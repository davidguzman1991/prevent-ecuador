from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.doctor import Doctor
from app.models.user import AppUser


@dataclass(frozen=True)
class AuthenticatedUser:
    user: AppUser
    doctor_profile: Doctor | None
    claims: dict[str, Any]


def _claim_email(claims: dict[str, Any]) -> str | None:
    email = claims.get("email")
    return str(email).lower() if email else None


def _claim_full_name(claims: dict[str, Any]) -> str | None:
    metadata = claims.get("user_metadata")
    if isinstance(metadata, dict):
        for key in ("full_name", "name"):
            value = metadata.get(key)
            if value:
                return str(value)
    value = claims.get("name")
    return str(value) if value else None


def _role_for_claims(claims: dict[str, Any], existing_role: str | None = None) -> str:
    email = _claim_email(claims)
    if email and email in settings.prevent_global_admin_emails_list:
        return "global_admin"
    return existing_role or "doctor"


def _doctor_display_name(user: AppUser) -> str:
    return user.full_name or user.email or "Médico PREVENT"


def sync_authenticated_user(
    db: Session,
    claims: dict[str, Any],
) -> AuthenticatedUser:
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise ValueError("Supabase JWT does not include sub claim")

    email = _claim_email(claims)
    full_name = _claim_full_name(claims)
    user = (
        db.query(AppUser)
        .filter(
            AppUser.auth_provider == "supabase",
            AppUser.auth_subject == str(auth_subject),
        )
        .one_or_none()
    )
    if user is None and email:
        user = (
            db.query(AppUser)
            .filter(AppUser.email == email)
            .one_or_none()
        )

    if user is None:
        user = AppUser(
            auth_provider="supabase",
            auth_subject=str(auth_subject),
            email=email,
            full_name=full_name,
            role=_role_for_claims(claims),
            is_active=True,
        )
        db.add(user)
        db.flush()
    else:
        if user.auth_provider != "supabase" or user.auth_subject != str(auth_subject):
            user.auth_provider = "supabase"
            user.auth_subject = str(auth_subject)
        if email and user.email != email:
            user.email = email
        if full_name and user.full_name != full_name:
            user.full_name = full_name
        promoted_role = _role_for_claims(claims, existing_role=user.role)
        if promoted_role == "global_admin" and user.role != "global_admin":
            user.role = "global_admin"

    doctor_profile = (
        db.query(Doctor)
        .filter(Doctor.user_id == user.id)
        .one_or_none()
    )
    if user.role == "doctor" and doctor_profile is None:
        doctor_profile = Doctor(
            user_id=user.id,
            display_name=_doctor_display_name(user),
        )
        db.add(doctor_profile)
        db.flush()

    db.commit()
    db.refresh(user)
    if doctor_profile is not None:
        db.refresh(doctor_profile)

    return AuthenticatedUser(user=user, doctor_profile=doctor_profile, claims=claims)
