"""
PropMetric Prediction & Analytics Engine
Loads model metadata, validates inputs, estimates asking price,
computes overpricing screening with validation-derived tolerance bands,
and queries genuine comparable listings.
"""

import json
import math
import os
from typing import Dict, Any, List, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_META_PATH = os.path.join(BASE_DIR, "Models", "model_metadata.json")
CLEAN_DATA_PATH = os.path.join(BASE_DIR, "Data", "Processed", "properties_cleaned.csv")
JSON_PROPS_PATH = os.path.join(BASE_DIR, "src", "data", "properties.json")

def load_model_metadata() -> Dict[str, Any]:
    if os.path.exists(MODEL_META_PATH):
        with open(MODEL_META_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "model_name": "Hedonic Log-Linear Ridge Regressor",
        "tolerance_band_percent": 16.1,
        "city_gmean_rates": {"Pune": 11850.0, "Mumbai": 29500.0},
        "city_median_rates": {"Pune": 12142.0, "Mumbai": 32379.0},
        "mmr_outer_gmean_rate": 9200.0,
        "outer_mmr_tokens": [
            "nalasopara", "virar", "vasai", "ulhasnagar", "badlapur", "ambernath",
            "boisar", "palghar", "chikhal dongari", "kalyan", "dombivli", "karjat",
            "khopoli", "bhiwandi", "panvel", "taloja", "kamothe", "kharghar", "ulwe"
        ],
        "coefficients": [-1.502696, 0.952067, 1.160192, -0.126416, 0.03819, 0.078074, 0.055819, 0.003956, 0.02866]
    }

def load_properties() -> List[Dict[str, Any]]:
    if os.path.exists(JSON_PROPS_PATH):
        with open(JSON_PROPS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

LOCALITIES_JSON_PATH = os.path.join(BASE_DIR, "src", "data", "localities.json")

def load_localities() -> Dict[str, List[Dict[str, Any]]]:
    if os.path.exists(LOCALITIES_JSON_PATH):
        with open(LOCALITIES_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"Pune": [], "Mumbai": []}

def estimate_asking_price(
    city: str,
    area_sqft: float,
    bhk: float,
    bathrooms: Optional[float] = None,
    furnishing: str = "Unfurnished",
    status: str = "Ready to Move",
    locality: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes asking price estimate using the fitted 9-feature hedonic log-linear Ridge regressor.
    Matches src/utils/calculator.ts identically.
    """
    if city not in ["Pune", "Mumbai"]:
        raise ValueError("City must be either 'Pune' or 'Mumbai'.")
    if area_sqft <= 100 or area_sqft > 25000:
        raise ValueError("Area must be between 100 and 25,000 sqft.")
    if bhk < 1 or bhk > 10:
        raise ValueError("BHK must be between 1 and 10.")

    meta = load_model_metadata()
    coeffs = meta.get("coefficients", [-1.502696, 0.952067, 1.160192, -0.126416, 0.03819, 0.078074, 0.055819, 0.003956, 0.02866])
    city_gmeans = meta.get("city_gmean_rates", {"Pune": 11850.0, "Mumbai": 29500.0})
    outer_gmean = float(meta.get("mmr_outer_gmean_rate", 9200.0))
    outer_tokens = meta.get("outer_mmr_tokens", [])

    bath = bathrooms if (bathrooms and bathrooms > 0) else max(1.0, min(bhk, 5.0))
    loc_clean = (locality or "").strip()
    is_outer = (city == "Mumbai") and any(tok in loc_clean.lower() for tok in outer_tokens)
    smoothed_loc_rate = outer_gmean if is_outer else float(city_gmeans.get(city, 12000.0))

    if loc_clean and loc_clean not in ["All", "Other / General", "Other / General Average", ""]:
        loc_data = load_localities()
        city_locs = loc_data.get(city, [])
        for l in city_locs:
            if l.get("locality", "").lower() == loc_clean.lower():
                smoothed_loc_rate = float(l.get("smoothed_rate_sqft") or l.get("gmean_rate_sqft") or l.get("median_rate_sqft") or smoothed_loc_rate)
                break

    is_mumbai = 1.0 if city == "Mumbai" else 0.0
    is_furn = 1.0 if furnishing == "Furnished" else 0.0
    is_semi = 1.0 if furnishing == "Semi-Furnished" else 0.0
    is_uc = 1.0 if status == "Under Construction" else 0.0

    features = [
        1.0,
        math.log(float(area_sqft)),
        math.log(max(1000.0, smoothed_loc_rate)),
        is_mumbai,
        float(bhk),
        float(bath),
        is_furn,
        is_semi,
        is_uc
    ]

    log_price = sum(f * c for f, c in zip(features, coeffs))
    estimated_price = round(math.exp(log_price))

    tolerance_pct = float(meta.get("tolerance_band_percent", 16.1))
    lower_bound = round(estimated_price * (1.0 - tolerance_pct / 100.0))
    upper_bound = round(estimated_price * (1.0 + tolerance_pct / 100.0))

    return {
        "estimated_price_inr": estimated_price,
        "estimated_rate_per_sqft": round(estimated_price / area_sqft),
        "lower_bound_inr": lower_bound,
        "upper_bound_inr": upper_bound,
        "tolerance_band_percent": tolerance_pct,
        "city": city,
        "area_sqft": area_sqft,
        "bhk": bhk
    }

def screen_overpricing(
    seller_asking_price: float,
    estimate_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compares seller asking price to model estimate and evaluates deviation.
    """
    estimated = estimate_result["estimated_price_inr"]
    tolerance = estimate_result["tolerance_band_percent"]
    
    diff_inr = seller_asking_price - estimated
    pct_diff = round((diff_inr / estimated) * 100.0, 1)
    
    if pct_diff <= tolerance:
        if pct_diff < -tolerance:
            verdict = "Below model estimate — potential value proposition or unlisted caveats"
            risk_tier = "low"
        else:
            verdict = "Within model's expected market range"
            risk_tier = "fair"
    elif pct_diff <= tolerance * 2:
        verdict = "Above model estimate — review suggested"
        risk_tier = "moderate"
    else:
        verdict = "Significantly above model estimate"
        risk_tier = "high"
        
    return {
        "seller_asking_price": seller_asking_price,
        "estimated_price": estimated,
        "difference_inr": diff_inr,
        "difference_percent": pct_diff,
        "tolerance_percent": tolerance,
        "verdict": verdict,
        "risk_tier": risk_tier
    }

def find_comparables(
    city: str,
    bhk: float,
    area_sqft: float,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Retrieves genuine comparable listings from the cleaned dataset.
    Never fabricates data.
    """
    props = load_properties()
    # Filter by city and BHK
    matches = [
        p for p in props 
        if p.get("city") == city and p.get("bhk") == bhk and p.get("price_inr")
    ]
    
    # If too few, relax BHK to +/- 1
    if len(matches) < 3:
        matches = [
            p for p in props 
            if p.get("city") == city and abs(p.get("bhk", 0) - bhk) <= 1.0 and p.get("price_inr")
        ]
        
    # Rank by area similarity
    for m in matches:
        m_area = m.get("area_sqft") or 1000
        m["area_diff"] = abs(m_area - area_sqft)
        
    matches.sort(key=lambda x: x["area_diff"])
    return matches[:limit]
