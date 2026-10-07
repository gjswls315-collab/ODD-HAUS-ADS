#!/usr/bin/env python3
"""ODD HAUS 50s animatic renderer.

Reads spec/timeline.json, animates virtual-camera moves over the reference key
visual and storyboard board, applies the night->amber grade arc and light FX,
and pipes frames to ffmpeg.

  python3 animatic/render.py                     # clean + review cuts -> renders/
  python3 animatic/render.py --stills 0.5,5,22.3 # PNG stills -> renders/stills/
  python3 animatic/render.py --scale 0.5         # fast low-res preview
"""
import argparse
import json
import math
import multiprocessing as mp
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from textdraw import FontStack, text_layer  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
UPS = 2  # sources are pre-upscaled by this factor; timeline coords stay in original px
WARM = np.array([1.0, 0.72, 0.42], np.float32)
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def smoothstep(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease(x, kind):
    x = min(max(x, 0.0), 1.0)
    if kind == "linear":
        return x
    if kind == "inout":
        return smoothstep(x)
    return 0.5 * x + 0.5 * smoothstep(x)  # "soft": keeps drift alive, no dead stop


def interp_keys(keys, t, kind="soft"):
    """keys: [[t, v...], ...] -> interpolated list of values at t."""
    if t <= keys[0][0]:
        return list(keys[0][1:])
    for a, b in zip(keys, keys[1:]):
        if a[0] <= t <= b[0]:
            u = ease((t - a[0]) / max(b[0] - a[0], 1e-6), kind)
            return [va + (vb - va) * u for va, vb in zip(a[1:], b[1:])]
    return list(keys[-1][1:])


def scalar_track(v, t):
    """A number, or [[t, v], ...] keyframes (linear)."""
    if isinstance(v, (int, float)):
        return float(v)
    return interp_keys(v, t, "linear")[0]


def box_blur(a, r, axis):
    """Box blur of radius r along axis (edge-clamped), float arrays."""
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis)
    hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return (hi - lo) / (2 * r + 1)


def blur_f(a, rad):
    """Approximate Gaussian blur (3 box passes per axis) for float arrays."""
    r = max(1, int(rad * 0.58))
    for _ in range(3):
        a = box_blur(box_blur(a, r, 0), r, 1)
    return a


def erase_text(im, box, thresh):
    """Remove baked-in titles from a reference image: bright pixels inside box are
    refilled from the surrounding dark background (normalized-convolution inpaint)."""
    x0, y0, x1, y1 = box
    pad = 40
    region = im.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
    arr = np.asarray(region, np.float32) / 255
    inner = np.zeros(arr.shape[:2], bool)
    inner[pad:-pad, pad:-pad] = True
    hole = ((arr @ LUMA) > thresh) & inner
    hole = np.asarray(Image.fromarray(hole.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(7))) > 0
    hole &= inner
    keep = (~hole).astype(np.float32)
    fill = arr.copy()
    for rad in (4, 10, 24, 48):
        num = blur_f(fill * keep[..., None], rad)
        den = blur_f(keep, rad)[..., None]
        est = num / np.maximum(den, 1e-4)
        fill = np.where(hole[..., None] & (keep[..., None] < 1), est, fill)
        keep = np.maximum(keep, (den[..., 0] > 0.25).astype(np.float32))
    soft = blur_f(hole.astype(np.float32), 2)[..., None]
    out = arr * (1 - soft) + fill * soft
    im = im.copy()
    im.paste(Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)), (x0 - pad, y0 - pad))
    return im


REVIEW_SIZE = (1280, 720)


class Renderer:
    """Image work (grade, FX, bloom, grain) runs at an internal resolution
    (default 2/3 of output - the 2x-upscaled references hold no more detail than
    that), then one bicubic upscale; supers are composited crisp at output size."""

    def __init__(self, timeline, scale=1.0, internal=2 / 3):
        self.tl = timeline
        meta = timeline["meta"]
        self.fps = meta["fps"]
        self.dur = meta["duration"]
        self.aspect = meta["active_aspect"]
        self.FW = int(round(meta["resolution"][0] * scale)) // 2 * 2
        self.FH = int(round(meta["resolution"][1] * scale)) // 2 * 2
        self.OW = self.FW
        self.OH = int(round(self.OW / self.aspect)) // 2 * 2
        self.bar = (self.FH - self.OH) // 2
        self.W = int(round(self.OW * internal)) // 2 * 2
        self.H = int(round(self.W / self.aspect)) // 2 * 2
        self.scale = scale
        self.iscale = self.W / meta["resolution"][0]

        self.src = {}
        for key, rel in timeline["sources"].items():
            im = Image.open(ROOT / rel).convert("RGB")
            for c in timeline.get("cleanup", []):
                if c["src"] == key:
                    im = erase_text(im, c["box"], c["thresh"])
            up = im.resize((im.width * UPS, im.height * UPS), Image.Resampling.LANCZOS)
            self.src[key] = up.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=2))
        self.src_orig = {k: v.resize((v.width // UPS, v.height // UPS), Image.Resampling.LANCZOS)
                         for k, v in self.src.items()}

        self.shots = []
        for sc in timeline["scenes"]:
            for sh in sc["shots"]:
                self.shots.append((sc, sh))

        yy, xx = np.mgrid[0:self.H, 0:self.W].astype(np.float32)
        nx = (xx / self.W - 0.5) * 2
        ny = (yy / self.H - 0.5) * 2
        self.r2 = ((nx * nx * 0.8 + ny * ny * 1.1) / 1.9).astype(np.float32)[..., None]

        rng = np.random.default_rng(7)
        self.grain = []
        for _ in range(8):
            n = rng.normal(0, 1, (self.H // 2, self.W // 2)).astype(np.float32)
            g = Image.fromarray(n).resize((self.W, self.H), Image.Resampling.BILINEAR)
            self.grain.append(np.asarray(g, np.float32)[..., None])

        self._sparkle_cache = {}
        self._super_cache = {}
        self._review_cache = {}

    # ---------------------------------------------------------------- camera
    def camera(self, sh, t):
        a = sh["animatic"]
        cx, cy, w = interp_keys(a["cam"], t, a.get("ease", "soft"))
        for fx in a.get("fx", []):
            if fx["type"] == "shake" and t >= fx["t"]:
                k = math.exp(-(t - fx["t"]) / fx["decay"]) * fx["amp"]
                cx += k * math.sin(t * 97.0 + fx["t"] * 13)
                cy += k * math.sin(t * 71.0 + fx["t"] * 7 + 1.3)
            elif fx["type"] == "punch" and fx["t"] <= t <= fx["t"] + fx["dur"]:
                w *= 1 - fx["amount"] * math.sin(math.pi * (t - fx["t"]) / fx["dur"])
        return cx, cy, w

    def crop_box(self, key, cx, cy, w):
        img = self.src[key]
        ws = min(w * UPS, img.width, img.height * self.aspect)
        hs = ws / self.aspect
        x0 = min(max(cx * UPS - ws / 2, 0), img.width - ws)
        y0 = min(max(cy * UPS - hs / 2, 0), img.height - hs)
        return x0, y0, ws, hs

    def to_frame(self, box, sx, sy):
        x0, y0, ws, hs = box
        return (sx * UPS - x0) / ws * self.W, (sy * UPS - y0) / hs * self.H, self.W / ws * UPS

    # ----------------------------------------------------------------- grade
    def grade_at(self, sh, t):
        keys = sh["animatic"].get("grade", [[0, "night"]])
        presets = self.tl["grades"]
        if t <= keys[0][0] or len(keys) == 1:
            return presets[keys[0][1]]
        for a, b in zip(keys, keys[1:]):
            if a[0] <= t <= b[0]:
                u = smoothstep((t - a[0]) / max(b[0] - a[0], 1e-6))
                pa, pb = presets[a[1]], presets[b[1]]
                out = {}
                for k in pa:
                    va, vb = pa[k], pb[k]
                    out[k] = ([x + (y - x) * u for x, y in zip(va, vb)]
                              if isinstance(va, list) else va + (vb - va) * u)
                return out
        return presets[keys[-1][1]]

    def apply_grade(self, img, g):
        img = img * g["exposure"]
        l = img @ LUMA
        img = l[..., None] + (img - l[..., None]) * g["saturation"]
        l = np.clip(l, 0, 1)[..., None]
        img = img * (1 + (np.array(g["highlight_gain"], np.float32) - 1) * (l * l))
        img = img + np.array(g["shadow_tint"], np.float32) * (1 - l) ** 2
        img = np.clip(img, 0, 1)
        img = img + g["contrast"] * (img * img * (3 - 2 * img) - img)
        img = g["lift"] + img * (1 - g["lift"])
        img *= np.clip(1 - g["vignette"] * 0.62 * self.r2 ** 1.15, 0, 1)
        return img

    # -------------------------------------------------------------------- fx
    def add_glow(self, img, x, y, r, color, k):
        if k <= 0.001:
            return
        x0, x1 = int(max(x - 3 * r, 0)), int(min(x + 3 * r, self.W))
        y0, y1 = int(max(y - 3 * r, 0)), int(min(y + 3 * r, self.H))
        if x1 <= x0 or y1 <= y0:
            return
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
        d2 = ((xx - x) ** 2 + (yy - y) ** 2) / (r * r)
        fall = np.exp(-d2 * 1.4)[..., None] * k
        c = np.array(color, np.float32) / 255.0
        patch = img[y0:y1, x0:x1]
        img[y0:y1, x0:x1] = 1 - (1 - patch) * (1 - c * fall)  # screen blend

    def lowres_mask(self, fn):
        h, w = self.H // 8, self.W // 8
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        m = fn(xx / w, yy / h).astype(np.float32)
        m = Image.fromarray(m).resize((self.W, self.H), Image.Resampling.BILINEAR)
        return np.asarray(m, np.float32)[..., None]

    def sparkle_points(self, key, fx):
        ck = (key, tuple(fx["region"]), fx["count"])
        if ck not in self._sparkle_cache:
            x0, y0, x1, y1 = fx["region"]
            reg = np.asarray(self.src_orig[key].crop((x0, y0, x1, y1)), np.float32) / 255
            lum = reg @ LUMA
            warmness = reg[..., 0] - reg[..., 2]
            score = lum * (warmness > 0.15)
            pts = []
            flat = np.argsort(score, axis=None)[::-1]
            for idx in flat[:20000]:
                py, px = divmod(int(idx), score.shape[1])
                if score[py, px] < 0.75:
                    break
                if all((px - qx) ** 2 + (py - qy) ** 2 > 18 ** 2 for qx, qy in pts):
                    pts.append((px, py))
                if len(pts) >= fx["count"]:
                    break
            rng = np.random.default_rng(len(pts))
            self._sparkle_cache[ck] = [(px + x0, py + y0, rng.uniform(0, 6.28), rng.uniform(1.2, 2.6))
                                       for px, py in pts]
        return self._sparkle_cache[ck]

    def render_shot(self, sc, sh, t):
        a = sh["animatic"]
        key = a["src"]
        cx, cy, w = self.camera(sh, t)
        box = self.crop_box(key, cx, cy, w)
        x0, y0, ws, hs = box
        frame = self.src[key].transform((self.W, self.H), Image.Transform.EXTENT,
                                        (x0, y0, x0 + ws, y0 + hs), Image.Resampling.BICUBIC)
        for fx in a.get("fx", []):
            if fx["type"] == "blur" and t >= fx["t0"]:
                rad = fx["from"] + (fx["to"] - fx["from"]) * smoothstep((t - fx["t0"]) / (fx["t1"] - fx["t0"]))
                if rad > 0.3:
                    small = frame.resize((self.W // 4, self.H // 4), Image.Resampling.BILINEAR)
                    frame = small.filter(ImageFilter.GaussianBlur(rad * self.iscale / 4)).resize(
                        (self.W, self.H), Image.Resampling.BILINEAR)
        img = np.asarray(frame, np.float32) / 255.0
        img = self.apply_grade(img, self.grade_at(sh, t))

        mult = 1.0
        for fx in a.get("fx", []):
            typ = fx["type"]
            if typ == "glow":
                fx_x, fx_y, s = self.to_frame(box, *fx["at"])
                k = scalar_track(fx["strength"], t)
                if fx.get("pulse"):
                    k *= 0.75 + 0.25 * math.sin(2 * math.pi * fx["pulse"] * t)
                self.add_glow(img, fx_x, fx_y, fx["radius"] * s, fx["color"], k)
            elif typ == "blink" and fx["t0"] <= t <= fx["t1"]:
                on = 0.5 + 0.5 * math.sin(2 * math.pi * fx["hz"] * (t - fx["t0"]) - math.pi / 2)
                fx_x, fx_y, s = self.to_frame(box, *fx["at"])
                self.add_glow(img, fx_x, fx_y, fx["radius"] * s, fx["color"], fx["strength"] * on ** 2)
            elif typ == "sparkle" and fx["t0"] <= t <= fx["t1"]:
                env = smoothstep((t - fx["t0"]) / 0.4)
                for sx, sy, ph, hz in self.sparkle_points(key, fx):
                    fx_x, fx_y, s = self.to_frame(box, sx, sy)
                    tw = (0.5 + 0.5 * math.sin(ph + 2 * math.pi * hz * t)) ** 3
                    self.add_glow(img, fx_x, fx_y, fx["size"] * s, (255, 214, 140), fx["strength"] * tw * env)
            elif typ == "shadow" and fx["t0"] <= t <= fx["t1"]:
                u = (t - fx["t0"]) / (fx["t1"] - fx["t0"])
                px = fx["from"][0] + (fx["to"][0] - fx["from"][0]) * u
                py = fx["from"][1] + (fx["to"][1] - fx["from"][1]) * u
                rx, ry = fx["size"]
                env = math.sin(math.pi * u) ** 0.5
                m = self.lowres_mask(lambda X, Y: np.exp(-(((X - px) / rx) ** 2 + ((Y - py) / ry) ** 2) * 2.2))
                img *= 1 - fx["strength"] * env * m
            elif typ == "door":
                u = smoothstep((t - fx["t0"]) / (fx["t1"] - fx["t0"]))
                half = 0.004 + 0.62 * u
                xs = np.linspace(0, 1, self.W, dtype=np.float32)
                d = np.abs(xs - fx["center"])
                inside = np.clip((half - d) / 0.02 + 0.5, 0, 1)
                edge = np.exp(-((d - half) / 0.012) ** 2) * (1 - u) * 1.6
                lit = 0.035 + 0.965 * inside
                img *= lit[None, :, None]
                img += (edge[None, :, None] * WARM * 0.9)
            elif typ == "scrim" and fx["t0"] <= t <= fx["t1"]:
                env = smoothstep((t - fx["t0"]) / 0.45)
                cxn, cyn = fx["center"]
                rx, ry = fx["radius"]
                m = self.lowres_mask(lambda X, Y: np.exp(-(((X - cxn) / rx) ** 2 + ((Y - cyn) / ry) ** 2) * 1.6))
                img *= 1 - fx["strength"] * env * m
            elif typ == "fade" and t >= fx["t0"]:
                u = smoothstep((t - fx["t0"]) / max(fx["t1"] - fx["t0"], 1e-6))
                mult *= fx["from"] + (fx["to"] - fx["from"]) * u
            elif typ == "flash" and fx["t"] <= t <= fx["t"] + fx["dur"]:
                k = fx["strength"] * (1 - (t - fx["t"]) / fx["dur"]) ** 2
                img += WARM * k
        return np.clip(img * mult, 0, 1)

    # -------------------------------------------------------------- supers
    def super_layer(self, sp):
        if sp["id"] in self._super_cache:
            return self._super_cache[sp["id"]]
        if sp.get("type") == "logo":
            img = self.src[sp["src"]].crop(tuple(v * UPS for v in sp["box"]))
            h = int(sp["height"] * self.scale)
            img = img.resize((int(img.width * h / img.height), h), Image.Resampling.LANCZOS)
            lum = np.asarray(img, np.float32) @ LUMA / 255
            lo, hi = sp["key"]
            alpha = np.clip((lum - lo) / (hi - lo), 0, 1)
            alpha = alpha * alpha * (3 - 2 * alpha)
            logo = np.zeros((h, img.width, 4), np.uint8)
            logo[..., :3] = (245, 236, 218)
            logo[..., 3] = (alpha * 255).astype(np.uint8)
            pad = int(60 * self.scale)
            logo_im = Image.new("RGBA", (img.width + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
            logo_im.paste(Image.fromarray(logo, "RGBA"), (pad, pad))
            layer = Image.new("RGBA", (self.OW, self.OH), (0, 0, 0, 0))
            px = int(sp["center"][0] * self.OW - logo_im.width / 2)
            py = int(sp["center"][1] * self.OH - logo_im.height / 2)
            glow = Image.new("RGBA", logo_im.size, (255, 180, 100, 0))
            glow.putalpha(logo_im.getchannel("A").filter(ImageFilter.GaussianBlur(18 * self.scale)).point(lambda v: int(v * 0.5)))
            layer.alpha_composite(glow, (px, py))
            layer.alpha_composite(logo_im, (px, py))
        else:
            lines = [dict(l, size=max(8, int(l["size"] * self.scale))) for l in sp["lines"]]
            anchor = sp["anchor"]
            if anchor != "center":
                anchor = (anchor[0] * self.OW, anchor[1] * self.OH)
            layer = text_layer(lines, (self.OW, self.OH), anchor=anchor,
                               glow=(255, 175, 95, int(16 * self.scale) or 1, 0.9))
            if sp.get("offset_y"):
                shifted = Image.new("RGBA", layer.size, (0, 0, 0, 0))
                shifted.alpha_composite(layer, (0, int(sp["offset_y"] * self.OH)))
                layer = shifted
        arr = np.asarray(layer, np.float32) / 255.0
        self._super_cache[sp["id"]] = arr
        return arr

    def composite_supers(self, img, t):
        """img: uint8 output-size array; returns uint8."""
        live = [sp for sp in self.tl.get("supers", []) if sp["t0"] <= t <= sp["t1"]]
        if not live:
            return img
        img = img.astype(np.float32) / 255
        for sp in live:
            if not (sp["t0"] <= t <= sp["t1"]):
                continue
            a = 1.0
            if sp.get("fade_in"):
                a *= smoothstep((t - sp["t0"]) / sp["fade_in"])
            if sp.get("fade_out"):
                a *= smoothstep((sp["t1"] - t) / sp["fade_out"])
            lay = self.super_layer(sp)
            al = lay[..., 3:4] * a
            img = img * (1 - al) + lay[..., :3] * al
        return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)

    # --------------------------------------------------------------- frame
    def shot_at(self, t):
        for i, (sc, sh) in enumerate(self.shots):
            if sh["start"] <= t < sh["end"]:
                return i
        return len(self.shots) - 1

    def active(self, t, fi):
        i = self.shot_at(t)
        sc, sh = self.shots[i]
        img = self.render_shot(sc, sh, t)
        tr = sh["animatic"].get("in", {"type": "cut"})
        dt = t - sh["start"]
        if tr["type"] == "dissolve" and dt < tr["dur"] and i > 0:
            psc, psh = self.shots[i - 1]
            prev = self.render_shot(psc, psh, t)
            u = smoothstep(dt / tr["dur"])
            img = prev * (1 - u) + img * u
        elif tr["type"] == "flash" and dt < tr["dur"]:
            img = np.clip(img + WARM * 0.55 * (1 - dt / tr["dur"]) ** 2, 0, 1)

        # bloom
        l = img @ LUMA
        bright = img * np.clip((l - 0.55) / 0.45, 0, 1)[..., None]
        h8, w8 = self.H // 8, self.W // 8
        small = bright[:h8 * 8, :w8 * 8].reshape(h8, 8, w8, 8, 3).mean(axis=(1, 3))
        b = Image.fromarray((small * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
        b = np.asarray(b.resize((self.W, self.H), Image.Resampling.BILINEAR), np.float32) / 255
        img = 1 - (1 - img) * (1 - b * 0.55 * np.array([1.0, 0.85, 0.7], np.float32))

        img = img + self.grain[fi % len(self.grain)] * 0.011 * (0.6 + 0.4 * (1 - l[..., None]))
        img = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
        img = np.asarray(img.resize((self.OW, self.OH), Image.Resampling.BICUBIC))
        return i, self.composite_supers(img, t)

    def frame(self, t, fi, review=False, active=None):
        """Letterboxed output frame; review=True returns the 720p review frame."""
        if active is None:
            active = self.active(t, fi)
        i, img = active
        out = np.zeros((self.FH, self.FW, 3), np.uint8)
        out[self.bar:self.bar + self.OH] = img
        if review:
            out = self.review_overlay(out, i, t)
        return out

    def review_overlay(self, out, i, t):
        rw, rh = REVIEW_SIZE
        rbar = (rh - int(round(rw / self.aspect))) // 2
        sc, sh = self.shots[i]
        if i not in self._review_cache:
            top = text_layer([{"text": f"{sc['id']} · {sh['id']}    {sc['title_en']}  ·  {sc['title_ko']}",
                               "families": ["serif-caps", "kr-sans"], "size": int(rbar * 0.42),
                               "tracking": 0.08, "color": (232, 196, 140)}],
                             (rw, rbar), anchor=(16, int(rbar * 0.2)), shadow=False)
            # NanumGothic's → glyph renders as a tiny tick at bar size; ⇒ stays legible
            bot = text_layer([{"text": sh["note_ko"].replace("→", "⇒"), "families": ["kr-sans"],
                               "size": int(rbar * 0.42), "color": (235, 230, 220)}],
                             (rw, rbar), anchor="center", shadow=False)
            self._review_cache[i] = [np.asarray(l, np.float32) / 255 for l in (top, bot)]
        small = np.array(Image.fromarray(out).resize((rw, rh), Image.Resampling.BILINEAR))
        for lay, y in zip(self._review_cache[i], (0, rh - rbar)):
            small[y:y + rbar] = (lay[..., :3] * lay[..., 3:4] * 255 + 0.5).astype(np.uint8)
        im = Image.fromarray(small)
        fs = FontStack(["serif-caps"], int(rbar * 0.42))
        tc = f"{int(t // 60):02d}:{t % 60:05.2f}  /  00:{self.dur:05.2f}"
        fs.draw(ImageDraw.Draw(im), (rw - fs.measure(tc, 0.04) - 16, rbar * 0.2), tc, (232, 196, 140), 0.04)
        return np.asarray(im)


def ffmpeg_writer(path, w, h, fps, audio, crf=23):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{w}x{h}", "-r", str(fps), "-i", "-"]
    if audio and Path(audio).exists():
        cmd += ["-i", str(audio), "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(path)]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


_R = None


def _worker_init(timeline_path, scale):
    global _R
    _R = Renderer(json.loads(Path(timeline_path).read_text()), scale)


def _worker_frame(fi):
    t = fi / _R.fps
    act = _R.active(t, fi)
    return (_R.frame(t, fi, active=act).tobytes(),
            _R.frame(t, fi, review=True, active=act).tobytes(),
            _R.shots[act[0]][1]["id"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", default=str(ROOT / "spec/timeline.json"))
    ap.add_argument("--out", default=str(ROOT / "renders"))
    ap.add_argument("--audio", default=str(ROOT / "renders/odd_haus_score.wav"))
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--stills", help="comma-separated times; writes PNGs instead of video")
    ap.add_argument("--review-only", action="store_true")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    args = ap.parse_args()

    tl = json.loads(Path(args.timeline).read_text())
    r = Renderer(tl, args.scale)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if args.stills:
        (out / "stills").mkdir(exist_ok=True)
        for s in args.stills.split(","):
            t = float(s)
            Image.fromarray(r.frame(t, int(t * r.fps))).save(out / "stills" / f"t{t:05.2f}.png")
        return

    n = int(round(r.dur * r.fps))
    writers = []
    if not args.review_only:
        writers.append((ffmpeg_writer(out / "odd_haus_animatic_50s.mp4", r.FW, r.FH, r.fps, args.audio), False))
    writers.append((ffmpeg_writer(out / "odd_haus_animatic_50s_review.mp4", *REVIEW_SIZE, r.fps, args.audio, crf=25), True))
    with mp.Pool(args.jobs, _worker_init, (args.timeline, args.scale)) as pool:
        for fi, (clean, review, shot) in enumerate(pool.imap(_worker_frame, range(n), chunksize=4)):
            for proc, is_review in writers:
                proc.stdin.write(review if is_review else clean)
            if fi % 48 == 0:
                print(f"  frame {fi}/{n}  t={fi / r.fps:5.2f}s  shot={shot}", flush=True)
    for proc, _ in writers:
        proc.stdin.close()
        proc.wait()
    print("done ->", out)


if __name__ == "__main__":
    main()
