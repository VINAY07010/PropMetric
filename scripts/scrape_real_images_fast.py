#!/usr/bin/env python3
import json
import re
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor

PROPS_PATH = "src/data/properties.json"
OUTPUT_PATH = "src/data/property_real_images.json"

with open(PROPS_PATH) as f:
    props = json.load(f)

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

def fetch_single(p):
    raw_url = p.get("listing_url")
    full_url = clean_url(raw_url)
    pid = p["id"]
    if not full_url or "pdpid-" not in full_url:
        return pid, {"primary_image": None, "images": [], "source_url": full_url}

    try:
        req = urllib.request.Request(full_url, headers=headers)
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'https://img\.staticmb\.com/mbimages/project/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
            if not matches:
                matches = re.findall(r'https://img\.staticmb\.com/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
            
            unique_photos = []
            seen = set()
            for m in matches:
                if any(x in m.lower() for x in ["icon", "logo", "avatar", "badge", "star", "loader"]):
                    continue
                core = re.sub(r'_[wh]\d+.*', '', m)
                if core not in seen:
                    seen.add(core)
                    unique_photos.append(m)

            primary = unique_photos[0] if unique_photos else None
            return pid, {
                "primary_image": primary,
                "images": unique_photos[:6],
                "source_url": full_url
            }
    except Exception:
        return pid, {"primary_image": None, "images": [], "source_url": full_url}

# Scrape first 60 properties
results = {}
sample = props[:60]
print(f"Scraping real photos for {len(sample)} properties...")

with ThreadPoolExecutor(max_workers=10) as executor:
    for pid, res in executor.map(fetch_single, sample):
        results[pid] = res

# Also populate clean source_url for all other properties
for p in props:
    pid = p["id"]
    if pid not in results:
        results[pid] = {
            "primary_image": None,
            "images": [],
            "source_url": clean_url(p.get("listing_url"))
        }

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

count_with_img = sum(1 for v in results.values() if v.get("primary_image"))
print(f"Done! Successfully saved {count_with_img} verified real Magicbricks photos to {OUTPUT_PATH}")
