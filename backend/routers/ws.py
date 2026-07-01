from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.session_store import session_store

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/agent/{session_id}")
async def agent_events(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    queue = await session_store.subscribe(session_id)
    try:
        session = await session_store.get(session_id)
        if session is not None:
            await websocket.send_json({"type": "session_complete", "session_id": session_id, "payload": {"status": session.status.value}})

        while True:
            event = await queue.get()
            await websocket.send_json(event.model_dump(mode="json"))
    except WebSocketDisconnect:
        await session_store.unsubscribe(session_id, queue)

