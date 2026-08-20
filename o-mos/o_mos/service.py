"""Shared local-model helpers used by the CLI and HTTP API."""

import os
from collections.abc import Iterable, Iterator

from langchain_core.messages import BaseMessage, SystemMessage
from langchain_ollama import ChatOllama

from o_mos.config import DEFAULT_MODEL, MAX_HISTORY_MESSAGES, SYSTEM_PROMPT


def content_to_text(content: object) -> str:
    """Convert LangChain's possible message content shapes into plain text."""
    if isinstance(content, str):
        return content
    if isinstance(content, Iterable):
        return "".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )
    return str(content)


def final_answer(text: str) -> str:
    """Hide Qwen's optional ``<think>`` trace when a model emits it as content."""
    marker = "</think>"
    return text.rsplit(marker, maxsplit=1)[-1].strip() if marker in text else text.strip()


def visible_stream(chunks: Iterable[object]) -> Iterator[str]:
    """Yield only final answer text, withholding an optional Qwen thinking trace.

    Some Qwen3 builds emit a thought trace without the opening ``<think>`` token.
    Buffering until the closing token prevents that private trace from reaching a CLI
    or browser. Models that do not emit the token still return their full answer.
    """
    buffered = ""
    showing_answer = False

    for chunk in chunks:
        text = content_to_text(getattr(chunk, "content", ""))
        if not text:
            continue
        if showing_answer:
            yield text
            continue

        buffered += text
        if "</think>" not in buffered:
            continue

        showing_answer = True
        answer_start = buffered.rsplit("</think>", maxsplit=1)[-1].lstrip()
        buffered = ""
        if answer_start:
            yield answer_start

    if not showing_answer and buffered:
        yield buffered


def create_model() -> ChatOllama:
    """Create the shared client for the Ollama service running on this Mac."""
    return ChatOllama(
        model=os.getenv("OLLAMA_MODEL", DEFAULT_MODEL),
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=0.4,
        reasoning=False,
    )


def create_conversation() -> list[BaseMessage]:
    """Start one in-memory conversation with the o-mos system prompt."""
    return [SystemMessage(content=SYSTEM_PROMPT)]


def trim_history(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Keep the system prompt and only the most recent conversation turns."""
    return [messages[0], *messages[-MAX_HISTORY_MESSAGES:]]
