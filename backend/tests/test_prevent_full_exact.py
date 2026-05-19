from __future__ import annotations

import unittest

from app.services.prevent_engine import compute_prevent_10y, prevent_base_10y, prevent_full_10y


class PreventFullExactPortTest(unittest.TestCase):
    def test_matches_official_dataframe_row_example_within_point_two_percent(self) -> None:
        result = prevent_full_10y(
            {
                "sex": 1,
                "age": 45,
                "tc": 200,
                "hdl": 60,
                "sbp": 120,
                "dm": 1,
                "smoking": 1,
                "bmi": 25,
                "egfr": 95,
                "bptreat": 0,
                "statin": 0,
                "uacr": 150,
                "hba1c": 8.5,
                "sdi": 10,
            }
        )

        expected = {
            "cvd_10y": 9.387279,
            "ascvd_10y": 5.283784,
            "hf_10y": 6.556148,
        }

        for key, target in expected.items():
            self.assertIsNotNone(result[key], msg=f"{key} should not be None")
            self.assertLessEqual(abs(float(result[key]) - target), 0.2)

    def test_variant_selection_uses_full_when_multiple_optional_inputs_are_present(self) -> None:
        model_variant, result = compute_prevent_10y(
            {
                "sex": 1,
                "age": 45,
                "tc": 200,
                "hdl": 60,
                "sbp": 120,
                "dm": 1,
                "smoking": 1,
                "bmi": 25,
                "egfr": 95,
                "bptreat": 0,
                "statin": 0,
                "uacr": 150,
                "hba1c": 8.5,
            }
        )

        self.assertEqual(model_variant, "full")
        self.assertIsNotNone(result["cvd_10y"])

    def test_explicit_variant_overrides_automatic_selection(self) -> None:
        payload = {
            "sex": 1,
            "age": 45,
            "tc": 200,
            "hdl": 60,
            "sbp": 120,
            "dm": 1,
            "smoking": 1,
            "bmi": 25,
            "egfr": 95,
            "bptreat": 0,
            "statin": 0,
            "uacr": 150,
            "hba1c": 8.5,
            "sdi": 10,
        }
        base_result = prevent_base_10y(payload)
        model_variant, result = compute_prevent_10y(payload, "base")

        self.assertEqual(model_variant, "base")
        self.assertAlmostEqual(float(result["cvd_10y"]), float(base_result["cvd_10y"]), places=9)
        self.assertAlmostEqual(float(result["ascvd_10y"]), float(base_result["ascvd_10y"]), places=9)
        self.assertAlmostEqual(float(result["hf_10y"]), float(base_result["hf_10y"]), places=9)

    def test_missing_bmi_keeps_hf_null_in_full_model(self) -> None:
        result = prevent_full_10y(
            {
                "sex": 1,
                "age": 39,
                "tc": 190,
                "hdl": 50,
                "sbp": 110,
                "dm": 1,
                "smoking": 0,
                "egfr": 120,
                "bptreat": 0,
                "statin": 0,
                "uacr": 500,
                "hba1c": 6.0,
                "sdi": 8,
            }
        )

        self.assertLessEqual(abs(float(result["cvd_10y"]) - 3.140486), 0.2)
        self.assertLessEqual(abs(float(result["ascvd_10y"]) - 1.816275), 0.2)
        self.assertIsNone(result["hf_10y"])


if __name__ == "__main__":
    unittest.main()
