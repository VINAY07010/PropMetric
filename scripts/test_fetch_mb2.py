#!/usr/bin/env python3
import urllib.request
import re

url = "https://www.magicbricks.com/propertyDetails/3-BHK-1288-Sq-ft-Multistorey-Apartment-FOR-Sale-Balewadi-Gaon-in-Pune&id=4d423834363733353535"
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print("Success! HTML length:", len(html))
        img_urls = re.findall(r'https://img\.staticmb\.com/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
        print("StaticMB image URLs found:", len(img_urls))
        for img in img_urls[:5]:
            print("  -", img)
except Exception as e:
    print("Fetch error:", e)
