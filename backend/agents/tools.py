from collections.abc import Callable
import re
from typing import Any

from backend.cisco.netmiko_tools import (
    configure_acl,
    configure_interface,
    configure_ospf,
    configure_static_route,
    get_running_config,
    rollback_config,
    show_command,
)
from backend.cisco.result import ToolResult
from backend.cisco.restconf_tools import restconf_get, restconf_get_interfaces, restconf_get_routing
from backend.llm import generate_advisory_answer

ToolCallable = Callable[..., ToolResult]

SENSITIVE_KEY_PATTERN = re.compile(r"[rs]?sk-proj-[A-Za-z0-9_-]+|[rs]?sk-[A-Za-z0-9_-]+")


def answer_question(question: str, topic: str = "capabilities") -> ToolResult:
    answer = generate_advisory_answer(question)
    return ToolResult.success("answer_question", {"answer": answer, "topic": topic})


TOOL_REGISTRY: dict[str, ToolCallable] = {
    "answer_question": answer_question,
    "show_command": show_command,
    "get_running_config": get_running_config,
    "configure_ospf": configure_ospf,
    "configure_static_route": configure_static_route,
    "configure_interface": configure_interface,
    "configure_acl": configure_acl,
    "rollback_config": rollback_config,
    "restconf_get": restconf_get,
    "restconf_get_interfaces": restconf_get_interfaces,
    "restconf_get_routing": restconf_get_routing,
}


def call_tool(tool_name: str, params: dict[str, Any], approved: bool = False) -> ToolResult:
    tool = TOOL_REGISTRY.get(tool_name)
    if tool is None:
        return ToolResult.failure(tool_name, "Unknown tool")

    call_params = dict(params)
    if tool_name.startswith("configure_") or tool_name == "rollback_config":
        call_params["approved"] = approved

    try:
        return tool(**call_params)
    except TypeError as exc:
        return ToolResult.failure(tool_name, f"Invalid tool parameters: {exc}", {"params": params})
    except Exception as exc:
        return ToolResult.failure(tool_name, _safe_error(str(exc)), {"params": params})


def _safe_error(message: str) -> str:
    return SENSITIVE_KEY_PATTERN.sub("[redacted-api-key]", message)
