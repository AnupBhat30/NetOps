from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Protocol

import httpx
from netmiko import ConnectHandler

from backend.config import Settings, get_settings


class CliClient(Protocol):
    def send_command(self, command: str, **kwargs: Any) -> Any:
        ...

    def send_config_set(self, config_commands: list[str], **kwargs: Any) -> Any:
        ...

    def disconnect(self) -> None:
        ...


class RestconfClient(Protocol):
    def get(self, url: str, **kwargs: Any) -> Any:
        ...

    def patch(self, url: str, **kwargs: Any) -> Any:
        ...


class CiscoConnection:
    """Lazily manages Cisco CLI and RESTCONF clients."""

    def __init__(
        self,
        settings: Settings | None = None,
        cli_client: CliClient | None = None,
        restconf_client: RestconfClient | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._cli_client = cli_client
        self._restconf_client = restconf_client

    @property
    def restconf_base_url(self) -> str:
        return f"https://{self.settings.cat8k_host}:{self.settings.cat8k_restconf_port}/restconf"

    def cli(self) -> CliClient:
        if self._cli_client is None:
            if not self.settings.cat8k_username or not self.settings.cat8k_password:
                raise RuntimeError("Cisco SSH credentials are not configured")
            self._cli_client = ConnectHandler(
                device_type="cisco_xe",
                host=self.settings.cat8k_host,
                username=self.settings.cat8k_username,
                password=self.settings.cat8k_password,
                port=self.settings.cat8k_ssh_port,
            )
        return self._cli_client

    def restconf(self) -> RestconfClient:
        if self._restconf_client is None:
            if not self.settings.cat8k_username or not self.settings.cat8k_password:
                raise RuntimeError("Cisco RESTCONF credentials are not configured")
            self._restconf_client = httpx.Client(
                auth=(self.settings.cat8k_username, self.settings.cat8k_password),
                headers={
                    "Accept": "application/yang-data+json",
                    "Content-Type": "application/yang-data+json",
                },
                verify=False,
                timeout=20.0,
            )
        return self._restconf_client

    def restconf_url(self, endpoint: str) -> str:
        endpoint = endpoint.lstrip("/")
        if endpoint.startswith("restconf/"):
            endpoint = endpoint.removeprefix("restconf/")
        return f"{self.restconf_base_url}/{endpoint}"

    def close(self) -> None:
        if self._cli_client is not None:
            self._cli_client.disconnect()
            self._cli_client = None
        if self._restconf_client is not None and hasattr(self._restconf_client, "close"):
            self._restconf_client.close()
            self._restconf_client = None

    def __enter__(self) -> "CiscoConnection":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()


def json_from_response(response: Any) -> Mapping[str, Any]:
    if hasattr(response, "json"):
        value = response.json()
        if isinstance(value, Mapping):
            return value
    return {}
