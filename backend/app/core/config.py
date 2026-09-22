from pydantic_settings import BaseSettings
from functools import lru_cache
import os


DEV_SECRET_MARKER = "dev-secret-key-change-in-production"


class Settings(BaseSettings):
    APP_NAME: str = "VirtualDev Studio"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/virtualdev_studio"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    LLM_PROVIDER: str = "mock"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    environment = settings.ENVIRONMENT or os.getenv("ENVIRONMENT", "development")
    is_prod = environment != "development"

    if not settings.SECRET_KEY:
        if is_prod and not settings.DEBUG:
            raise RuntimeError("SECRET_KEY must be set in production")
        settings.SECRET_KEY = DEV_SECRET_MARKER
    elif settings.SECRET_KEY == DEV_SECRET_MARKER and is_prod:
        raise RuntimeError("SECRET_KEY is the well-known development value; set a real secret in production")
    return settings