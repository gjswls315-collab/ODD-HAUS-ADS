"""Text rendering with per-glyph font fallback.

fontsource ships Korean faces as ~100 unicode-range slices, so a single
PIL font can't draw a Korean sentence. FontStack reads each file's cmap once
and picks, per character, the first file that has the glyph.
"""
from functools import lru_cache
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = Path(__file__).resolve().parent / ".fonts"

# family key -> (glob relative to FONT_DIR, weight token or None)
FAMILIES = {
    "serif-caps": ("cormorant-garamond/cormorant-garamond-latin-600-normal.woff", None),
    "serif": ("cormorant-garamond/cormorant-garamond-latin-500-normal.woff", None),
    "hand": ("patrick-hand-sc/patrick-hand-sc-latin-400-normal.woff", None),
    "kr-serif": ("nanum-myeongjo/nanum-myeongjo-*-400-normal.woff", None),
    "kr-serif-bold": ("nanum-myeongjo/nanum-myeongjo-*-700-normal.woff", None),
    "kr-sans": ("NanumGothic.ttf", None),
    "kr-sans-bold": ("NanumGothicBold.ttf", None),
}


@lru_cache(maxsize=None)
def _cmap(path):
    font = TTFont(path, lazy=True)
    return frozenset(font.getBestCmap().keys())


class FontStack:
    def __init__(self, families, size):
        self.paths = []
        for fam in families:
            pattern, _ = FAMILIES[fam]
            found = sorted(FONT_DIR.glob(pattern))
            if not found:
                raise FileNotFoundError(
                    f"font '{fam}' missing under {FONT_DIR} - run animatic/fetch_fonts.sh")
            self.paths.extend(str(p) for p in found)
        self.size = size
        self._fonts = {}

    def _font(self, path):
        if path not in self._fonts:
            self._fonts[path] = ImageFont.truetype(path, self.size)
        return self._fonts[path]

    def font_for(self, ch):
        cp = ord(ch)
        for p in self.paths:
            if cp in _cmap(p):
                return self._font(p)
        return self._font(self.paths[0])

    def measure(self, text, tracking=0.0):
        w = 0.0
        for ch in text:
            w += self.font_for(ch).getlength(ch) + tracking * self.size
        return w - (tracking * self.size if text else 0)

    def draw(self, draw, xy, text, fill, tracking=0.0):
        x, y = xy
        for ch in text:
            f = self.font_for(ch)
            draw.text((x, y), ch, font=f, fill=fill)
            x += f.getlength(ch) + tracking * self.size


def text_layer(lines, canvas_size, anchor="center", color=(245, 236, 220),
               glow=None, shadow=True):
    """Render a block of lines onto a transparent RGBA canvas.

    lines: list of dicts {text, families, size, tracking, gap, color?}
    anchor: (x, y) top-left in px, or "center" to center the block.
    glow: optional (r, g, b, radius, strength) soft halo behind the text.
    """
    W, H = canvas_size
    stacks = [FontStack(l["families"], l["size"]) for l in lines]
    widths = [s.measure(l["text"], l.get("tracking", 0)) for s, l in zip(stacks, lines)]
    heights = [l["size"] * 1.25 + l.get("gap", 0) for l in lines]
    block_h = sum(heights)
    if anchor == "center":
        y = (H - block_h) / 2
        xs = [(W - w) / 2 for w in widths]
    else:
        x0, y = anchor
        align = lines[0].get("align", "left")
        bw = max(widths)
        xs = [x0 + ((bw - w) / 2 if align == "center" else 0) for w in widths]

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mask = Image.new("L", (W, H), 0)
    d_layer = ImageDraw.Draw(layer)
    d_mask = ImageDraw.Draw(mask)
    for s, l, x, h in zip(stacks, lines, xs, heights):
        fill = tuple(l.get("color", color)) + (255,)
        s.draw(d_layer, (x, y), l["text"], fill, l.get("tracking", 0))
        s.draw(d_mask, (x, y), l["text"], 255, l.get("tracking", 0))
        y += h

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if shadow:
        sh = mask.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.85))
        out.paste(Image.new("RGBA", (W, H), (0, 0, 0, 255)), (3, 4), sh)
    if glow:
        r, g, b, rad, k = glow
        gl = mask.filter(ImageFilter.GaussianBlur(rad)).point(lambda v: int(min(255, v * k)))
        out.paste(Image.new("RGBA", (W, H), (r, g, b, 255)), (0, 0), gl)
    out.alpha_composite(layer)
    return out
