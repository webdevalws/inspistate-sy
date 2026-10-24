import urllib.request
import re
import json

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}

def check_pexels(query):
    url = f"https://www.pexels.com/search/videos/{query}/"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # Look for video file links or video ids
            matches = re.findall(r'https://videos\.pexels\.com/video-files/[0-9]+/[^"\'\s&]+', html)
            print(f"Query '{query}' matches:", len(matches))
            for m in matches[:5]:
                print("  ", m)
    except Exception as e:
        print(f"Error {query}: {e}")

check_pexels("luxury-real-estate")
check_pexels("modern-skyscraper")
check_pexels("modern-building")
