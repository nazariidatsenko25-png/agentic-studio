"""
Demo Mode - pitch-safe scripted SSE generator.

Provides multiple scripted scenarios that work WITHOUT any API calls.
Activate by setting DEMO_MODE=1 in .env before the pitch.

ALL messages will be routed through demo mode when active.
Different user prompts trigger different scripted scenarios.
Any unrecognized prompt gets a smart generic response.
"""

import json
import asyncio
import os
from pathlib import Path
from dotenv import dotenv_values

# ── The trigger prompt (case-insensitive prefix match) ──
DEMO_TRIGGER = "\u043f\u0440\u043e\u0430\u043d\u0430\u043b\u0456\u0437\u0443\u0439 \u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442\u0456\u0432"

def is_demo_mode() -> bool:
    """Check DEMO_MODE from .env file (re-reads every call for hot-toggle)."""
    # Re-read .env so changes take effect without restart
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        env_vals = dotenv_values(env_path)
        val = env_vals.get("DEMO_MODE", "").strip()
        if val in ("1", "true", "yes"):
            return True
    return os.getenv("DEMO_MODE", "").strip() in ("1", "true", "yes")

def should_use_demo(user_message: str) -> bool:
    """Check if the user message triggers demo mode."""
    if is_demo_mode():
        return True
    return user_message.strip().lower().startswith(DEMO_TRIGGER)


# ═══════════════════════════════════════════════════
# HELPER: emit a full ReAct iteration with timing
# ═══════════════════════════════════════════════════

async def _emit_iteration(
    iteration: int,
    max_iter: int,
    elapsed: float,
    thought: str,
    tool_name: str | None = None,
    tool_args: dict | None = None,
    tool_time: float = 1.5,
    observation: str | None = None,
    final_text: str | None = None,
):
    """Generator helper: emits a complete Think -> Act -> Observe cycle."""
    # Iteration start
    yield f"data: {json.dumps({'type': 'iter_start', 'iteration': iteration, 'max': max_iter, 'elapsed': round(elapsed, 1)})}\n\n"
    await asyncio.sleep(0.2)

    # Phase: Thinking
    yield f"data: {json.dumps({'type': 'phase', 'phase': 'thinking', 'iteration': iteration})}\n\n"
    await asyncio.sleep(0.3)
    yield f"data: {json.dumps({'type': 'thought', 'content': thought})}\n\n"
    await asyncio.sleep(1.0)

    if tool_name and observation:
        # Phase: Acting
        yield f"data: {json.dumps({'type': 'phase', 'phase': 'acting', 'iteration': iteration, 'tool': tool_name})}\n\n"
        await asyncio.sleep(0.2)
        yield f"data: {json.dumps({'type': 'action', 'tool': tool_name, 'args': tool_args or {}})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'content': f'\u0412\u0438\u043a\u043e\u043d\u0443\u044e {tool_name}...'})}\n\n"
        await asyncio.sleep(tool_time)

        # Phase: Observing
        yield f"data: {json.dumps({'type': 'phase', 'phase': 'observing', 'iteration': iteration, 'tool': tool_name, 'elapsed': tool_time})}\n\n"
        await asyncio.sleep(0.2)
        yield f"data: {json.dumps({'type': 'observation', 'content': observation})}\n\n"
        yield f"data: {json.dumps({'type': 'status', 'content': f'\u2713 {tool_name} \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 {tool_time}s'})}\n\n"
        await asyncio.sleep(0.3)

    if final_text:
        # Phase: Responding
        yield f"data: {json.dumps({'type': 'phase', 'phase': 'responding', 'iteration': iteration})}\n\n"
        await asyncio.sleep(0.3)

        # Stream token by token
        tokens = final_text.split(" ")
        accumulated = ""
        for i, token in enumerate(tokens):
            accumulated += (" " if i > 0 else "") + token
            yield f"data: {json.dumps({'type': 'token', 'content': token + ' '})}\n\n"
            delay = 0.03 if not token.startswith("#") else 0.08
            await asyncio.sleep(delay)
        yield f"data: {json.dumps({'type': 'message', 'content': accumulated})}\n\n"

    # Iteration end
    iter_elapsed = tool_time + 1.5 if tool_name else 1.5
    yield f"data: {json.dumps({'type': 'iter_end', 'iteration': iteration, 'elapsed': round(iter_elapsed, 1), 'final': final_text is not None})}\n\n"


# ═══════════════════════════════════════════════════
# SCENARIO ROUTER
# ═══════════════════════════════════════════════════

def _match_scenario(msg: str) -> str:
    """Match user message to a scenario key."""
    msg = msg.strip().lower()
    
    if any(kw in msg for kw in ["\u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442", "competitor", "market", "\u0440\u0438\u043d\u043e\u043a", "\u0430\u043d\u0430\u043b\u0456\u0437"]):
        return "competitors"
    if any(kw in msg for kw in ["\u043f\u043e\u0433\u043e\u0434", "weather", "\u0442\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440"]):
        return "weather"
    if any(kw in msg for kw in ["\u043c\u0430\u0442\u0435\u043c\u0430\u0442", "math", "calc", "\u043f\u043e\u0440\u0430\u0445\u0443", "\u0441\u043a\u0456\u043b\u044c\u043a\u0438", "\u043e\u0431\u0447\u0438\u0441\u043b"]):
        return "math"
    if any(kw in msg for kw in ["api", "endpoint", "\u0456\u043d\u0442\u0435\u0433\u0440\u0430\u0446\u0456", "rest", "http"]):
        return "api"
    if any(kw in msg for kw in ["hello", "\u043f\u0440\u0438\u0432\u0456\u0442", "hi", "\u0434\u043e\u0431\u0440\u0438\u0439"]):
        return "greeting"
    return "generic"


# ═══════════════════════════════════════════════════
# SCENARIOS
# ═══════════════════════════════════════════════════

async def _scenario_competitors():
    """Market Research demo with web search."""
    async for event in _emit_iteration(
        iteration=1, max_iter=2, elapsed=0,
        thought=(
            "\u0414\u043b\u044f \u0432\u0438\u043a\u043e\u043d\u0430\u043d\u043d\u044f \u0446\u044c\u043e\u0433\u043e \u0437\u0430\u0432\u0434\u0430\u043d\u043d\u044f \u043c\u0435\u043d\u0456 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e:\n"
            "1. \u0417\u043d\u0430\u0439\u0442\u0438 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u043f\u0440\u043e \u043e\u0441\u043d\u043e\u0432\u043d\u0438\u0445 \u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442\u0456\u0432\n"
            "2. \u041f\u0440\u043e\u0430\u043d\u0430\u043b\u0456\u0437\u0443\u0432\u0430\u0442\u0438 \u0457\u0445\u043d\u0456 \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u0438 \u0442\u0430 \u0446\u0456\u043d\u0438\n"
            "3. \u0421\u043a\u043b\u0430\u0441\u0442\u0438 \u043f\u043e\u0440\u0456\u0432\u043d\u044f\u043b\u044c\u043d\u0443 \u0442\u0430\u0431\u043b\u0438\u0446\u044e\n\n"
            "\u041f\u043e\u0447\u043d\u0443 \u0437 \u043f\u043e\u0448\u0443\u043a\u0443 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0457 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u0457 \u0432 \u0456\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0456."
        ),
        tool_name="web_search",
        tool_args={"query": "top AI agent platforms 2026 pricing comparison"},
        tool_time=1.8,
        observation=(
            "Title: AI Agent Platforms Comparison 2026\n"
            "URL: https://techreview.com/ai-agents-2026\n"
            "Content: The leading AI agent platforms in 2026 include:\n"
            "1. AutoGPT Enterprise \u2014 $299/month, limited tool integrations\n"
            "2. LangFlow Pro \u2014 $199/month, complex setup required\n"
            "3. CrewAI Cloud \u2014 $149/month, Python-only\n"
            "4. AgentGPT \u2014 Free tier available, basic features only"
        ),
    ):
        yield event

    async for event in _emit_iteration(
        iteration=2, max_iter=2, elapsed=3.8,
        thought=(
            "\u041e\u0442\u0440\u0438\u043c\u0430\u0432 \u0434\u0430\u043d\u0456 \u043f\u0440\u043e \u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442\u0456\u0432. \u0422\u0435\u043f\u0435\u0440 \u043f\u0440\u043e\u0430\u043d\u0430\u043b\u0456\u0437\u0443\u044e \u0457\u0445\u043d\u0456 "
            "\u0441\u0438\u043b\u044c\u043d\u0456 \u0442\u0430 \u0441\u043b\u0430\u0431\u043a\u0456 \u0441\u0442\u043e\u0440\u043e\u043d\u0438 \u043f\u043e\u0440\u0456\u0432\u043d\u044f\u043d\u043e \u0437 Agentic Studio."
        ),
        final_text=(
            "## \ud83d\udcca \u0410\u043d\u0430\u043b\u0456\u0437 \u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442\u0456\u0432: AI Agent Platforms 2026\n\n"
            "### \u041f\u043e\u0440\u0456\u0432\u043d\u044f\u043b\u044c\u043d\u0430 \u0442\u0430\u0431\u043b\u0438\u0446\u044f\n\n"
            "| \u041f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430 | \u0426\u0456\u043d\u0430 | \u0412\u0456\u0437\u0443\u0430\u043b\u044c\u043d\u0438\u0439 \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440 | Live Tracking | Deploy |\n"
            "|-----------|------|----------------------|---------------|--------|\n"
            "| **AutoGPT Enterprise** | $299/\u043c\u0456\u0441 | \u274c \u041a\u043e\u0434 | \u274c | \u274c |\n"
            "| **LangFlow Pro** | $199/\u043c\u0456\u0441 | \u26a0\ufe0f \u041e\u0431\u043c\u0435\u0436\u0435\u043d\u0438\u0439 | \u274c | \u26a0\ufe0f REST |\n"
            "| **CrewAI Cloud** | $149/\u043c\u0456\u0441 | \u274c Python | \u274c | \u274c |\n"
            "| **Agentic Studio** | \u2014 | \u2705 No-code | \u2705 \u0420\u0435\u0430\u043b\u044c\u043d\u0438\u0439 \u0447\u0430\u0441 | \u2705 JS-\u0432\u0456\u0434\u0436\u0435\u0442 |\n\n"
            "### \u041a\u043b\u044e\u0447\u043e\u0432\u0456 \u0432\u0438\u0441\u043d\u043e\u0432\u043a\u0438\n\n"
            "\ud83d\udd39 **Agentic Studio** \u2014 \u0454\u0434\u0438\u043d\u0430 \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u0430 \u0437 \u043f\u043e\u0432\u043d\u043e\u0446\u0456\u043d\u043d\u0438\u043c \u0432\u0456\u0437\u0443\u0430\u043b\u044c\u043d\u0438\u043c \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0442\u043e\u0440\u043e\u043c \u043d\u0430 \u0431\u0430\u0437\u0456 React Flow.\n\n"
            "\ud83d\udd39 **Live Tracking** \u2014 \u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442\u043d\u0430 \u043f\u0435\u0440\u0435\u0432\u0430\u0433\u0430 \u21161. \u0416\u043e\u0434\u0435\u043d \u043a\u043e\u043d\u043a\u0443\u0440\u0435\u043d\u0442 \u043d\u0435 \u043f\u043e\u043a\u0430\u0437\u0443\u0454 \u043f\u0440\u043e\u0446\u0435\u0441 \u043c\u0438\u0441\u043b\u0435\u043d\u043d\u044f \u0430\u0433\u0435\u043d\u0442\u0430.\n\n"
            "\ud83d\udd39 **Deploy Anywhere** \u2014 \u0432\u0431\u0443\u0434\u043e\u0432\u0443\u0432\u0430\u043d\u043d\u044f JS-\u0432\u0456\u0434\u0436\u0435\u0442\u043e\u043c \u043e\u0434\u043d\u0438\u043c \u0440\u044f\u0434\u043a\u043e\u043c \u043a\u043e\u0434\u0443.\n\n"
            "### \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u044f\n"
            "Agentic Studio \u0437\u0430\u0439\u043c\u0430\u0454 \u0443\u043d\u0456\u043a\u0430\u043b\u044c\u043d\u0443 \u043d\u0456\u0448\u0443 **no-code AI agent builder** \u0437 \u043f\u043e\u0432\u043d\u043e\u044e \u043f\u0440\u043e\u0437\u043e\u0440\u0456\u0441\u0442\u044e \u0432\u0438\u043a\u043e\u043d\u0430\u043d\u043d\u044f."
        ),
    ):
        yield event

    yield f"data: {json.dumps({'type': 'status', 'content': '\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 8.0s (2 \u0456\u0442\u0435\u0440\u0430\u0446\u0456\u0457)'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _scenario_weather():
    """Weather lookup demo with web search."""
    async for event in _emit_iteration(
        iteration=1, max_iter=1, elapsed=0,
        thought=(
            "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447 \u0437\u0430\u043f\u0438\u0442\u0443\u0454 \u043f\u0440\u043e \u043f\u043e\u0433\u043e\u0434\u0443. \u0417\u0440\u043e\u0431\u043b\u044e \u043f\u043e\u0448\u0443\u043a "
            "\u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0457 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u0457 \u0432 \u0456\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0456 \u0456 \u043d\u0430\u0434\u0430\u043c \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043e\u0432\u0430\u043d\u0443 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c."
        ),
        tool_name="web_search",
        tool_args={"query": "weather Kyiv today forecast"},
        tool_time=1.2,
        observation=(
            "Title: Weather in Kyiv - AccuWeather\n"
            "URL: https://accuweather.com/kyiv\n"
            "Current: 22\u00b0C, Partly Cloudy\n"
            "Feels like: 24\u00b0C\n"
            "Wind: 12 km/h SW\n"
            "Humidity: 45%\n"
            "Forecast: High 25\u00b0C, Low 16\u00b0C. Sunny periods with clouds."
        ),
        final_text=(
            "## \u2600\ufe0f \u041f\u043e\u0433\u043e\u0434\u0430 \u0432 \u041a\u0438\u0454\u0432\u0456 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456\n\n"
            "| \u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440 | \u0417\u043d\u0430\u0447\u0435\u043d\u043d\u044f |\n"
            "|---------|--------|\n"
            "| \ud83c\udf21\ufe0f \u0422\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430 | **22\u00b0C** (\u0432\u0456\u0434\u0447\u0443\u0432\u0430\u0454\u0442\u044c\u0441\u044f 24\u00b0C) |\n"
            "| \ud83c\udf24\ufe0f \u0421\u0442\u0430\u043d | \u0427\u0430\u0441\u0442\u043a\u043e\u0432\u043e \u0445\u043c\u0430\u0440\u043d\u043e |\n"
            "| \ud83d\udca8 \u0412\u0456\u0442\u0435\u0440 | 12 \u043a\u043c/\u0433\u043e\u0434, \u041f\u0434-\u0417\u0445 |\n"
            "| \ud83d\udca7 \u0412\u043e\u043b\u043e\u0433\u0456\u0441\u0442\u044c | 45% |\n"
            "| \ud83d\udcc8 \u041f\u0440\u043e\u0433\u043d\u043e\u0437 | \u041c\u0430\u043a\u0441 25\u00b0C / \u041c\u0456\u043d 16\u00b0C |\n\n"
            "\u0421\u043e\u043d\u044f\u0447\u043d\u0456 \u043f\u0435\u0440\u0456\u043e\u0434\u0438 \u0437 \u0445\u043c\u0430\u0440\u0430\u043c\u0438. \u0413\u0430\u0440\u043d\u0438\u0439 \u0434\u0435\u043d\u044c \u0434\u043b\u044f \u043f\u0440\u043e\u0433\u0443\u043b\u044f\u043d\u043a\u0438! \u2600\ufe0f"
        ),
    ):
        yield event

    yield f"data: {json.dumps({'type': 'status', 'content': '\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 3.2s (1 \u0456\u0442\u0435\u0440\u0430\u0446\u0456\u044f)'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _scenario_math():
    """Calculator demo."""
    async for event in _emit_iteration(
        iteration=1, max_iter=1, elapsed=0,
        thought=(
            "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447 \u043f\u043e\u0441\u0442\u0430\u0432\u0438\u0432 \u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u0447\u043d\u0435 \u0437\u0430\u043f\u0438\u0442\u0430\u043d\u043d\u044f. "
            "\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u044e \u043a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440 \u0434\u043b\u044f \u0442\u043e\u0447\u043d\u043e\u0433\u043e \u043e\u0431\u0447\u0438\u0441\u043b\u0435\u043d\u043d\u044f."
        ),
        tool_name="calculator",
        tool_args={"expression": "((15 * 24) + (8 * 16)) / 7"},
        tool_time=0.3,
        observation="Result: 69.71428571428571",
        final_text=(
            "## \ud83e\uddee \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u0447\u0438\u0441\u043b\u0435\u043d\u043d\u044f\n\n"
            "**\u0412\u0438\u0440\u0430\u0437:** `((15 \u00d7 24) + (8 \u00d7 16)) \u00f7 7`\n\n"
            "| \u041a\u0440\u043e\u043a | \u041e\u043f\u0435\u0440\u0430\u0446\u0456\u044f | \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 |\n"
            "|------|----------|----------|\n"
            "| 1 | 15 \u00d7 24 | 360 |\n"
            "| 2 | 8 \u00d7 16 | 128 |\n"
            "| 3 | 360 + 128 | 488 |\n"
            "| 4 | 488 \u00f7 7 | **69.71** |\n\n"
            "\u0412\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c: **\u2248 69.71**"
        ),
    ):
        yield event

    yield f"data: {json.dumps({'type': 'status', 'content': '\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 1.8s (1 \u0456\u0442\u0435\u0440\u0430\u0446\u0456\u044f)'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _scenario_api():
    """API integration demo."""
    async for event in _emit_iteration(
        iteration=1, max_iter=1, elapsed=0,
        thought=(
            "\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447 \u0437\u0430\u043f\u0438\u0442\u0443\u0454 \u043f\u0440\u043e API. "
            "\u0417\u0440\u043e\u0431\u043b\u044e \u0437\u0430\u043f\u0438\u0442 \u0434\u043e \u043f\u0443\u0431\u043b\u0456\u0447\u043d\u043e\u0433\u043e API \u0442\u0430 \u043f\u043e\u043a\u0430\u0436\u0443 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442."
        ),
        tool_name="call_api",
        tool_args={"url": "https://api.github.com/repos/vercel/next.js", "method": "GET"},
        tool_time=1.0,
        observation=(
            '{"full_name": "vercel/next.js", "stargazers_count": 128450, '
            '"forks_count": 27800, "open_issues_count": 3240, '
            '"description": "The React Framework for the Web"}'
        ),
        final_text=(
            "## \ud83d\udd0c \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 API \u0437\u0430\u043f\u0438\u0442\u0443\n\n"
            "**Endpoint:** `GET https://api.github.com/repos/vercel/next.js`\n\n"
            "| \u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440 | \u0417\u043d\u0430\u0447\u0435\u043d\u043d\u044f |\n"
            "|---------|--------|\n"
            "| \u0420\u0435\u043f\u043e\u0437\u0438\u0442\u043e\u0440\u0456\u0439 | vercel/next.js |\n"
            "| \u2b50 Stars | **128,450** |\n"
            "| \ud83c\udf74 Forks | 27,800 |\n"
            "| \ud83d\udcdd Issues | 3,240 |\n\n"
            "API \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0432 \u0443\u0441\u043f\u0456\u0448\u043d\u043e \u0437\u0456 \u0441\u0442\u0430\u0442\u0443\u0441\u043e\u043c **200 OK**."
        ),
    ):
        yield event

    yield f"data: {json.dumps({'type': 'status', 'content': '\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 2.5s (1 \u0456\u0442\u0435\u0440\u0430\u0446\u0456\u044f)'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _scenario_greeting():
    """Simple greeting - no tools."""
    async for event in _emit_iteration(
        iteration=1, max_iter=1, elapsed=0,
        thought="\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447 \u043f\u0440\u0438\u0432\u0456\u0442\u0430\u0432\u0441\u044f. \u0412\u0456\u0434\u043f\u043e\u0432\u0456\u043c \u0434\u0440\u0443\u0436\u043d\u044c\u043e \u0442\u0430 \u0440\u043e\u0437\u043f\u043e\u0432\u0456\u043c \u043f\u0440\u043e \u0441\u0432\u043e\u0457 \u043c\u043e\u0436\u043b\u0438\u0432\u043e\u0441\u0442\u0456.",
        final_text=(
            "\u041f\u0440\u0438\u0432\u0456\u0442! \ud83d\udc4b \u042f \u2014 \u0432\u0430\u0448 AI-\u0430\u0433\u0435\u043d\u0442, \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u0438\u0439 \u0432 **Agentic Studio**.\n\n"
            "\u042f \u043c\u043e\u0436\u0443:\n"
            "- \ud83d\udd0d **\u0428\u0443\u043a\u0430\u0442\u0438 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e** \u0432 \u0456\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0456 (\u0432\u0435\u0431-\u043f\u043e\u0448\u0443\u043a)\n"
            "- \ud83e\uddee **\u041e\u0431\u0447\u0438\u0441\u043b\u044e\u0432\u0430\u0442\u0438** \u043c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u0447\u043d\u0456 \u0432\u0438\u0440\u0430\u0437\u0438\n"
            "- \ud83d\udd0c **\u0412\u0438\u043a\u043b\u0438\u043a\u0430\u0442\u0438 API** \u0434\u043b\u044f \u043e\u0442\u0440\u0438\u043c\u0430\u043d\u043d\u044f \u0434\u0430\u043d\u0438\u0445\n\n"
            "\u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0437\u0430\u043f\u0438\u0442\u0430\u0442\u0438 \u043c\u0435\u043d\u0435 \u0449\u043e-\u043d\u0435\u0431\u0443\u0434\u044c! \ud83d\ude80"
        ),
    ):
        yield event

    yield f"data: {json.dumps({'type': 'status', 'content': '\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 1.5s (1 \u0456\u0442\u0435\u0440\u0430\u0446\u0456\u044f)'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _scenario_generic(user_message: str):
    """Fallback: simulates web search for any topic."""
    query = user_message[:80]
    async for event in _emit_iteration(
        iteration=1, max_iter=2, elapsed=0,
        thought=(
            f"\u041a\u043e\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447 \u0437\u0430\u043f\u0438\u0442\u0443\u0454: \u00ab{query}\u00bb. "
            "\u041f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u0437\u043d\u0430\u0439\u0442\u0438 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e \u0432 \u0456\u043d\u0442\u0435\u0440\u043d\u0435\u0442\u0456, "
            "\u043f\u0440\u043e\u0430\u043d\u0430\u043b\u0456\u0437\u0443\u0432\u0430\u0442\u0438 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0438 \u0442\u0430 \u0441\u0444\u043e\u0440\u043c\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c."
        ),
        tool_name="web_search",
        tool_args={"query": query},
        tool_time=1.5,
        observation=(
            f"Title: {query} \u2014 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u0439\u043d\u0438\u0439 \u043e\u0433\u043b\u044f\u0434\n"
            "URL: https://uk.wikipedia.org/wiki/example\n"
            f"Content: \u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e \u0440\u0435\u043b\u0435\u0432\u0430\u043d\u0442\u043d\u0456 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0438 \u0437\u0430 \u0437\u0430\u043f\u0438\u0442\u043e\u043c \u00ab{query}\u00bb. "
            "\u0406\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0430 \u043d\u0430 2026 \u0440\u0456\u043a. "
            "\u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e 3 \u0434\u0436\u0435\u0440\u0435\u043b\u0430 \u0437 \u0432\u0438\u0441\u043e\u043a\u043e\u044e \u0440\u0435\u043b\u0435\u0432\u0430\u043d\u0442\u043d\u0456\u0441\u0442\u044e."
        ),
    ):
        yield event

    async for event in _emit_iteration(
        iteration=2, max_iter=2, elapsed=3.5,
        thought=(
            "\u041e\u0442\u0440\u0438\u043c\u0430\u0432 \u0434\u0430\u043d\u0456 \u0437 \u0432\u0435\u0431-\u043f\u043e\u0448\u0443\u043a\u0443. "
            "\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0443\u044e \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u044c \u0443 \u0437\u0440\u0443\u0447\u043d\u043e\u043c\u0443 \u0444\u043e\u0440\u043c\u0430\u0442\u0456."
        ),
        final_text=(
            f"## \ud83d\udcdd \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0438 \u0434\u043e\u0441\u043b\u0456\u0434\u0436\u0435\u043d\u043d\u044f\n\n"
            f"\u0417\u0430 \u0432\u0430\u0448\u0438\u043c \u0437\u0430\u043f\u0438\u0442\u043e\u043c \u00ab**{query}**\u00bb \u044f \u0437\u043d\u0430\u0439\u0448\u043e\u0432 \u043d\u0430\u0441\u0442\u0443\u043f\u043d\u0443 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044e:\n\n"
            "### \u041e\u0441\u043d\u043e\u0432\u043d\u0456 \u0444\u0430\u043a\u0442\u0438\n\n"
            "- \u0422\u0435\u043c\u0430 \u0430\u043a\u0442\u0438\u0432\u043d\u043e \u043e\u0431\u0433\u043e\u0432\u043e\u0440\u044e\u0454\u0442\u044c\u0441\u044f \u0443 \u043f\u0440\u043e\u0444\u0435\u0441\u0456\u0439\u043d\u0438\u0445 \u043a\u043e\u043b\u0430\u0445\n"
            "- \u0417\u043d\u0430\u0439\u0434\u0435\u043d\u043e \u0434\u0435\u043a\u0456\u043b\u044c\u043a\u0430 \u0440\u0435\u043b\u0435\u0432\u0430\u043d\u0442\u043d\u0438\u0445 \u0434\u0436\u0435\u0440\u0435\u043b \u0437 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0438\u043c\u0438 \u0434\u0430\u043d\u0438\u043c\u0438\n"
            "- \u0406\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u0435\u043d\u0430 \u0437\u0430 \u0434\u0435\u043a\u0456\u043b\u044c\u043a\u043e\u043c\u0430 \u0434\u0436\u0435\u0440\u0435\u043b\u0430\u043c\u0438\n\n"
            "### \u0414\u0436\u0435\u0440\u0435\u043b\u0430\n"
            "- Wikipedia \u2014 \u0437\u0430\u0433\u0430\u043b\u044c\u043d\u0430 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f\n"
            "- TechReview \u2014 \u043f\u0440\u043e\u0444\u0435\u0441\u0456\u0439\u043d\u0438\u0439 \u0430\u043d\u0430\u043b\u0456\u0437\n"
            "- AI News \u2014 \u043e\u0441\u0442\u0430\u043d\u043d\u0456 \u043d\u043e\u0432\u0438\u043d\u0438\n\n"
            "*\u0426\u0435\u0439 \u0430\u0433\u0435\u043d\u0442 \u0441\u0442\u0432\u043e\u0440\u0435\u043d\u0438\u0439 \u0443 Agentic Studio \u0437\u0430 60 \u0441\u0435\u043a\u0443\u043d\u0434.* \u2728"
        ),
    ):
        yield event

    yield f"data: {json.dumps({'type': 'status', 'content': '\u2713 \u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e \u0437\u0430 6.5s (2 \u0456\u0442\u0435\u0440\u0430\u0446\u0456\u0457)'})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


# ═══════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════

async def execute_demo(user_message: str):
    """Route user message to the best demo scenario."""
    scenario = _match_scenario(user_message)
    
    if scenario == "competitors":
        async for event in _scenario_competitors():
            yield event
    elif scenario == "weather":
        async for event in _scenario_weather():
            yield event
    elif scenario == "math":
        async for event in _scenario_math():
            yield event
    elif scenario == "api":
        async for event in _scenario_api():
            yield event
    elif scenario == "greeting":
        async for event in _scenario_greeting():
            yield event
    else:
        async for event in _scenario_generic(user_message):
            yield event
