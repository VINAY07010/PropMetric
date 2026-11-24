#!/usr/bin/env python3
import json
from collections import defaultdict

with open("src/data/properties.json") as f:
    props = json.load(f)

for city in ["Pune", "Mumbai"]:
    c_props = [p for p in props if p["city"] == city]
    locs = defaultdict(list)
    for p in c_props:
        loc = p.get("locality") or "Other / Unspecified"
        if p.get("price_per_sqft"):
            locs[loc].append(p["price_per_sqft"])
            
    print(f"\n=== Top Localities in {city} (Total listings: {len(c_props)}) ===")
    sorted_locs = sorted(locs.items(), key=lambda x: len(x[1]), reverse=True)
    for loc, rates in sorted_locs[:20]:
        rates.sort()
        med = rates[len(rates)//2]
        print(f"  - {loc}: {len(rates)} listings, Median Rate: ₹{med:,.0f}/sqft")
