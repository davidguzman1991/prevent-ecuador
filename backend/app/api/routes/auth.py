from fastapi import APIRouter, Depends

from app.core.auth import get_current_user_required
from app.schemas.auth import CurrentUserResponse, DoctorProfileResponse
from app.services.auth_users import AuthenticatedUser


router = APIRouter()


@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user_required),
) -> CurrentUserResponse:
    doctor_profile = current_user.doctor_profile
    return CurrentUserResponse(
        user_id=current_user.user.id,
        email=current_user.user.email,
        full_name=current_user.user.full_name,
        role=current_user.user.role,
        is_active=current_user.user.is_active,
        auth_provider=current_user.user.auth_provider,
        auth_subject=current_user.user.auth_subject,
        created_at=current_user.user.created_at,
        updated_at=current_user.user.updated_at,
        doctor_profile=DoctorProfileResponse(
            id=doctor_profile.id,
            display_name=doctor_profile.display_name,
            specialty=doctor_profile.specialty,
            license_number=doctor_profile.license_number,
            institution_name=doctor_profile.institution_name,
            city=doctor_profile.city,
        )
        if doctor_profile is not None
        else None,
    )
