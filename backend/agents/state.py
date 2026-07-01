from typing import Any, NotRequired, TypedDict


class AgentState(TypedDict):
    session_id: str
    user_intent: str
    plan: list[dict[str, Any]]
    human_approved: bool
    execution_results: list[dict[str, Any]]
    validation_result: NotRequired[str | None]
    status: str
    device_snapshot_before: NotRequired[str | None]
    device_snapshot_after: NotRequired[str | None]

