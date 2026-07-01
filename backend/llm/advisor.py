from __future__ import annotations

import httpx
from openai import AuthenticationError, OpenAI, OpenAIError

from backend.config import Settings, get_settings


SYSTEM_PROMPT = """You are NetOps Agent, an AI-assisted network change workflow.

Answer operator questions about the current project and connected target.

Project context:
- Product name: NetOps Agent.
- Purpose: AI-assisted network change workflow with approval, execution, and validation.
- Current demo scope: one connected Cisco IOS XE Cat8000 target.
- Automation paths: Netmiko SSH for CLI operations, RESTCONF for model-driven reads.
- Safety model: read-only checks can execute directly; configuration-changing operations require human approval first.
- Current supported operations include show commands, running-config reads, OSPF config, static route config, interface config, basic ACL config, and validation evidence.

Answer naturally and concretely. Do not claim broad multi-device or multi-vendor support as already implemented. Make it clear that the product direction is general NetOps, while the current implementation is one IOS XE target.
Keep the answer useful for a portfolio demo and suggest example prompts the operator can try."""


def generate_advisory_answer(question: str, settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    provider = settings.llm_provider.lower().strip()

    if provider == "ollama":
        return _generate_with_ollama(question, settings)
    return _generate_with_openai(question, settings)


def _generate_with_openai(question: str, settings: Settings) -> str:
    if not settings.openai_api_key or settings.openai_api_key == "replace-me":
        raise RuntimeError("OpenAI is not configured. Set OPENAI_API_KEY and OPENAI_MODEL in .env.")
    if not settings.openai_model or settings.openai_model == "replace-me":
        raise RuntimeError("OpenAI model is not configured. Set OPENAI_MODEL in .env.")

    client = OpenAI(api_key=settings.openai_api_key)
    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.2,
        )
    except AuthenticationError as exc:
        raise RuntimeError("OpenAI authentication failed. Check OPENAI_API_KEY and restart the backend.") from exc
    except OpenAIError as exc:
        raise RuntimeError("OpenAI request failed. Check OPENAI_MODEL, project access, billing, and server logs.") from exc
    answer = response.choices[0].message.content
    if not answer:
        raise RuntimeError("The LLM returned an empty answer.")
    return answer


def _generate_with_ollama(question: str, settings: Settings) -> str:
    if not settings.ollama_model or settings.ollama_model == "replace-me":
        raise RuntimeError("Ollama model is not configured. Set OLLAMA_MODEL in .env.")

    response = httpx.post(
        f"{settings.ollama_base_url.rstrip('/')}/api/chat",
        json={
            "model": settings.ollama_model,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            "options": {"temperature": 0.2},
        },
        timeout=45.0,
    )
    response.raise_for_status()
    payload = response.json()
    answer = payload.get("message", {}).get("content")
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("The LLM returned an empty answer.")
    return answer
