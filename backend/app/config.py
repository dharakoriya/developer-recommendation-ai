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

    # Production Recommendation Engine Weights (Baseline-v2)
    REC_WEIGHT_SKILL_MATCH: float = 30.0
    REC_WEIGHT_SKILL_COVERAGE: float = 15.0
    REC_WEIGHT_WORKLOAD: float = 15.0
    REC_WEIGHT_AVAILABILITY: float = 10.0
    REC_WEIGHT_EXPERIENCE: float = 10.0
    REC_WEIGHT_PERFORMANCE: float = 10.0
    REC_WEIGHT_TASK_COMPAT: float = 10.0

    # Workload Engine Capacity Thresholds
    WORKLOAD_HEALTHY_MAX: float = 50.0
    WORKLOAD_MODERATE_MAX: float = 75.0
    WORKLOAD_HIGH_MAX: float = 100.0

    # Task Weight Engine Factors
    TASK_WEIGHT_COMPLEXITY: float = 0.35
    TASK_WEIGHT_PRIORITY: float = 0.25
    TASK_WEIGHT_EFFORT: float = 0.25
    TASK_WEIGHT_SKILL: float = 0.15

    # Developer Performance Engine Weights
    PERF_WEIGHT_ON_TIME: float = 0.40
    PERF_WEIGHT_COMPLEXITY: float = 0.30
    PERF_WEIGHT_QUALITY: float = 0.30

    # Developer Incentive System Rates
    INCENTIVE_BASE_RATE: float = 10.0
    INCENTIVE_ON_TIME_BONUS: float = 0.20
    INCENTIVE_COMPLEXITY_BONUS: float = 0.15

    # Automated Risk Management Parameters
    RISK_WORKLOAD_CAPACITY_LIMIT: float = 100.0
    RISK_DEADLINE_WARNING_HOURS: int = 48
    RISK_LOW_PERFORMANCE_THRESHOLD: float = 60.0

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

