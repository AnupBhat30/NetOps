from typing import Any

from backend.cisco.connection import CiscoConnection
from backend.cisco.netmiko_tools import configure_ospf, configure_static_route, show_command
from backend.cisco.restconf_tools import restconf_get_interfaces


class FakeCli:
    def __init__(self) -> None:
        self.commands: list[str] = []
        self.config_sets: list[list[str]] = []
        self.disconnected = False

    def send_command(self, command: str, **_kwargs: Any) -> str:
        self.commands.append(command)
        return "command output"

    def send_config_set(self, config_commands: list[str], **_kwargs: Any) -> str:
        self.config_sets.append(config_commands)
        return "config output"

    def disconnect(self) -> None:
        self.disconnected = True


class FakeResponse:
    status_code = 200

    def json(self) -> dict[str, object]:
        return {"ietf-interfaces:interfaces": {"interface": [{"name": "GigabitEthernet1"}]}}


class FakeRestconf:
    def __init__(self) -> None:
        self.urls: list[str] = []
        self.closed = False

    def get(self, url: str, **_kwargs: Any) -> FakeResponse:
        self.urls.append(url)
        return FakeResponse()

    def patch(self, url: str, **_kwargs: Any) -> FakeResponse:
        self.urls.append(url)
        return FakeResponse()

    def close(self) -> None:
        self.closed = True


def test_show_command_uses_cli_client() -> None:
    cli = FakeCli()

    def factory() -> CiscoConnection:
        return CiscoConnection(cli_client=cli)

    result = show_command("show version", connection_factory=factory)

    assert result.ok is True
    assert result.operation == "show_command"
    assert result.data["output"] == "command output"
    assert cli.commands == ["show version"]
    assert cli.disconnected is True


def test_show_command_blocks_dangerous_command() -> None:
    result = show_command("reload")

    assert result.ok is False
    assert result.error == "Command is blocked by safety policy"


def test_configure_ospf_requires_approval() -> None:
    result = configure_ospf(process_id=1, network="10.0.0.0", wildcard="0.0.0.255", area=0)

    assert result.ok is False
    assert result.error == "Write operation requires approval"


def test_configure_ospf_sends_expected_commands_when_approved() -> None:
    cli = FakeCli()

    def factory() -> CiscoConnection:
        return CiscoConnection(cli_client=cli)

    result = configure_ospf(
        process_id=1,
        network="10.99.99.0",
        wildcard="0.0.0.255",
        area=0,
        approved=True,
        connection_factory=factory,
    )

    assert result.ok is True
    assert cli.config_sets == [["router ospf 1", "network 10.99.99.0 0.0.0.255 area 0"]]


def test_configure_static_route_sends_expected_command_when_approved() -> None:
    cli = FakeCli()

    def factory() -> CiscoConnection:
        return CiscoConnection(cli_client=cli)

    result = configure_static_route(
        network="10.10.10.0",
        mask="255.255.255.0",
        next_hop="10.0.0.1",
        approved=True,
        connection_factory=factory,
    )

    assert result.ok is True
    assert cli.config_sets == [["ip route 10.10.10.0 255.255.255.0 10.0.0.1"]]


def test_restconf_get_interfaces_uses_restconf_client() -> None:
    restconf = FakeRestconf()

    def factory() -> CiscoConnection:
        return CiscoConnection(restconf_client=restconf)

    result = restconf_get_interfaces(connection_factory=factory)

    assert result.ok is True
    assert result.data["response"] == {"ietf-interfaces:interfaces": {"interface": [{"name": "GigabitEthernet1"}]}}
    assert restconf.urls == ["https://devnetsandboxiosxec8k.cisco.com:443/restconf/data/ietf-interfaces:interfaces"]
    assert restconf.closed is True

