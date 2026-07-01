from __future__ import annotations

import asyncio

from backend.models.events import AgentEvent
from backend.models.schemas import SessionState, SessionStatus


class SessionStore:
    """Small in-memory store for early local development."""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._queues: dict[str, list[asyncio.Queue[AgentEvent]]] = {}
        self._lock = asyncio.Lock()

    async def create(self, intent: str, session_id: str | None = None) -> SessionState:
        async with self._lock:
            session = SessionState(intent=intent)
            if session_id is not None:
                session.session_id = session_id
            session.status = SessionStatus.PLANNING
            session.touch()
            self._sessions[session.session_id] = session
            self._queues.setdefault(session.session_id, [])
            return session

    async def get(self, session_id: str) -> SessionState | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def save(self, session: SessionState) -> None:
        async with self._lock:
            session.touch()
            self._sessions[session.session_id] = session
            self._queues.setdefault(session.session_id, [])

    async def set_status(self, session_id: str, status: SessionStatus) -> SessionState | None:
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            session.status = status
            session.touch()
            return session

    async def subscribe(self, session_id: str) -> asyncio.Queue[AgentEvent]:
        queue: asyncio.Queue[AgentEvent] = asyncio.Queue()
        async with self._lock:
            self._queues.setdefault(session_id, []).append(queue)
        return queue

    async def unsubscribe(self, session_id: str, queue: asyncio.Queue[AgentEvent]) -> None:
        async with self._lock:
            queues = self._queues.get(session_id, [])
            if queue in queues:
                queues.remove(queue)

    async def publish(self, event: AgentEvent) -> None:
        async with self._lock:
            queues = list(self._queues.get(event.session_id, []))
        for queue in queues:
            await queue.put(event)


session_store = SessionStore()

