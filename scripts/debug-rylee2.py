#!/usr/bin/env python3
import subprocess
from pathlib import Path

src = "/tmp/dwts-faces-src/rylee-arnold.src"

# try ffmpeg variants
cmds = [
    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-frames:v", "1", "/tmp/rylee-out.jpg"],
    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "image2", "-i", src, "-frames:v", "1", "/tmp/rylee-out2.jpg"],
    ["ffmpeg", "-y", "-hide_banner", "-loglevel", "verbose", "-i", src, "-f", "null", "-"],
]
for c in cmds:
    print("===", " ".join(c[:6]), "...")
    r = subprocess.run(c, capture_output=True, text=True)
    print("rc", r.returncode)
    print("stderr", r.stderr[-800:])

# apt install pillow?
r = subprocess.run(["python3", "-c", "from PIL import Image; im=Image.open('/tmp/dwts-faces-src/rylee-arnold.src'); print(im.size, im.mode)"], capture_output=True, text=True)
print("PIL", r.returncode, r.stdout, r.stderr)

# try installing pillow via apt
r = subprocess.run(["sudo", "apt-get", "install", "-y", "python3-pil"], capture_output=True, text=True)
print("apt pil", r.returncode, r.stdout[-300:], r.stderr[-300:])
r = subprocess.run(["python3", "-c", "from PIL import Image; im=Image.open('/tmp/dwts-faces-src/rylee-arnold.src'); print(im.size, im.mode); im.convert('RGB').save('/tmp/rylee-pil.jpg', quality=95); print('saved')"], capture_output=True, text=True)
print("PIL2", r.returncode, r.stdout, r.stderr)
