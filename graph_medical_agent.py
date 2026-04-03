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
import gradio as gr
from PIL import Image

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
    # topic: str
    # audience: Literal["children", "teenagers", "adults", "seniors"]
    # length: Literal["short", "medium", "long"]

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
                            You are a general agent that deal with headache, fever and pain related issues.."
                            should only respond to issues relates to general problems. 
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
                "content": "Your request was routed to General Agent\n\n" + reply.content,
            }
        ]
    }

def dentist_agent(state: State):
    last_message = state["messages"][-1]
    mesages = [
        {
            "role": "system", 
            "content": """
                            You are a dentist agent that deal with all teeth related issues.."
                            should only respond to issues relates to teeth problems. 
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

def router(state: State):
    message_type = state.get("message_type","general")

    if message_type == "cardiologist":
        return {"next":"cardiologist"}
    elif message_type == "dentist":
        return {"next":"dentist"}
    else:
        return {"next":"general"}

# Create the state graph
graph_builder = StateGraph(State)

#Build the graph flow
graph_builder.add_node("classifier", classify_message)
graph_builder.add_node("router", router)
graph_builder.add_node("cardiologist", cardilogist_agent)
graph_builder.add_node("dentist", dentist_agent)    
graph_builder.add_node("general", general_agent)

graph_builder.add_edge(START, "classifier")
graph_builder.add_edge("classifier", "router")

graph_builder.add_conditional_edges(
    "router",
    lambda state: state.get("next"),
    {
        "cardiologist": "cardiologist",
        "dentist": "dentist",
        "general": "general"
    }
)

graph_builder.add_edge("cardiologist", END)
graph_builder.add_edge("dentist", END)
graph_builder.add_edge("general", END)

# Compile the graph
graph = graph_builder.compile()


def get_mermaid_diagram_text() -> str:
        """Return LangGraph routing flow as Mermaid text."""
        return graph.get_graph().draw_mermaid()


def get_mermaid_diagram_image() -> Image.Image | None:
        """Render Mermaid diagram to PNG using LangGraph's API renderer."""
        try:
            png_bytes = graph.get_graph().draw_mermaid_png(
                draw_method=MermaidDrawMethod.API
            )
            return Image.open(BytesIO(png_bytes))
        except Exception:
            return None

def run_chatbot():
    state = {"messages": [], "message_type": None}

    while True:
        user_input = input("Message: ")
        if user_input == "exit":
            print("Bye")
            break

        state["messages"] = state.get("messages", []) + [
            {"role": "user", "content": user_input}
        ]

        state = graph.invoke(state)

        if state.get("messages") and len(state["messages"]) > 0:
            last_message = state["messages"][-1]
            print(f"Assistant: {last_message.content}")

def chat(message, history):
    state = {"messages": [], "message_type": None}

    # Reconstruct state from Gradio 6 history (list of {"role": ..., "content": ...} dicts)
    for msg in history:
        state["messages"].append({"role": msg["role"], "content": msg["content"]})

    state["messages"].append({"role": "user", "content": message})

    state = graph.invoke(state)

    last_message = state["messages"][-1]
    return last_message.content


def launch_ui():
    theme = gr.themes.Soft(
        primary_hue="blue",
        secondary_hue="slate",
        neutral_hue="slate",
        font=[gr.themes.GoogleFont("Inter"), "ui-sans-serif", "sans-serif"],
    )

    custom_css = """
    #response_window {
        background: #eaf4ff;
        border: 1px solid #bfdcff;
        border-radius: 12px;
    }

    #question_box,
    #question_box textarea,
    #question_box input {
        background: #0b2f6b !important;
        color: #ffffff !important;
        border: 1px solid #0b2f6b !important;
    }

    #question_box textarea::placeholder,
    #question_box input::placeholder {
        color: #d9e8ff !important;
    }

    #response_window .message.user,
    #response_window .message.user .message-content,
    #response_window .message.user .message-content * {
        background: #0b2f6b !important;
        color: #ffffff !important;
    }

    #response_window .message.user {
        border: 1px solid #0b2f6b !important;
        border-radius: 12px !important;
    }
    """

    with gr.Blocks(title="Medical Assistant") as demo:
        gr.Markdown(
            """
            # 🏥 Medical Assistant
            **AI-powered triage for cardiology, dental, and general health concerns.**
            
            Describe your symptoms and you will be connected with the appropriate specialist agent.
            """
        )

        with gr.Accordion("View Routing Diagram", open=False):
            diagram_image = get_mermaid_diagram_image()
            if diagram_image is not None:
                gr.Image(
                    value=diagram_image,
                    label="LangGraph Routing Diagram",
                    interactive=False,
                )
            else:
                gr.Markdown(
                    """
                    Diagram preview is temporarily unavailable.

                    Mermaid source:
                    ```mermaid
                    """
                    + get_mermaid_diagram_text()
                    + """
                    ```
                    """
                )

        gr.ChatInterface(
            fn=chat,
            chatbot=gr.Chatbot(elem_id="response_window"),
            textbox=gr.Textbox(
                elem_id="question_box",
                placeholder="Type your question here...",
                lines=1,
                max_lines=1,
                container=False,
            ),
            examples=[
                "I have chest pain and shortness of breath.",
                "My tooth has been hurting for 3 days.",
                "I have a fever and headache.",
            ],
        )

        gr.Markdown(
            """
            ---
            <center><sub>This tool is for demonstration purposes only and does not constitute medical advice.</sub></center>
            """
        )

    demo.launch(theme=theme, css=custom_css)


if __name__ == "__main__":
    launch_ui()