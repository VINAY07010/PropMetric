#!/usr/bin/env python3
import urllib.request
import re

url = "https://www.magicbricks.com/lodha-estilo-kharadi-pune-pdpid-4d4235343138323837"

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

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        print("Success! HTML length:", len(html))
        # Find images
        img_urls = re.findall(r'https://img\.staticmb\.com/[^\s"\'<>]+\.(?:jpg|jpeg|png|webp)', html)
        print("StaticMB image URLs found:", len(img_urls))
        for img in img_urls[:5]:
            print("  -", img)
except Exception as e:
    print("Fetch error:", e)
