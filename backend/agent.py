"""
OpenAI integration with LangGraph example.
This demonstrates how to use the OpenAI API with LangGraph for building conversational AI.
"""

import os
from io import BytesIO
from dotenv import load_dotenv
from typing import Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.runnables.graph import MermaidDrawMethod
from pydantic import BaseModel, Field
from typing_extensions import Annotated, TypedDict
from langchain_openai import ChatOpenAI

# Load environment variables
load_dotenv()

def get_openai_llm():
    """Initialize the OpenAI client."""
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.7,
        max_tokens=1000,
    )

llm = get_openai_llm()

# Structured output for message classification
class MessageClassifier(BaseModel):
    message_type: Literal["cardiologist", "dentist", "general"] = Field(
        ..., 
        description="Classify if the message is related to cardiology (heart issues), dentistry (teeth) or a general issue."
    )

class State(TypedDict):
    """State schema for the conversation graph."""
    messages: Annotated[list, add_messages]
    message_type: str|None

def classify_message(state: State):
    last_message = state["messages"][-1]
    classifier_llm = llm.with_structured_output(MessageClassifier)

    result = classifier_llm.invoke([
        {
            "role": "system", 
            "content": """
                            Classify the user's message into one of the following categories that is most approrpirate to handle the issue:
                            - cardiologist, 
                            - dentist,
                            - general 
                        """
        },
        {
            "role": "user", 
            "content": last_message.content
        }
    ])

    return {"message_type": result.message_type}

def cardilogist_agent(state: State):
    last_message = state["messages"][-1]
    mesages = [
        {
            "role": "system", 
            "content": """
                            You are a cardilogist agent that deal with all heart related issues.."
                            should only respond to issues relates to heart problems. 
                        """
        },
        {
            "role": "user", 
            "content": last_message.content
        }
    ]

    reply = llm.invoke(mesages)
    return {
        "messages": [
            {
                "role": "assistant",
                "content": "Your request was routed to Cardiologist Agent\n\n" + reply.content,
            }
        ]
    }

def general_agent(state: State):
    last_message = state["messages"][-1]
    mesages = [
        {
            "role": "system", 
            "content": """
                            You are a general agent that handle general health related issues that are not specific to any medical specialist.
                        """
        },
        {
            "role": "user", 
            "content": last_message.content
        }
    ]

    reply = llm.invoke(mesages)
    return {
        "messages": [
            {
                "role": "assistant",
                "content": "Your request was routed to General Health Agent\n\n" + reply.content,
            }
        ]
    }

def dentist_agent(state: State):
    last_message = state["messages"][-1]
    mesages = [
        {
            "role": "system", 
            "content": """
                            You are a dentist agent that deal with all teeth and oral health related issues.
                            should only respond to issues relates to dental problems. 
                        """
        },
        {
            "role": "user", 
            "content": last_message.content
        }
    ]

    reply = llm.invoke(mesages)
    return {
        "messages": [
            {
                "role": "assistant",
                "content": "Your request was routed to Dentist Agent\n\n" + reply.content,
            }
        ]
    }

def should_end(state: State):
    """Determine if the conversation should end."""
    return state.get("message_type") is not None

def build_graph():
    """Build and compile the LangGraph agent."""
    builder = StateGraph(State)
    
    # Add nodes
    builder.add_node("classifier", classify_message)
    builder.add_node("cardiologist", cardilogist_agent)
    builder.add_node("general", general_agent)
    builder.add_node("dentist", dentist_agent)
    
    # Add edges
    builder.add_edge(START, "classifier")
    
    # Conditional routing based on message_type
    builder.add_conditional_edges(
        "classifier",
        lambda state: state.get("message_type", "general"),
        {
            "cardiologist": "cardiologist",
            "dentist": "dentist",
            "general": "general",
        }
    )
    
    # All agents route to END
    builder.add_edge("cardiologist", END)
    builder.add_edge("dentist", END)
    builder.add_edge("general", END)
    
    return builder.compile()

# Initialize the graph
graph = build_graph()
