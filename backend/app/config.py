from typing import List, Union, Optional
from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env values are loaded into os.environ for os.getenv() calls
load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "DevAlign AI Backend"
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api"
    PORT: int = 8000
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/devalign_db"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    JWT_SECRET: str = "devalign-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    AI_PROVIDER: str = "heuristic"
    AI_MODEL: str = "llama3"
    OLLAMA_HOST: str = "http://localhost:11434"
    AI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

