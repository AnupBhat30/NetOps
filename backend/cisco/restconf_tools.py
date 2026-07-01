from collections.abc import Callable
from typing import Any

from backend.cisco.connection import CiscoConnection, json_from_response
from backend.cisco.result import ToolResult

ConnectionFactory = Callable[[], CiscoConnection]


def restconf_get(endpoint: str, connection_factory: ConnectionFactory = CiscoConnection) -> ToolResult:
    operation = "restconf_get"
    try:
        with connection_factory() as connection:
            response = connection.restconf().get(connection.restconf_url(endpoint))
            status_code = getattr(response, "status_code", 200)
            if status_code >= 400:
                return ToolResult.failure(operation, f"RESTCONF GET failed with status {status_code}", {"endpoint": endpoint})
            return ToolResult.success(operation, {"endpoint": endpoint, "response": dict(json_from_response(response))})
    except Exception as exc:
        return ToolResult.failure(operation, str(exc), {"endpoint": endpoint})


def restconf_get_interfaces(connection_factory: ConnectionFactory = CiscoConnection) -> ToolResult:
    return restconf_get("data/ietf-interfaces:interfaces", connection_factory=connection_factory)


def restconf_get_routing(connection_factory: ConnectionFactory = CiscoConnection) -> ToolResult:
    return restconf_get("data/ietf-routing:routing", connection_factory=connection_factory)

