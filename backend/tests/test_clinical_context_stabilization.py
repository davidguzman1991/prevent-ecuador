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


def _domain(clinical: dict[str, object], key: str) -> dict[str, object]:
    domains = clinical.get("domain_recommendations") or []
    for item in domains:
        if isinstance(item, dict) and item.get("key") == key:
            return item
    raise AssertionError(f"Domain {key} not found")


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
                "ascvd_risk": 2.8,
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
        self.assertIn("El score PREVENT no se modifica", clinical["disclaimer"])

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

    def test_lipid_domain_uses_ascvd_not_higher_cvd(self) -> None:
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": 18.0,
                "ascvd_risk": 2.7,
                "hf_risk": 3.0,
                "prevent_age": 61.0,
                "model_variant": "base",
            },
            input_payload={
                "age": 55,
                "sex": "male",
                "smoker": False,
                "diabetes": False,
                "egfr": 90,
                "bmi": 25,
                "hdl": 50,
                "sbp": 132,
            },
        )

        lipid = _domain(clinical, "lipids")
        bp = _domain(clinical, "blood_pressure")
        self.assertEqual(lipid["base"], "ASCVD 10 años")
        self.assertEqual(lipid["risk"], 2.7)
        self.assertEqual(lipid["category"], "low")
        self.assertEqual(bp["base"], "CVD global 10 años")
        self.assertEqual(bp["risk"], 18.0)
        self.assertIsNone(clinical["ldl_goal"])

    def test_isolated_high_hf_is_not_lipid_mandate(self) -> None:
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": 4.0,
                "ascvd_risk": 2.4,
                "hf_risk": 22.0,
                "prevent_age": 58.0,
                "model_variant": "base",
            },
            input_payload={
                "age": 54,
                "sex": "female",
                "smoker": False,
                "diabetes": False,
                "egfr": 82,
                "bmi": 34,
                "hdl": 48,
                "sbp": 124,
            },
        )

        hf = _domain(clinical, "heart_failure")
        lipid = _domain(clinical, "lipids")
        self.assertEqual(hf["base"], "HF 10 años")
        self.assertEqual(hf["risk"], 22.0)
        self.assertEqual(lipid["category"], "low")
        self.assertIsNone(clinical["ldl_goal"])
        self.assertNotIn("estatina", _recommendation_text(clinical).lower())

    def test_low_egfr_is_renal_context_without_score_reclassification(self) -> None:
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": 6.0,
                "ascvd_risk": 2.6,
                "hf_risk": 4.0,
                "prevent_age": 57.0,
                "model_variant": "base",
            },
            input_payload={
                "age": 52,
                "sex": "male",
                "smoker": False,
                "diabetes": False,
                "egfr": 45,
                "uacr": 40,
                "bmi": 26,
                "hdl": 45,
                "sbp": 128,
            },
        )

        renal = _domain(clinical, "renal")
        self.assertEqual(renal["base"], "eGFR / perfil renal")
        self.assertEqual(renal["risk"], 45)
        self.assertIn("Enfermedad renal crónica probable", [
            item["label"] for item in clinical["clinical_factors"]["items"]
        ])
        self.assertEqual(clinical["prevent_risk_category"]["label"], "Bajo riesgo")


if __name__ == "__main__":
    unittest.main()
