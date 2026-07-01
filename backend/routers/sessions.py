from fastapi import APIRouter, HTTPException

from backend.agents.graph import resume_approved_session
from backend.models.events import AgentEvent
from backend.models.schemas import SessionState, SessionStatus
from backend.session_store import session_store

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/{session_id}", response_model=SessionState)
async def get_session(session_id: str) -> SessionState:
    session = await session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/approve", response_model=SessionState)
async def approve_session(session_id: str) -> SessionState:
    session = await session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != SessionStatus.AWAITING_APPROVAL:
        raise HTTPException(status_code=409, detail=f"Session is {session.status}, not awaiting approval")

    await session_store.publish(
        AgentEvent(type="executing_step", session_id=session_id, payload={"step_index": 0, "description": "Approved plan entering executor"})
    )
    session = await resume_approved_session(session)
    return session


@router.post("/{session_id}/reject", response_model=SessionState)
async def reject_session(session_id: str) -> SessionState:
    session = await session_store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.REJECTED
    await session_store.save(session)
    await session_store.publish(
        AgentEvent(type="session_complete", session_id=session_id, payload={"status": session.status.value})
    )
    return session
