import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}

video_ids = [
    '13023865',
    '18711551',
    '13546136',
    '13970500',
    '18484700',
    '17224760',
    '20799633'
]

for vid in video_ids:
    url = f"https://www.pexels.com/video/{vid}/"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            m = re.search(r'<title>(.*?)</title>', html)
            title = m.group(1) if m else "No title"
            print(f"ID {vid}: {title}")
    except Exception as e:
        print(f"ID {vid}: {e}")
