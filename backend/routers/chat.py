from fastapi import APIRouter

from backend.agents.graph import start_agent_session
from backend.models.schemas import ChatRequest, ChatResponse
from backend.session_store import session_store

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def create_chat_session(request: ChatRequest) -> ChatResponse:
    session = await session_store.create(intent=request.intent, session_id=request.session_id)
    session = await start_agent_session(session)
    return ChatResponse(session_id=session.session_id, status=session.status)

