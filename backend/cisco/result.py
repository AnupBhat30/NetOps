from typing import Any

from pydantic import BaseModel, Field


class ToolResult(BaseModel):
    ok: bool
    operation: str
    data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None

    @classmethod
    def success(cls, operation: str, data: dict[str, Any] | None = None) -> "ToolResult":
        return cls(ok=True, operation=operation, data=data or {})

    @classmethod
    def failure(cls, operation: str, error: str, data: dict[str, Any] | None = None) -> "ToolResult":
        return cls(ok=False, operation=operation, data=data or {}, error=error)

