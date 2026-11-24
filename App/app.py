"""
PropMetric Streamlit Companion Application (Python / ML Validation Interface)
Purpose: Provides direct pure-Python interactive access to `App/prediction.py` and the
trained scikit-learn Ridge model (`Models/best_model.pkl`) alongside the primary React + Express web app.
Run locally with: streamlit run App/app.py
"""

import streamlit as st
import json
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from App.prediction import estimate_asking_price, screen_overpricing, find_comparables, load_model_metadata, load_properties
from App.ai_assistant import generate_grounded_explanation

st.set_page_config(
    page_title="PropMetric | Mumbai & Pune Real Estate Price Analytics",
    layout="wide"
)

st.title("PropMetric — Real Estate Price Analytics")
st.caption("Hedonic asking price estimation, overpricing screening, and comparable intelligence for Mumbai & Pune.")

tab1, tab2, tab3, tab4 = st.tabs([
    "Market Overview", 
    "Price Estimation & Overpricing Screening", 
    "Comparable Listings", 
    "AI Analyst"
])

meta = load_model_metadata()
tolerance = meta.get("tolerance_band_percent", 16.1)
city_med = meta.get("city_median_rates", {"Pune": 12142.0, "Mumbai": 32379.0})

with tab1:
    st.header("Mumbai vs Pune Market Overview")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Cleaned Listings", "1,799")
    with col2:
        st.metric("Pune Median Rate", f"₹{round(city_med.get('Pune', 12142)):,} / sqft")
    with col3:
        st.metric("Mumbai Median Rate", f"₹{round(city_med.get('Mumbai', 32379)):,} / sqft")
    with col4:
        st.metric("Model Tolerance Band", f"±{tolerance}%")

with tab2:
    st.header("Asking Price Estimation & Overpricing Screener")
    c1, c2 = st.columns(2)
    with c1:
        city = st.selectbox("City", ["Pune", "Mumbai"])
        
        # Load verified localities from dataset
        localities_dict = {}
        loc_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data", "localities.json")
        if os.path.exists(loc_path):
            with open(loc_path) as lf:
                localities_dict = json.load(lf)
        city_locs = [l["locality"] for l in localities_dict.get(city, [])]
        locality = st.selectbox("Locality / Submarket", ["Other / General Average"] + city_locs)

        bhk = st.number_input("BHK", min_value=1.0, max_value=8.0, value=2.0, step=1.0)
        area = st.number_input("Area (sqft)", min_value=150.0, max_value=15000.0, value=950.0, step=50.0)
        furnishing = st.selectbox("Furnishing", ["Unfurnished", "Semi-Furnished", "Furnished"])
        status = st.selectbox("Status", ["Ready to Move", "Under Construction"])
        seller_price = st.number_input("Seller's Asking Price (INR, optional)", min_value=0.0, value=12500000.0, step=100000.0)

    with c2:
        res = estimate_asking_price(city, area, bhk, furnishing=furnishing, status=status, locality=locality)
        st.subheader("Model Valuation Estimate")
        st.write(f"**Estimated Price:** ₹{res['estimated_price_inr']:,} ({res['estimated_price_inr']/1e7:.2f} Cr)")
        st.write(f"**Rate per sqft:** ₹{res['estimated_rate_per_sqft']:,} / sqft")
        st.write(f"**Expected Range (±{tolerance}%):** ₹{res['lower_bound_inr']:,} – ₹{res['upper_bound_inr']:,}")

        if seller_price > 0:
            screen_res = screen_overpricing(seller_price, res)
            st.divider()
            st.subheader("Overpricing Screening Verdict")
            st.info(f"**Verdict:** {screen_res['verdict']}")
            st.write(f"Deviation: **{screen_res['difference_percent']:+.1f}%** (₹{screen_res['difference_inr']:,})")

with tab3:
    st.header("Verified Comparable Properties")
    comps = find_comparables("Pune", 2.0, 950.0)
    for c in comps:
        st.write(f"- **{c.get('title')}** | ₹{c.get('price_inr'):,} | {c.get('area_sqft')} sqft ({c.get('locality')})")

with tab4:
    st.header("PropMetric AI Analyst")
    st.caption(f"Grounded in PropMetric hedonic valuation baselines (±{tolerance}% validation tolerance) and verified listing comparables.")
    user_q = st.text_input("Ask a question about your estimation:")
    if st.button("Ask AI Analyst"):
        sample_context = {
            "city": "Pune", "bhk": 2, "area_sqft": 950,
            "estimated_price_inr": 11500000,
            "seller_asking_price": 12500000,
            "difference_percent": 8.7,
            "tolerance_band_percent": tolerance,
            "verdict": "Within model's expected market range"
        }
        exp = generate_grounded_explanation(sample_context, user_q)
        st.text(exp)
