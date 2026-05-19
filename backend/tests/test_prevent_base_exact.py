from __future__ import annotations

import unittest

from app.services.prevent_engine import prevent_base_10y


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
