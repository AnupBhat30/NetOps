from __future__ import annotations

import json
from typing import Any

import httpx
from openai import AuthenticationError, OpenAI, OpenAIError
from pydantic import BaseModel, Field, ValidationError

from backend.config import Settings, get_settings
from backend.models.schemas import ActionStep


PLANNER_SYSTEM_PROMPT = """You are the NetOps Agent planner.

Convert the operator request into a JSON plan using only the allowed tools.
You do not execute anything. You only produce a typed plan.

Current project context:
- Product: NetOps Agent.
- Current connected target: one Cisco IOS XE Cat8000 demo device.
- Read-only operations may execute directly.
- Write operations must have "write": true and will pause for human approval.
- For every write operation, include at least one read-only validation step after it.

Allowed tools and params:
- answer_question: {"question": string, "topic": string}
- show_command: {"command": string}
- get_running_config: {}
- configure_ospf: {"process_id": integer, "network": string, "wildcard": string, "area": integer}
- configure_static_route: {"network": string, "mask": string, "next_hop": string}
- configure_interface: {"interface": string, "ip_address": string, "subnet_mask": string, "description": string|null, "enable": boolean}
- configure_acl: {"acl_name": string, "action": "permit"|"deny", "source": string, "wildcard": string, "dest": string}

Safety rules:
- Never invent unsupported tools.
- Never emit reload, erase, delete, format, configure replace, shutdown, or no ip address commands.
- If the request is general/advisory, use answer_question.
- If required details are missing, use answer_question to ask for the missing details.
- Prefer show_command for show/inspect/check requests.

Return only valid JSON in this exact shape:
{"steps":[{"tool":"show_command","params":{"command":"show ip route"},"description":"Show the routing table.","write":false}]}
"""


class LlmPlan(BaseModel):
    steps: list[ActionStep] = Field(min_length=1, max_length=8)


ALLOWED_TOOLS = {
    "answer_question",
    "show_command",
    "get_running_config",
    "configure_ospf",
    "configure_static_route",
    "configure_interface",
    "configure_acl",
}

WRITE_TOOLS = {"configure_ospf", "configure_static_route", "configure_interface", "configure_acl"}


def generate_plan(intent: str, settings: Settings | None = None) -> list[ActionStep]:
    settings = settings or get_settings()
    provider = settings.llm_provider.lower().strip()

    raw = _generate_with_ollama(intent, settings) if provider == "ollama" else _generate_with_openai(intent, settings)
    return _parse_and_validate_plan(raw)


def _generate_with_openai(intent: str, settings: Settings) -> str:
    if not settings.openai_api_key or settings.openai_api_key == "replace-me":
        raise RuntimeError("OpenAI is not configured. Set OPENAI_API_KEY and OPENAI_MODEL in .env.")
    if not settings.openai_model or settings.openai_model == "replace-me":
        raise RuntimeError("OpenAI model is not configured. Set OPENAI_MODEL in .env.")

    client = OpenAI(api_key=settings.openai_api_key)
    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": intent},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
    except AuthenticationError as exc:
        raise RuntimeError("OpenAI authentication failed. Check OPENAI_API_KEY and restart the backend.") from exc
    except OpenAIError as exc:
        raise RuntimeError("OpenAI planner request failed. Check OPENAI_MODEL, project access, billing, and server logs.") from exc

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("The planner LLM returned an empty plan.")
    return content


def _generate_with_ollama(intent: str, settings: Settings) -> str:
    if not settings.ollama_model or settings.ollama_model == "replace-me":
        raise RuntimeError("Ollama model is not configured. Set OLLAMA_MODEL in .env.")

    response = httpx.post(
        f"{settings.ollama_base_url.rstrip('/')}/api/chat",
        json={
            "model": settings.ollama_model,
            "stream": False,
            "format": "json",
            "messages": [
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": intent},
            ],
            "options": {"temperature": 0.1},
        },
        timeout=45.0,
    )
    response.raise_for_status()
    payload = response.json()
    content = payload.get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("The planner LLM returned an empty plan.")
    return content


def _parse_and_validate_plan(raw: str) -> list[ActionStep]:
    try:
        payload: dict[str, Any] = json.loads(raw)
        plan = LlmPlan.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise RuntimeError(f"The planner LLM returned an invalid plan: {exc}") from exc

    steps = plan.steps
    for step in steps:
        if step.tool not in ALLOWED_TOOLS:
            raise RuntimeError(f"The planner LLM selected an unsupported tool: {step.tool}")
        if step.tool in WRITE_TOOLS and not step.write:
            raise RuntimeError(f"The planner LLM marked write tool {step.tool} as read-only.")
        if step.tool not in WRITE_TOOLS and step.write:
            raise RuntimeError(f"The planner LLM marked read-only tool {step.tool} as a write.")

    if any(step.write for step in steps) and not any(not step.write and step.tool in {"show_command", "get_running_config", "answer_question"} for step in steps):
        raise RuntimeError("The planner LLM created a write plan without a validation step.")

    return steps
