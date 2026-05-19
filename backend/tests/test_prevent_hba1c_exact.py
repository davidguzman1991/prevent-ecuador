from __future__ import annotations

import unittest

from app.services.prevent_engine import prevent_hba1c_10y


class PreventHba1cExactPortTest(unittest.TestCase):
    def test_matches_official_vignette_example_within_point_two_percent(self) -> None:
        result = prevent_hba1c_10y(
            {
                "sex": 1,
                "age": 39,
                "tc": 190,
                "hdl": 50,
                "sbp": 110,
                "dm": 1,
                "smoking": 0,
                "bmi": None,
                "egfr": 120,
                "bptreat": 0,
                "statin": 0,
                "hba1c": 8,
            }
        )

        self.assertLessEqual(abs(float(result["cvd_10y"]) - 2.040985), 0.2)
        self.assertLessEqual(abs(float(result["ascvd_10y"]) - 1.256887), 0.2)
        self.assertIsNone(result["hf_10y"])

    def test_missing_hba1c_uses_missing_coefficient_without_nulling_required_outcomes(self) -> None:
        result = prevent_hba1c_10y(
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

        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNotNone(result["hf_10y"])


if __name__ == "__main__":
    unittest.main()
