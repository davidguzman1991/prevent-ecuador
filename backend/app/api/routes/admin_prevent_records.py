from datetime import date
from io import BytesIO
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.routes.prevent_records import (
    EDUCATION_LEVEL_PATTERN,
    EMPLOYMENT_STATUS_PATTERN,
    ETHNICITY_PATTERN,
    HEALTH_COVERAGE_PATTERN,
    SOCIOECONOMIC_LEVEL_PATTERN,
)
from app.core.auth import require_admin
from app.core.dependencies import get_db
from app.schemas.prevent_record import (
    PreventRecordDetailResponse,
    PreventRecordListFilters,
    PreventRecordListResponse,
)
from app.services.auth_users import AuthenticatedUser
from app.models.doctor import Doctor
from app.services.prevent_records import (
    export_prevent_records_csv,
    export_prevent_records_xlsx,
    get_prevent_record_detail,
    list_prevent_records,
)


router = APIRouter()


@router.get("/doctors/count")
def count_admin_doctors_endpoint(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> dict[str, int]:
    _ = current_user
    return {"total_doctors": int(db.query(func.count(Doctor.id)).scalar() or 0)}


def _admin_filters(
    *,
    date_from: date | None,
    date_to: date | None,
    physician_name: str | None,
    diabetes: bool | None,
    smoker: bool | None,
    patient_province_code: str | None,
    patient_canton_code: str | None,
    patient_area_type: str | None,
    patient_geo_source: str | None,
    patient_health_coverage: str | None,
    patient_education_level: str | None,
    patient_employment_status: str | None,
    patient_ethnicity: str | None,
    patient_socioeconomic_level: str | None,
    model_variant: str | None,
    record_status: str,
    page: int = 1,
    page_size: int = 20,
) -> PreventRecordListFilters:
    return PreventRecordListFilters(
        date_from=date_from,
        date_to=date_to,
        physician_name=physician_name,
        diabetes=diabetes,
        smoker=smoker,
        patient_province_code=patient_province_code,
        patient_canton_code=patient_canton_code,
        patient_area_type=patient_area_type,
        patient_geo_source=patient_geo_source,
        patient_health_coverage=patient_health_coverage,
        patient_education_level=patient_education_level,
        patient_employment_status=patient_employment_status,
        patient_ethnicity=patient_ethnicity,
        patient_socioeconomic_level=patient_socioeconomic_level,
        model_variant=model_variant,
        record_status=record_status,
        page=page,
        page_size=page_size,
        include_public=True,
        include_legacy=True,
        admin_mode=True,
    )


@router.get("/list", response_model=PreventRecordListResponse)
def list_admin_prevent_records_endpoint(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    physician_name: str | None = Query(default=None),
    diabetes: bool | None = Query(default=None),
    smoker: bool | None = Query(default=None),
    patient_province_code: str | None = Query(default=None),
    patient_canton_code: str | None = Query(default=None),
    patient_area_type: str | None = Query(default=None, pattern="^(urban|rural|unknown)$"),
    patient_geo_source: str | None = Query(
        default=None,
        pattern="^(self_reported|clinic_assigned|imported|unknown)$",
    ),
    patient_health_coverage: str | None = Query(default=None, pattern=HEALTH_COVERAGE_PATTERN),
    patient_education_level: str | None = Query(default=None, pattern=EDUCATION_LEVEL_PATTERN),
    patient_employment_status: str | None = Query(default=None, pattern=EMPLOYMENT_STATUS_PATTERN),
    patient_ethnicity: str | None = Query(default=None, pattern=ETHNICITY_PATTERN),
    patient_socioeconomic_level: str | None = Query(default=None, pattern=SOCIOECONOMIC_LEVEL_PATTERN),
    model_variant: str | None = Query(default=None),
    record_status: str = Query(default="active", pattern="^(active|archived|all)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> PreventRecordListResponse:
    _ = current_user
    filters = _admin_filters(
        date_from=date_from,
        date_to=date_to,
        physician_name=physician_name,
        diabetes=diabetes,
        smoker=smoker,
        patient_province_code=patient_province_code,
        patient_canton_code=patient_canton_code,
        patient_area_type=patient_area_type,
        patient_geo_source=patient_geo_source,
        patient_health_coverage=patient_health_coverage,
        patient_education_level=patient_education_level,
        patient_employment_status=patient_employment_status,
        patient_ethnicity=patient_ethnicity,
        patient_socioeconomic_level=patient_socioeconomic_level,
        model_variant=model_variant,
        record_status=record_status,
        page=page,
        page_size=page_size,
    )
    return list_prevent_records(db=db, filters=filters)


@router.get("/export")
def export_admin_prevent_records_endpoint(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    physician_name: str | None = Query(default=None),
    diabetes: bool | None = Query(default=None),
    smoker: bool | None = Query(default=None),
    patient_province_code: str | None = Query(default=None),
    patient_canton_code: str | None = Query(default=None),
    patient_area_type: str | None = Query(default=None, pattern="^(urban|rural|unknown)$"),
    patient_geo_source: str | None = Query(
        default=None,
        pattern="^(self_reported|clinic_assigned|imported|unknown)$",
    ),
    patient_health_coverage: str | None = Query(default=None, pattern=HEALTH_COVERAGE_PATTERN),
    patient_education_level: str | None = Query(default=None, pattern=EDUCATION_LEVEL_PATTERN),
    patient_employment_status: str | None = Query(default=None, pattern=EMPLOYMENT_STATUS_PATTERN),
    patient_ethnicity: str | None = Query(default=None, pattern=ETHNICITY_PATTERN),
    patient_socioeconomic_level: str | None = Query(default=None, pattern=SOCIOECONOMIC_LEVEL_PATTERN),
    model_variant: str | None = Query(default=None),
    record_status: str = Query(default="active", pattern="^(active|archived|all)$"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> StreamingResponse:
    _ = current_user
    filters = _admin_filters(
        date_from=date_from,
        date_to=date_to,
        physician_name=physician_name,
        diabetes=diabetes,
        smoker=smoker,
        patient_province_code=patient_province_code,
        patient_canton_code=patient_canton_code,
        patient_area_type=patient_area_type,
        patient_geo_source=patient_geo_source,
        patient_health_coverage=patient_health_coverage,
        patient_education_level=patient_education_level,
        patient_employment_status=patient_employment_status,
        patient_ethnicity=patient_ethnicity,
        patient_socioeconomic_level=patient_socioeconomic_level,
        model_variant=model_variant,
        record_status=record_status,
    )
    csv_content = export_prevent_records_csv(db=db, filters=filters)
    return StreamingResponse(
        BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="admin_prevent_records_export.csv"'},
    )


@router.get("/export.xlsx")
def export_admin_prevent_records_xlsx_endpoint(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    physician_name: str | None = Query(default=None),
    diabetes: bool | None = Query(default=None),
    smoker: bool | None = Query(default=None),
    patient_province_code: str | None = Query(default=None),
    patient_canton_code: str | None = Query(default=None),
    patient_area_type: str | None = Query(default=None, pattern="^(urban|rural|unknown)$"),
    patient_geo_source: str | None = Query(
        default=None,
        pattern="^(self_reported|clinic_assigned|imported|unknown)$",
    ),
    patient_health_coverage: str | None = Query(default=None, pattern=HEALTH_COVERAGE_PATTERN),
    patient_education_level: str | None = Query(default=None, pattern=EDUCATION_LEVEL_PATTERN),
    patient_employment_status: str | None = Query(default=None, pattern=EMPLOYMENT_STATUS_PATTERN),
    patient_ethnicity: str | None = Query(default=None, pattern=ETHNICITY_PATTERN),
    patient_socioeconomic_level: str | None = Query(default=None, pattern=SOCIOECONOMIC_LEVEL_PATTERN),
    model_variant: str | None = Query(default=None),
    record_status: str = Query(default="active", pattern="^(active|archived|all)$"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> StreamingResponse:
    _ = current_user
    filters = _admin_filters(
        date_from=date_from,
        date_to=date_to,
        physician_name=physician_name,
        diabetes=diabetes,
        smoker=smoker,
        patient_province_code=patient_province_code,
        patient_canton_code=patient_canton_code,
        patient_area_type=patient_area_type,
        patient_geo_source=patient_geo_source,
        patient_health_coverage=patient_health_coverage,
        patient_education_level=patient_education_level,
        patient_employment_status=patient_employment_status,
        patient_ethnicity=patient_ethnicity,
        patient_socioeconomic_level=patient_socioeconomic_level,
        model_variant=model_variant,
        record_status=record_status,
    )
    xlsx_content = export_prevent_records_xlsx(db=db, filters=filters)
    return StreamingResponse(
        BytesIO(xlsx_content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="admin_prevent_records_export.xlsx"'},
    )


@router.get("/{record_id}", response_model=PreventRecordDetailResponse)
def get_admin_prevent_record_detail_endpoint(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin),
) -> PreventRecordDetailResponse:
    _ = current_user
    record = get_prevent_record_detail(db=db, record_id=record_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prevent record not found",
        )
    return record
