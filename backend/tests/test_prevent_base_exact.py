from __future__ import annotations

import unittest

from app.services.clinical_recommendations import build_clinical_interpretation
from app.services.prevent_engine import calculate_prevent_age, classify_risk, prevent_base_10y


class PreventBaseExactPortTest(unittest.TestCase):
    def test_matches_official_vignette_example_within_point_two_percent(self) -> None:
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

        expected = {
            "cvd_10y": 3.37941,
            "ascvd_10y": 2.101978,
            "hf_10y": 1.698138,
        }

        for key, target in expected.items():
            self.assertIsNotNone(result[key], msg=f"{key} should not be None")
            self.assertLessEqual(
                abs(float(result[key]) - target),
                0.2,
                msg=f"{key} differs from official AHA example: {result[key]} vs {target}",
            )

    def test_low_risk_case_uses_official_percent_scale(self) -> None:
        payload = {
            "sex": 1,
            "age": 38,
            "tc": 165,
            "hdl": 62,
            "sbp": 108,
            "dm": 0,
            "smoking": 0,
            "bmi": 23,
            "egfr": 105,
            "bptreat": 0,
            "statin": 0,
        }
        result = prevent_base_10y(payload)

        expected = {
            "cvd_10y": 0.385283,
            "ascvd_10y": 0.2476011,
            "hf_10y": 0.171623,
        }

        for key, target in expected.items():
            self.assertIsNotNone(result[key], msg=f"{key} should not be None")
            self.assertLessEqual(
                abs(float(result[key]) - target),
                0.05,
                msg=f"{key} differs from official AHA case: {result[key]} vs {target}",
            )

        self.assertEqual(classify_risk(float(result["cvd_10y"])), "Bajo")
        self.assertEqual(classify_risk(float(result["ascvd_10y"])), "Bajo")
        self.assertEqual(classify_risk(float(result["hf_10y"])), "Bajo")
        clinical = build_clinical_interpretation(
            prevent_result={
                "cvd_risk": result["cvd_10y"],
                "ascvd_risk": result["ascvd_10y"],
                "hf_risk": result["hf_10y"],
                "prevent_age": calculate_prevent_age(result["cvd_10y"], payload["sex"]),
                "model_variant": "base",
            },
            input_payload=payload,
        )
        self.assertEqual(clinical["lipid_ascvd_category"]["label"], "Bajo riesgo")
        self.assertEqual(clinical["risk_category"]["label"], "Contexto clínico")

    def test_intermediate_case_uses_official_percent_scale(self) -> None:
        result = prevent_base_10y(
            {
                "sex": 0,
                "age": 52,
                "tc": 158,
                "hdl": 29,
                "sbp": 125,
                "dm": 1,
                "smoking": 0,
                "bmi": 26,
                "egfr": 82,
                "bptreat": 0,
                "statin": 0,
            }
        )

        expected = {
            "cvd_10y": 8.808541,
            "ascvd_10y": 5.639618,
            "hf_10y": 3.566107,
        }

        for key, target in expected.items():
            self.assertIsNotNone(result[key], msg=f"{key} should not be None")
            self.assertLessEqual(
                abs(float(result[key]) - target),
                0.05,
                msg=f"{key} differs from official AHA case: {result[key]} vs {target}",
            )

        self.assertEqual(classify_risk(float(result["cvd_10y"])), "Intermedio")
        self.assertEqual(classify_risk(float(result["ascvd_10y"])), "Borderline")
        self.assertEqual(classify_risk(float(result["hf_10y"])), "Bajo")

    def test_hf_is_none_when_bmi_is_missing_exactly_like_r_base_model(self) -> None:
        result = prevent_base_10y(
            {
                "sex": "female",
                "age": 45,
                "tc": 162,
                "hdl": 31,
                "sbp": 125,
                "dm": 0,
                "smoking": 0,
                "egfr": 95,
                "bptreat": 0,
                "statin": 0,
            }
        )

        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNone(
            result["hf_10y"],
            msg="Official prevent_base requires BMI for HF and returns NA when it is missing.",
        )

    def test_hf_is_computed_when_bmi_is_provided(self) -> None:
        result = prevent_base_10y(
            {
                "sex": "female",
                "age": 45,
                "tc": 162,
                "hdl": 31,
                "sbp": 125,
                "dm": 0,
                "smoking": 0,
                "bmi": 28,
                "egfr": 95,
                "bptreat": 0,
                "statin": 0,
            }
        )

        self.assertIsNotNone(result["hf_10y"])
        self.assertGreaterEqual(float(result["hf_10y"]), 0.4)
        self.assertLessEqual(float(result["hf_10y"]), 2.0)


if __name__ == "__main__":
    unittest.main()
