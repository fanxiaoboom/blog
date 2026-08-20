"""HTTP API for serving o-mos to a browser or another application."""

import json
import os
import secrets
import threading
import urllib.error
import urllib.request
from collections.abc import Iterator
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from pydantic import BaseModel, Field

from o_mos.config import DEFAULT_MODEL
from o_mos.service import (
    content_to_text,
    create_conversation,
    create_model,
    final_answer,
    trim_history,
    visible_stream,
)

APP_TITLE = "o-mos API"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
MODEL_NAME = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
DEFAULT_ORIGINS = "http://localhost:3000,http://localhost:3001,http://localhost:5173"


class ChatRequest(BaseModel):
    """One user message and its optional short-lived conversation id."""

    message: str = Field(min_length=1, max_length=8_000)
    session_id: str | None = Field(default=None, max_length=100)


class ChatResponse(BaseModel):
    session_id: str
    answer: str


class SessionResponse(BaseModel):
    session_id: str
    message: str


class HealthResponse(BaseModel):
    status: str
    model: str
    ollama: str


sessions: dict[str, list[BaseMessage]] = {}
sessions_lock = threading.Lock()
model = create_model()

app = FastAPI(title=APP_TITLE, version="0.1.0")
allowed_origins = [
    origin.strip()
    for origin in os.getenv("OMOS_ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    expose_headers=["X-Omos-Session-Id"],
)


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """Reject all API requests that do not carry the configured Bearer key."""
    expected_key = os.getenv("OMOS_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=503, detail="O-mos API authentication is not configured.")

    scheme, _, supplied_key = (authorization or "").partition(" ")
    if (
        scheme.lower() != "bearer"
        or not supplied_key
        or not secrets.compare_digest(supplied_key, expected_key)
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_session(session_id: str | None) -> tuple[str, list[BaseMessage]]:
    """Return an existing memory buffer or create a fresh browser conversation."""
    resolved_id = session_id or uuid4().hex
    with sessions_lock:
        messages = sessions.setdefault(resolved_id, create_conversation())
    return resolved_id, messages


def forget_user_message(session_id: str) -> None:
    """Remove the unfinished turn so a failed request does not pollute memory."""
    with sessions_lock:
        messages = sessions.get(session_id)
        if messages and isinstance(messages[-1], HumanMessage):
            messages.pop()


def remember_answer(session_id: str, answer: str) -> None:
    """Persist the completed turn in the short-lived in-memory session."""
    with sessions_lock:
        messages = sessions.get(session_id)
        if messages is None:
            return
        messages.append(AIMessage(content=answer))
        sessions[session_id] = trim_history(messages)


def sse(event: str, payload: dict[str, str]) -> str:
    """Encode a minimal Server-Sent Event without relying on another service."""
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.get("/health", response_model=HealthResponse, dependencies=[Depends(require_api_key)])
def health() -> HealthResponse:
    """Check that the API process and its configured Ollama service are reachable."""
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE_URL}/api/tags", timeout=2):
            pass
    except (urllib.error.URLError, TimeoutError):
        return HealthResponse(status="degraded", model=MODEL_NAME, ollama="unreachable")
    return HealthResponse(status="ok", model=MODEL_NAME, ollama="reachable")


@app.post("/api/chat", response_model=ChatResponse, dependencies=[Depends(require_api_key)])
def chat(request: ChatRequest) -> ChatResponse:
    """Return a complete o-mos answer; useful for simple HTTP clients."""
    session_id, messages = get_session(request.session_id)
    messages.append(HumanMessage(content=request.message.strip()))
    try:
        answer = final_answer(content_to_text(model.invoke(messages).content))
    except Exception as error:
        forget_user_message(session_id)
        raise HTTPException(status_code=503, detail=f"Ollama 调用失败：{error}") from error
    remember_answer(session_id, answer)
    return ChatResponse(session_id=session_id, answer=answer)


@app.post("/api/chat/stream", dependencies=[Depends(require_api_key)])
def stream_chat(request: ChatRequest) -> StreamingResponse:
    """Stream answer tokens as SSE for a responsive browser chat experience."""
    session_id, messages = get_session(request.session_id)
    messages.append(HumanMessage(content=request.message.strip()))

    def generate() -> Iterator[str]:
        answer_parts: list[str] = []
        try:
            for text in visible_stream(model.stream(messages)):
                answer_parts.append(text)
                yield sse("token", {"text": text})
        except Exception as error:
            forget_user_message(session_id)
            yield sse("error", {"message": f"Ollama 调用失败：{error}"})
            return

        answer = "".join(answer_parts)
        remember_answer(session_id, answer)
        yield sse("done", {"session_id": session_id})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Omos-Session-Id": session_id,
        },
    )


@app.post(
    "/api/sessions/{session_id}/reset",
    response_model=SessionResponse,
    dependencies=[Depends(require_api_key)],
)
def reset_session(session_id: str) -> SessionResponse:
    """Clear the API's short-term conversation memory for one browser session."""
    with sessions_lock:
        sessions[session_id] = create_conversation()
    return SessionResponse(session_id=session_id, message="已清空本次会话记忆。")


@app.get(
    "/api/sessions/{session_id}",
    response_model=SessionResponse,
    dependencies=[Depends(require_api_key)],
)
def session_status(session_id: str) -> SessionResponse:
    """Expose a small session probe for local integration debugging."""
    with sessions_lock:
        exists = session_id in sessions
    if not exists:
        raise HTTPException(status_code=404, detail="会话不存在或已过期。")
    return SessionResponse(session_id=session_id, message="会话有效。")


@app.options("/api/chat")
def chat_options() -> Response:
    """Make the API intent obvious in generated documentation."""
    return Response(status_code=204)


def main() -> None:
    """Run the local API with the project command: ``uv run o-mos-api``."""
    import uvicorn

    uvicorn.run(
        "o_mos.api:app",
        host=os.getenv("OMOS_HOST", "127.0.0.1"),
        port=int(os.getenv("OMOS_PORT", "8000")),
        reload=False,
    )
