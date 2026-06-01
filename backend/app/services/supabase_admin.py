from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from app.core.config import settings


class SupabaseAdminClient:
    def __init__(self) -> None:
        self.project_url = settings.SUPABASE_PROJECT_URL.rstrip("/")
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY

    def _require_config(self) -> None:
        if not self.project_url or not self.service_role_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase service role key is not configured.",
            )

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        self._require_config()
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(
            f"{self.project_url}{path}",
            data=body,
            method=method,
            headers={
                "apikey": self.service_role_key,
                "Authorization": f"Bearer {self.service_role_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=15) as response:
                raw_body = response.read().decode("utf-8")
        except HTTPError as exc:
            raw_error = exc.read().decode("utf-8", errors="replace")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase Auth admin request failed: {raw_error or exc.reason}",
            ) from exc
        except URLError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase Auth admin request failed.",
            ) from exc
        return json.loads(raw_body) if raw_body else {}

    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        data = self._request("GET", "/auth/v1/admin/users")
        users = data.get("users") if isinstance(data, dict) else None
        if not isinstance(users, list):
            return None
        normalized_email = email.lower()
        for user in users:
            if isinstance(user, dict) and str(user.get("email") or "").lower() == normalized_email:
                return user
        return None

    def create_user(
        self,
        *,
        email: str,
        full_name: str,
        temporary_password: str | None,
    ) -> dict[str, Any]:
        existing = self.find_user_by_email(email)
        if existing is not None:
            if temporary_password and existing.get("id"):
                return self._request(
                    "PUT",
                    f"/auth/v1/admin/users/{existing['id']}",
                    {
                        "password": temporary_password,
                        "user_metadata": {"full_name": full_name, "name": full_name},
                    },
                )
            return existing
        payload: dict[str, Any] = {
            "email": email,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name, "name": full_name},
        }
        if temporary_password:
            payload["password"] = temporary_password
        return self._request("POST", "/auth/v1/admin/users", payload)

    def send_password_recovery(self, email: str) -> bool:
        self._request("POST", "/auth/v1/admin/generate_link", {"type": "recovery", "email": email})
        return True


def get_supabase_admin_client() -> SupabaseAdminClient:
    return SupabaseAdminClient()
