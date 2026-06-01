from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException

from app.models.doctor import Doctor
from app.models.user import AppUser
from app.schemas.doctor_admin import AdminDoctorCreate
from app.services.admin_doctors import create_admin_doctor, set_admin_doctor_active
from app.services.supabase_admin import SupabaseAdminClient


class FakeSupabaseAdmin:
    def __init__(self, auth_subject: str = "auth-subject-1") -> None:
        self.auth_subject = auth_subject
        self.created_payloads = []

    def create_user(self, **kwargs):
        self.created_payloads.append(kwargs)
        return {"id": self.auth_subject, "email": kwargs["email"]}


class FakeModelQuery:
    def __init__(self, values) -> None:
        self.values = values

    def filter(self, *criteria):
        _ = criteria
        return self

    def one_or_none(self):
        return self.values.pop(0) if self.values else None


class FakeCreateDoctorDb:
    def __init__(self, user=None, doctor=None) -> None:
        self.user = user
        self.doctor = doctor
        self.added = []
        self.committed = False
        self.refreshed = []

    def query(self, model):
        if model is AppUser:
            return FakeModelQuery([self.user])
        if model is Doctor:
            return FakeModelQuery([self.doctor])
        return FakeModelQuery([None])

    def add(self, model) -> None:
        self.added.append(model)
        if isinstance(model, AppUser):
            self.user = model
        if isinstance(model, Doctor):
            self.doctor = model

    def flush(self) -> None:
        if self.user is not None and self.user.id is None:
            self.user.id = uuid4()
        if self.doctor is not None and self.doctor.id is None:
            self.doctor.id = uuid4()

    def commit(self) -> None:
        self.committed = True

    def refresh(self, model) -> None:
        self.refreshed.append(model)
        if getattr(model, "created_at", None) is None:
            model.created_at = datetime.now(timezone.utc)


class FakeActivateDb:
    def __init__(self, doctor: Doctor, user: AppUser) -> None:
        self.doctor = doctor
        self.user = user
        self.committed = False

    def get(self, model, model_id):
        _ = model_id
        if model is Doctor:
            return self.doctor
        if model is AppUser:
            return self.user
        return None

    def commit(self) -> None:
        self.committed = True

    def refresh(self, model) -> None:
        _ = model


class AdminDoctorsTest(unittest.TestCase):
    def test_supabase_service_role_missing_returns_clear_error(self) -> None:
        client = SupabaseAdminClient()
        client.project_url = "https://example.supabase.co"
        client.service_role_key = ""

        with self.assertRaises(HTTPException) as context:
            client._require_config()

        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, "Supabase service role key is not configured.")

    def test_create_doctor_reuses_existing_app_user_by_email(self) -> None:
        user = AppUser(
            id=uuid4(),
            auth_provider="supabase",
            auth_subject="old-subject",
            email="doctor@example.com",
            full_name="Old Name",
            role="doctor",
            is_active=False,
        )
        doctor = Doctor(
            id=uuid4(),
            user_id=user.id,
            display_name="Old Doctor",
            created_at=datetime.now(timezone.utc),
        )
        db = FakeCreateDoctorDb(user=user, doctor=doctor)
        supabase = FakeSupabaseAdmin(auth_subject="new-subject")
        payload = AdminDoctorCreate(
            email="Doctor@Example.com",
            full_name="Dra. Nueva",
            display_name="Dra. Nueva",
            specialty="Cardiologia",
        )

        with patch("app.services.admin_doctors.get_admin_doctor") as get_doctor:
            get_doctor.return_value = doctor
            create_admin_doctor(db=db, payload=payload, supabase_admin=supabase)

        self.assertNotIn(user, db.added)
        self.assertEqual(user.auth_subject, "new-subject")
        self.assertEqual(user.email, "doctor@example.com")
        self.assertEqual(user.full_name, "Dra. Nueva")
        self.assertTrue(user.is_active)
        self.assertEqual(doctor.display_name, "Dra. Nueva")

    def test_deactivate_doctor_sets_user_inactive_without_deleting(self) -> None:
        user = AppUser(
            id=uuid4(),
            auth_provider="supabase",
            auth_subject="doctor-subject",
            email="doctor@example.com",
            role="doctor",
            is_active=True,
        )
        doctor = Doctor(id=uuid4(), user_id=user.id, display_name="Doctor")
        db = FakeActivateDb(doctor=doctor, user=user)

        with patch("app.services.admin_doctors.get_admin_doctor") as get_doctor:
            get_doctor.return_value = doctor
            set_admin_doctor_active(db=db, doctor_id=doctor.id, is_active=False)

        self.assertFalse(user.is_active)
        self.assertTrue(db.committed)


if __name__ == "__main__":
    unittest.main()
