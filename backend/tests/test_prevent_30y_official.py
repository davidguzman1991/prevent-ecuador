from __future__ import annotations

import json
import unittest
from pathlib import Path

from app.services.prevent_engine import compute_prevent_10y


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "prevent_30y_r_official.json"


class PreventThirtyYearOfficialPortTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixtures = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    def test_30_year_risks_match_official_r_fixtures(self) -> None:
        for case in self.fixtures:
            with self.subTest(case=case["name"]):
                variant, result, warnings = compute_prevent_10y(
                    case["payload"],
                    case["variant"],
                )

                self.assertEqual(variant, case["variant"])
                self.assertIsNone(warnings)
                for key in ("cvd_30y", "ascvd_30y", "hf_30y"):
                    self.assertIsNotNone(result[key], msg=f"{key} should not be None")
                    self.assertAlmostEqual(
                        float(result[key]),
                        float(case["expected"][key]),
                        places=5,
                        msg=f"{key} differs from AHAprevent R fixture",
                    )

    def test_existing_10_year_risks_are_unchanged(self) -> None:
        for case in self.fixtures:
            with self.subTest(case=case["name"]):
                _, result, _ = compute_prevent_10y(case["payload"], case["variant"])
                for key in ("cvd_10y", "ascvd_10y", "hf_10y"):
                    self.assertIsNotNone(result[key], msg=f"{key} should not be None")
                    self.assertAlmostEqual(
                        float(result[key]),
                        float(case["expected"][key]),
                        places=5,
                        msg=f"{key} changed while adding 30-year horizons",
                    )

    def test_30_year_risks_are_null_for_age_above_official_horizon(self) -> None:
        variant, result, warnings = compute_prevent_10y(
            {
                "sex": 0,
                "age": 75,
                "tc": 250,
                "hdl": 90,
                "sbp": 130,
                "dm": 0,
                "smoking": 1,
                "bmi": 30,
                "egfr": 105,
                "bptreat": 1,
                "statin": 1,
            },
            "base",
        )

        self.assertEqual(variant, "base")
        self.assertIsNone(warnings)
        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNotNone(result["hf_10y"])
        self.assertIsNone(result["cvd_30y"])
        self.assertIsNone(result["ascvd_30y"])
        self.assertIsNone(result["hf_30y"])


if __name__ == "__main__":
    unittest.main()
