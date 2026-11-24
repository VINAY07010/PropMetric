"""
Automated Pipeline & Logic Verification Tests for PropMeric
Run with: python3 -m unittest tests/test_pipeline.py
"""

import unittest
import os
import json
import csv
from App.prediction import estimate_asking_price, screen_overpricing, find_comparables

class TestPropMericPipeline(unittest.TestCase):

    def test_file_structure_exists(self):
        """Verifies that all required folders and files exist."""
        required_paths = [
            "Data/Raw/mumbai_pune_properties.csv",
            "Data/Interim/residential_properties.csv",
            "Data/Interim/excluded_properties.csv",
            "Data/Processed/properties_cleaned.csv",
            "Data/Processed/properties_ml_ready.csv",
            "Reports/cleaning_report.txt",
            "Reports/eda_report.txt",
            "Reports/model_evaluation.txt",
            "Models/best_model.pkl",
            "Notebooks/01_Data_Inspection.ipynb",
            "Notebooks/02_Data_Cleaning.ipynb",
            "Notebooks/03_Data_Validation.ipynb",
            "Notebooks/04_EDA.ipynb",
            "Notebooks/05_Model_Training.ipynb",
            "App/app.py",
            "App/prediction.py",
            "App/ai_assistant.py"
        ]
        for p in required_paths:
            self.assertTrue(os.path.exists(p), f"Missing expected deliverable: {p}")

    def test_row_reconciliation(self):
        """Ensures that no rows were accidentally lost or multiplied."""
        with open("Data/Raw/mumbai_pune_properties.csv", encoding="utf-8") as f:
            raw_len = sum(1 for _ in f) - 1
        with open("Data/Interim/residential_properties.csv", encoding="utf-8") as f:
            res_len = sum(1 for _ in f) - 1
        with open("Data/Interim/excluded_properties.csv", encoding="utf-8") as f:
            exc_len = sum(1 for _ in f) - 1

        self.assertEqual(raw_len, res_len + exc_len, "Reconciliation mismatch between Raw and Interim files!")

    def test_asking_price_estimation(self):
        """Tests hedonic estimation for Pune and Mumbai with valid positive bounds."""
        pune_res = estimate_asking_price("Pune", 1000.0, 2.0)
        self.assertGreater(pune_res["estimated_price_inr"], 0)
        self.assertLess(pune_res["lower_bound_inr"], pune_res["estimated_price_inr"])
        self.assertGreater(pune_res["upper_bound_inr"], pune_res["estimated_price_inr"])

        mum_res = estimate_asking_price("Mumbai", 1000.0, 2.0)
        self.assertGreater(mum_res["estimated_price_inr"], pune_res["estimated_price_inr"], 
                           "Mumbai rate should reflect realistic market premium over Pune.")

    def test_overpricing_screening_logic(self):
        """Tests that deviations are properly classified into cautious tiers."""
        est = {"estimated_price_inr": 10000000.0, "tolerance_band_percent": 18.0}
        
        # Within range
        fair = screen_overpricing(10500000.0, est)
        self.assertIn("Within", fair["verdict"])
        self.assertEqual(fair["risk_tier"], "fair")

        # Above estimate - review suggested
        review = screen_overpricing(12500000.0, est)
        self.assertIn("Above model estimate", review["verdict"])

        # Significantly above
        high = screen_overpricing(15000000.0, est)
        self.assertIn("Significantly", high["verdict"])

    def test_comparable_listings_are_real(self):
        """Ensures comparable property queries return genuine listings without fabrication."""
        comps = find_comparables("Pune", 2.0, 900.0, limit=3)
        self.assertGreater(len(comps), 0)
        for c in comps:
            self.assertEqual(c["city"], "Pune")
            self.assertIn("title", c)
            self.assertIsNotNone(c["price_inr"])

if __name__ == "__main__":
    unittest.main()
