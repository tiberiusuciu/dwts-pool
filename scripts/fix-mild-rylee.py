#!/usr/bin/env python3
"""Fix remaining face crops: rylee download + milder re-crop for already-headshot sources."""
from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

SRC_DIR = Path("/tmp/dwts-faces-src")
OUT_DIR = Path("/home/tiberiu/labs/dwts-pool/public/couples")
PREVIEW_DIR = Path("/tmp/dwts-faces-preview")
UA = "DWTS-pool-local/1.0 (personal fan pool; contact: local-dev)"

# Re-crop these with looser mild (0.65) — already head/shoulders
MILD_REDO = [
    "julia-stiles",
    "emma-slater",
    "sharna-burgess",
    "witney-carson",
    "rylee-arnold",
    "mark-ballas",
    "pasha-pashkov",
]

RYLEE_URL = "https://upload.wikimedia.org/wikipedia/commons/5/57/Rylee_Arnold_at_Press_Play_2026.jpg"


def dims(path: Path) -> tuple[int, int]:
    out = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x",
            str(path),
        ],
        text=True,
    ).strip()
    w, h = out.split("x")
    return int(w), int(h)


def download_rylee() -> Path:
    dest = SRC_DIR / "rylee-arnold.src"
    dest.unlink(missing_ok=True)
    for attempt in range(6):
        if attempt:
            time.sleep(5 * attempt)
        print(f"download rylee attempt {attempt}")
        r = subprocess.run(
            ["curl", "-fsSL", "-A", UA, "-o", str(dest), RYLEE_URL],
            capture_output=True,
            text=True,
        )
        if r.returncode == 0 and dest.exists() and dest.stat().st_size > 5000:
            # validate it's an image
            try:
                dims(dest)
                print(f"  ok size={dest.stat().st_size} dims={dims(dest)}")
                return dest
            except Exception as e:
                print(f"  invalid image: {e}")
                # show first bytes
                print(dest.read_bytes()[:200])
        else:
            print(f"  fail rc={r.returncode} stderr={r.stderr[-300:]}")
    raise SystemExit("rylee download failed")


def crop_mild(src: Path, out: Path) -> None:
    w, h = dims(src)
    vf = (
        "crop='min(iw\\,ih)*0.65':'min(iw\\,ih)*0.65':"
        "'(iw-min(iw\\,ih)*0.65)/2':'max(0\\,ih*0.03)',"
        "scale=320:320:flags=lanczos"
    )
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-vf", vf, "-q:v", "5", str(out),
        ]
    )
    print(f"  mild-0.65 {src.name} {w}x{h} -> {out.name}")


def main() -> None:
    download_rylee()
    for name in MILD_REDO:
        src = SRC_DIR / f"{name}.src"
        if not src.exists():
            print(f"MISSING src {name}")
            continue
        out = OUT_DIR / f"{name}.jpg"
        crop_mild(src, out)
        shutil.copy(out, PREVIEW_DIR / f"{name}.jpg")

    print("\nverify:")
    for n in ("rylee-arnold", "emma-slater", "jackson-olson", "brandon-armstrong"):
        p = OUT_DIR / f"{n}.jpg"
        subprocess.call(["file", str(p)])
        print(f"  {n} {dims(p)} {p.stat().st_size}")


if __name__ == "__main__":
    main()
