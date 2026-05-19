from __future__ import annotations

import unittest

from app.services.prevent_engine import prevent_uacr_10y


class PreventUacrExactPortTest(unittest.TestCase):
    def test_matches_official_vignette_example_within_point_two_percent(self) -> None:
        result = prevent_uacr_10y(
            {
                "sex": 0,
                "age": 75,
                "tc": 240,
                "hdl": 90,
                "sbp": 130,
                "dm": 0,
                "smoking": 0,
                "bmi": 30,
                "egfr": 105,
                "bptreat": 1,
                "statin": 1,
                "uacr": 10,
            }
        )

        expected = {
            "cvd_10y": 17.49271,
            "ascvd_10y": 10.52928,
            "hf_10y": 12.06778,
        }

        for key, target in expected.items():
            self.assertIsNotNone(result[key], msg=f"{key} should not be None")
            self.assertLessEqual(abs(float(result[key]) - target), 0.2)

    def test_uacr_values_below_point_one_are_adjusted_to_point_one(self) -> None:
        low_result = prevent_uacr_10y(
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
                "uacr": 0.05,
            }
        )
        adjusted_result = prevent_uacr_10y(
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
                "uacr": 0.1,
            }
        )

        self.assertAlmostEqual(float(low_result["cvd_10y"]), float(adjusted_result["cvd_10y"]), places=9)
        self.assertAlmostEqual(float(low_result["ascvd_10y"]), float(adjusted_result["ascvd_10y"]), places=9)
        self.assertAlmostEqual(float(low_result["hf_10y"]), float(adjusted_result["hf_10y"]), places=9)


if __name__ == "__main__":
    unittest.main()
