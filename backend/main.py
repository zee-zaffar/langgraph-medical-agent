"""
FastAPI server for the LangGraph medical agent.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
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
        last_message = result["messages"][-1]
        response_text = last_message.get("content", "No response")
        
        return MessageResponse(
            response=response_text,
            message_type=result.get("message_type")
        )
    except Exception as e:
        return MessageResponse(
            response=f"Error processing message: {str(e)}",
            message_type=None
        )

@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": "Medical Agent API",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "chat": "/chat (POST)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
