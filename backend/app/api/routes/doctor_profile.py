from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import require_doctor
from app.core.dependencies import get_db
from app.schemas.doctor_profile import DoctorProfileResponse, DoctorProfileUpdate
from app.services.admin_doctors import _profile_status
from app.services.auth_users import AuthenticatedUser


router = APIRouter()


def _doctor_profile_response(current_user: AuthenticatedUser) -> DoctorProfileResponse:
    doctor = current_user.doctor_profile
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor profile required",
        )
    return DoctorProfileResponse(
        doctor_id=doctor.id,
        user_id=doctor.user_id,
        email=current_user.user.email,
        full_name=current_user.user.full_name,
        display_name=doctor.display_name,
        specialty=doctor.specialty,
        phone=doctor.phone,
        birth_date=doctor.birth_date,
        province_code=doctor.province_code,
        province_name=doctor.province_name,
        city=doctor.city,
        institution_name=doctor.institution_name,
        profile_status=_profile_status(doctor, current_user.user),
    )


@router.get("", response_model=DoctorProfileResponse)
def get_doctor_profile_endpoint(
    current_user: AuthenticatedUser = Depends(require_doctor),
) -> DoctorProfileResponse:
    return _doctor_profile_response(current_user)


@router.patch("", response_model=DoctorProfileResponse)
def update_doctor_profile_endpoint(
    payload: DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_doctor),
) -> DoctorProfileResponse:
    doctor = current_user.doctor_profile
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor profile required",
        )
    doctor.display_name = payload.display_name
    doctor.specialty = payload.specialty
    doctor.phone = payload.phone
    doctor.birth_date = payload.birth_date
    doctor.province_code = payload.province_code
    doctor.province_name = payload.province_name
    doctor.city = payload.city
    doctor.institution_name = payload.institution_name
    db.commit()
    db.refresh(doctor)
    return _doctor_profile_response(current_user)
