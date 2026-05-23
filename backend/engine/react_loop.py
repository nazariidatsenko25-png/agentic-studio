import os
import re
import json
import time
import asyncio
from google import genai
from google.genai import types
from .tools import web_search, calculator, call_api

# ReAct system prompt that forces the model to "think out loud"
REACT_SYSTEM_PREFIX = """You are an autonomous AI agent that solves tasks step-by-step using the ReAct framework.

## Your Process
For EVERY user request, follow this cycle:

1. **THINK** — Analyze the request. What do you know? What do you need to find out? Which tool would help?
   Write your reasoning clearly, starting with "THINK:"

2. **ACT** — If you need external information, call an available tool.

3. **OBSERVE** — Analyze the tool's output. Did it answer the question? Do you need another tool call?

4. **RESPOND** — Once you have enough information, provide a comprehensive final answer.

## Rules
- ALWAYS start your first response with "THINK:" followed by your genuine reasoning
- Be specific in your thinking — mention what you're considering and why
- If a tool returns an error, explain what happened and try a different approach
- After receiving tool results, ALWAYS think again before responding ("THINK: Now that I have the search results...")
- Your final answer should synthesize all gathered information

## Example
User: "What is the current population of Tokyo?"
You: "THINK: The user wants the current population of Tokyo. This is a factual question about current data, so I should use web_search to find the most up-to-date information rather than relying on my training data which may be outdated."
[Then you call web_search]
After results: "THINK: I found several sources. According to the most recent data..."
[Then you give a final answer]
"""

# Maximum number of retries for rate-limited requests
MAX_RETRIES = 3


def _get_function_calls(response):
    """Extract function calls from a GenerateContentResponse (SDK v0.3.0 compat)."""
    try:
        parts = response.candidates[0].content.parts
        return [p.function_call for p in parts if p.function_call is not None]
    except (IndexError, AttributeError):
        return []


def _get_text(response):
    """Extract concatenated text from a GenerateContentResponse (SDK v0.3.0 compat)."""
    try:
        parts = response.candidates[0].content.parts
        texts = [p.text for p in parts if p.text]
        return "\n".join(texts) if texts else ""
    except (IndexError, AttributeError):
        return ""


def get_client():
    # Re-read .env each time so key changes are picked up without restart
    from pathlib import Path
    from dotenv import dotenv_values
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        env_vals = dotenv_values(env_path)
        api_key = env_vals.get("GEMINI_API_KEY", "").strip()
    else:
        api_key = ""
    # Fallback to process env
    if not api_key:
        api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set.")
    return genai.Client(api_key=api_key)


def extract_thoughts(text: str) -> tuple[list[str], str]:
    """
    Extract THINK: blocks from model text.
    Returns (list_of_thoughts, remaining_text_without_thinks).
    
    Handles cases where THINK: and response are on the same line or
    consecutive lines without a blank separator.
    """
    # Use regex to find all THINK: blocks (greedy up to next THINK: or end-of-think markers)
    think_pattern = re.compile(
        r'THINK:\s*(.*?)(?=\n\s*(?:ACTION:|OBSERVE:|RESPOND:|THINK:)|\n\s*\n|$)',
        re.IGNORECASE | re.DOTALL
    )
    
    thoughts = []
    for match in think_pattern.finditer(text):
        thought = match.group(1).strip()
        if thought:
            thoughts.append(thought)
    
    # Remove all THINK: blocks from the text to get the remaining response
    remaining = think_pattern.sub('', text).strip()
    
    # Clean up any leftover empty lines
    remaining = re.sub(r'\n{3,}', '\n\n', remaining)
    
    return thoughts, remaining


def strip_thinks(text: str) -> str:
    """Safety-net: remove any THINK: prefixed content from final user-facing text."""
    # Remove lines that start with THINK:
    lines = text.split('\n')
    cleaned = []
    skip = False
    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith('THINK:'):
            skip = True
            continue
        if skip and stripped == '':
            continue  # Skip blank lines right after THINK blocks
        skip = False
        cleaned.append(line)
    return '\n'.join(cleaned).strip()


def parse_retry_delay(error_msg: str) -> int:
    """
    Extract the retry delay (in seconds) from a Gemini 429 error message.
    Falls back to 10 seconds if parsing fails.
    """
    match = re.search(r'retry\s*(?:in|after)\s+(\d+)', error_msg, re.IGNORECASE)
    if match:
        return min(int(match.group(1)), 60)  # Cap at 60s
    # Try float format: "retryDelay": "53s"
    match = re.search(r'"retryDelay":\s*"(\d+)s?"', error_msg)
    if match:
        return min(int(match.group(1)), 60)
    return 10


def format_api_error(error_msg: str) -> str:
    """
    Convert raw API error into a user-friendly message (Ukrainian).
    """
    if "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
        if "limit: 0" in error_msg:
            return (
                "⚠️ Денний ліміт безкоштовного Gemini API вичерпано. "
                "Спробуйте пізніше або оновіть API-ключ на https://aistudio.google.com/apikey"
            )
        return "⏳ API тимчасово перевантажено. Повторюю запит..."
    if "INVALID_API_KEY" in error_msg or "API_KEY_INVALID" in error_msg:
        return "🔑 Невалідний API-ключ Gemini. Перевірте GEMINI_API_KEY в .env"
    if "PERMISSION_DENIED" in error_msg:
        return "🔒 Доступ заборонено. Перевірте налаштування проєкту Google Cloud."
    return f"Помилка API: {error_msg[:200]}"





async def execute_agent(
    system_prompt: str,
    tools_config: list[str],
    max_iterations: int,
    user_message: str,
    output_format: dict | None = None,
    knowledge_sources: list[dict] | None = None,
    api_integrations: list[dict] | None = None,
    memory_config: dict | None = None,
    conditions: list[dict] | None = None,
    conversation_history: list[dict] | None = None,
):
    """
    Executes the ReAct loop using Gemini 2.0 Flash.
    Yields SSE events with real model reasoning.
    All builder block configs are injected into the system prompt.
    """
    try:
        client = get_client()
    except Exception as e:
        yield f"data: {json.dumps({'type': 'message', 'content': f'Помилка ініціалізації: {str(e)}'})}\n\n"
        return

    model = "gemini-2.5-flash"
    
    # Combine ReAct prefix with user's custom system prompt
    full_system_prompt = REACT_SYSTEM_PREFIX
    if system_prompt and system_prompt.strip():
        full_system_prompt += f"\n\n## Additional Instructions from Agent Creator\n{system_prompt}"

    # ─── Output Format ───
    if output_format and output_format.get('format'):
        fmt = output_format['format']
        full_system_prompt += f"\n\n## Output Format\nAlways format your final response as {fmt}."
        if fmt == 'json' and output_format.get('schema'):
            full_system_prompt += f"\nFollow this JSON schema:\n```json\n{output_format['schema']}\n```"
        elif fmt == 'markdown':
            full_system_prompt += "\nUse proper Markdown with headers, bold, lists where appropriate."
        elif fmt == 'csv':
            full_system_prompt += "\nReturn data as CSV with a header row."
        elif fmt == 'html':
            full_system_prompt += "\nReturn properly structured HTML."

    # ─── Knowledge Sources ───
    if knowledge_sources:
        knowledge_texts = []
        for ks in knowledge_sources:
            src_type = ks.get('source_type', 'url')
            src_value = ks.get('source_value', '')
            if not src_value:
                continue
            if src_type == 'text':
                knowledge_texts.append(src_value[:4000])
            elif src_type == 'url':
                try:
                    import httpx
                    resp = httpx.get(src_value, timeout=10, follow_redirects=True)
                    text = resp.text[:4000]
                    knowledge_texts.append(f"Content from {src_value}:\n{text}")
                except Exception:
                    knowledge_texts.append(f"(Failed to fetch {src_value})")
            elif src_type == 'file':
                knowledge_texts.append(f"(File source configured: {src_value} — file reading not yet available)")
        if knowledge_texts:
            full_system_prompt += "\n\n## Knowledge Context\nUse the following knowledge as reference when answering:\n\n" + "\n---\n".join(knowledge_texts)

    # ─── API Integrations (inform the model) ───
    if api_integrations:
        api_descriptions = []
        for i, api in enumerate(api_integrations):
            url = api.get('url', '')
            method = api.get('method', 'GET')
            if url:
                api_descriptions.append(f"- API #{i+1}: {method} {url}")
        if api_descriptions:
            full_system_prompt += "\n\n## Available API Integrations\nYou have access to the call_api tool. The user has configured these endpoints:\n" + "\n".join(api_descriptions)
            full_system_prompt += "\nUse the call_api tool when the user's question requires data from these endpoints."

    # ─── Memory ───
    if memory_config:
        mem_type = memory_config.get('memory_type', 'session')
        ttl = memory_config.get('ttl_minutes', 60)
        full_system_prompt += f"\n\n## Memory\nYou have {mem_type} memory enabled (TTL: {ttl} minutes). Maintain context across messages and refer back to earlier parts of the conversation when relevant."

    # ─── Conditions ───
    if conditions:
        cond_texts = []
        for c in conditions:
            expr = c.get('expression', '')
            if expr:
                cond_texts.append(f"- If `{expr}` is true, follow the True branch; otherwise follow the False branch.")
        if cond_texts:
            full_system_prompt += "\n\n## Conditional Logic\nApply these decision rules:\n" + "\n".join(cond_texts)

    # ─── Unavailable Tools ───
    unavailable = []
    for tid in tools_config:
        if tid in ('code_interpreter', 'image_generation', 'file_reader'):
            unavailable.append(tid.replace('_', ' ').title())
    if unavailable:
        full_system_prompt += f"\n\n## Unavailable Tools\nThe following tools are configured but not yet available: {', '.join(unavailable)}. If the user requests these capabilities, politely inform them that these tools are coming soon."

    # Map requested tools to actual functions
    tool_funcs = []
    if "web_search" in tools_config:
        tool_funcs.append(web_search)
    if "calculator" in tools_config:
        tool_funcs.append(calculator)
    if api_integrations and any(a.get('url') for a in api_integrations):
        tool_funcs.append(call_api)
        
    config = types.GenerateContentConfig(
        system_instruction=full_system_prompt,
        temperature=0.7,
        tools=tool_funcs if tool_funcs else None,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
    )
    
    # Status: connecting
    yield f"data: {json.dumps({'type': 'status', 'content': 'Підключення до AI моделі...'})}\n\n"
    
    chat = client.chats.create(model=model, config=config)

    # If conversation history exists (memory), prepend it
    history_prefix = ""
    if conversation_history:
        history_lines = []
        for msg in conversation_history[-10:]:  # Last 10 messages max
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if content:
                history_lines.append(f"{role.upper()}: {content[:500]}")
        if history_lines:
            history_prefix = "## Previous Conversation\n" + "\n".join(history_lines) + "\n\n## Current Message\n"

    messages = [history_prefix + user_message if history_prefix else user_message]
    
    total_start = time.time()
    
    for i in range(max_iterations):
        iter_start = time.time()
        elapsed_total = time.time() - total_start
        
        # Emit iteration start
        yield f"data: {json.dumps({'type': 'iter_start', 'iteration': i + 1, 'max': max_iterations, 'elapsed': round(elapsed_total, 1)})}\n\n"
        
        # Phase: Thinking
        yield f"data: {json.dumps({'type': 'phase', 'phase': 'thinking', 'iteration': i + 1})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'content': f'Крок {i+1}/{max_iterations} — модель аналізує... ({elapsed_total:.1f}s)'})}\n\n"
        
        message_to_send = messages.pop() if messages else ""
        
        try:
            response = None
            last_error = None
            for attempt in range(MAX_RETRIES):
                try:
                    response = chat.send_message(message_to_send)
                    break
                except Exception as e:
                    error_msg = str(e)
                    last_error = e
                    
                    is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg
                    if is_rate_limit and attempt < MAX_RETRIES - 1:
                        if "limit: 0" in error_msg:
                            raise
                        delay = parse_retry_delay(error_msg)
                        yield f"data: {json.dumps({'type': 'status', 'content': f'⏳ Rate limit — очікування {delay}с (спроба {attempt + 2}/{MAX_RETRIES})...'})}\n\n"
                        await asyncio.sleep(delay)
                    else:
                        raise
            if response is None:
                raise last_error
        except Exception as e:
            friendly_msg = format_api_error(str(e))
            yield f"data: {json.dumps({'type': 'message', 'content': friendly_msg})}\n\n"
            break
            
        # --- Extract function calls and text using SDK-compatible helpers ---
        func_calls = _get_function_calls(response)
        response_text = _get_text(response)
        
        # Handle empty responses
        if not func_calls and not response_text:
            yield f"data: {json.dumps({'type': 'message', 'content': 'API Error: Model returned an empty response. This may be due to safety filters.'})}\n\n"
            break
        
        # --- Process tool calls ---
        if func_calls:
            # If there's also text with THINK: blocks, extract and emit them first
            if response_text:
                thoughts, _ = extract_thoughts(response_text)
                for thought in thoughts:
                    if thought:
                        yield f"data: {json.dumps({'type': 'thought', 'content': thought})}\n\n"
            
            parts = []
            for fc in func_calls:
                tool_name = fc.name
                tool_args = dict(fc.args) if fc.args else {}
                
                # Phase: Acting
                yield f"data: {json.dumps({'type': 'phase', 'phase': 'acting', 'iteration': i + 1, 'tool': tool_name})}\n\n"
                yield f"data: {json.dumps({'type': 'action', 'tool': tool_name, 'args': tool_args})}\n\n"
                tool_start = time.time()
                yield f"data: {json.dumps({'type': 'status', 'content': f'Виконую {tool_name}...'})}\n\n"
                
                # Execute tool
                if tool_name == "web_search":
                    result = await web_search(**tool_args)
                elif tool_name == "calculator":
                    result = await calculator(**tool_args)
                elif tool_name == "call_api":
                    result = await call_api(**tool_args)
                else:
                    result = f"Unknown tool: {tool_name}"
                    
                # Phase: Observing
                tool_elapsed = time.time() - tool_start
                yield f"data: {json.dumps({'type': 'phase', 'phase': 'observing', 'iteration': i + 1, 'tool': tool_name, 'elapsed': round(tool_elapsed, 1)})}\n\n"
                obs_preview = str(result)[:500] + "..." if len(str(result)) > 500 else str(result)
                yield f"data: {json.dumps({'type': 'observation', 'content': obs_preview})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'content': f'✓ {tool_name} завершено за {tool_elapsed:.1f}s'})}\n\n"
                
                # Collect tool result
                parts.append(
                    types.Part.from_function_response(
                        name=tool_name,
                        response={"result": result}
                    )
                )
            
            # Send all tool results back to model together
            messages.append(parts)
            
            # Emit iteration end
            iter_elapsed = time.time() - iter_start
            yield f"data: {json.dumps({'type': 'iter_end', 'iteration': i + 1, 'elapsed': round(iter_elapsed, 1)})}\n\n"
            continue  # Next iteration to process tool results
            
        # --- Process text response ---
        elif response_text:
            thoughts, remaining = extract_thoughts(response_text)
            
            # Emit each thought as a separate SSE event
            for thought in thoughts:
                if thought:
                    yield f"data: {json.dumps({'type': 'thought', 'content': thought})}\n\n"
            
            # Phase: Responding
            yield f"data: {json.dumps({'type': 'phase', 'phase': 'responding', 'iteration': i + 1})}\n\n"
            
            # Emit the final message (text without THINK: blocks)
            final_text = remaining if remaining else response_text
            # Safety net: strip any remaining THINK: content
            final_text = strip_thinks(final_text)
            if final_text.strip():
                total_elapsed = time.time() - total_start
                yield f"data: {json.dumps({'type': 'message', 'content': final_text})}\n\n"
                yield f"data: {json.dumps({'type': 'iter_end', 'iteration': i + 1, 'elapsed': round(time.time() - iter_start, 1), 'final': True})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'content': f'✓ Завершено за {total_elapsed:.1f}s ({i+1} кроків)'})}\n\n"
            break  # Done
            
    else:
        total_elapsed = time.time() - total_start
        yield f"data: {json.dumps({'type': 'message', 'content': f'Досягнуто ліміт ітерацій ({total_elapsed:.1f}s). Спробуйте збільшити максимальну кількість кроків.'})}\n\n"
