#!/usr/bin/env python3
import urllib.request

img_url = "https://img.staticmb.com/mbimages/project/Photo_h310_w462/2023/12/27/Project-Photo-1-Lodha-Estilo-Pune-5418287_345_1366_310_462.jpg"
try:
    req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        print("Image status:", resp.status, "Length:", len(resp.read()))
except Exception as e:
    print("Image error:", e)
