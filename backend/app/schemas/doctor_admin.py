from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AdminDoctorCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    full_name: str = Field(min_length=1, max_length=150)
    display_name: str = Field(min_length=1, max_length=150)
    specialty: str | None = Field(default=None, max_length=150)
    institution_name: str | None = Field(default=None, max_length=150)
    city: str | None = Field(default=None, max_length=100)
    temporary_password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminDoctorUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=150)
    specialty: str | None = Field(default=None, max_length=150)
    institution_name: str | None = Field(default=None, max_length=150)
    city: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None


class AdminDoctorResponse(BaseModel):
    doctor_id: UUID
    user_id: UUID | None
    email: str | None
    full_name: str | None
    display_name: str
    specialty: str | None
    institution_name: str | None
    city: str | None
    is_active: bool
    created_at: datetime
    total_records: int
    last_record_at: datetime | None


class AdminDoctorListResponse(BaseModel):
    items: list[AdminDoctorResponse]
    total: int


class AdminDoctorPasswordResetResponse(BaseModel):
    message: str
    manual_instructions: str | None = None
