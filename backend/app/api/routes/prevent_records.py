import logging
from datetime import date
from io import BytesIO
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_optional
from app.core.dependencies import get_db, require_admin_api_key
from app.schemas.prevent_record import (
    PreventRecordCreate,
    PreventRecordCreateResponse,
    PreventRecordDetailResponse,
    PreventRecordListFilters,
    PreventRecordListResponse,
)
from app.services.prevent_records import (
    archive_prevent_record,
    create_prevent_record,
    export_prevent_records_csv,
    export_prevent_records_xlsx,
    get_prevent_record_detail,
    list_prevent_records,
    restore_prevent_record,
)
from app.services.auth_users import AuthenticatedUser


router = APIRouter()
logger = logging.getLogger(__name__)

HEALTH_COVERAGE_PATTERN = "^(iess|msp|private|issfa|isspol|none|unknown)$"
EDUCATION_LEVEL_PATTERN = "^(no_schooling|primary|secondary|higher|postgraduate|unknown)$"
EMPLOYMENT_STATUS_PATTERN = (
    "^(employed|self_employed|unemployed|retired|homemaker|student|other|unknown)$"
)
ETHNICITY_PATTERN = "^(mestizo|montubio|afro_ecuadorian|indigenous|white|other|unknown)$"
SOCIOECONOMIC_LEVEL_PATTERN = "^(low|middle|high|prefer_not_to_answer)$"


@router.get(
    "/list",
    response_model=PreventRecordListResponse,
    dependencies=[Depends(require_admin_api_key)],
)
def list_prevent_records_endpoint(
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
) -> PreventRecordListResponse:
    filters = PreventRecordListFilters(
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


@router.get("/export", dependencies=[Depends(require_admin_api_key)])
def export_prevent_records_endpoint(
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
) -> StreamingResponse:
    filters = PreventRecordListFilters(
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
    filename = "prevent_records_export.csv"
    return StreamingResponse(
        BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export.xlsx", dependencies=[Depends(require_admin_api_key)])
def export_prevent_records_xlsx_endpoint(
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
) -> StreamingResponse:
    filters = PreventRecordListFilters(
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
    filename = "prevent_records_export.xlsx"
    return StreamingResponse(
        BytesIO(xlsx_content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.patch(
    "/{record_id}/archive",
    response_model=PreventRecordDetailResponse,
    dependencies=[Depends(require_admin_api_key)],
)
def archive_prevent_record_endpoint(
    record_id: UUID,
    db: Session = Depends(get_db),
) -> PreventRecordDetailResponse:
    record = archive_prevent_record(db=db, record_id=record_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prevent record not found",
        )
    detail = get_prevent_record_detail(db=db, record_id=record_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prevent record not found",
        )
    return detail


@router.patch(
    "/{record_id}/restore",
    response_model=PreventRecordDetailResponse,
    dependencies=[Depends(require_admin_api_key)],
)
def restore_prevent_record_endpoint(
    record_id: UUID,
    db: Session = Depends(get_db),
) -> PreventRecordDetailResponse:
    record = restore_prevent_record(db=db, record_id=record_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prevent record not found",
        )
    detail = get_prevent_record_detail(db=db, record_id=record_id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prevent record not found",
        )
    return detail


@router.post(
    "/",
    response_model=PreventRecordCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_prevent_record_endpoint(
    payload: PreventRecordCreate,
    debug: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser | None = Depends(get_current_user_optional),
) -> PreventRecordCreateResponse:
    # Manual test payload:
    # {
    #   "age": 55,
    #   "sex": "male",
    #   "total_cholesterol": 220,
    #   "hdl": 40,
    #   "sbp": 130,
    #   "diabetes": true,
    #   "smoker": false,
    #   "egfr": 95,
    #   "antihypertensive_use": false,
    #   "statin_use": false,
    #   "physician_name": "Dr. Example",
    #   "physician_specialty": "Cardiology"
    # }
    owner_doctor_id = (
        current_user.doctor_profile.id
        if current_user is not None and current_user.doctor_profile is not None
        else None
    )
    logger.info(
        "PREVENT_AUTH current_user_is_none=%s current_user_email=%s owner_doctor_id=%s visibility_scope=%s",
        current_user is None,
        current_user.user.email if current_user is not None else None,
        owner_doctor_id,
        "doctor_private" if current_user is not None else "public_anonymous",
    )

    try:
        return create_prevent_record(
            db=db,
            payload=payload,
            debug=debug,
            current_user=current_user,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{record_id}",
    response_model=PreventRecordDetailResponse,
    dependencies=[Depends(require_admin_api_key)],
)
def get_prevent_record_detail_endpoint(
    record_id: UUID,
    db: Session = Depends(get_db),
) -> PreventRecordDetailResponse:
    record = get_prevent_record_detail(db=db, record_id=record_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prevent record not found",
        )

    return record
