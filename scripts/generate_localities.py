#!/usr/bin/env python3
import json
import math
from collections import defaultdict

with open("src/data/properties.json", encoding="utf-8") as f:
    props = json.load(f)

with open("Models/model_metadata.json", encoding="utf-8") as f:
    meta = json.load(f)

SHRINKAGE_M = float(meta.get("shrinkage_m", 3.0))
OUTER_MMR_TOKENS = set(meta.get("outer_mmr_tokens", [
    "nalasopara", "virar", "vasai", "ulhasnagar", "badlapur", "ambernath",
    "boisar", "palghar", "chikhal dongari", "kalyan", "dombivli", "karjat",
    "khopoli", "bhiwandi", "panvel", "taloja", "kamothe", "kharghar", "ulwe"
]))

def geom_mean(vals):
    return math.exp(sum(math.log(v) for v in vals) / len(vals))

def is_outer_mmr(locality_name):
    low = (locality_name or "").lower()
    return any(tok in low for tok in OUTER_MMR_TOKENS)

localities_by_city = {"Pune": [], "Mumbai": []}

for city in ["Pune", "Mumbai"]:
    c_props = [p for p in props if p["city"] == city]
    locs = defaultdict(list)
    for p in c_props:
        loc = p.get("locality") or "Other / General"
        if p.get("price_per_sqft"):
            locs[loc].append({
                "price": p.get("price_inr"),
                "rate": p.get("price_per_sqft"),
                "area": p.get("area_sqft")
            })

    all_rates = sorted([p["price_per_sqft"] for p in c_props if p.get("price_per_sqft")])
    n_all = len(all_rates)
    city_median_rate = all_rates[n_all // 2] if n_all % 2 != 0 else (all_rates[n_all // 2 - 1] + all_rates[n_all // 2]) / 2.0
    city_gmean = float(meta.get("city_gmean_rates", {}).get(city) or geom_mean(all_rates))
    outer_gmean = float(meta.get("mmr_outer_gmean_rate") or city_gmean)

    loc_list = []
    for loc, items in locs.items():
        if len(items) >= 2 and loc not in ["Unknown", "Other"]:
            rates = sorted([x["rate"] for x in items])
            prices = sorted([x["price"] for x in items if x["price"]])
            nr = len(rates)
            np_cnt = len(prices)
            med_rate = rates[nr // 2] if nr % 2 != 0 else (rates[nr // 2 - 1] + rates[nr // 2]) / 2.0
            med_price = (prices[np_cnt // 2] if np_cnt % 2 != 0 else (prices[np_cnt // 2 - 1] + prices[np_cnt // 2]) / 2.0) if np_cnt else 0
            gm_rate = geom_mean(rates)
            prior = outer_gmean if (city == "Mumbai" and is_outer_mmr(loc)) else city_gmean
            w = nr / (nr + SHRINKAGE_M)
            smoothed_rate = math.exp(w * math.log(gm_rate) + (1.0 - w) * math.log(prior))
            multiplier = round(med_rate / city_median_rate, 3)

            loc_list.append({
                "locality": loc,
                "city": city,
                "count": nr,
                "median_rate_sqft": round(med_rate),
                "gmean_rate_sqft": round(gm_rate),
                "smoothed_rate_sqft": round(smoothed_rate),
                "median_price_inr": round(med_price),
                "multiplier": multiplier
            })

    loc_list.sort(key=lambda x: x["count"], reverse=True)
    localities_by_city[city] = loc_list

with open("src/data/localities.json", "w", encoding="utf-8") as f:
    json.dump(localities_by_city, f, indent=2)

print("Generated src/data/localities.json with", len(localities_by_city["Pune"]), "Pune localities and", len(localities_by_city["Mumbai"]), "Mumbai localities.")
