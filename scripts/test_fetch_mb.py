#!/usr/bin/env python3
import urllib.request
import re

url = "https://www.magicbricks.com/lodha-estilo-kharadi-pune-pdpid-4d4235343138323837"
req = urllib.request.Request(
    url,
    headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
)

try:
    with urllib.request.urlopen(req, timeout=5) as response:
        html = response.read().decode('utf-8', errors='ignore')
        og_image = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html)
        if og_image:
            print("Found og:image:", og_image.group(1))
        else:
            # Look for other image tags
            img_matches = re.findall(r'https://[^\s"\']+(?:img\.magicbricks\.com|cdn)[^\s"\']+\.(?:jpg|jpeg|png|webp)', html)
            print("Found other CDN images:", img_matches[:3])
except Exception as e:
    print("Error fetching:", e)
