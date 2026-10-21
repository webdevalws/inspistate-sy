import os
import urllib.request

urls = {
    "luxury_villa.mp4": "https://videos.pexels.com/video-files/17224760/17224760-hd_1920_1080_30fps.mp4",
    "luxury_tower.mp4": "https://videos.pexels.com/video-files/13023865/13023865-hd_1920_1080_30fps.mp4",
    "luxury_penthouse.mp4": "https://videos.pexels.com/video-files/18711551/18711551-hd_1920_1080_30fps.mp4",
    "modern_building.mp4": "https://videos.pexels.com/video-files/13970500/13970500-hd_1920_1080_30fps.mp4"
}

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}

os.makedirs("public/videos", exist_ok=True)

for name, url in urls.items():
    dest = os.path.join("public/videos", name)
    print(f"Checking {name} from {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_length = resp.headers.get('Content-Length')
            print(f"  Status: {resp.status}, Size: {content_length} bytes")
            # Download file in chunks
            with open(dest, 'wb') as f:
                downloaded = 0
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
            print(f"  Successfully saved {dest} ({downloaded} bytes)")
    except Exception as e:
        print(f"  Failed {name}: {e}")
