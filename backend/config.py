"""Application settings, loaded from environment variables and the backend/.env file."""
import re
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "Inventory Management System"
    app_version: str = "1.0.0"

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "inventory_db"
    db_pool_size: int = Field(default=10, ge=1, le=32)
    auto_init_schema: bool = True

    log_level: str = "INFO"
    log_dir: str = "logs"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @field_validator("db_name")
    @classmethod
    def _valid_db_name(cls, value: str) -> str:
        # The name is used inside CREATE DATABASE, so only allow safe characters.
        if not re.fullmatch(r"[A-Za-z0-9_]+", value):
            raise ValueError("DB_NAME may only contain letters, digits and underscores")
        return value

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def log_path(self) -> Path:
        path = Path(self.log_dir)
        return path if path.is_absolute() else BASE_DIR / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
