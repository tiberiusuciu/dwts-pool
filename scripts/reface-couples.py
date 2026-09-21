#!/usr/bin/env python3
"""Download couple source images and crop face-focused 320x320 JPEGs."""
from __future__ import annotations

import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

SRC_DIR = Path("/tmp/dwts-faces-src")
OUT_DIR = Path("/home/tiberiu/labs/dwts-pool/public/couples")
PREVIEW_DIR = Path("/tmp/dwts-faces-preview")

UA = "Mozilla/5.0 (compatible; DWTS-pool/1.0)"

# (name, url, mode) mode: aggressive | mild | auto
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


def have_cv2():
    try:
        import cv2  # noqa: F401
        return True
    except ImportError:
        return False


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


def download(name: str, url: str) -> Path:
    dest = SRC_DIR / f"{name}.src"
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  cached: {name}")
        return dest
    print(f"  downloading: {name}")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())
    return dest


def resolve_mode(mode: str, path: Path) -> str:
    if mode != "auto":
        return mode
    w, h = dims(path)
    return "aggressive" if (h / w) > 1.2 else "mild"


def crop_ffmpeg(src: Path, out: Path, mode: str) -> str:
    mode = resolve_mode(mode, src)
    w, h = dims(src)
    if mode == "aggressive":
        # square ≈ min*0.34, centered x, y near top
        vf = (
            "crop='min(iw\\,ih)*0.34':'min(iw\\,ih)*0.34':"
            "'(iw-min(iw\\,ih)*0.34)/2':'ih*0.04',"
            "scale=320:320:flags=lanczos"
        )
    else:
        vf = (
            "crop='min(iw\\,ih)*0.60':'min(iw\\,ih)*0.60':"
            "'(iw-min(iw\\,ih)*0.60)/2':'max(0\\,ih*0.05)',"
            "scale=320:320:flags=lanczos"
        )
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-vf", vf, "-q:v", "5", str(out),
        ]
    )
    return f"ffmpeg/{mode} src={w}x{h}"


def crop_cv2(src: Path, out: Path, mode: str) -> str | None:
    import cv2

    # Decode via ffmpeg first (webp etc)
    tmp = SRC_DIR / f"_decode_{src.stem}.jpg"
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-q:v", "2", str(tmp),
        ]
    )
    img = cv2.imread(str(tmp))
    if img is None:
        return None
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
    if len(faces) == 0:
        # try alt cascade
        cascade2 = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        )
        faces = cascade2.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(30, 30))

    if len(faces) == 0:
        return None

    # pick largest face
    x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    cx, cy = x + fw / 2, y + fh / 2
    side = max(fw, fh) * 1.6
    # for full-body aggressive, allow a bit tighter if face is small relative to frame
    if mode == "aggressive" or resolve_mode(mode, src) == "aggressive":
        # still pad ~1.6x but ensure we don't zoom out too much
        side = max(fw, fh) * 1.65

    x0 = int(max(0, cx - side / 2))
    y0 = int(max(0, cy - side / 2))
    x1 = int(min(w, x0 + side))
    y1 = int(min(h, y0 + side))
    # re-square within bounds
    side2 = min(x1 - x0, y1 - y0)
    x1, y1 = x0 + side2, y0 + side2
    crop = img[y0:y1, x0:x1]
    resized = cv2.resize(crop, (320, 320), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(out), resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    return f"cv2/face src={w}x{h} face={fw}x{fh}"


def process_one(name: str, url: str, mode: str, use_cv2: bool) -> None:
    print(f"== {name} ==")
    src = download(name, url)
    out = OUT_DIR / f"{name}.jpg"
    method = None
    if use_cv2:
        try:
            method = crop_cv2(src, out, mode)
        except Exception as e:
            print(f"  cv2 failed: {e}")
            method = None
    if method is None:
        method = crop_ffmpeg(src, out, mode)
    shutil.copy(out, PREVIEW_DIR / f"{name}.jpg")
    print(f"  OK {method} -> {out}")


def main() -> int:
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    use_cv2 = have_cv2()
    print(f"opencv available: {use_cv2}")

    fails: list[str] = []
    for name, url, mode in ITEMS:
        try:
            process_one(name, url, mode, use_cv2)
        except Exception as e:
            print(f"FAIL {name}: {e}", file=sys.stderr)
            fails.append(f"{name}:{e}")

    print("\n==== SUMMARY ====")
    print(f"processed={len(ITEMS) - len(fails)} fails={len(fails)}")
    for f in fails:
        print(f"  {f}")

    print("\n==== VERIFY ====")
    for n in ("jackson-olson", "brandon-armstrong", "ciara-miller", "rylee-arnold"):
        p = OUT_DIR / f"{n}.jpg"
        subprocess.call(["file", str(p)])
        w, h = dims(p)
        print(f"  {n}: {w}x{h} size={p.stat().st_size}")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
