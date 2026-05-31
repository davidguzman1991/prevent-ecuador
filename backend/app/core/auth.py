from __future__ import annotations

from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db
from app.services.auth_users import AuthenticatedUser, sync_authenticated_user

_jwks_client: PyJWKClient | None = None


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
        )
    return token.strip()


def _decode_options() -> dict[str, Any]:
    options: dict[str, Any] = {"require": ["exp", "sub"]}
    if not settings.SUPABASE_AUTH_AUDIENCE:
        options["verify_aud"] = False
    if not settings.SUPABASE_AUTH_ISSUER:
        options["verify_iss"] = False
    return options


def _decode_with_secret(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience=settings.SUPABASE_AUTH_AUDIENCE or None,
        issuer=settings.SUPABASE_AUTH_ISSUER or None,
        options=_decode_options(),
    )


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.supabase_jwks_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase JWKS URL is not configured",
            )
        _jwks_client = PyJWKClient(settings.supabase_jwks_url)
    return _jwks_client


def _decode_with_jwks(token: str) -> dict[str, Any]:
    signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256", "ES256"],
        audience=settings.SUPABASE_AUTH_AUDIENCE or None,
        issuer=settings.SUPABASE_AUTH_ISSUER or None,
        options=_decode_options(),
    )


def verify_supabase_jwt(token: str) -> dict[str, Any]:
    try:
        if settings.SUPABASE_JWT_SECRET:
            claims = _decode_with_secret(token)
        else:
            claims = _decode_with_jwks(token)
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Supabase token",
        ) from exc

    if claims.get("sub") is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Supabase token does not include a subject",
        )
    return claims


def get_current_user_optional(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> AuthenticatedUser | None:
    token = _bearer_token(authorization)
    if token is None:
        return None
    claims = verify_supabase_jwt(token)
    current_user = sync_authenticated_user(db=db, claims=claims)
    if not current_user.user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def get_current_user_required(
    current_user: AuthenticatedUser | None = Depends(get_current_user_optional),
) -> AuthenticatedUser:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return current_user


def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user_required),
) -> AuthenticatedUser:
    if current_user.user.role != "global_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Global admin role required",
        )
    return current_user


def require_doctor(
    current_user: AuthenticatedUser = Depends(get_current_user_required),
) -> AuthenticatedUser:
    if current_user.user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor role required",
        )
    if current_user.doctor_profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor profile required",
        )
    return current_user
