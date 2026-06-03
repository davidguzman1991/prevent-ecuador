from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Doctor(Base):
    __tablename__ = "doctors"
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
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("public.app_users.id"),
        nullable=True,
        unique=True,
    )
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(150), nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    institution_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    province_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    province_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
