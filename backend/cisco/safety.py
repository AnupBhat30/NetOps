from collections.abc import Iterable


BLOCKED_COMMAND_TOKENS = (
    "reload",
    "write erase",
    "erase startup-config",
    "format",
    "delete flash:",
    "configure replace",
)

BLOCKED_INTERFACE_COMMANDS = (
    "ip address dhcp",
    "no ip address",
    "shutdown",
)


def command_is_blocked(command: str) -> bool:
    normalized = " ".join(command.lower().split())
    return any(token in normalized for token in BLOCKED_COMMAND_TOKENS)


def config_lines_are_blocked(lines: Iterable[str]) -> bool:
    normalized_lines = [" ".join(line.lower().split()) for line in lines]
    for line in normalized_lines:
        if command_is_blocked(line):
            return True
        if line in BLOCKED_INTERFACE_COMMANDS:
            return True
    return False

