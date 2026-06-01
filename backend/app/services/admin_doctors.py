from __future__ import annotations

import secrets
import string
from datetime import datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.prevent_record import PreventRecord
from app.models.user import AppUser
from app.schemas.doctor_admin import (
    AdminDoctorCreate,
    AdminDoctorCreateResponse,
    AdminDoctorListResponse,
    AdminDoctorPasswordResetResponse,
    AdminDoctorResponse,
    AdminDoctorUpdate,
)
from app.services.supabase_admin import SupabaseAdminClient


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _generate_temporary_password(length: int = 14) -> str:
    symbols = "#!$%&*?"
    alphabet = string.ascii_letters + string.digits + symbols
    required = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(symbols),
    ]
    remaining = [secrets.choice(alphabet) for _ in range(length - len(required))]
    password_chars = required + remaining
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)


def _profile_status(doctor: Doctor, user: AppUser | None) -> str:
    _ = user
    if doctor.specialty or doctor.city:
        return "partial"
    return "pending"


def _doctor_metrics_subquery(db: Session):
    return (
        db.query(
            PreventRecord.owner_doctor_id.label("doctor_id"),
            func.count(PreventRecord.id).label("total_records"),
            func.max(PreventRecord.created_at).label("last_record_at"),
        )
        .filter(PreventRecord.owner_doctor_id.isnot(None))
        .group_by(PreventRecord.owner_doctor_id)
        .subquery()
    )


def _doctor_response(row) -> AdminDoctorResponse:
    doctor, user, total_records, last_record_at = row
    return AdminDoctorResponse(
        doctor_id=doctor.id,
        user_id=user.id if user is not None else None,
        email=user.email if user is not None else None,
        full_name=user.full_name if user is not None else None,
        display_name=doctor.display_name,
        specialty=doctor.specialty,
        institution_name=doctor.institution_name,
        city=doctor.city,
        is_active=bool(user.is_active) if user is not None else False,
        created_at=doctor.created_at,
        total_records=int(total_records or 0),
        last_record_at=last_record_at,
        profile_status=_profile_status(doctor, user),
    )


def list_admin_doctors(db: Session) -> AdminDoctorListResponse:
    metrics = _doctor_metrics_subquery(db)
    rows = (
        db.query(Doctor, AppUser, metrics.c.total_records, metrics.c.last_record_at)
        .outerjoin(AppUser, Doctor.user_id == AppUser.id)
        .outerjoin(metrics, metrics.c.doctor_id == Doctor.id)
        .order_by(Doctor.created_at.desc())
        .all()
    )
    return AdminDoctorListResponse(items=[_doctor_response(row) for row in rows], total=len(rows))


def get_admin_doctor(db: Session, doctor_id: UUID) -> AdminDoctorResponse:
    metrics = _doctor_metrics_subquery(db)
    row = (
        db.query(Doctor, AppUser, metrics.c.total_records, metrics.c.last_record_at)
        .outerjoin(AppUser, Doctor.user_id == AppUser.id)
        .outerjoin(metrics, metrics.c.doctor_id == Doctor.id)
        .filter(Doctor.id == doctor_id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return _doctor_response(row)


def create_admin_doctor(
    db: Session,
    payload: AdminDoctorCreate,
    supabase_admin: SupabaseAdminClient,
) -> AdminDoctorCreateResponse:
    email = _normalize_email(payload.email)
    temporary_password = _generate_temporary_password()
    auth_user = supabase_admin.create_user(
        email=email,
        full_name=payload.full_name,
        temporary_password=temporary_password,
    )
    auth_subject = str(auth_user.get("id") or auth_user.get("sub") or "")
    if not auth_subject:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase Auth did not return a user id.",
        )

    user = db.query(AppUser).filter(AppUser.email == email).one_or_none()
    if user is None:
        user = (
            db.query(AppUser)
            .filter(
                AppUser.auth_provider == "supabase",
                AppUser.auth_subject == auth_subject,
            )
            .one_or_none()
        )
    if user is None:
        user = AppUser(
            auth_provider="supabase",
            auth_subject=auth_subject,
            email=email,
            full_name=payload.full_name,
            role="doctor",
            is_active=True,
        )
        db.add(user)
        db.flush()
    else:
        user.auth_provider = "supabase"
        user.auth_subject = auth_subject
        user.email = email
        user.full_name = payload.full_name
        user.role = "doctor"
        user.is_active = True

    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).one_or_none()
    if doctor is None:
        doctor = Doctor(user_id=user.id, display_name=payload.display_name or payload.full_name)
        db.add(doctor)
    doctor.display_name = payload.display_name or payload.full_name
    doctor.specialty = payload.specialty
    doctor.city = payload.city

    db.commit()
    db.refresh(doctor)
    db.refresh(user)
    response = get_admin_doctor(db=db, doctor_id=doctor.id)
    return AdminDoctorCreateResponse(**response.model_dump(), temporary_password=temporary_password)


def update_admin_doctor(db: Session, doctor_id: UUID, payload: AdminDoctorUpdate) -> AdminDoctorResponse:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    user = db.get(AppUser, doctor.user_id) if doctor.user_id is not None else None
    data = payload.model_dump(exclude_unset=True)
    for field in ("display_name", "specialty", "city"):
        if field in data:
            setattr(doctor, field, data[field])
    if "is_active" in data and user is not None:
        user.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(doctor)
    if user is not None:
        db.refresh(user)
    return get_admin_doctor(db=db, doctor_id=doctor_id)


def set_admin_doctor_active(db: Session, doctor_id: UUID, is_active: bool) -> AdminDoctorResponse:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if doctor.user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor has no linked user")
    user = db.get(AppUser, doctor.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor user not found")
    if user.role == "global_admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Global admin users cannot be activated or deactivated through doctor management.",
        )
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return get_admin_doctor(db=db, doctor_id=doctor_id)


def send_admin_doctor_password_reset(
    db: Session,
    doctor_id: UUID,
    supabase_admin: SupabaseAdminClient,
) -> AdminDoctorPasswordResetResponse:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    user = db.get(AppUser, doctor.user_id) if doctor.user_id is not None else None
    if user is None or not user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor has no email")
    try:
        supabase_admin.send_password_recovery(user.email)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
            raise
        return AdminDoctorPasswordResetResponse(
            message="No se pudo enviar recuperación automática.",
            manual_instructions="Use Supabase Auth Dashboard para enviar recuperación de contraseña.",
        )
    return AdminDoctorPasswordResetResponse(message="Recuperación de contraseña solicitada.")
