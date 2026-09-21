#!/usr/bin/env python3
"""Retry failed Wikimedia downloads with delays; re-crop all with tighter face zoom."""
from __future__ import annotations

import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

SRC_DIR = Path("/tmp/dwts-faces-src")
OUT_DIR = Path("/home/tiberiu/labs/dwts-pool/public/couples")
PREVIEW_DIR = Path("/tmp/dwts-faces-preview")

# Wikimedia-friendly UA
UA = "DWTS-pool-local/1.0 (personal fan pool; contact: local-dev) Python-urllib"

ITEMS = [
    ("jackson-olson", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_01671_v1.webp", "aggressive"),
    ("tyler-cameron", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_05483_v1.webp", "aggressive"),
    ("guillermo-rodriguez", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_06471_v1.webp", "aggressive"),
    ("ezra-frech", "https://upload.wikimedia.org/wikipedia/commons/5/51/Ezra_Frech_Milan_2026.jpg", "auto"),
    ("connor-wood", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_08726_v1.webp", "aggressive"),
    ("taylor-hanson", "https://upload.wikimedia.org/wikipedia/commons/1/1e/Jordan_Taylor_Hanson_%287991672586%29.jpg", "auto"),
    ("harry-shum-jr", "https://upload.wikimedia.org/wikipedia/commons/d/df/Harry_Shum_by_Gage_Skidmore.jpg", "auto"),
    ("conner-leavitt", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220508/183136_04840_v1.webp", "aggressive"),
    ("tatyana-ali", "https://upload.wikimedia.org/wikipedia/commons/1/19/Tatyana_Ali_03.jpg", "auto"),
    ("amber-glenn", "https://upload.wikimedia.org/wikipedia/commons/c/c9/Amber_Glenn_in_2026.jpg", "auto"),
    ("ciara-miller", "https://cdn.talentrecap.com/wp-content/uploads/2026/09/Original_CiaraMiller_MOD_Disney_Andrew-Eccles.jpg", "aggressive"),
    ("giada-de-laurentiis", "https://upload.wikimedia.org/wikipedia/commons/e/e1/Giada_De_Laurentiis_2010.jpg", "auto"),
    ("julia-stiles", "https://upload.wikimedia.org/wikipedia/commons/d/d5/Julia_Stiles_by_David_Shankbone_cropped.jpg", "mild"),
    ("maura-higgins", "https://upload.wikimedia.org/wikipedia/commons/e/eb/Maura_Higgins_attending_the_World_premier_of_%22Argylle%22_in_London_%2C_January_2024_%28cropped%29.jpg", "auto"),
    ("sarah-jane-nader", "https://cdn.talentrecap.com/wp-content/uploads/2026/09/Original_SarahJaneNader_MOD_Disney_Andrew-Eccles.jpg", "aggressive"),
    ("jenna-dewan", "https://upload.wikimedia.org/wikipedia/commons/4/49/Jenna_Dewan_at_San_Diego_Comic_Con_2026-2.jpg", "auto"),
    ("emma-slater", "https://upload.wikimedia.org/wikipedia/commons/3/3c/Emma_Slater_Better_Together_2026_%28cropped%29.jpg", "mild"),
    ("sharna-burgess", "https://upload.wikimedia.org/wikipedia/commons/f/f2/Sharna_Burgess_2012_%28cropped%29.jpg", "mild"),
    ("witney-carson", "https://upload.wikimedia.org/wikipedia/commons/1/13/Witney_Carson_2019_by_Glenn_Francis_%28cropped%29.jpg", "mild"),
    ("daniella-karagach", "https://upload.wikimedia.org/wikipedia/commons/f/f9/Daniella_Karagach_on_Panache_Star_Dancesport.jpg", "auto"),
    ("rylee-arnold", "https://upload.wikimedia.org/wikipedia/commons/5/57/Rylee_Arnold_at_Press_Play_2026.jpg", "mild"),
    ("britt-stewart", "https://upload.wikimedia.org/wikipedia/commons/7/78/Britt_Stewart_at_Tribeca_Film_Festival_2026-1.jpg", "auto"),
    ("jenna-johnson", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220518/183136_10021_v1.webp", "aggressive"),
    ("adele-zaikman", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220508/183136_04837_v2.webp", "aggressive"),
    ("jan-ravnik", "https://upload.wikimedia.org/wikipedia/commons/6/6d/Jan_Ravnik_at_Tribeca_Film_Festival_2026-1.jpg", "auto"),
    ("pasha-pashkov", "https://upload.wikimedia.org/wikipedia/commons/0/0e/Pasha_Pashkov_on_Panache_Star_Dancesport.jpg", "auto"),
    ("brandon-armstrong", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220508/183136_01976_v1.webp", "aggressive"),
    ("alan-bersten", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_05995_v2.webp", "aggressive"),
    ("ezra-sosa", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_03366_v1.webp", "aggressive"),
    ("mark-ballas", "https://upload.wikimedia.org/wikipedia/commons/a/ad/Mark_Ballas_%282014%29_%28cropped%29.jpg", "mild"),
    ("hailey-bills", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_08103_v1.webp", "aggressive"),
    ("val-chmerkovskiy", "https://cdn.seat42f.com/wp-content/uploads/2026/09/08220509/183136_07268_v1.webp", "aggressive"),
]


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


def download(name: str, url: str, force: bool = False) -> Path:
    dest = SRC_DIR / f"{name}.src"
    if not force and dest.exists() and dest.stat().st_size > 1000:
        print(f"  cached: {name} ({dest.stat().st_size} bytes)")
        return dest

    # Prefer curl (better for Wikimedia)
    print(f"  downloading: {name}")
    for attempt in range(5):
        if "upload.wikimedia.org" in url and attempt > 0:
            wait = 8 * attempt
            print(f"  retry {attempt} sleep {wait}s")
            time.sleep(wait)
        elif "upload.wikimedia.org" in url:
            time.sleep(1.5)

        r = subprocess.run(
            [
                "curl", "-fsSL", "--retry", "2", "--retry-delay", "3",
                "-A", UA, "-o", str(dest), url,
            ],
            capture_output=True,
            text=True,
        )
        if r.returncode == 0 and dest.exists() and dest.stat().st_size > 1000:
            return dest
        print(f"  curl fail attempt {attempt}: rc={r.returncode} {r.stderr[-200:]}")
        # fallback urllib
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                dest.write_bytes(resp.read())
            if dest.stat().st_size > 1000:
                return dest
        except Exception as e:
            print(f"  urllib fail: {e}")

    raise RuntimeError(f"download failed after retries: {name}")


def resolve_mode(mode: str, path: Path) -> str:
    if mode != "auto":
        return mode
    w, h = dims(path)
    # landscape Disney Eccles treated as aggressive by caller; tall => aggressive
    return "aggressive" if (h / max(w, 1)) > 1.2 else "mild"


def crop_ffmpeg(src: Path, out: Path, mode: str) -> str:
    mode = resolve_mode(mode, src)
    w, h = dims(src)

    # Landscape full portraits (Eccles 750x500): face is more centered; use width-based crop
    if mode == "aggressive" and w >= h:
        # square ~ 0.55*ih, centered, slightly top-biased
        vf = (
            "crop='ih*0.72':'ih*0.72':'(iw-ih*0.72)/2':'ih*0.02',"
            "scale=320:320:flags=lanczos"
        )
        tag = "aggressive-landscape"
    elif mode == "aggressive":
        # tighter face zoom: 0.28 of min side, y starts ~6% (cuts headroom)
        vf = (
            "crop='min(iw\\,ih)*0.28':'min(iw\\,ih)*0.28':"
            "'(iw-min(iw\\,ih)*0.28)/2':'ih*0.055',"
            "scale=320:320:flags=lanczos"
        )
        tag = "aggressive"
    else:
        vf = (
            "crop='min(iw\\,ih)*0.58':'min(iw\\,ih)*0.58':"
            "'(iw-min(iw\\,ih)*0.58)/2':'max(0\\,ih*0.04)',"
            "scale=320:320:flags=lanczos"
        )
        tag = "mild"

    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-vf", vf, "-q:v", "5", str(out),
        ]
    )
    return f"ffmpeg/{tag} src={w}x{h}"


def main() -> int:
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    fails: list[str] = []
    for name, url, mode in ITEMS:
        print(f"== {name} ==")
        try:
            src = download(name, url)
            out = OUT_DIR / f"{name}.jpg"
            method = crop_ffmpeg(src, out, mode)
            shutil.copy(out, PREVIEW_DIR / f"{name}.jpg")
            print(f"  OK {method}")
        except Exception as e:
            print(f"FAIL {name}: {e}", file=sys.stderr)
            fails.append(f"{name}:{e}")

    print("\n==== SUMMARY ====")
    print(f"ok={len(ITEMS) - len(fails)} fails={len(fails)}")
    for f in fails:
        print(f"  {f}")

    print("\n==== VERIFY ====")
    for n in ("jackson-olson", "brandon-armstrong", "ciara-miller", "rylee-arnold", "emma-slater"):
        p = OUT_DIR / f"{n}.jpg"
        if not p.exists():
            print(f"  MISSING {n}")
            continue
        subprocess.call(["file", str(p)])
        w, h = dims(p)
        print(f"  {n}: {w}x{h} size={p.stat().st_size}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
