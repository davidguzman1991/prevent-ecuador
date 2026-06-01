from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest.mock import Mock, patch
from uuid import UUID, uuid4

from fastapi import HTTPException

from app.api.router import api_router
from app.api.routes.admin_prevent_records import (
    count_admin_doctors_endpoint,
    export_admin_prevent_records_endpoint,
    get_admin_prevent_record_detail_endpoint,
    list_admin_prevent_records_endpoint,
)
from app.api.routes.doctor_prevent_records import (
    export_doctor_prevent_records_endpoint,
    list_doctor_prevent_records_endpoint,
)
from app.core.auth import get_current_user_required, require_admin, require_doctor
from app.models.doctor import Doctor
from app.models.prevent_record import PreventRecord
from app.models.user import AppUser
from app.schemas.prevent_record import PreventRecordCreate, PreventRecordListFilters
from app.services.auth_users import AuthenticatedUser
from app.services.prevent_engine import prevent_base_10y
from app.services.prevent_records import (
    _build_prevent_records_query,
    create_prevent_record,
    get_prevent_record_detail,
)


BASE_PAYLOAD = {
    "age": 55,
    "sex": "male",
    "total_cholesterol": 220,
    "hdl": 45,
    "sbp": 132,
    "egfr": 92,
    "bmi": 28,
    "diabetes": True,
    "smoker": False,
    "antihypertensive_use": False,
    "statin_use": False,
    "physician_name": "Dr. Example",
    "physician_specialty": "Cardiologia",
}


class FakeQuery:
    def __init__(self) -> None:
        self.criteria = []

    def filter(self, *criteria):
        self.criteria.extend(criteria)
        return self


class FakeQueryDb:
    def __init__(self) -> None:
        self.query_obj = FakeQuery()

    def query(self, *args, **kwargs):
        return self.query_obj


class FakeGetDb:
    def __init__(self, record) -> None:
        self.record = record

    def get(self, model, record_id):
        return self.record


class FakeRecordSession:
    def __init__(self) -> None:
        self.record = None

    def add(self, record) -> None:
        self.record = record

    def commit(self) -> None:
        return None

    def refresh(self, record) -> None:
        if record.id is None:
            record.id = uuid4()


class FakeScalarQuery:
    def __init__(self, value: int) -> None:
        self.value = value

    def scalar(self) -> int:
        return self.value


class FakeCountDb:
    def __init__(self, value: int) -> None:
        self.value = value

    def query(self, *args, **kwargs):
        return FakeScalarQuery(self.value)


def make_current_user(role: str = "doctor", doctor_id: UUID | None = None) -> AuthenticatedUser:
    user = AppUser(
        id=uuid4(),
        auth_provider="supabase",
        auth_subject=f"{role}-subject",
        email=f"{role}@example.com",
        full_name=f"{role.title()} User",
        role=role,
        is_active=True,
    )
    doctor = None
    if doctor_id is not None:
        doctor = Doctor(id=doctor_id, user_id=user.id, display_name="Doctor User")
    return AuthenticatedUser(user=user, doctor_profile=doctor, claims={})


class AuthorizationScopesTest(unittest.TestCase):
    def test_router_registers_doctor_and_admin_endpoints(self) -> None:
        paths = {route.path for route in api_router.routes}

        self.assertIn("/doctor/prevent-records/list", paths)
        self.assertIn("/doctor/prevent-records/{record_id}", paths)
        self.assertIn("/doctor/prevent-records/export", paths)
        self.assertIn("/doctor/prevent-records/export.xlsx", paths)
        self.assertIn("/admin/prevent-records/list", paths)
        self.assertIn("/admin/prevent-records/{record_id}", paths)
        self.assertIn("/admin/prevent-records/export", paths)
        self.assertIn("/admin/prevent-records/export.xlsx", paths)

    def test_unauthenticated_user_cannot_access_required_dependencies(self) -> None:
        with self.assertRaises(HTTPException) as context:
            get_current_user_required(current_user=None)

        self.assertEqual(context.exception.status_code, 401)

    def test_doctor_role_accesses_doctor_dependency_but_not_admin_dependency(self) -> None:
        doctor = make_current_user(role="doctor", doctor_id=uuid4())

        self.assertIs(require_doctor(current_user=doctor), doctor)
        with self.assertRaises(HTTPException) as context:
            require_admin(current_user=doctor)

        self.assertEqual(context.exception.status_code, 403)

    def test_admin_role_accesses_admin_dependency_but_not_doctor_dependency(self) -> None:
        admin = make_current_user(role="global_admin")

        self.assertIs(require_admin(current_user=admin), admin)
        with self.assertRaises(HTTPException) as context:
            require_doctor(current_user=admin)

        self.assertEqual(context.exception.status_code, 403)

    def test_doctor_query_scope_filters_owner_and_doctor_private_only(self) -> None:
        doctor_id = uuid4()
        db = FakeQueryDb()
        filters = PreventRecordListFilters(
            owner_doctor_id=doctor_id,
            visibility_scope="doctor_private",
        )

        query = _build_prevent_records_query(db, filters)
        criteria_sql = " ".join(str(criteria) for criteria in query.criteria)

        self.assertIn("owner_doctor_id", criteria_sql)
        self.assertIn("visibility_scope", criteria_sql)
        self.assertIn("is_deleted", criteria_sql)

    def test_doctor_list_endpoint_passes_private_owner_scope_to_service(self) -> None:
        doctor_id = uuid4()
        doctor = make_current_user(role="doctor", doctor_id=doctor_id)
        response = Mock()

        with patch(
            "app.api.routes.doctor_prevent_records.list_prevent_records",
            return_value=response,
        ) as list_mock:
            returned = list_doctor_prevent_records_endpoint(
                db=Mock(),
                current_user=doctor,
                date_from=None,
                date_to=None,
                physician_name=None,
                diabetes=None,
                smoker=None,
                patient_province_code=None,
                patient_canton_code=None,
                patient_area_type=None,
                patient_geo_source=None,
                patient_health_coverage=None,
                patient_education_level=None,
                patient_employment_status=None,
                patient_ethnicity=None,
                patient_socioeconomic_level=None,
                model_variant=None,
                record_status="active",
                page=1,
                page_size=20,
            )

        self.assertIs(returned, response)
        filters = list_mock.call_args.kwargs["filters"]
        self.assertEqual(filters.owner_doctor_id, doctor_id)
        self.assertEqual(filters.visibility_scope, "doctor_private")
        self.assertFalse(filters.include_public)
        self.assertFalse(filters.include_legacy)

    def test_doctor_export_endpoint_passes_private_owner_scope_to_service(self) -> None:
        doctor_id = uuid4()
        doctor = make_current_user(role="doctor", doctor_id=doctor_id)

        with patch(
            "app.api.routes.doctor_prevent_records.export_prevent_records_csv",
            return_value="\ufeffid\r\n",
        ) as export_mock:
            export_doctor_prevent_records_endpoint(
                db=Mock(),
                current_user=doctor,
                date_from=None,
                date_to=None,
                physician_name=None,
                diabetes=None,
                smoker=None,
                patient_province_code=None,
                patient_canton_code=None,
                patient_area_type=None,
                patient_geo_source=None,
                patient_health_coverage=None,
                patient_education_level=None,
                patient_employment_status=None,
                patient_ethnicity=None,
                patient_socioeconomic_level=None,
                model_variant=None,
                record_status="active",
            )

        filters = export_mock.call_args.kwargs["filters"]
        self.assertEqual(filters.owner_doctor_id, doctor_id)
        self.assertEqual(filters.visibility_scope, "doctor_private")

    def test_doctor_cannot_open_foreign_legacy_or_public_records_by_id(self) -> None:
        doctor_id = uuid4()
        other_doctor_id = uuid4()
        record_id = uuid4()

        for owner_doctor_id, visibility_scope in [
            (other_doctor_id, "doctor_private"),
            (None, "legacy_admin_only"),
            (None, "public_anonymous"),
        ]:
            with self.subTest(owner_doctor_id=owner_doctor_id, visibility_scope=visibility_scope):
                record = PreventRecord(
                    id=record_id,
                    owner_doctor_id=owner_doctor_id,
                    visibility_scope=visibility_scope,
                )

                detail = get_prevent_record_detail(
                    db=FakeGetDb(record),
                    record_id=record_id,
                    owner_doctor_id=doctor_id,
                    visibility_scope="doctor_private",
                )

                self.assertIsNone(detail)

    def test_doctor_can_open_own_private_record(self) -> None:
        doctor_id = uuid4()
        record_id = uuid4()
        now = datetime.now(timezone.utc)
        record = PreventRecord(
            id=record_id,
            created_at=now,
            updated_at=now,
            is_deleted=False,
            deleted_at=None,
            patient_age=55,
            patient_sex="male",
            patient_country="Ecuador",
            diabetes=True,
            smoker=False,
            statin_use=False,
            antihypertensive_use=False,
            physician_name="Dr. A",
            physician_specialty="Cardiologia",
            engine_version="AHA_PREVENT_original_adapted",
            source_org="ANOVA Research Group",
            initiative_name="Red Ecuatoriana de Cardiometabolismo DOH",
            director_name="Dr. David Guzmán",
            consent_for_research=True,
            owner_doctor_id=doctor_id,
            visibility_scope="doctor_private",
            cvd_risk_10y=1.2,
            ascvd_risk_10y=0.8,
            hf_risk_10y=0.5,
        )

        detail = get_prevent_record_detail(
            db=FakeGetDb(record),
            record_id=record_id,
            owner_doctor_id=doctor_id,
            visibility_scope="doctor_private",
        )

        self.assertIsNotNone(detail)
        self.assertEqual(detail.owner_doctor_id, doctor_id)

    def test_admin_list_and_export_have_global_scope(self) -> None:
        admin = make_current_user(role="global_admin")
        response = Mock()

        with patch(
            "app.api.routes.admin_prevent_records.list_prevent_records",
            return_value=response,
        ) as list_mock:
            returned = list_admin_prevent_records_endpoint(
                db=Mock(),
                current_user=admin,
                date_from=None,
                date_to=None,
                physician_name=None,
                diabetes=None,
                smoker=None,
                patient_province_code=None,
                patient_canton_code=None,
                patient_area_type=None,
                patient_geo_source=None,
                patient_health_coverage=None,
                patient_education_level=None,
                patient_employment_status=None,
                patient_ethnicity=None,
                patient_socioeconomic_level=None,
                model_variant=None,
                record_status="active",
                page=1,
                page_size=20,
            )

        self.assertIs(returned, response)
        filters = list_mock.call_args.kwargs["filters"]
        self.assertIsNone(filters.owner_doctor_id)
        self.assertIsNone(filters.visibility_scope)
        self.assertTrue(filters.admin_mode)
        self.assertTrue(filters.include_public)
        self.assertTrue(filters.include_legacy)

        with patch(
            "app.api.routes.admin_prevent_records.export_prevent_records_csv",
            return_value="\ufeffid\r\n",
        ) as export_mock:
            export_admin_prevent_records_endpoint(
                db=Mock(),
                current_user=admin,
                date_from=None,
                date_to=None,
                physician_name=None,
                diabetes=None,
                smoker=None,
                patient_province_code=None,
                patient_canton_code=None,
                patient_area_type=None,
                patient_geo_source=None,
                patient_health_coverage=None,
                patient_education_level=None,
                patient_employment_status=None,
                patient_ethnicity=None,
                patient_socioeconomic_level=None,
                model_variant=None,
                record_status="active",
            )

        filters = export_mock.call_args.kwargs["filters"]
        self.assertIsNone(filters.owner_doctor_id)
        self.assertTrue(filters.admin_mode)

    def test_admin_can_open_any_record_detail_without_owner_scope(self) -> None:
        admin = make_current_user(role="global_admin")
        record_id = uuid4()
        response = Mock()

        with patch(
            "app.api.routes.admin_prevent_records.get_prevent_record_detail",
            return_value=response,
        ) as detail_mock:
            returned = get_admin_prevent_record_detail_endpoint(
                record_id=record_id,
                db=Mock(),
                current_user=admin,
            )

        self.assertIs(returned, response)
        self.assertEqual(detail_mock.call_args.kwargs["record_id"], record_id)
        self.assertNotIn("owner_doctor_id", detail_mock.call_args.kwargs)

    def test_admin_doctor_count_uses_doctors_table_count(self) -> None:
        admin = make_current_user(role="global_admin")

        response = count_admin_doctors_endpoint(
            db=FakeCountDb(2),
            current_user=admin,
        )

        self.assertEqual(response, {"total_doctors": 2})

    def test_public_and_doctor_post_compatibility_remain_intact(self) -> None:
        anonymous_db = FakeRecordSession()
        public_response = create_prevent_record(
            db=anonymous_db,
            payload=PreventRecordCreate(**BASE_PAYLOAD),
        )
        self.assertEqual(public_response.source_type, "public")
        self.assertEqual(public_response.user_type, "anonymous")
        self.assertEqual(public_response.visibility_scope, "public_anonymous")

        doctor_id = uuid4()
        current_user = make_current_user(role="doctor", doctor_id=doctor_id)
        doctor_db = FakeRecordSession()
        doctor_response = create_prevent_record(
            db=doctor_db,
            payload=PreventRecordCreate(**BASE_PAYLOAD),
            current_user=current_user,
        )
        self.assertEqual(doctor_response.source_type, "doctor")
        self.assertEqual(doctor_response.user_type, "doctor")
        self.assertEqual(doctor_response.visibility_scope, "doctor_private")
        self.assertEqual(doctor_response.owner_doctor_id, doctor_id)

    def test_legacy_admin_api_key_routes_still_exist(self) -> None:
        paths = {route.path for route in api_router.routes}

        self.assertIn("/prevent-records/list", paths)
        self.assertIn("/prevent-records/{record_id}", paths)
        self.assertIn("/prevent-records/export", paths)
        self.assertIn("/prevent-records/export.xlsx", paths)

    def test_prevent_engine_reference_output_is_unchanged(self) -> None:
        result = prevent_base_10y(
            {
                "sex": 1,
                "age": 45,
                "tc": 200,
                "hdl": 60,
                "sbp": 120,
                "dm": 1,
                "smoking": 0,
                "bmi": 25,
                "egfr": 95,
                "bptreat": 0,
                "statin": 0,
            }
        )

        self.assertAlmostEqual(float(result["cvd_10y"]), 3.37941, places=5)
        self.assertAlmostEqual(float(result["ascvd_10y"]), 2.101978, places=5)
        self.assertAlmostEqual(float(result["hf_10y"]), 1.698138, places=5)


if __name__ == "__main__":
    unittest.main()
