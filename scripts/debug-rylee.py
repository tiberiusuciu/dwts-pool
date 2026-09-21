#!/usr/bin/env python3
from pathlib import Path
import subprocess

src = Path("/tmp/dwts-faces-src/rylee-arnold.src")
print("size", src.stat().st_size)
print("head", src.read_bytes()[:20].hex())
print("tail", src.read_bytes()[-20:].hex())

# try identify / convert
for cmd in [
    ["identify", str(src)],
    ["ffmpeg", "-v", "error", "-i", str(src), "-f", "null", "-"],
    ["python3", "-c", "from struct import unpack; d=open('/tmp/dwts-faces-src/rylee-arnold.src','rb').read(); print(len(d), d[:4], d[-2:])"],
]:
    print("CMD", cmd[0])
    r = subprocess.run(cmd, capture_output=True, text=True)
    print("rc", r.returncode, "out", r.stdout[:300], "err", r.stderr[:400])

# try commons special URL / thumb
urls = [
    "https://upload.wikimedia.org/wikipedia/commons/5/57/Rylee_Arnold_at_Press_Play_2026.jpg",
    "https://commons.wikimedia.org/wiki/Special:FilePath/Rylee_Arnold_at_Press_Play_2026.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Rylee_Arnold_at_Press_Play_2026.jpg/800px-Rylee_Arnold_at_Press_Play_2026.jpg",
]
for u in urls:
    dest = Path("/tmp/rylee-try.jpg")
    r = subprocess.run(["curl", "-fsSL", "-A", "Mozilla/5.0", "-o", str(dest), u], capture_output=True, text=True)
    print("URL", u, "rc", r.returncode, "size", dest.stat().st_size if dest.exists() else 0, "err", r.stderr[-200:])
    if dest.exists() and dest.stat().st_size > 1000:
        r2 = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", str(dest)], capture_output=True, text=True)
        print("  probe", r2.stdout, r2.stderr[-200:])
