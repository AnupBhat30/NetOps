from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.models.schemas import ActionStep, SessionStatus


class AgentEvent(BaseModel):
    type: Literal[
        "plan_created",
        "approval_required",
        "executing_step",
        "step_result",
        "validation_started",
        "validation_result",
        "rollback_started",
        "rollback_complete",
        "session_complete",
        "error",
    ]
    session_id: str
    payload: dict[str, Any] = Field(default_factory=dict)


class PlanCreatedPayload(BaseModel):
    plan: list[ActionStep]


class SessionCompletePayload(BaseModel):
    status: SessionStatus

