from collections.abc import Callable
from typing import Any

from backend.cisco.connection import CiscoConnection
from backend.cisco.result import ToolResult
from backend.cisco.safety import command_is_blocked, config_lines_are_blocked

ConnectionFactory = Callable[[], CiscoConnection]


def show_command(command: str, connection_factory: ConnectionFactory = CiscoConnection) -> ToolResult:
    operation = "show_command"
    if command_is_blocked(command):
        return ToolResult.failure(operation, "Command is blocked by safety policy", {"command": command})

    try:
        with connection_factory() as connection:
            output = connection.cli().send_command(command)
        return ToolResult.success(operation, {"command": command, "output": output})
    except Exception as exc:
        return ToolResult.failure(operation, str(exc), {"command": command})


def get_running_config(connection_factory: ConnectionFactory = CiscoConnection) -> ToolResult:
    return show_command("show running-config", connection_factory=connection_factory)


def configure_ospf(
    process_id: int,
    network: str,
    wildcard: str,
    area: int,
    approved: bool = False,
    connection_factory: ConnectionFactory = CiscoConnection,
) -> ToolResult:
    operation = "configure_ospf"
    if not approved:
        return ToolResult.failure(operation, "Write operation requires approval")

    commands = [
        f"router ospf {process_id}",
        f"network {network} {wildcard} area {area}",
    ]
    return _send_config(operation, commands, connection_factory)


def configure_static_route(
    network: str,
    mask: str,
    next_hop: str,
    approved: bool = False,
    connection_factory: ConnectionFactory = CiscoConnection,
) -> ToolResult:
    operation = "configure_static_route"
    if not approved:
        return ToolResult.failure(operation, "Write operation requires approval")

    commands = [f"ip route {network} {mask} {next_hop}"]
    return _send_config(operation, commands, connection_factory)


def configure_interface(
    interface: str,
    ip_address: str,
    subnet_mask: str,
    description: str | None = None,
    enable: bool = True,
    approved: bool = False,
    connection_factory: ConnectionFactory = CiscoConnection,
) -> ToolResult:
    operation = "configure_interface"
    if not approved:
        return ToolResult.failure(operation, "Write operation requires approval")

    commands = [f"interface {interface}"]
    if description:
        commands.append(f"description {description}")
    commands.append(f"ip address {ip_address} {subnet_mask}")
    if enable:
        commands.append("no shutdown")

    return _send_config(operation, commands, connection_factory)


def configure_acl(
    acl_name: str,
    action: str,
    source: str,
    wildcard: str,
    dest: str,
    approved: bool = False,
    connection_factory: ConnectionFactory = CiscoConnection,
) -> ToolResult:
    operation = "configure_acl"
    if not approved:
        return ToolResult.failure(operation, "Write operation requires approval")
    if action not in {"permit", "deny"}:
        return ToolResult.failure(operation, "ACL action must be permit or deny", {"action": action})

    commands = [f"ip access-list extended {acl_name}", f"{action} ip {source} {wildcard} {dest}"]
    return _send_config(operation, commands, connection_factory)


def rollback_config(snapshot_id: str, approved: bool = False, connection_factory: ConnectionFactory = CiscoConnection) -> ToolResult:
    operation = "rollback_config"
    if not approved:
        return ToolResult.failure(operation, "Rollback requires approval")

    return ToolResult.failure(
        operation,
        "Rollback storage is not implemented yet",
        {"snapshot_id": snapshot_id},
    )


def _send_config(operation: str, commands: list[str], connection_factory: ConnectionFactory) -> ToolResult:
    if config_lines_are_blocked(commands):
        return ToolResult.failure(operation, "Configuration contains blocked commands", {"commands": commands})

    try:
        with connection_factory() as connection:
            output = connection.cli().send_config_set(commands)
        return ToolResult.success(operation, {"commands": commands, "output": output})
    except Exception as exc:
        return ToolResult.failure(operation, str(exc), {"commands": commands})

