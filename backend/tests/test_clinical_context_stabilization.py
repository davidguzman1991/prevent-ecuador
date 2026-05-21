from __future__ import annotations

import unittest

from app.services.clinical_recommendations import build_clinical_interpretation


def _recommendation_text(clinical: dict[str, object]) -> str:
    recommendations = clinical.get("recommendations") or []
    return " ".join(
        str(item.get("summary", ""))
        for item in recommendations
        if isinstance(item, dict)
    )


class ClinicalContextStabilizationTest(unittest.TestCase):
    def test_low_prevent_score_with_smoking_is_not_reclassified(self) -> None:
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": 2.8,
                "ascvd_risk": 2.1,
                "hf_risk": 1.3,
                "prevent_age": 42.0,
                "model_variant": "base",
            },
            input_payload={
                "age": 40,
                "sex": "male",
                "smoker": True,
                "diabetes": False,
                "egfr": 95,
                "bmi": 24,
                "hdl": 52,
            },
        )

        self.assertEqual(clinical["prevent_risk_category"]["label"], "Bajo riesgo")
        self.assertEqual(clinical["risk_category"]["label"], "Contexto clínico")
        self.assertIn("Tabaquismo activo", [
            item["label"] for item in clinical["clinical_factors"]["items"]
        ])
        self.assertNotIn("Alto riesgo", _recommendation_text(clinical))
        self.assertIsNone(clinical["ldl_goal"])

    def test_low_prevent_score_with_diabetes_is_not_reclassified(self) -> None:
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": 4.2,
                "ascvd_risk": 3.2,
                "hf_risk": 2.5,
                "prevent_age": 48.0,
                "model_variant": "base",
            },
            input_payload={
                "age": 45,
                "sex": "female",
                "smoker": False,
                "diabetes": True,
                "egfr": 92,
                "bmi": 25,
                "hdl": 55,
            },
        )

        self.assertEqual(clinical["prevent_risk_category"]["label"], "Bajo riesgo")
        self.assertIn("Diabetes mellitus", [
            item["label"] for item in clinical["clinical_factors"]["items"]
        ])
        self.assertIsNone(clinical["ldl_goal"])
        self.assertIn("no modifican el score PREVENT", clinical["disclaimer"])

    def test_intermediate_prevent_score_with_ckd_keeps_prevent_category(self) -> None:
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": 11.2,
                "ascvd_risk": 9.1,
                "hf_risk": 8.4,
                "prevent_age": 65.0,
                "model_variant": "base",
            },
            input_payload={
                "age": 58,
                "sex": "male",
                "smoker": False,
                "diabetes": False,
                "egfr": 48,
                "bmi": 27,
                "hdl": 44,
            },
        )

        self.assertEqual(clinical["prevent_risk_category"]["label"], "Riesgo intermedio")
        self.assertEqual(clinical["risk_category"]["label"], "Contexto clínico")
        self.assertIn("Enfermedad renal crónica probable", [
            item["label"] for item in clinical["clinical_factors"]["items"]
        ])
        self.assertNotIn("reclasificación", _recommendation_text(clinical).lower())


if __name__ == "__main__":
    unittest.main()
