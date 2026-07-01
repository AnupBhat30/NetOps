from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class SessionStatus(StrEnum):
    CREATED = "created"
    PLANNING = "planning"
    AWAITING_APPROVAL = "awaiting_approval"
    REJECTED = "rejected"
    EXECUTING = "executing"
    VALIDATING = "validating"
    DONE = "done"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ActionStep(BaseModel):
    tool: str
    params: dict[str, Any] = Field(default_factory=dict)
    description: str
    write: bool = False


class StepResult(BaseModel):
    step_index: int
    tool: str
    ok: bool
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None


class ChatRequest(BaseModel):
    intent: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None


class ChatResponse(BaseModel):
    session_id: str
    status: SessionStatus


class InterfaceInfo(BaseModel):
    name: str
    ip_address: str | None = None
    status: str = "unknown"
    protocol: str = "unknown"


class RouteEntry(BaseModel):
    prefix: str
    protocol: str
    next_hop: str | None = None
    interface: str | None = None


class ACLInfo(BaseModel):
    name: str
    action: str
    source: str
    destination: str


class DeviceHealth(BaseModel):
    backend: str = "ok"
    llm: str = "not_configured"
    device: str = "not_checked"


class DeviceState(BaseModel):
    interfaces: list[InterfaceInfo] = Field(default_factory=list)
    routing_table: list[RouteEntry] = Field(default_factory=list)
    acls: list[ACLInfo] = Field(default_factory=list)
    health: DeviceHealth = Field(default_factory=DeviceHealth)


class SessionState(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    intent: str
    status: SessionStatus = SessionStatus.CREATED
    plan: list[ActionStep] = Field(default_factory=list)
    results: list[StepResult] = Field(default_factory=list)
    validation_result: str | None = None
    device_snapshot_before: str | None = None
    device_snapshot_after: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    def touch(self) -> None:
        self.updated_at = datetime.now(UTC)

