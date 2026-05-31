from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    owner_doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.doctors.id"),
        nullable=True,
    )
    public_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.public_sessions.id"),
        nullable=True,
    )
    external_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    patient_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    patient_sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patient_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    patient_province_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patient_canton_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    patient_metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
