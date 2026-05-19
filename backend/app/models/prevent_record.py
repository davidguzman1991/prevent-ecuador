from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class PreventRecord(Base):
    __tablename__ = "prevent_records"
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

    patient_age: Mapped[int] = mapped_column(Integer, nullable=False)
    patient_sex: Mapped[str] = mapped_column(String(20), nullable=False)
    patient_country: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Ecuador",
        server_default=text("'Ecuador'"),
    )
    patient_province: Mapped[str | None] = mapped_column(String(100), nullable=True)

    total_cholesterol: Mapped[float | None] = mapped_column(Float, nullable=True)
    hdl_cholesterol: Mapped[float | None] = mapped_column(Float, nullable=True)
    ldl_cholesterol: Mapped[float | None] = mapped_column(Float, nullable=True)
    systolic_bp: Mapped[float | None] = mapped_column(Float, nullable=True)
    diabetes: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    smoker: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    egfr: Mapped[float | None] = mapped_column(Float, nullable=True)
    uacr: Mapped[float | None] = mapped_column(Float, nullable=True)
    hba1c: Mapped[float | None] = mapped_column(Float, nullable=True)
    sdi: Mapped[int | None] = mapped_column(Integer, nullable=True)
    statin_use: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    antihypertensive_use: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    physician_name: Mapped[str] = mapped_column(String(150), nullable=False)
    physician_specialty: Mapped[str] = mapped_column(String(150), nullable=False)
    physician_city: Mapped[str | None] = mapped_column(String(100), nullable=True)

    risk_10y: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_variant_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cvd_risk_10y: Mapped[float | None] = mapped_column(Float, nullable=True)
    ascvd_risk_10y: Mapped[float | None] = mapped_column(Float, nullable=True)
    hf_risk_10y: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvd_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ascvd_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hf_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    prevent_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    engine_version: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="AHA_PREVENT_original_adapted",
        server_default=text("'AHA_PREVENT_original_adapted'"),
    )

    source_org: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="ANOVA Research Group",
        server_default=text("'ANOVA Research Group'"),
    )
    initiative_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="Red Ecuatoriana de Cardiometabolismo DOH",
        server_default=text("'Red Ecuatoriana de Cardiometabolismo DOH'"),
    )
    director_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        default="Dr. David Guzmán",
        server_default=text("'Dr. David Guzmán'"),
    )
    consent_for_research: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_payload_json: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
