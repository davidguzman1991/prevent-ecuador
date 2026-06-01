from __future__ import annotations

import unittest
from pathlib import Path
from uuid import uuid4

from app.schemas.prevent_record import PreventRecordCreate
from app.services.prevent_engine import compute_prevent_10y, prevent_base_10y
from app.services.prevent_records import calculate_prevent_record_preview, create_prevent_record


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


class FakeSession:
    def __init__(self) -> None:
        self.record = None

    def add(self, record) -> None:
        self.record = record

    def commit(self) -> None:
        return None

    def refresh(self, record) -> None:
        if record.id is None:
            record.id = uuid4()


class MultiuserFoundationTest(unittest.TestCase):
    def test_public_post_keeps_prevent_result_identical(self) -> None:
        db = FakeSession()
        payload = PreventRecordCreate(**BASE_PAYLOAD)
        clinical_payload = {
            key: value
            for key, value in BASE_PAYLOAD.items()
            if key not in {"physician_name", "physician_specialty"}
        }
        expected_variant, expected_result, _ = compute_prevent_10y(clinical_payload)

        response = create_prevent_record(db=db, payload=payload)

        self.assertEqual(response.model_variant, expected_variant)
        self.assertEqual(response.cvd_risk, expected_result["cvd_10y"])
        self.assertEqual(response.ascvd_risk, expected_result["ascvd_10y"])
        self.assertEqual(response.hf_risk, expected_result["hf_10y"])
        self.assertEqual(response.cvd_risk_30y, expected_result["cvd_30y"])
        self.assertEqual(response.ascvd_risk_30y, expected_result["ascvd_30y"])
        self.assertEqual(response.hf_risk_30y, expected_result["hf_30y"])

    def test_public_record_is_marked_anonymous(self) -> None:
        db = FakeSession()
        payload = PreventRecordCreate(**BASE_PAYLOAD)

        response = create_prevent_record(db=db, payload=payload)

        self.assertIsNotNone(db.record)
        self.assertEqual(db.record.source_type, "public")
        self.assertEqual(db.record.user_type, "anonymous")
        self.assertEqual(db.record.visibility_scope, "public_anonymous")
        self.assertEqual(db.record.created_modality, "public_calculator")
        self.assertIsNotNone(db.record.request_id)
        self.assertEqual(response.source_type, "public")
        self.assertEqual(response.user_type, "anonymous")
        self.assertEqual(response.visibility_scope, "public_anonymous")
        self.assertEqual(response.created_modality, "public_calculator")
        self.assertEqual(response.request_id, db.record.request_id)

    def test_preview_calculation_does_not_persist_record(self) -> None:
        db = FakeSession()
        payload = PreventRecordCreate(**BASE_PAYLOAD)

        response = calculate_prevent_record_preview(payload=payload)

        self.assertIsNone(db.record)
        self.assertEqual(response.message, "Prevent risk calculated without saving")
        self.assertIsNone(response.visibility_scope)
        self.assertIsNone(response.owner_doctor_id)

    def test_legacy_backfill_is_in_migration(self) -> None:
        migration = (
            Path(__file__).resolve().parents[1]
            / "alembic"
            / "versions"
            / "f2c9e7a1b5d0_add_multiuser_foundation.py"
        ).read_text(encoding="utf-8")

        self.assertIn("source_type = COALESCE(source_type, 'legacy')", migration)
        self.assertIn("user_type = COALESCE(user_type, 'legacy')", migration)
        self.assertIn(
            "visibility_scope = COALESCE(visibility_scope, 'legacy_admin_only')",
            migration,
        )
        self.assertIn(
            "created_modality = COALESCE(created_modality, 'legacy_dashboard')",
            migration,
        )

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
