import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    PROJECT_NAME: str = "PREVENT Ecuador API"
    API_PREFIX: str = "/api"
    PREVENT_ADMIN_API_KEY: str = os.getenv("PREVENT_ADMIN_API_KEY", "")
    PREVENT_GLOBAL_ADMIN_EMAILS: str = os.getenv("PREVENT_GLOBAL_ADMIN_EMAILS", "")
    FRONTEND_ORIGINS: str = os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://localhost:3001",
    )
    SUPABASE_PROJECT_URL: str = os.getenv("SUPABASE_PROJECT_URL", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_AUTH_AUDIENCE: str = os.getenv("SUPABASE_AUTH_AUDIENCE", "authenticated")
    SUPABASE_AUTH_ISSUER: str = os.getenv("SUPABASE_AUTH_ISSUER", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://user:password@localhost/prevent_ecuador",
    )

    @property
    def frontend_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.FRONTEND_ORIGINS.split(",")
            if origin.strip()
        ]

    @property
    def prevent_global_admin_emails_list(self) -> list[str]:
        return [
            email.strip().lower()
            for email in self.PREVENT_GLOBAL_ADMIN_EMAILS.split(",")
            if email.strip()
        ]

    @property
    def supabase_jwks_url(self) -> str:
        project_url = self.SUPABASE_PROJECT_URL.rstrip("/")
        return f"{project_url}/auth/v1/.well-known/jwks.json" if project_url else ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
