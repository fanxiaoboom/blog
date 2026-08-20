"""Smallest useful LangGraph + local Ollama example.

Run with: uv run python app.py "用一句话解释 LangGraph"
"""

import os
import sys
from typing import Annotated

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_ollama import ChatOllama
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


model = ChatOllama(
    model=os.getenv("OLLAMA_MODEL", "qwen3:4b"),
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    temperature=0.2,
)


def call_model(state: ChatState) -> dict[str, list[BaseMessage]]:
    """Send the accumulated conversation to the local model."""
    return {"messages": [model.invoke(state["messages"])]}


workflow = StateGraph(ChatState)
workflow.add_node("model", call_model)
workflow.add_edge(START, "model")
workflow.add_edge("model", END)
graph = workflow.compile()


if __name__ == "__main__":
    prompt = " ".join(sys.argv[1:]) or "你好，请介绍一下你自己。"
    result = graph.invoke({"messages": [HumanMessage(content=prompt)]})
    print(result["messages"][-1].content)
