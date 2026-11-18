"""Extract the JEON DE VERO mural artwork from the store reference image.

The mural (mascot + "Jeon de Vero" script + RECORDS & GOODS badge) is separated
from the plaster wall by colour, upscaled 3x with smooth thresholding so edges
stay crisp, and recoloured to the brand inks. Outputs PNGs plus a JS module of
data URIs that the 3D store uses for the mural decal and merchandise prints.

    python3 tools/extract_brand.py
"""
import base64, io, json, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "reference" / "jdv_store_reference.webp"
OUT_PNG = ROOT / "tools" / "out"
OUT_JS = ROOT / "src" / "assets" / "brandArt.js"

NAVY = (31, 43, 69)
RED = (166, 56, 42)
CREAM = (243, 231, 207)

BOX = (205, 62, 760, 372)  # mural region in the reference (x0, y0, x1, y1)
UP = 3


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def masks():
    im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    x0, y0, x1, y1 = BOX
    c = im[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    greenish = (g > b * 1.35) & (g > r * 0.95)  # pothos leaves at the left edge
    ratio = g / np.maximum(r, 1)
    red = smoothstep(0.62, 0.45, ratio) * smoothstep(50, 95, r)
    navy = smoothstep(118, 70, lum) * (1 - red) * (~greenish)
    # mask out what is not mural: ceiling + track lights (top right), pothos leaf (top left)
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w]
    ceiling = yy < (xx - 383) * 58 / 172 + 6
    leaf = (xx < 31) & (yy < 46)
    for m in (navy, red):
        m[ceiling | leaf] = 0
        m[:, :12] = 0
    return navy, red


def up(m):
    h, w = m.shape
    img = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    img = img.resize((w * UP, h * UP), Image.BICUBIC)
    a = np.asarray(img).astype(np.float32) / 255
    return smoothstep(0.38, 0.62, a)


def fill_holes(mask):
    """Pixels enclosed by the mask (e.g. letters inside the red badge)."""
    bin_img = Image.fromarray(((mask > 0.5) * 255).astype(np.uint8))
    pad = Image.new("L", (bin_img.width + 2, bin_img.height + 2), 0)
    pad.paste(bin_img, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    a = np.asarray(pad)[1:-1, 1:-1]
    return (a == 0).astype(np.float32)


def rgba(layers, size):
    h, w = size
    out = np.zeros((h, w, 4), np.float32)
    for mask, col in layers:  # painter's order
        a = mask[..., None]
        out[..., :3] = out[..., :3] * (1 - a) + np.array(col, np.float32) * a
        out[..., 3:] = out[..., 3:] * (1 - a) + a
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8) if False else
                           np.dstack([np.clip(out[..., :3], 0, 255), np.clip(out[..., 3:] * 255, 0, 255)]).astype(np.uint8), "RGBA")


def crop(img, box):
    return img.crop(tuple(int(v * UP) for v in box))


def data_uri(img):
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def main():
    navy, red = masks()
    N, R = up(navy), up(red)
    N[:100, :150] = 0  # leaf fleck above the cap
    holes = fill_holes(R)
    holes_soft = np.asarray(Image.fromarray((holes * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    badge_text = holes_soft * (1 - R)
    size = N.shape
    OUT_PNG.mkdir(parents=True, exist_ok=True)

    mural = rgba([(R, RED), (badge_text, CREAM), (N, NAVY)], size)
    mural.save(OUT_PNG / "mural.png")

    # Separate the script lettering from the mascot. The J's loop shares the
    # mascot's chin line, so the split follows a hand-placed cut along the
    # left edge of the J stem (coordinates in upscaled mural pixels).
    cut = [(695, 0), (size[1], 0), (size[1], size[0]), (325, size[0]), (325, 650), (420, 622), (520, 608), (560, 590),
           (615, 540), (643, 470), (641, 445), (645, 420), (672, 330), (695, 250)]
    region = Image.new("L", (size[1], size[0]), 0)
    ImageDraw.Draw(region).polygon(cut, fill=255)
    script = (np.asarray(region) > 0) & (N > 0.5)
    grow = Image.fromarray((script * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    script_soft = np.asarray(grow).astype(np.float32) / 255
    S = N * script_soft
    M = N * (1 - script_soft)

    def bbox(m, pad=6):
        ys, xs = np.nonzero(m > 0.5)
        return (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, size[1]), min(ys.max() + pad, size[0]))

    sb, mb = bbox(S), bbox(M)
    script_cream = rgba([(S, CREAM)], size).crop(sb)
    script_navy = rgba([(S, NAVY)], size).crop(sb)
    mascot_navy = rgba([(M, NAVY)], size).crop(mb)
    mascot_cream = rgba([(M, CREAM)], size).crop(mb)
    for name, img in [("script_cream", script_cream), ("script_navy", script_navy), ("mascot_navy", mascot_navy)]:
        img.save(OUT_PNG / f"{name}.png")

    meta = {"mural": list(mural.size), "script": list(script_navy.size), "mascot": list(mascot_navy.size)}
    js = ["// Generated by tools/extract_brand.py from reference/jdv_store_reference.webp. Do not edit.",
          f"export const BRAND_META = {json.dumps(meta)};",
          f"export const MURAL = \"{data_uri(mural)}\";",
          f"export const SCRIPT_CREAM = \"{data_uri(script_cream)}\";",
          f"export const SCRIPT_NAVY = \"{data_uri(script_navy)}\";",
          f"export const MASCOT_NAVY = \"{data_uri(mascot_navy)}\";",
          f"export const MASCOT_CREAM = \"{data_uri(mascot_cream)}\";"]
    OUT_JS.write_text("\n".join(js) + "\n")
    print("wrote", OUT_JS, OUT_JS.stat().st_size // 1024, "KB; mural", mural.size)


if __name__ == "__main__":
    main()
