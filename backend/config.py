from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Agentic Network Configuration Assistant"
    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")
    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    cat8k_host: str = Field(default="devnetsandboxiosxec8k.cisco.com", alias="CAT8K_HOST")
    cat8k_username: str = Field(default="", alias="CAT8K_USERNAME")
    cat8k_password: str = Field(default="", alias="CAT8K_PASSWORD")
    cat8k_ssh_port: int = Field(default=22, alias="CAT8K_SSH_PORT")
    cat8k_restconf_port: int = Field(default=443, alias="CAT8K_RESTCONF_PORT")

    llm_provider: str = Field(default="openai", alias="LLM_PROVIDER")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="", alias="OPENAI_MODEL")
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="", alias="OLLAMA_MODEL")

    langgraph_checkpointer: str = Field(default="memory", alias="LANGGRAPH_CHECKPOINTER")
    langgraph_db_path: str = Field(default="./agent.db", alias="LANGGRAPH_DB_PATH")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
