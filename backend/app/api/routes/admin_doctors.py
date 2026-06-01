from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.dependencies import get_db
from app.schemas.doctor_admin import (
    AdminDoctorCreate,
    AdminDoctorListResponse,
    AdminDoctorPasswordResetResponse,
    AdminDoctorResponse,
    AdminDoctorUpdate,
)
from app.services.admin_doctors import (
    create_admin_doctor,
    get_admin_doctor,
    list_admin_doctors,
    send_admin_doctor_password_reset,
    set_admin_doctor_active,
    update_admin_doctor,
)
from app.services.auth_users import AuthenticatedUser
from app.services.supabase_admin import SupabaseAdminClient, get_supabase_admin_client


router = APIRouter()


@router.get("", response_model=AdminDoctorListResponse)
def list_admin_doctors_endpoint(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> AdminDoctorListResponse:
    _ = current_user
    return list_admin_doctors(db=db)


@router.get("/{doctor_id}", response_model=AdminDoctorResponse)
def get_admin_doctor_endpoint(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> AdminDoctorResponse:
    _ = current_user
    return get_admin_doctor(db=db, doctor_id=doctor_id)


@router.post("", response_model=AdminDoctorResponse, status_code=status.HTTP_201_CREATED)
def create_admin_doctor_endpoint(
    payload: AdminDoctorCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
    supabase_admin: SupabaseAdminClient = Depends(get_supabase_admin_client),
) -> AdminDoctorResponse:
    _ = current_user
    return create_admin_doctor(db=db, payload=payload, supabase_admin=supabase_admin)


@router.patch("/{doctor_id}", response_model=AdminDoctorResponse)
def update_admin_doctor_endpoint(
    doctor_id: UUID,
    payload: AdminDoctorUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> AdminDoctorResponse:
    _ = current_user
    return update_admin_doctor(db=db, doctor_id=doctor_id, payload=payload)


@router.post("/{doctor_id}/deactivate", response_model=AdminDoctorResponse)
def deactivate_admin_doctor_endpoint(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> AdminDoctorResponse:
    _ = current_user
    return set_admin_doctor_active(db=db, doctor_id=doctor_id, is_active=False)


@router.post("/{doctor_id}/activate", response_model=AdminDoctorResponse)
def activate_admin_doctor_endpoint(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> AdminDoctorResponse:
    _ = current_user
    return set_admin_doctor_active(db=db, doctor_id=doctor_id, is_active=True)


@router.post("/{doctor_id}/password-reset", response_model=AdminDoctorPasswordResetResponse)
def reset_admin_doctor_password_endpoint(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
    supabase_admin: SupabaseAdminClient = Depends(get_supabase_admin_client),
) -> AdminDoctorPasswordResetResponse:
    _ = current_user
    return send_admin_doctor_password_reset(
        db=db,
        doctor_id=doctor_id,
        supabase_admin=supabase_admin,
    )
