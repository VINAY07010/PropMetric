#!/usr/bin/env python3
import json
import re

with open("src/data/properties.json") as f:
    props = json.load(f)

pdpids = set()
for p in props:
    url = p.get("listing_url") or ""
    m = re.search(r'pdpid-([0-9a-fA-F]+)', url)
    if m:
        pdpids.add(m.group(1))

print(f"Total unique project PDPIDs: {len(pdpids)}")
