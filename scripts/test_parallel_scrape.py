#!/usr/bin/env python3
import urllib.request
import re
import json
from concurrent.futures import ThreadPoolExecutor

with open("src/data/properties.json") as f:
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

def extract_image(prop):
    url = prop.get("listing_url")
    if not url or not url.startswith("http"):
        return prop["id"], None, []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=4) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Extract staticmb photos
            # Priority to Project-Photo-1 or Photo_h310
            matches = re.findall(r'https://img\.staticmb\.com/mbimages/project/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
            if not matches:
                matches = re.findall(r'https://img\.staticmb\.com/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
            
            # Filter distinct high-quality photos
            unique_matches = []
            seen = set()
            for m in matches:
                # filter out icons or logos
                if "icon" in m.lower() or "logo" in m.lower():
                    continue
                clean = re.sub(r'_[wh]\d+.*', '', m)
                if clean not in seen:
                    seen.add(clean)
                    unique_matches.append(m)
            
            primary = unique_matches[0] if unique_matches else None
            return prop["id"], primary, unique_matches[:5]
    except Exception as e:
        return prop["id"], None, []

# Test 10 listings
sample = props[:10]
with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(extract_image, sample))

for pid, prim, all_imgs in results:
    print(f"{pid}: {prim} (total: {len(all_imgs)})")
