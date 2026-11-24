"""
PropMetric AI Analyst Module
Provides intent-aware, plain-language explanations of model estimates,
negotiation strategies, overpricing screening, and market patterns,
with a robust rule-based grounded fallback.
"""

import json
import os
import re
import urllib.request
import urllib.error
from typing import Dict, Any, Optional


def _format_inr(amt: Optional[float]) -> str:
    if not amt:
        return "₹0"
    if amt >= 10000000:
        return f"₹{amt / 10000000:.2f} Cr"
    if amt >= 100000:
        return f"₹{amt / 100000:.2f} Lakh"
    return f"₹{amt:,.0f}"


def _clean_plain_text(text: str) -> str:
    """Strips markdown headings and bold markers for clean, readable UI output."""
    cleaned = re.sub(r"^\s*#{1,6}\s+", "", text, flags=re.MULTILINE)
    cleaned = cleaned.replace("**", "").replace("__", "").replace("`", "")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def generate_grounded_explanation(
    context: Dict[str, Any],
    user_query: Optional[str] = None
) -> str:
    """
    Generates a clear, non-technical explanation grounded strictly in the provided context.
    Never invents unverified prices, trends, or dates.
    """
    city = context.get("city", "the selected city")
    locality = context.get("locality", "")
    bhk = context.get("bhk", 2)
    area = context.get("area_sqft", 1000)
    estimated_price = context.get("estimated_price_inr", 0)
    seller_price = context.get("seller_asking_price")
    tolerance = context.get("tolerance_band_percent", 16.1)
    verdict = context.get("verdict", "")
    diff_pct = context.get("difference_percent", 0)

    loc_label = f"{locality}, {city}" if locality and locality != "Other / General Average" else city
    est_str = _format_inr(estimated_price)
    rate_val = round(estimated_price / area) if area else 0
    rate_str = f"₹{rate_val:,}/sqft" if rate_val else "N/A"
    seller_str = _format_inr(seller_price) if seller_price else "N/A"

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key:
        system_instruction = (
            "You are the PropMetric AI Analyst, an institutional residential real estate analyst for Mumbai and Pune. "
            "Answer the user's specific question directly using only verified figures from the provided context. "
            "Do not invent property listings, transaction dates, or rental yields. "
            "Never use markdown heading symbols (#, ##, ###) or bold markers (**). Write in clean plain paragraphs and bullet points."
        )
        prompt = (
            f"Property Context:\n"
            f"- Location: {loc_label}\n"
            f"- Configuration: {bhk} BHK, {area} sqft\n"
            f"- Model Baseline Estimate: {est_str} (~{rate_str}, tolerance band +/-{tolerance}%)\n"
            f"- Seller Asking Price: {seller_str}\n"
            f"- Screening Verdict: {verdict} ({diff_pct:+.1f}% deviation)\n\n"
            f"User Question: {user_query or 'Please explain this property estimate and pricing status.'}"
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key={api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
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
            with urllib.request.urlopen(req, timeout=12.0) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    text = "".join(p.get("text", "") for p in parts).strip()
                    if text:
                        return _clean_plain_text(text)
        except Exception:
            pass  # Gracefully fall back to deterministic grounded response

    q_lower = (user_query or "").lower()
    if any(k in q_lower for k in ["negotiate", "offer", "counter", "discount", "bargain"]):
        anchor_base = min(seller_price, estimated_price) if seller_price and estimated_price else (seller_price or estimated_price)
        opening = _format_inr(round(anchor_base * 0.92))
        target = _format_inr(round(anchor_base * 0.98))
        lines = [
            f"Negotiation Playbook for {bhk} BHK in {loc_label} ({area:,.0f} sqft):",
            f"- Model Baseline Anchor: {est_str} (~{rate_str}) with a +/-{tolerance}% tolerance margin.",
            f"- Seller Asking Price: {seller_str} ({diff_pct:+.1f}% variance).",
            f"- Opening Bid: {opening} (anchor on comparable listings and deduct fit-out or legal contingency allowances).",
            f"- Fair Target Zone: {opening} to {target} before Maharashtra stamp duty (~6%) and registration.",
            "Note: This guidance is a statistical decision-support metric based on advertised listings, not an official RERA or municipal valuation.",
        ]
        return "\n".join(lines)

    if any(k in q_lower for k in ["document", "legal", "rera", "verify", "check", "risk", "due diligence"]):
        lines = [
            f"Buyer Due Diligence Checklist for {bhk} BHK in {loc_label}:",
            "- Verify MahaRERA registration number, sanctioned plan, and completion timeline.",
            "- Obtain Occupancy Certificate (OC) and Commencement Certificate (CC) for ready homes.",
            "- Run a 30-year Title Search and Encumbrance Certificate check, plus society No-Dues NOC.",
            f"- Validate actual RERA carpet area against the quoted {area:,.0f} sqft before locking final price near {est_str}.",
        ]
        return "\n".join(lines)

    explanation_parts = [
        f"For a {bhk} BHK residence in {loc_label} measuring {area:,.0f} sqft, the PropMetric model estimates an expected asking price of {est_str} (~{rate_str}).",
        f"This estimate is calibrated via hedonic regression across verified residential listings in {city}, capturing typical market rate baselines.",
    ]

    if seller_price:
        explanation_parts.append(
            f"The seller is asking {seller_str}, which represents a {diff_pct:+.1f}% deviation relative to the model baseline."
        )
        if abs(diff_pct) <= tolerance:
            explanation_parts.append(
                f"Verdict: {verdict}. Because this gap sits within the empirical validation tolerance (+/-{tolerance}%), the asking price aligns with prevailing listing patterns."
            )
        elif diff_pct > tolerance:
            explanation_parts.append(
                f"Verdict: {verdict}. The seller's asking price sits {diff_pct - tolerance:.1f}% above the normal tolerance ceiling. Confirm whether floor rise, premium views, or society upgrades justify the markup, or negotiate closer to {est_str}."
            )
        else:
            explanation_parts.append(
                f"Verdict: {verdict}. The asking price sits below typical comparable listings. Verify title clearance, building age, and exact RERA carpet area before proceeding."
            )

    explanation_parts.append(
        "Note: This analysis is an informational decision-support metric based on advertised listings, not an official RERA or municipal valuation."
    )
    return "\n\n".join(explanation_parts)
