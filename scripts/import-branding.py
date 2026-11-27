"""Deterministic branding derivatives; only pack 2 is rewritten."""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import base64, hashlib, json, re

root = Path(__file__).resolve().parents[1]
source = root / 'assets/branding/kurvflict-source.webp'
im = Image.open(source).convert('RGB')
# Preserve the selected composition; no generative redraw or stretching.
loading = im.copy()
loading.thumbnail((1024, 576), Image.Resampling.LANCZOS)
loading.save(root / 'assets/branding/kurvflict-loading.webp', 'WEBP', quality=87, method=6)
header = im.copy()
header.thumbnail((512, 288), Image.Resampling.LANCZOS)
key = '7f9218e42db9bb1204b1.webp'
raw = root / 'assets/raw/images' / key
header.save(raw, 'WEBP', quality=86, method=6)
# Square app icon: full logo on a darkened matching backdrop, not a clipped wordmark.
for size in (192, 512):
    bg = ImageOps.fit(im, (size, size), method=Image.Resampling.LANCZOS)
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(size / 18))).enhance(.38)
    fg = im.copy()
    fg.thumbnail((round(size * .94), round(size * .94)), Image.Resampling.LANCZOS)
    bg.paste(fg, ((size - fg.width)//2, (size - fg.height)//2))
    bg.save(root / f'assets/icons/icon-{size}.png', optimize=True)

pack = root / 'assets/packs/assets-2.js'
old = pack.read_text(encoding='utf-8')
match = re.fullmatch(r'Object\.assign\(KW_ASSETS,(\{[\s\S]*\})\);\s*', old)
if not match: raise ValueError('Unexpected asset pack format')
data = json.loads(match[1])
if key not in data: raise ValueError('Header key not found in pack 2')
data[key] = 'data:image/webp;base64,' + base64.b64encode(raw.read_bytes()).decode('ascii')
content = 'Object.assign(KW_ASSETS,' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ');'
pack.write_text(content, encoding='utf-8')
digest = hashlib.sha256(content.encode('utf-8')).hexdigest()[:12]
loader = root / 'src/host/asset-loader.js'
code = loader.read_text(encoding='utf-8')
match = re.search(r'const kwPackVersions=(\[[^\]]+\]);', code)
if not match: raise ValueError('Pack version index missing')
versions = json.loads(match[1])
versions[1] = digest
code = code[:match.start(1)] + json.dumps(versions, separators=(',', ':')) + code[match.end(1):]
loader.write_text(code, encoding='utf-8')
print('KURVFLICT artwork imported; pack 2 revision:', digest)
