#!/usr/bin/env python3
import json

with open("src/data/properties.json") as f:
    props = json.load(f)

print(f"Total properties: {len(props)}")
valid_urls = [p for p in props if p.get("listing_url") and p.get("listing_url").startswith("http")]
print(f"Properties with full http URLs: {len(valid_urls)}")
relative_urls = [p for p in props if p.get("listing_url") and not p.get("listing_url").startswith("http")]
print(f"Properties with relative URLs: {len(relative_urls)}")

for p in valid_urls[:10]:
    print(f"- {p['id']}: {p['listing_url']}")

if relative_urls:
    print("\nRelative URL sample:")
    for p in relative_urls[:5]:
        print(f"- {p['id']}: {p['listing_url']}")
