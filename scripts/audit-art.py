#!/usr/bin/env python3
"""Read-only audit of Kurwa Wars packed assets. Requires Pillow.
Run: python scripts/audit-art.py > art-audit.json
Opaque images are flagged for review, not automatically classified as placeholders.
"""
import base64
import hashlib
import io
import json
import re
from collections import defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACKS = sorted((ROOT / "assets/packs").glob("assets-*.js"))
KEY_NAMES = [
    "Garagenkomplex Blyat", "Discounter des Verderbens", "Plattenbau des Zorns",
    "Der rosafarbene Dschungel", "Finanzamt der Verdammnis",
    "Waschsalon der sieben Schleudergänge", "TÜV der letzten Hoffnung",
    "Pfandkathedrale", "Amt für absurde Angelegenheiten",
    "Mondgarage der letzten Schraube", "Imperium der kaputten Kurbelwellen",
    "Discounter der finanziellen Endzeit", "Plattenbau der letzten Mahnung",
    "Kosmischer Hinterhof der Unvernunft",
]
known = [{"id": "dungeon-key-" + str(i), "name": n,
          "source": "src/engine/core/05-materials-enemies.js",
          "generator": "dungeonKeyArt"} for i, n in enumerate(KEY_NAMES)]
known += [{"id": "gem:" + n, "source": "src/engine/core/09-gems.js",
           "generator": "gemArt"} for n in ("ruby", "emerald", "sapphire", "amethyst", "topaz")]
known += [{"id": "roomArt[12]", "name": "Edelsteinwerkbank",
           "source": "src/engine/core/09-gems.js", "generator": "roomArt.push"}]

refs = defaultdict(set)
svg_sources = []
for path in sorted((ROOT / "src").rglob("*")):
    if not path.is_file() or path.suffix not in (".js", ".html", ".css"):
        continue
    source = path.read_text(encoding="utf-8")
    name = path.relative_to(ROOT).as_posix()
    for match in re.finditer(r"@@LOCAL:([^@]+)@@", source):
        refs[match[1]].add(name)
    for i, line in enumerate(source.splitlines(), 1):
        if re.search(r"data:image/svg\+xml|<svg\b", line):
            svg_sources.append({"path": name, "line": i})

registered = set()
duplicates = defaultdict(list)
images = []
errors = []
for path in PACKS:
    raw = path.read_text(encoding="utf-8")
    match = re.fullmatch(r"Object\.assign\(KW_ASSETS,(\{[\s\S]*\})\);\s*", raw)
    if not match:
        errors.append({"pack": path.name, "error": "Invalid pack syntax"})
        continue
    for key, uri in json.loads(match[1]).items():
        if key in registered:
            errors.append({"key": key, "error": "Duplicate registry key"})
        registered.add(key)
        if not uri.startswith("data:image/"):
            continue
        row = {"key": key, "pack": path.name, "references": sorted(refs[key])}
        try:
            data = base64.b64decode(uri.split(",", 1)[1], validate=True)
            duplicates[hashlib.sha256(data).hexdigest()].append(key)
            with Image.open(io.BytesIO(data)) as im:
                im.load()
                w, h = im.size
                alpha = im.convert("RGBA").getchannel("A")
                low, high = alpha.getextrema()
                box = alpha.point(lambda a: 255 if a >= 16 else 0).getbbox()
                row.update(format=im.format, width=w, height=h,
                           alpha_channel=("A" in im.getbands() or "transparency" in im.info),
                           transparent=(low < 255), alpha_range=[low, high],
                           content_bbox=list(box) if box else None)
                flags = []
                if low == 255:
                    flags.append("opaque_review")
                if box:
                    fill = max((box[2]-box[0])/w, (box[3]-box[1])/h)
                    row["long_axis_fill"] = round(fill, 4)
                    if low < 255 and fill < .90:
                        flags.append("excess_padding_review")
                else:
                    flags.append("empty_alpha")
                if w != h:
                    flags.append("non_square_review")
                if (w, h) != (240, 240):
                    flags.append("non_240_review")
                row["flags"] = flags
        except Exception as exc:
            row["error"] = str(exc)
            errors.append({"key": key, "error": str(exc)})
        images.append(row)

for row in known:
    asset_id = row["id"]
    if asset_id.startswith("dungeon-key-"):
        key = "kw_dungeon_key_" + asset_id.rsplit("-", 1)[1].zfill(2) + ".webp"
    elif asset_id.startswith("gem:"):
        key = "kw_gem_" + asset_id.split(":", 1)[1] + ".webp"
    else:
        key = "kw_gem_workbench.webp"
    row["asset_key"] = key
    row["resolved"] = key in registered and key in refs

print(json.dumps({
    "known_provisional_art": [r for r in known if not r["resolved"]],
    "replaced_provisional_art": [r for r in known if r["resolved"]],
    "svg_source_locations": svg_sources,
    "missing_local_references": sorted(set(refs) - registered),
    "identical_image_groups": [v for v in duplicates.values() if len(v) > 1],
    "image_count": len(images),
    "images": images,
    "errors": errors,
    "note": "Flags require category-specific visual review. Full-bleed scene art is not an item sprite."
}, ensure_ascii=False, indent=2))
