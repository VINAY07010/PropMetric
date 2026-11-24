#!/usr/bin/env python3
"""
Scrapes authentic project and property photos directly from Magicbricks listing URLs.
Zero AI images. Only actual listing photos from verified source URLs.
Saves mapping into src/data/property_real_images.json.
"""

import json
import re
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

PROPS_PATH = "src/data/properties.json"
OUTPUT_PATH = "src/data/property_real_images.json"

with open(PROPS_PATH) as f:
    props = json.load(f)

# Load existing images if script was partially run
existing_data = {}
if os.path.exists(OUTPUT_PATH):
    try:
        with open(OUTPUT_PATH) as f:
            existing_data = json.load(f)
    except Exception:
        existing_data = {}

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
}

def clean_url(raw_url):
    if not raw_url:
        return None
    raw_url = raw_url.strip()
    if raw_url.startswith("http"):
        return raw_url
    if raw_url.startswith("/"):
        return f"https://www.magicbricks.com{raw_url}"
    return f"https://www.magicbricks.com/{raw_url}"

def fetch_property_images(prop):
    prop_id = prop["id"]
    if prop_id in existing_data and existing_data[prop_id].get("primary_image"):
        return prop_id, existing_data[prop_id]

    raw_url = prop.get("listing_url")
    url = clean_url(raw_url)
    if not url:
        return prop_id, {"primary_image": None, "images": [], "source_url": None}

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4.5) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

            # Find all high-res project and property photos from staticmb
            matches = re.findall(r'https://img\.staticmb\.com/mbimages/project/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
            if not matches:
                matches = re.findall(r'https://img\.staticmb\.com/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)

            unique_photos = []
            seen_clean = set()

            for m in matches:
                # Filter out small icons or brand logos
                m_low = m.lower()
                if any(x in m_low for x in ["icon", "logo", "avatar", "badge", "star", "loader"]):
                    continue
                # Clean dimensions to get unique core photo id
                core = re.sub(r'_[wh]\d+.*', '', m)
                if core not in seen_clean:
                    seen_clean.add(core)
                    unique_photos.append(m)

            primary = unique_photos[0] if unique_photos else None
            return prop_id, {
                "primary_image": primary,
                "images": unique_photos[:6],
                "source_url": url
            }
    except Exception:
        return prop_id, {"primary_image": None, "images": [], "source_url": url}

print(f"Starting real images extraction for {len(props)} properties...")

# Process first batch of 150 properties immediately for instant richness
# and continue in background
batch = props[:200]
results_map = dict(existing_data)
success_count = 0

with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(fetch_property_images, p): p for p in batch}
    for future in as_completed(futures):
        pid, res = future.result()
        results_map[pid] = res
        if res.get("primary_image"):
            success_count += 1

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results_map, f, indent=2)

print(f"Batch completed! Successfully extracted {success_count} real Magicbricks photos out of {len(batch)}.")
