"""Frame strips around key actions (every ~0.2 s), for review: python3 tools/strips.py"""
import json, pathlib
from PIL import Image, ImageDraw
HERE = pathlib.Path(__file__).resolve().parents[1]
H = json.loads((HERE / "timeline.json").read_text())["hits"]
keys = {"double take": H["doubleTake"] - 0.2, "getaway": H["getaway"] - 0.1, "hop+wobble": H["plinthHop"], "settle": H["settle"] - 0.6,
        "plinth hop": H["hop"] - 0.3, "needle drop": H["nudge"] - 0.1, "turn+cap": H["turnToUs"] - 0.1, "burn": H["burn"] - 0.1}
rows = []
for name, t0 in keys.items():
    ims = []
    for k in range(6):
        f = round((t0 + k * 0.2) * 24)
        p = HERE / "out/frames" / f"{f:05d}.jpg"
        if p.exists():
            ims.append(Image.open(p).crop((240, 0, 1680, 1080)).resize((320, 240)))
    rows.append((name, ims))
sheet = Image.new("RGB", (6 * 320 + 110, len(rows) * 244), (16, 16, 16))
d = ImageDraw.Draw(sheet)
for r, (name, ims) in enumerate(rows):
    d.text((6, r * 244 + 110), name, fill=(230, 220, 200))
    for k, im in enumerate(ims):
        sheet.paste(im, (110 + k * 320, r * 244))
sheet.save(HERE / "out/strips.jpg", quality=82)
print("out/strips.jpg")
