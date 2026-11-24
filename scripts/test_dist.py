#!/usr/bin/env python3
import json, math, random

with open("src/data/properties.json") as f:
    props = json.load(f)

# Filter ml ready
rows = [p for p in props if p["price_inr"] and p["area_sqft"] and p["bhk"]]

# Check area and price distributions
for city in ["Pune", "Mumbai"]:
    c_rows = [r for r in rows if r["city"] == city]
    prices = [r["price_inr"] for r in c_rows]
    areas = [r["area_sqft"] for r in c_rows]
    rates = [r["price_per_sqft"] for r in c_rows if r["price_per_sqft"]]
    rates.sort()
    prices.sort()
    print(f"--- {city} (Count: {len(c_rows)}) ---")
    print(f"Price Median: ₹{prices[len(prices)//2]:,.0f}, Min: ₹{prices[0]:,.0f}, Max: ₹{prices[-1]:,.0f}")
    print(f"Rate/sqft Median: ₹{rates[len(rates)//2]:,.0f}, Min: ₹{rates[0]:,.0f}, Max: ₹{rates[-1]:,.0f}")
