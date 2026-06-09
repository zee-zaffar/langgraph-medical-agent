"""
FastAPI server for the LangGraph medical agent.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import uuid
import json
from dotenv import load_dotenv
from agent import build_graph

# Load environment variables
load_dotenv()

# Module-level graph; replaced with checkpointed version on startup when DATABASE_URL is set
graph = build_graph()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global graph
    db_url = os.getenv("DATABASE_URL", "")
    pool = None
    if db_url:
        try:
            from urllib.parse import urlparse
            from psycopg_pool import AsyncConnectionPool
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

            # Parse the URL and build an explicit DSN to avoid libpq URI-parsing issues
            parsed = urlparse(db_url)
            dsn = (
                f"host={parsed.hostname} "
                f"port={parsed.port or 5432} "
                f"user={parsed.username} "
                f"password={parsed.password} "
                f"dbname={parsed.path.lstrip('/')} "
                f"sslmode=disable"
            )
            pool = AsyncConnectionPool(conninfo=dsn, open=False, kwargs={"autocommit": True})
            await pool.open()
            checkpointer = AsyncPostgresSaver(pool)
            await checkpointer.setup()
            graph = build_graph(checkpointer=checkpointer)
        except Exception as exc:
            print(f"WARNING: Could not connect to database ({exc}). Running without memory persistence.")
    yield
    if pool:
        await pool.close()

app = FastAPI(title="Medical Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Public API usage from browser: allow all origins and avoid credential constraints.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message: str
    thread_id: str | None = None  # Provide to persist conversation state across calls

class MessageResponse(BaseModel):
    response: str
    message_type: str | None
    thread_id: str

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/chat")
def chat(request: MessageRequest) -> MessageResponse:
    """
    Process a user message through the medical agent.
    Pass the same thread_id across requests to maintain conversation history.
    """
    thread_id = request.thread_id or str(uuid.uuid4())
    try:
        initial_state = {
            "messages": [
                {"role": "user", "content": request.message}
            ],
            "message_type": None
        }
        config = {"configurable": {"thread_id": thread_id}}

        result = graph.invoke(initial_state, config=config)

        last_message = result["messages"][-1]
        response_text = last_message.content if hasattr(last_message, "content") else last_message.get("content", "No response")

        return MessageResponse(
            response=response_text,
            message_type=result.get("message_type"),
            thread_id=thread_id,
        )
    except Exception as e:
        return MessageResponse(
            response=f"Error processing message: {str(e)}",
            message_type=None,
            thread_id=thread_id,
        )

@app.post("/chat/stream")
async def chat_stream(request: MessageRequest):
    """
    Stream a response from the medical agent using Server-Sent Events.
    Events: {type: 'message_type', value: str} | {type: 'token', value: str} | {type: 'done'} | {type: 'error', value: str}
    """
    thread_id = request.thread_id or str(uuid.uuid4())

    async def generate():
        try:
            initial_state = {
                "messages": [{"role": "user", "content": request.message}],
                "message_type": None,
            }
            config = {"configurable": {"thread_id": thread_id}}

            thread_id_sent = False
            message_type_sent = False

            async for event in graph.astream_events(initial_state, config=config, version="v2"):
                event_type = event.get("event")
                node = event.get("metadata", {}).get("langgraph_node", "")

                # Emit thread_id exactly once
                if not thread_id_sent:
                    yield f"data: {json.dumps({'type': 'thread_id', 'value': thread_id})}\n\n"
                    thread_id_sent = True

                # Detect specialist by watching which agent node starts
                if not message_type_sent and event_type == "on_chain_start" and node in ("cardiologist", "dentist", "general"):
                    yield f"data: {json.dumps({'type': 'message_type', 'value': node})}\n\n"
                    message_type_sent = True

                # Stream tokens from specialist agents only (not the classifier)
                elif event_type == "on_chat_model_stream" and node in ("cardiologist", "dentist", "general"):
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield f"data: {json.dumps({'type': 'token', 'value': chunk.content})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'value': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "Medical Agent API",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "chat": "/chat (POST)",
            "chat_stream": "/chat/stream (POST, SSE)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
