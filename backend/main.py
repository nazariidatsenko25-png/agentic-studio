import os
import json
import asyncio
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

from engine.react_loop import execute_agent
from engine.workflow import execute_workflow
from engine.demo_mode import should_use_demo, execute_demo

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing in .env")

class KnowledgeSource(BaseModel):
    source_type: str = "url"
    source_value: str = ""

class OutputFormat(BaseModel):
    format: str = "markdown"
    output_schema: str = ""

class ApiIntegration(BaseModel):
    method: str = "GET"
    url: str = ""
    headers: str = ""
    body: str = ""

class MemoryConfig(BaseModel):
    memory_type: str = "session"
    ttl_minutes: int = 60

class ConditionConfig(BaseModel):
    expression: str = ""

class AgentConfig(BaseModel):
    name: str = "Unnamed Agent"
    system_prompt: str
    tools: List[str] = []
    max_iterations: int = 5
    knowledge_sources: Optional[List[KnowledgeSource]] = []
    output_format: Optional[OutputFormat] = None
    api_integrations: Optional[List[ApiIntegration]] = []
    memory_config: Optional[MemoryConfig] = None
    conditions: Optional[List[ConditionConfig]] = []

class StreamRequest(BaseModel):
    agent_id: Optional[str] = None
    message: str
    session_id: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    max_iterations: Optional[int] = 5
    mock: Optional[bool] = False
    output_format: Optional[OutputFormat] = None
    knowledge_sources: Optional[List[KnowledgeSource]] = []
    api_integrations: Optional[List[ApiIntegration]] = []
    memory_config: Optional[MemoryConfig] = None
    conditions: Optional[List[ConditionConfig]] = []


# ─── AGENT CRUD ───

@app.post("/api/agents")
async def create_agent(config: AgentConfig):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    response = supabase.table("agents").insert({
        "name": config.name,
        "system_prompt": config.system_prompt,
        "tools": config.tools,
        "max_iterations": config.max_iterations,
        "knowledge_sources": [ks.dict() for ks in (config.knowledge_sources or [])],
        "output_format": config.output_format.dict() if config.output_format else None,
        "api_integrations": [ai.dict() for ai in (config.api_integrations or [])],
        "memory_config": config.memory_config.dict() if config.memory_config else None,
        "conditions": [c.dict() for c in (config.conditions or [])],
    }).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create agent")
        
    return {"agent_id": response.data[0]["id"]}


@app.get("/api/agents")
async def list_agents():
    """List all created agents."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    response = supabase.table("agents").select("*").execute()
    
    agents = response.data or []
    agents.reverse()  # Newest agents first
    return {"agents": agents}


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent by ID."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    # First delete related sessions and messages
    sessions = supabase.table("sessions").select("id").eq("agent_id", agent_id).execute()
    if sessions.data:
        for session in sessions.data:
            supabase.table("messages").delete().eq("session_id", session["id"]).execute()
        supabase.table("sessions").delete().eq("agent_id", agent_id).execute()
    
    # Delete the agent
    response = supabase.table("agents").delete().eq("id", agent_id).execute()
    
    return {"status": "deleted", "agent_id": agent_id}


@app.get("/api/agents/{agent_id}/stats")
async def agent_stats(agent_id: str):
    """Get analytics for a specific agent: conversations, messages, tool usage."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    # Verify agent exists
    agent_res = supabase.table("agents").select("*").eq("id", agent_id).execute()
    if not agent_res.data:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = agent_res.data[0]
    
    # Get sessions for this agent
    sessions_res = supabase.table("sessions").select("*").eq("agent_id", agent_id).execute()
    sessions = sessions_res.data or []
    total_sessions = len(sessions)
    
    # Get all messages across all sessions
    total_messages = 0
    tool_usage: dict = {}
    recent_conversations = []
    
    for session in sessions:
        msgs_res = supabase.table("messages").select("*").eq("session_id", session["id"]).execute()
        msgs = msgs_res.data or []
        total_messages += len(msgs)
        
        # Extract tool usage from assistant messages
        for msg in msgs:
            content = msg.get("content", "")
            if msg.get("role") == "assistant":
                # Count tool mentions in responses
                for tool_name in ["web_search", "calculator", "call_api"]:
                    if tool_name in content.lower():
                        tool_usage[tool_name] = tool_usage.get(tool_name, 0) + 1
        
        # Build recent conversation preview
        user_msgs = [m for m in msgs if m.get("role") == "user"]
        assistant_msgs = [m for m in msgs if m.get("role") == "assistant"]
        if user_msgs:
            recent_conversations.append({
                "session_id": session["id"],
                "first_message": user_msgs[0].get("content", "")[:100],
                "message_count": len(msgs),
                "created_at": session.get("created_at", ""),
            })
    
    # Sort recent conversations by date (newest first)
    recent_conversations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "agent": {
            "id": agent["id"],
            "name": agent.get("name", "Unnamed"),
            "system_prompt": agent.get("system_prompt", "")[:200],
            "tools": agent.get("tools", []),
        },
        "stats": {
            "total_conversations": total_sessions,
            "total_messages": total_messages,
            "avg_messages_per_conversation": round(total_messages / max(total_sessions, 1), 1),
            "tool_usage": tool_usage,
        },
        "recent_conversations": recent_conversations[:10],
    }


@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    """Get all messages for a session (for conversation history)."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    msgs_res = supabase.table("messages").select("*").eq("session_id", session_id).order("created_at").execute()
    
    return {"messages": msgs_res.data or []}


# ─── CHAT STREAMING ───

async def sse_generator_wrapper(generator, session_id: Optional[str]):
    """Wraps the execute_agent generator to intercept the final message and save it."""
    final_message = ""
    async for chunk in generator:
        yield chunk
        try:
            if chunk.startswith("data: "):
                event_data = json.loads(chunk[6:].strip())
                if event_data.get("type") == "message":
                    final_message = event_data.get("content", "")
        except Exception:
            pass
            
    if final_message and supabase and session_id:
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": final_message
        }).execute()

async def mock_generator(user_message: str):
    """Презентаційний Demo Mode: повний ReAct цикл з конкурентним аналізом."""
    async for chunk in execute_demo(user_message):
        yield chunk


@app.post("/api/chat/stream")
async def chat_stream(request: StreamRequest):
    # Demo Mode — manual flag OR auto-detect demo prompt
    if request.mock or should_use_demo(request.message):
        return StreamingResponse(
            mock_generator(request.message),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    if request.agent_id:
        if not supabase:
            raise HTTPException(status_code=500, detail="Supabase client not initialized")
            
        # 1. Fetch agent config
        response = supabase.table("agents").select("*").eq("id", request.agent_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = response.data[0]
        system_prompt = agent.get("system_prompt", "")
        tools_config = agent.get("tools", [])
        max_iterations = agent.get("max_iterations", 5)
        output_format_data = agent.get("output_format", None)
        knowledge_sources_data = agent.get("knowledge_sources", [])
        api_integrations_data = agent.get("api_integrations", [])
        memory_config_data = agent.get("memory_config", None)
        conditions_data = agent.get("conditions", [])
        
        # 2. Handle session
        session_id = request.session_id
        is_new_session = False
        if not session_id:
            response = supabase.table("sessions").insert({"agent_id": request.agent_id}).execute()
            session_id = response.data[0]["id"]
            is_new_session = True
            
        # 3. Save user message
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": request.message
        }).execute()

        # 4. Fetch conversation history when memory is enabled
        conversation_history = None
        if memory_config_data and session_id and not is_new_session:
            try:
                hist_resp = supabase.table("messages").select("role, content").eq("session_id", session_id).order("created_at", desc=False).limit(20).execute()
                if hist_resp.data and len(hist_resp.data) > 1:
                    conversation_history = hist_resp.data[:-1]  # Exclude the message we just inserted
            except Exception:
                pass  # Non-critical, continue without history
    else:
        # Direct mode (no DB, from builder preview)
        system_prompt = request.system_prompt or ""
        tools_config = request.tools or []
        max_iterations = request.max_iterations or 5
        output_format_data = request.output_format.dict() if request.output_format else None
        knowledge_sources_data = [ks.dict() for ks in (request.knowledge_sources or [])]
        api_integrations_data = [ai.dict() for ai in (request.api_integrations or [])]
        memory_config_data = request.memory_config.dict() if request.memory_config else None
        conditions_data = [c.dict() for c in (request.conditions or [])]
        session_id = None
        is_new_session = False
        conversation_history = None
    
    # 4. Generate response
    generator = execute_agent(
        system_prompt=system_prompt,
        tools_config=tools_config,
        max_iterations=max_iterations,
        user_message=request.message,
        output_format=output_format_data,
        knowledge_sources=knowledge_sources_data if knowledge_sources_data else None,
        api_integrations=api_integrations_data if api_integrations_data else None,
        memory_config=memory_config_data,
        conditions=conditions_data if conditions_data else None,
        conversation_history=conversation_history,
    )
    
    async def final_generator():
        if is_new_session:
            yield f"data: {json.dumps({'type': 'session_created', 'session_id': session_id})}\n\n"
        
        async for chunk in sse_generator_wrapper(generator, session_id):
            yield chunk

    return StreamingResponse(
        final_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

# ─── WORKFLOW STREAMING ───

class WorkflowStep(BaseModel):
    step_id: str = ""
    label: str = "Step"
    system_prompt: str = ""
    tools: List[str] = []
    max_iterations: int = 5
    knowledge_sources: Optional[List[KnowledgeSource]] = []
    output_format: Optional[OutputFormat] = None
    api_integrations: Optional[List[ApiIntegration]] = []
    memory_config: Optional[MemoryConfig] = None
    conditions: Optional[List[ConditionConfig]] = []

class WorkflowRequest(BaseModel):
    steps: List[WorkflowStep]
    message: str


@app.post("/api/workflow/stream")
async def workflow_stream(request: WorkflowRequest):
    """Execute a multi-step workflow sequentially."""
    # Convert Pydantic models to dicts for the workflow executor
    steps_dicts = []
    for step in request.steps:
        steps_dicts.append({
            "step_id": step.step_id,
            "label": step.label,
            "system_prompt": step.system_prompt,
            "tools": step.tools,
            "max_iterations": step.max_iterations,
            "knowledge_sources": [ks.dict() for ks in (step.knowledge_sources or [])] or None,
            "output_format": step.output_format.dict() if step.output_format else None,
            "api_integrations": [ai.dict() for ai in (step.api_integrations or [])] or None,
            "memory_config": step.memory_config.dict() if step.memory_config else None,
            "conditions": [c.dict() for c in (step.conditions or [])] or None,
        })

    generator = execute_workflow(
        steps=steps_dicts,
        user_message=request.message,
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}
