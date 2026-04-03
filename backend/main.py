"""
FastAPI server for the LangGraph medical agent.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv
from agent import graph

# Load environment variables
load_dotenv()

app = FastAPI(title="Medical Agent API")

# Enable CORS for Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message: str

class MessageResponse(BaseModel):
    response: str
    message_type: str | None

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/chat")
def chat(request: MessageRequest) -> MessageResponse:
    """
    Process a user message through the medical agent.
    
    Args:
        request: MessageRequest containing the user's message
        
    Returns:
        MessageResponse with the agent's response and classified message type
    """
    try:
        # Initialize state with the user message
        initial_state = {
            "messages": [
                {"role": "user", "content": request.message}
            ],
            "message_type": None
        }
        
        # Run the graph
        result = graph.invoke(initial_state)
        
        # Extract the response from the last message
        # LangGraph returns AIMessage objects, not plain dicts
        last_message = result["messages"][-1]
        response_text = last_message.content if hasattr(last_message, "content") else last_message.get("content", "No response")
        
        return MessageResponse(
            response=response_text,
            message_type=result.get("message_type")
        )
    except Exception as e:
        return MessageResponse(
            response=f"Error processing message: {str(e)}",
            message_type=None
        )

@app.post("/chat/stream")
async def chat_stream(request: MessageRequest):
    """
    Stream a response from the medical agent using Server-Sent Events.
    Events: {type: 'message_type', value: str} | {type: 'token', value: str} | {type: 'done'} | {type: 'error', value: str}
    """
    async def generate():
        try:
            initial_state = {
                "messages": [{"role": "user", "content": request.message}],
                "message_type": None,
            }

            message_type_sent = False

            async for event in graph.astream_events(initial_state, version="v2"):
                event_type = event.get("event")
                node = event.get("metadata", {}).get("langgraph_node", "")

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
