from __future__ import annotations

import unittest
from datetime import date, timedelta
from uuid import uuid4

from pydantic import ValidationError

from app.api.routes.doctor_profile import get_doctor_profile_endpoint, update_doctor_profile_endpoint
from app.models.doctor import Doctor
from app.models.user import AppUser
from app.schemas.doctor_profile import DoctorProfileUpdate
from app.services.auth_users import AuthenticatedUser


class FakeProfileDb:
    def __init__(self) -> None:
        self.committed = False
        self.refreshed = []

    def commit(self) -> None:
        self.committed = True

    def refresh(self, model) -> None:
        self.refreshed.append(model)


def make_doctor_user() -> AuthenticatedUser:
    user = AppUser(
        id=uuid4(),
        auth_provider="supabase",
        auth_subject="doctor-subject",
        email="doctor@example.com",
        full_name="Dra. Ejemplo",
        role="doctor",
        is_active=True,
    )
    doctor = Doctor(
        id=uuid4(),
        user_id=user.id,
        display_name="Dra. Ejemplo",
    )
    return AuthenticatedUser(user=user, doctor_profile=doctor, claims={})


class DoctorProfileTest(unittest.TestCase):
    def test_get_doctor_profile_returns_own_pending_profile(self) -> None:
        current_user = make_doctor_user()

        response = get_doctor_profile_endpoint(current_user=current_user)

        self.assertEqual(response.email, "doctor@example.com")
        self.assertEqual(response.display_name, "Dra. Ejemplo")
        self.assertEqual(response.profile_status, "pending")

    def test_patch_doctor_profile_updates_editable_fields_and_complete_status(self) -> None:
        current_user = make_doctor_user()
        db = FakeProfileDb()
        payload = DoctorProfileUpdate(
            display_name="Dra. Perfil Completo",
            specialty="Cardiologia",
            phone="+593999999999",
            birth_date=date(1988, 8, 15),
            province_code="17",
            province_name="Pichincha",
            city="Quito",
            institution_name="Hospital PREVENT",
        )

        response = update_doctor_profile_endpoint(
            payload=payload,
            db=db,
            current_user=current_user,
        )

        self.assertTrue(db.committed)
        self.assertEqual(response.display_name, "Dra. Perfil Completo")
        self.assertEqual(response.phone, "+593999999999")
        self.assertEqual(response.province_name, "Pichincha")
        self.assertEqual(response.institution_name, "Hospital PREVENT")
        self.assertEqual(response.profile_status, "complete")

    def test_birth_date_cannot_be_future(self) -> None:
        with self.assertRaises(ValidationError):
            DoctorProfileUpdate(
                display_name="Doctor",
                birth_date=date.today() + timedelta(days=1),
            )


if __name__ == "__main__":
    unittest.main()
