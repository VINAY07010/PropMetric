#!/usr/bin/env python3
import urllib.request
import json

test_url = "https://www.magicbricks.com/lodha-estilo-kharadi-pune-pdpid-4d4235343138323837"
# Test microlink.io free metadata API
try:
    api_url = f"https://api.microlink.io?url={urllib.parse.quote(test_url)}"
    req = urllib.request.Request(api_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode())
        print("Microlink status:", data.get("status"))
        if "data" in data and "image" in data["data"]:
            print("Microlink image:", data["data"]["image"])
except Exception as e:
    print("Microlink error:", e)

# Test thum.io preview URL
thum_url = f"https://image.thum.io/get/width/600/{test_url}"
print("Thum.io preview URL:", thum_url)
