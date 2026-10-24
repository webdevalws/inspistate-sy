import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}

def find_landscape_videos(query):
    url = f"https://www.pexels.com/search/videos/{query}/"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        matches = set(re.findall(r'https://videos\.pexels\.com/video-files/[0-9]+/[^"\'\s&]+(?:hd_1920_1080|uhd_[0-9]+_[0-9]+)[^"\'\s&]*\.mp4', html))
        print(f"Query {query}: found {len(matches)} landscape videos:")
        for m in sorted(matches)[:10]:
            print("  ", m)

find_landscape_videos("modern-building")
find_landscape_videos("luxury-architecture")
find_landscape_videos("penthouse")
