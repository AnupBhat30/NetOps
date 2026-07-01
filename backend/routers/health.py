from fastapi import APIRouter

from backend.config import Settings, get_settings

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health(settings: Settings = get_settings()) -> dict[str, str]:
    llm_status = "configured" if settings.openai_api_key or settings.llm_provider == "ollama" else "missing_credentials"
    device_status = "configured" if settings.cat8k_username and settings.cat8k_password else "missing_credentials"
    return {"backend": "ok", "llm": llm_status, "device": device_status}

