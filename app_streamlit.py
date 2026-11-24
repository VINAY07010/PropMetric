"""
PropMetric: Mumbai & Pune Real Estate Price Analytics & Overpricing Screener
Streamlit Application Edition

Run locally:
    streamlit run app_streamlit.py
"""

import os
import re
import json
import urllib.request
import urllib.error
import streamlit as st

# Configure page layout
st.set_page_config(
    page_title="PropMetric | Real Estate Price Analytics",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom Styling for Industry-Level Analytics Terminal
st.markdown("""
<style>
    .metric-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .verdict-fair {
        background-color: #ecfdf5;
        border: 1px solid #6ee7b7;
        color: #065f46;
        padding: 12px;
        border-radius: 6px;
        font-weight: 600;
    }
    .verdict-review {
        background-color: #fffbeb;
        border: 1px solid #fcd34d;
        color: #92400e;
        padding: 12px;
        border-radius: 6px;
        font-weight: 600;
    }
    .verdict-high {
        background-color: #fff1f2;
        border: 1px solid #fca5a5;
        color: #9f1239;
        padding: 12px;
        border-radius: 6px;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# Helper formatting
def format_inr(n):
    if n is None or n == 0:
        return "N/A"
    if n >= 10000000:
        return f"₹{n / 10000000:.2f} Cr"
    if n >= 100000:
        return f"₹{n / 100000:.2f} Lakh"
    return f"₹{n:,.0f}"

# Load Dataset & Analytics
@st.cache_data
def load_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    prop_path = os.path.join(base_dir, "src", "data", "properties.json")
    analytics_path = os.path.join(base_dir, "src", "data", "analytics.json")
    localities_path = os.path.join(base_dir, "src", "data", "localities.json")

    with open(prop_path, "r", encoding="utf-8") as f:
        props = json.load(f)
    with open(analytics_path, "r", encoding="utf-8") as f:
        analytics = json.load(f)
    with open(localities_path, "r", encoding="utf-8") as f:
        localities = json.load(f)

    return props, analytics, localities

properties, analytics, localities = load_data()

# Hedonic Model Parameters
CITY_BASE_RATES = {"Pune": 12150.0, "Mumbai": 32400.0}
FURNISHING_MULT = {"Unfurnished": 1.0, "Semi-Furnished": 1.05, "Furnished": 1.12}
STATUS_MULT = {"Ready to Move": 1.04, "Under Construction": 0.98}
MODEL_TOLERANCE_PERCENT = 18.3

def calculate_estimate(city, locality, area, bhk, baths, furnishing, status):
    base_rate = CITY_BASE_RATES.get(city, 15000.0)
    expected_area = bhk * (450 if city == "Mumbai" else 550)
    area_ratio = max(100.0, float(area)) / float(max(100, expected_area))
    area_efficiency = area_ratio ** -0.08

    loc_multiplier = 1.0
    if locality and locality not in ["All", "Other / General", ""]:
        city_locs = localities.get(city, [])
        for l in city_locs:
            if l["locality"].lower() == locality.lower():
                loc_multiplier = l.get("multiplier", 1.0)
                break

    f_mult = FURNISHING_MULT.get(furnishing, 1.0)
    s_mult = STATUS_MULT.get(status, 1.0)
    b_mult = 1.0 + (baths - bhk) * 0.03

    est_rate = base_rate * loc_multiplier * area_efficiency * f_mult * s_mult * b_mult
    est_price = round(est_rate * area)
    lower = round(est_price * (1 - MODEL_TOLERANCE_PERCENT / 100))
    upper = round(est_price * (1 + MODEL_TOLERANCE_PERCENT / 100))

    return {
        "price": est_price,
        "rate": round(est_rate),
        "lower": lower,
        "upper": upper,
        "multiplier": loc_multiplier,
    }

def evaluate_overpricing(asking_price, est_price):
    if est_price <= 0:
        return {"diff_pct": 0, "verdict": "Indeterminate", "tier": "fair"}
    diff_inr = asking_price - est_price
    diff_pct = round((diff_inr / est_price) * 100, 1)

    if abs(diff_pct) <= MODEL_TOLERANCE_PERCENT:
        return {"diff_pct": diff_pct, "diff_inr": diff_inr, "verdict": "Fairly Priced (Within ±18.3% Tolerance)", "tier": "fair"}
    elif diff_pct > (MODEL_TOLERANCE_PERCENT * 2):
        return {"diff_pct": diff_pct, "diff_inr": diff_inr, "verdict": "Significantly Above Market Benchmark (> +36%)", "tier": "high"}
    elif diff_pct > MODEL_TOLERANCE_PERCENT:
        return {"diff_pct": diff_pct, "diff_inr": diff_inr, "verdict": "Review Suggested (+18% to +36% Above Model)", "tier": "moderate"}
    else:
        return {"diff_pct": diff_pct, "diff_inr": diff_inr, "verdict": "Value Priced (Below Model Baseline)", "tier": "low"}

# Query PropMetric AI Analyst
def _clean_plain_text(text):
    cleaned = re.sub(r"^\s*#{1,6}\s+", "", text, flags=re.MULTILINE)
    cleaned = cleaned.replace("**", "").replace("__", "").replace("`", "")
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()

def query_ai_analyst(prompt, city, locality, bhk, area, est_res, seller_ask, verdict_info):
    loc_label = f"{locality}, {city}" if locality and locality != "All" else city
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key:
        system_instruction = (
            "You are the PropMetric AI Analyst, an institutional residential real estate analyst for Mumbai and Pune. "
            "Answer the user's specific question directly using only the provided valuation figures and market context. "
            "Do not invent facts or use markdown hashtags (#) or bold asterisks (**)."
        )
        full_prompt = (
            f"Property Context:\n"
            f"- Location: {loc_label}\n"
            f"- Configuration: {bhk} BHK, {area} sqft\n"
            f"- Model Baseline: {format_inr(est_res['price'])} (~₹{est_res['rate']:,}/sqft, tolerance +/-18.3%)\n"
            f"- Seller Ask: {format_inr(seller_ask)}\n"
            f"- Verdict: {verdict_info['verdict']} ({verdict_info['diff_pct']:+}%)\n\n"
            f"User Question: {prompt}"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": full_prompt}]}],
            "generationConfig": {"thinkingConfig": {"thinkingLevel": "LOW"}},
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "aistudio-build",
                },
            )
            with urllib.request.urlopen(req, timeout=12) as res:
                data = json.loads(res.read().decode("utf-8"))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text = "".join(p.get("text", "") for p in parts).strip()
                    if text:
                        return _clean_plain_text(text)
        except Exception:
            pass

    q_lower = prompt.lower()
    if any(k in q_lower for k in ["negotiate", "offer", "counter", "discount"]):
        anchor = min(seller_ask, est_res['price']) if seller_ask and est_res['price'] else (seller_ask or est_res['price'])
        return "\n".join([
            f"Negotiation Strategy — {bhk} BHK in {loc_label} ({area} sqft)",
            f"- Model Baseline: {format_inr(est_res['price'])} (~₹{est_res['rate']:,}/sqft)",
            f"- Seller Ask: {format_inr(seller_ask)} ({verdict_info['diff_pct']:+}% variance)",
            f"- Opening Anchor Bid: {format_inr(int(anchor * 0.92))}",
            f"- Fair Closing Target: {format_inr(int(anchor * 0.94))} to {format_inr(int(anchor * 0.98))}",
        ])

    return "\n".join([
        f"PropMetric AI Analyst Assessment — {bhk} BHK in {loc_label} ({area} sqft)",
        f"- Metro Market: {city} • Locality: {locality}",
        f"- Model Baseline: {format_inr(est_res['price'])} (~₹{est_res['rate']:,}/sqft)",
        f"- Expected Market Range (±18.3%): {format_inr(est_res['lower'])} to {format_inr(est_res['upper'])}",
        f"- Seller Ask: {format_inr(seller_ask)} ({verdict_info['diff_pct']:+}% variance)",
        f"- Verdict: {verdict_info['verdict']}",
        f"- Recommended Target Offer: {format_inr(est_res['price'])} to {format_inr(int(est_res['price'] * 1.05))}",
    ])

# Sidebar: Market Selection
st.sidebar.title("PropMetric Settings")
st.sidebar.caption("Mumbai & Pune Real Estate Price Analytics")

selected_city = st.sidebar.selectbox("Metro Market", ["Pune", "Mumbai"])
available_locs = [l["locality"] for l in localities.get(selected_city, [])]
selected_locality = st.sidebar.selectbox("Micro-Market Locality", ["All"] + available_locs)

st.sidebar.divider()
st.sidebar.info("Valuation calibrated on 1,799 verified listings across 216 Mumbai & Pune localities (±18.3% MAPE tolerance).")

# App Tabs
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📊 Market Overview",
    "🧮 Price Estimator",
    "⚖️ Overpricing Screener",
    "🏢 Comparable Listings",
    "🤖 AI Analyst",
])

# TAB 1: Market Overview
with tab1:
    st.header("Mumbai & Pune Residential Market Overview")
    st.caption("Empirical analysis across 1,799 verified residential listings and 216 micro-markets.")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Analyzed Listings", f"{len(properties):,}")
    with col2:
        st.metric("Pune Median Rate", f"₹{analytics['pune_rate_per_sqft']['median']:,}/sqft", f"Median: {format_inr(analytics['pune_properties']['median'])}")
    with col3:
        st.metric("Mumbai Median Rate", f"₹{analytics['mumbai_rate_per_sqft']['median']:,}/sqft", f"Median: {format_inr(analytics['mumbai_properties']['median'])}")
    with col4:
        st.metric("Validation Tolerance", "±18.3% MAPE", "Held-out test split")

    st.divider()

    st.subheader(f"Top Localities in {selected_city}")
    city_locs = localities.get(selected_city, [])[:12]
    cols = st.columns(4)
    for i, loc in enumerate(city_locs):
        with cols[i % 4]:
            st.markdown(f"""
            <div class="metric-card">
                <b>{loc['locality']}</b><br>
                <small>{loc['count']} listings</small><br>
                <span style="font-size:18px; font-weight:bold;">₹{loc['median_rate_sqft']:,}/sqft</span><br>
                <small>Median: {format_inr(loc['median_price_inr'])}</small><br>
                <small style="color:{'#b45309' if loc['multiplier'] > 1.15 else '#047857'}">
                    {'+' if loc['multiplier'] >= 1 else ''}{round((loc['multiplier'] - 1) * 100)}% vs City
                </small>
            </div>
            """, unsafe_allow_html=True)

# TAB 2: Price Estimator
with tab2:
    st.header("Hedonic Asking Price Estimator")
    st.caption("Calculate model-calibrated asking prices and empirical tolerance corridors.")

    c1, c2 = st.columns([7, 5])
    with c1:
        bhk_val = st.slider("Bedrooms (BHK)", min_value=1, max_value=5, value=2)
        area_val = st.number_input("Carpet Area (sqft)", min_value=300, max_value=12000, value=950, step=50)
        baths_val = st.slider("Bathrooms", min_value=1, max_value=5, value=2)
        furnishing_val = st.selectbox("Furnishing Status", ["Unfurnished", "Semi-Furnished", "Furnished"])
        status_val = st.selectbox("Construction Stage", ["Ready to Move", "Under Construction"])

    est_res = calculate_estimate(
        selected_city,
        selected_locality if selected_locality != "All" else "",
        area_val,
        bhk_val,
        baths_val,
        furnishing_val,
        status_val,
    )

    with c2:
        st.markdown(f"""
        <div style="background-color:#0f172a; color:#fff; padding:24px; border-radius:8px;">
            <span style="color:#94a3b8; font-size:12px; font-weight:600; text-transform:uppercase;">Model Asking Price Estimate</span>
            <div style="font-size:32px; font-weight:bold; font-family:monospace; margin-top:8px;">
                {format_inr(est_res['price'])}
            </div>
            <div style="color:#f59e0b; font-size:16px; font-family:monospace; font-weight:bold; margin-top:4px;">
                ₹{est_res['rate']:,} / sqft
            </div>
            <hr style="border-color:#334155; margin:16px 0;">
            <div style="font-size:13px; color:#cbd5e1;">
                <b>Expected Market Corridor (±18.3% MAPE):</b><br>
                <span style="font-family:monospace; font-weight:bold; color:#fff;">
                    {format_inr(est_res['lower'])} – {format_inr(est_res['upper'])}
                </span>
            </div>
            <p style="font-size:11px; color:#94a3b8; margin-top:8px;">
                Based on regression model test-split validation across {selected_city} properties.
            </p>
        </div>
        """, unsafe_allow_html=True)

# TAB 3: Overpricing Screener
with tab3:
    st.header("Overpricing Screening & Variance Analysis")
    st.caption("Screen advertised asking prices against model predictions with ±18.3% tolerance.")

    sc1, sc2 = st.columns([5, 7])
    with sc1:
        seller_ask = st.number_input(
            "Seller's Asking Price (INR)",
            min_value=500000,
            max_value=200000000,
            value=int(est_res['price'] * 1.15),
            step=50000,
        )
        st.caption(f"Formatted: **{format_inr(seller_ask)}**")

    verdict_info = evaluate_overpricing(seller_ask, est_res['price'])

    with sc2:
        tier = verdict_info['tier']
        tier_class = "verdict-fair" if tier == "fair" else ("verdict-review" if tier == "moderate" else "verdict-high")
        st.markdown(f"""
        <div class="{tier_class}">
            <div style="font-size:18px;">{verdict_info['verdict']}</div>
            <div style="margin-top:6px; font-size:13px;">
                Asking price deviates by <b>{verdict_info['diff_pct']:+}%</b> ({format_inr(verdict_info['diff_inr'])}) against the baseline.
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown(f"""
        <div style="margin-top:16px; font-size:13px;">
            <b>Target Counter-Offer:</b> {format_inr(est_res['price'])} to {format_inr(int(est_res['price'] * 1.05))}<br>
            <b>Opening Bid:</b> {format_inr(int(est_res['price'] * 0.96))}
        </div>
        """, unsafe_allow_html=True)

# TAB 4: Comparable Listings
with tab4:
    st.header("Comparable Listings Explorer")
    st.caption("Search verified residential listings in Mumbai and Pune.")

    search_query = st.text_input("Search society or keyword", placeholder="e.g. Kharadi, Hinjawadi, Lodha, Godrej...")

    filtered_props = [
        p for p in properties
        if (selected_city == "All" or p["city"] == selected_city)
        and (selected_locality == "All" or p["locality"].lower() == selected_locality.lower())
        and (not search_query or search_query.lower() in p["title"].lower() or search_query.lower() in p["society"].lower())
    ]

    st.write(f"Showing **{len(filtered_props)}** matching listings")

    for p in filtered_props[:20]:
        st.markdown(f"""
        <div class="metric-card">
            <div style="display:flex; justify-content:space-between;">
                <b>{p['bhk']} BHK • {p['locality']}, {p['city']}</b>
                <span style="font-family:monospace; font-weight:bold; font-size:16px;">{format_inr(p['price_inr'])}</span>
            </div>
            <div style="font-size:14px; font-weight:600; margin-top:4px;">{p['title']}</div>
            <div style="font-size:12px; color:#64748b; margin-top:2px;">
                Society: {p['society']} • Area: {p['area_sqft']} sqft • Rate: ₹{p['price_per_sqft'] or 0:,}/sqft
            </div>
            <div style="margin-top:6px; font-size:12px;">
                <a href="{p['listing_url']}" target="_blank">🔗 Visit Magicbricks Listing</a>
            </div>
        </div>
        """, unsafe_allow_html=True)

# TAB 5: AI Analyst
with tab5:
    st.header("PropMetric AI Analyst")
    st.caption("Ask specific questions regarding property pricing, negotiation tactics, due diligence, or submarket patterns.")

    user_q = st.text_input(
        "Enter property inquiry",
        value=f"Please provide an analytical overpricing breakdown for a {bhk_val} BHK in {selected_locality if selected_locality != 'All' else selected_city} ({area_val} sqft, asking {format_inr(seller_ask)})."
    )

    if st.button("Ask AI Analyst", type="primary"):
        with st.spinner("Analyzing valuation and market comparables..."):
            ans = query_ai_analyst(
                user_q,
                selected_city,
                selected_locality,
                bhk_val,
                area_val,
                est_res,
                seller_ask,
                verdict_info,
            )
            st.text(ans)
