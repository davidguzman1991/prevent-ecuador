from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class PreventRecordBase(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True, populate_by_name=True)

    patient_age: int | None = Field(
        default=None,
        validation_alias=AliasChoices("age", "patient_age"),
        serialization_alias="age",
    )
    patient_sex: str | None = Field(
        default=None,
        validation_alias=AliasChoices("sex", "patient_sex"),
        serialization_alias="sex",
    )
    patient_country: str = "Ecuador"
    patient_province: str | None = None

    total_cholesterol: float | None = None
    hdl_cholesterol: float | None = Field(
        default=None,
        validation_alias=AliasChoices("hdl", "hdl_cholesterol"),
        serialization_alias="hdl",
    )
    ldl_cholesterol: float | None = None
    systolic_bp: float | None = Field(
        default=None,
        validation_alias=AliasChoices("sbp", "systolic_bp"),
        serialization_alias="sbp",
    )
    diabetes: bool | None = None
    smoker: bool | None = None
    bmi: float | None = None
    egfr: float | None = None
    hba1c: float | None = None
    uacr: float | None = None
    sdi: int | None = None
    model_variant: Literal["base", "uacr", "hba1c", "sdi", "full"] | None = None
    zip_code: str | None = None
    statin_use: bool | None = None
    antihypertensive_use: bool | None = None

    physician_name: str
    physician_specialty: str
    physician_city: str | None = None

    risk_10y: float | None = None
    risk_category: str | None = None
    engine_version: str = "AHA_PREVENT_original_adapted"

    source_org: str = "ANOVA Research Group"
    initiative_name: str = "Red Ecuatoriana de Cardiometabolismo DOH"
    director_name: str = "Dr. David Guzmán"
    consent_for_research: bool = True

    notes: str | None = None
    input_payload_json: dict[str, Any] | None = None


class PreventRecordCreate(PreventRecordBase):
    risk_10y: None = None


class PreventRecordResponse(PreventRecordBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False
    deleted_at: datetime | None = None
    model_variant_used: str | None = None
    cvd_risk_10y: float | None = None
    ascvd_risk_10y: float | None = None
    hf_risk_10y: float | None = None
    cvd_risk_30y: float | None = None
    ascvd_risk_30y: float | None = None
    hf_risk_30y: float | None = None
    cvd_category: str | None = None
    ascvd_category: str | None = None
    hf_category: str | None = None
    prevent_age: float | None = None


class PreventWarning(BaseModel):
    field: str
    field_label: str | None = None
    value: Any | None = None
    unit: str | None = None
    min: float | None = None
    max: float | None = None
    range: str | None = None
    outcomes: list[Literal["cvd", "ascvd", "hf"]]
    message: str
    severity: Literal["warning", "error"] = "warning"


class PreventRecordCreateResponse(BaseModel):
    id: UUID
    cvd_risk: Optional[float]
    ascvd_risk: Optional[float]
    hf_risk: Optional[float]
    cvd_risk_30y: Optional[float]
    ascvd_risk_30y: Optional[float]
    hf_risk_30y: Optional[float]
    prevent_age: float | None
    cvd_category: str | None
    ascvd_category: str | None
    hf_category: str | None
    model_variant: str
    risk_10y: float | None
    risk_category: str | None
    engine_status: str
    methodology_note: str
    warnings: list[PreventWarning] | None = None
    clinical_interpretation: dict[str, Any] | None = None
    debug: dict[str, Any] | None = None
    message: str


class PreventRecordListItem(BaseModel):
    id: UUID
    created_at: datetime
    is_deleted: bool = False
    deleted_at: datetime | None = None
    patient_age: int
    patient_sex: str
    physician_name: str
    diabetes: bool
    smoker: bool
    cvd_risk: float | None
    ascvd_risk: float | None
    hf_risk: float | None
    cvd_risk_30y: float | None
    ascvd_risk_30y: float | None
    hf_risk_30y: float | None
    model_variant: str | None


class PreventRecordListResponse(BaseModel):
    items: list[PreventRecordListItem]
    total: int
    active_total: int
    archived_total: int
    page: int
    page_size: int


class PreventRecordDetailResponse(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    deleted_at: datetime | None
    patient_age: int
    patient_sex: str
    patient_country: str
    patient_province: str | None
    total_cholesterol: float | None
    hdl_cholesterol: float | None
    ldl_cholesterol: float | None
    systolic_bp: float | None
    diabetes: bool
    smoker: bool
    bmi: float | None
    egfr: float | None
    statin_use: bool
    antihypertensive_use: bool
    physician_name: str
    physician_specialty: str
    physician_city: str | None
    risk_10y: float | None
    risk_category: str | None
    model_variant_used: str | None
    cvd_risk_10y: float | None
    ascvd_risk_10y: float | None
    hf_risk_10y: float | None
    cvd_risk_30y: float | None
    ascvd_risk_30y: float | None
    hf_risk_30y: float | None
    cvd_category: str | None
    ascvd_category: str | None
    hf_category: str | None
    prevent_age: float | None
    engine_version: str
    source_org: str
    initiative_name: str
    director_name: str
    consent_for_research: bool
    notes: str | None
    input_payload_json: dict[str, Any] | None
    cvd_risk: float | None
    ascvd_risk: float | None
    hf_risk: float | None
    cvd_30y: float | None = None
    ascvd_30y: float | None = None
    hf_30y: float | None = None
    model_variant: str | None
    clinical_interpretation: dict[str, Any] | None = None


class PreventRecordListFilters(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    physician_name: str | None = None
    diabetes: bool | None = None
    smoker: bool | None = None
    model_variant: Literal["base", "uacr", "hba1c", "sdi", "full"] | None = None
    record_status: Literal["active", "archived", "all"] = "active"
    page: int = 1
    page_size: int = 20
