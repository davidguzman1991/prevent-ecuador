from __future__ import annotations

import unittest

from app.services.prevent_engine import prevent_sdi_10y


class PreventSdiExactPortTest(unittest.TestCase):
    def test_matches_official_vignette_hf_example_within_point_two_percent(self) -> None:
        result = prevent_sdi_10y(
            {
                "sex": 0,
                "age": 58,
                "tc": 267,
                "hdl": None,
                "sbp": 150,
                "dm": 0,
                "smoking": 0,
                "bmi": 35,
                "egfr": 45,
                "bptreat": 1,
                "statin": None,
                "sdi": 8,
            }
        )

        self.assertIsNone(result["cvd_10y"])
        self.assertIsNone(result["ascvd_10y"])
        self.assertLessEqual(abs(float(result["hf_10y"]) - 12.52473), 0.2)

    def test_sdi_bucket_mapping_is_stable_inside_same_category(self) -> None:
        result_four = prevent_sdi_10y(
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
                "sdi": 4,
            }
        )
        result_six = prevent_sdi_10y(
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
                "sdi": 6,
            }
        )

        self.assertAlmostEqual(float(result_four["cvd_10y"]), float(result_six["cvd_10y"]), places=9)
        self.assertAlmostEqual(float(result_four["ascvd_10y"]), float(result_six["ascvd_10y"]), places=9)
        self.assertAlmostEqual(float(result_four["hf_10y"]), float(result_six["hf_10y"]), places=9)


if __name__ == "__main__":
    unittest.main()
