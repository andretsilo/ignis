import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    redis_url: str
    data_dir: str = "data/jobs"
    gpu_executor: str = "rocm_wsl2"
    app_env: str = "development"
    secret_key: str
    log_level: str = "INFO"
    echo_sql: bool = False
    data_dir: str = "data/jobs"

    model_config = SettingsConfigDict(
        env_file=os.getenv("ENV_FILE", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

@lru_cache
def get_settings() -> Settings:
    return Settings()