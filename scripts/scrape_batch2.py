#!/usr/bin/env python3
import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

PROPS_PATH = "src/data/properties.json"
OUTPUT_PATH = "src/data/property_real_images.json"

with open(PROPS_PATH) as f:
    props = json.load(f)

with open(OUTPUT_PATH) as f:
    results = json.load(f)

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

def fetch_one(p):
    pid = p["id"]
    if results.get(pid, {}).get("primary_image"):
        return pid, results[pid]
    
    raw_url = p.get("listing_url")
    url = clean_url(raw_url)
    if not url or "pdpid-" not in url:
        return pid, {"primary_image": None, "images": [], "source_url": url}

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4.0) as resp:
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
                "source_url": url
            }
    except Exception:
        return pid, {"primary_image": None, "images": [], "source_url": url}

# Scrape properties 1 to 120
sample = props[:120]
print(f"Scraping real photos for {len(sample)} properties...")

with ThreadPoolExecutor(max_workers=12) as executor:
    futures = {executor.submit(fetch_one, p): p for p in sample}
    for f in as_completed(futures):
        pid, data = f.result()
        results[pid] = data

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

count = sum(1 for v in results.values() if v.get("primary_image"))
print(f"Total verified real photos now: {count}")
