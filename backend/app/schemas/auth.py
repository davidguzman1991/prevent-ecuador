from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DoctorProfileResponse(BaseModel):
    id: UUID
    display_name: str
    specialty: str | None = None
    license_number: str | None = None
    institution_name: str | None = None
    city: str | None = None


class CurrentUserResponse(BaseModel):
    user_id: UUID
    email: str | None
    full_name: str | None
    role: str
    is_active: bool
    auth_provider: str
    auth_subject: str
    created_at: datetime
    updated_at: datetime
    doctor_profile: DoctorProfileResponse | None = None
