from fastapi import APIRouter

from backend.config import Settings, get_settings
from backend.models.schemas import DeviceHealth, DeviceState

router = APIRouter(prefix="/api/device", tags=["device"])


@router.get("/state", response_model=DeviceState)
async def get_device_state(settings: Settings = get_settings()) -> DeviceState:
    device_status = "configured" if settings.cat8k_username and settings.cat8k_password else "missing_credentials"
    llm_status = "configured" if settings.openai_api_key or settings.llm_provider == "ollama" else "missing_credentials"
    return DeviceState(health=DeviceHealth(llm=llm_status, device=device_status))


@router.get("/running-config")
async def get_running_config() -> dict[str, str]:
    return {"status": "not_implemented", "running_config": ""}

