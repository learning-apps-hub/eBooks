#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    raise SystemExit(
        "Pillow not installed. Set up the venv once:\n"
        "  python3 -m venv scripts/.venv\n"
        "  scripts/.venv/bin/pip install -r scripts/requirements.txt\n"
        "Then run with: scripts/.venv/bin/python scripts/prepare_picture_books.py"
    )


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
IMPORT_ROOT = PROJECT_ROOT / "working files" / "source-books" / "team-inbox-2026-07-02"


@dataclass(frozen=True)
class BookImport:
    slug: str
    title: str
    accent: str
    icon: str
    folders: dict[str, str]
    background_priority: tuple[str, ...]
    rotate_phone: bool = True


BOOKS = [
    BookImport(
        slug="gecko-echo",
        title="The Gecko and The Echo",
        accent="#ff5f8f",
        icon="GE",
        folders={
            "en": "The Gecko and The Echo - English",
            "zh": "The Gecko and The Echo - Chinese",
        },
        background_priority=("en", "zh"),
    ),
    BookImport(
        slug="pandas-promised",
        title="The Pandas Who Promised",
        accent="#4f8f6f",
        icon="PP",
        folders={
            "en": "The Pandas Who Promised - English",
            "zh": "The Pandas Who Promised - Chinese",
            "pl": "The Pandas Who Promised - Polish",
        },
        background_priority=("en", "pl", "zh"),
    ),
    BookImport(
        slug="whale-wanted-more",
        title="The Whale Who Wanted More",
        accent="#3478c6",
        icon="WW",
        folders={
            "zh": "The Whale Who Wanted More - Chinese",
        },
        background_priority=("zh",),
    ),
]


def natural_key(path: Path) -> list[object]:
    parts = re.split(r"(\d+)", path.name)
    return [int(p) if p.isdigit() else p.lower() for p in parts]


def source_files(folder: Path) -> list[Path]:
    files = [
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    ]
    return sorted(files, key=natural_key)


def content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    rgb = img.convert("RGB")
    small = rgb.resize((max(1, rgb.width // 16), max(1, rgb.height // 16)))
    corners = [
        small.getpixel((0, 0)),
        small.getpixel((small.width - 1, 0)),
        small.getpixel((0, small.height - 1)),
        small.getpixel((small.width - 1, small.height - 1)),
    ]
    bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))
    xs: list[int] = []
    ys: list[int] = []
    threshold = 46
    for y in range(small.height):
      for x in range(small.width):
        r, g, b = small.getpixel((x, y))
        diff = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
        if diff > threshold:
          xs.append(x)
          ys.append(y)
    if not xs:
        return (0, 0, img.width, img.height)
    scale_x = img.width / small.width
    scale_y = img.height / small.height
    pad_x = int(img.width * 0.018)
    pad_y = int(img.height * 0.018)
    return (
        max(0, int(min(xs) * scale_x) - pad_x),
        max(0, int(min(ys) * scale_y) - pad_y),
        min(img.width, int((max(xs) + 1) * scale_x) + pad_x),
        min(img.height, int((max(ys) + 1) * scale_y) + pad_y),
    )


def normalize_image(src: Path, dest: Path) -> None:
    img = Image.open(src)
    img = ImageOps.exif_transpose(img).convert("RGB")
    is_phone_photo = src.suffix.lower() in {".jpg", ".jpeg"} and max(img.size) > 2400
    if is_phone_photo:
        img = img.crop(content_bbox(img))
        if img.height > img.width:
            img = img.rotate(90, expand=True)

    max_width = 1800
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, round(img.height * ratio)), Image.Resampling.LANCZOS)

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "JPEG", quality=86, optimize=True, progressive=True)


def page_ref(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def build_book(book: BookImport) -> dict[str, object]:
    out_root = ROOT / "books" / book.slug
    assets_root = out_root / "assets"
    lang_outputs: dict[str, list[str]] = {}

    for lang, folder_name in book.folders.items():
        folder = IMPORT_ROOT / folder_name
        files = source_files(folder) if folder.exists() else []
        lang_outputs[lang] = []
        for idx, src in enumerate(files, start=1):
            dest = assets_root / lang / f"page-{idx:03}.jpg"
            normalize_image(src, dest)
            lang_outputs[lang].append(page_ref(dest))

    page_count = max((len(paths) for paths in lang_outputs.values()), default=0)
    pages = []
    for idx in range(page_count):
        images = {
            lang: paths[idx]
            for lang, paths in lang_outputs.items()
            if idx < len(paths)
        }
        fallback = next(
            (images[lang] for lang in book.background_priority if lang in images),
            next(iter(images.values()), ""),
        )
        pages.append({
            "image": fallback,
            "images": images,
            "text": {},
        })

    return {
        "slug": book.slug,
        "title": book.title,
        "accent": book.accent,
        "icon": book.icon,
        "languages": list(book.folders.keys()),
        "pages": pages,
    }


def main() -> None:
    if not IMPORT_ROOT.exists():
        raise SystemExit(f"Missing import folder: {IMPORT_ROOT}")
    manifest = [build_book(book) for book in BOOKS]
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    sys.exit(main())
