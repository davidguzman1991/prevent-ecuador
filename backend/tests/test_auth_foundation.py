from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.core import auth as auth_core
from app.core.config import Settings
from app.models.doctor import Doctor
from app.models.user import AppUser
from app.schemas.prevent_record import PreventRecordCreate
from app.services import auth_users
from app.services.auth_users import AuthenticatedUser, sync_authenticated_user
from app.services.prevent_engine import prevent_base_10y
from app.services.prevent_records import create_prevent_record


JWT_SECRET = "test-supabase-jwt-secret-with-enough-length"
JWT_ISSUER = "https://test-project.supabase.co/auth/v1"
JWT_AUDIENCE = "authenticated"

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


def build_token(
    *,
    sub: str = "auth-user-1",
    email: str = "doctor@example.com",
    full_name: str = "Dra. Example",
) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "aud": JWT_AUDIENCE,
        "iss": JWT_ISSUER,
        "sub": sub,
        "email": email,
        "user_metadata": {"full_name": full_name},
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
    }
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


class FakeQuery:
    def __init__(self, db: "FakeAuthSession", model) -> None:
        self.db = db
        self.model = model

    def filter(self, *args, **kwargs) -> "FakeQuery":
        return self

    def one_or_none(self):
        if self.model is AppUser:
            if self.db.user_query_results:
                return self.db.user_query_results.pop(0)
            return self.db.users[0] if self.db.users else None
        if self.model is Doctor:
            return self.db.doctors[0] if self.db.doctors else None
        return None


class FakeAuthSession:
    def __init__(self, user_query_results: list[AppUser | None] | None = None) -> None:
        self.users: list[AppUser] = []
        self.doctors: list[Doctor] = []
        self.user_query_results = user_query_results or []

    def query(self, model):
        return FakeQuery(self, model)

    def add(self, instance) -> None:
        if getattr(instance, "id", None) is None:
            instance.id = uuid4()
        now = datetime.now(timezone.utc)
        if getattr(instance, "created_at", None) is None:
            instance.created_at = now
        if getattr(instance, "updated_at", None) is None:
            instance.updated_at = now
        if isinstance(instance, AppUser):
            self.users.append(instance)
        if isinstance(instance, Doctor):
            self.doctors.append(instance)

    def flush(self) -> None:
        return None

    def commit(self) -> None:
        return None

    def refresh(self, instance) -> None:
        if getattr(instance, "id", None) is None:
            instance.id = uuid4()


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


class AuthFoundationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.previous_auth_settings = auth_core.settings
        self.previous_user_settings = auth_users.settings
        test_settings = Settings(
            SUPABASE_JWT_SECRET=JWT_SECRET,
            SUPABASE_AUTH_AUDIENCE=JWT_AUDIENCE,
            SUPABASE_AUTH_ISSUER=JWT_ISSUER,
        )
        auth_core.settings = test_settings
        auth_users.settings = test_settings

    def tearDown(self) -> None:
        auth_core.settings = self.previous_auth_settings
        auth_users.settings = self.previous_user_settings

    def test_auth_me_without_token_returns_401(self) -> None:
        with self.assertRaises(Exception) as context:
            auth_core.get_current_user_required(current_user=None)

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Authentication required")

    def test_valid_supabase_token_creates_and_syncs_user(self) -> None:
        token = build_token()
        claims = auth_core.verify_supabase_jwt(token)
        db = FakeAuthSession()

        current_user = sync_authenticated_user(db=db, claims=claims)

        self.assertEqual(current_user.user.auth_provider, "supabase")
        self.assertEqual(current_user.user.auth_subject, "auth-user-1")
        self.assertEqual(current_user.user.email, "doctor@example.com")
        self.assertEqual(current_user.user.full_name, "Dra. Example")
        self.assertEqual(current_user.user.role, "doctor")
        self.assertTrue(current_user.user.is_active)
        self.assertIsNotNone(current_user.doctor_profile)
        self.assertEqual(current_user.doctor_profile.user_id, current_user.user.id)

    def test_admin_role_can_be_detected_from_configured_email(self) -> None:
        admin_settings = Settings(
            SUPABASE_JWT_SECRET=JWT_SECRET,
            SUPABASE_AUTH_AUDIENCE=JWT_AUDIENCE,
            SUPABASE_AUTH_ISSUER=JWT_ISSUER,
            PREVENT_GLOBAL_ADMIN_EMAILS="admin@example.com",
        )
        auth_core.settings = admin_settings
        auth_users.settings = admin_settings
        claims = auth_core.verify_supabase_jwt(
            build_token(sub="admin-1", email="admin@example.com", full_name="Admin"),
        )
        db = FakeAuthSession()

        current_user = sync_authenticated_user(db=db, claims=claims)

        self.assertEqual(current_user.user.role, "global_admin")
        self.assertIsNone(current_user.doctor_profile)

    def test_existing_email_with_new_supabase_subject_is_linked_without_insert(self) -> None:
        existing_user = AppUser(
            id=uuid4(),
            auth_provider="supabase",
            auth_subject="old-stage2-subject",
            email="davidguzman.med@gmail.com",
            full_name="David Guzman",
            role="global_admin",
            is_active=True,
        )
        db = FakeAuthSession(user_query_results=[None, existing_user])
        claims = {
            "sub": "real-supabase-subject",
            "email": "davidguzman.med@gmail.com",
            "user_metadata": {"full_name": "David Guzman"},
        }

        current_user = sync_authenticated_user(db=db, claims=claims)

        self.assertEqual(current_user.user.id, existing_user.id)
        self.assertEqual(current_user.user.auth_provider, "supabase")
        self.assertEqual(current_user.user.auth_subject, "real-supabase-subject")
        self.assertEqual(current_user.user.email, "davidguzman.med@gmail.com")
        self.assertEqual(current_user.user.role, "global_admin")
        self.assertEqual(db.users, [])

    def test_doctor_user_creates_record_with_owner_doctor_id(self) -> None:
        user = AppUser(
            id=uuid4(),
            auth_provider="supabase",
            auth_subject="auth-user-1",
            email="doctor@example.com",
            full_name="Dra. Example",
            role="doctor",
            is_active=True,
        )
        doctor = Doctor(id=uuid4(), user_id=user.id, display_name="Dra. Example")
        current_user = AuthenticatedUser(user=user, doctor_profile=doctor, claims={})
        db = FakeRecordSession()

        response = create_prevent_record(
            db=db,
            payload=PreventRecordCreate(**BASE_PAYLOAD),
            current_user=current_user,
        )

        self.assertEqual(db.record.created_by_user_id, user.id)
        self.assertEqual(db.record.owner_doctor_id, doctor.id)
        self.assertEqual(db.record.source_type, "doctor")
        self.assertEqual(db.record.user_type, "doctor")
        self.assertEqual(db.record.visibility_scope, "doctor_private")
        self.assertEqual(db.record.created_modality, "doctor_calculator")
        self.assertEqual(response.owner_doctor_id, doctor.id)

    def test_anonymous_user_creates_public_record(self) -> None:
        db = FakeRecordSession()

        response = create_prevent_record(
            db=db,
            payload=PreventRecordCreate(**BASE_PAYLOAD),
        )

        self.assertIsNone(db.record.created_by_user_id)
        self.assertIsNone(db.record.owner_doctor_id)
        self.assertEqual(response.source_type, "public")
        self.assertEqual(response.user_type, "anonymous")
        self.assertEqual(response.visibility_scope, "public_anonymous")

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
