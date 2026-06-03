from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


PHONE_PATTERN = r"^\+?[0-9\s().-]{7,25}$"


class DoctorProfileResponse(BaseModel):
    doctor_id: UUID
    user_id: UUID | None
    email: str | None
    full_name: str | None
    display_name: str
    specialty: str | None
    phone: str | None
    birth_date: date | None
    province_code: str | None
    province_name: str | None
    city: str | None
    institution_name: str | None
    profile_status: Literal["pending", "partial", "complete"]


class DoctorProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=150)
    specialty: str | None = Field(default=None, max_length=150)
    phone: str | None = Field(default=None, max_length=40, pattern=PHONE_PATTERN)
    birth_date: date | None = None
    province_code: str | None = Field(default=None, max_length=20)
    province_name: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=100)
    institution_name: str | None = Field(default=None, max_length=150)

    @field_validator("birth_date")
    @classmethod
    def birth_date_cannot_be_future(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("birth_date cannot be in the future")
        return value
