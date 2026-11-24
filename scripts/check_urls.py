#!/usr/bin/env python3
import json

with open("src/data/properties.json") as f:
    props = json.load(f)

pdpid = [p for p in props if "pdpid-" in (p.get("listing_url") or "")]
propdetails = [p for p in props if "propertyDetails" in (p.get("listing_url") or "")]
others = [p for p in props if p not in pdpid and p not in propdetails]

print(f"Total: {len(props)}")
print(f"PDPID project URLs: {len(pdpid)}")
print(f"PropertyDetails URLs: {len(propdetails)}")
print(f"Other URLs: {len(others)}")
