// Procedural canvas textures. No image files: every surface is painted here.
import * as THREE from "three";
import { rng, clamp } from "./util.js";

const cache = new Map();
export const allTextures = [];

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}

function tex(c, { srgb = true, repeat = null, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (repeat) t.repeat.set(...repeat);
  t.needsUpdate = true;
  allTextures.push(t);
  return t;
}

function memo(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

const hex = (h) => new THREE.Color(h);
function shade(color, k) {
  const c = hex(color).clone().multiplyScalar(k);
  return `rgb(${clamp(c.r) * 255 | 0},${clamp(c.g) * 255 | 0},${clamp(c.b) * 255 | 0})`;
}
function mix(a, b, t) {
  const c = hex(a).clone().lerp(hex(b), t);
  return `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
}

function speckle(ctx, w, h, n, colorFn, r, sizeMin = 0.5, sizeMax = 1.6) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colorFn(r());
    const s = sizeMin + r() * (sizeMax - sizeMin);
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

// ---------------------------------------------------------------- wood
/** Floor planks. One canvas = `span` metres square. */
export function woodPlanks(seed = 3) {
  return memo("planks" + seed, () => {
    const W = 2048, H = 2048, rows = 14;
    const [c, x] = canvas(W, H);
    const [rc, rx] = canvas(W, H);
    const r = rng(seed);
    const tones = ["#6b4528", "#5c3a21", "#77502f", "#4f321d", "#6f4a2b", "#83593a"];
    const ph = H / rows;
    for (let row = 0; row < rows; row++) {
      let px = -r() * 600;
      while (px < W) {
        const len = 520 + r() * 900;
        const base = tones[(r() * tones.length) | 0];
        const y0 = row * ph;
        const g = x.createLinearGradient(px, y0, px + len, y0 + ph);
        g.addColorStop(0, shade(base, 0.92 + r() * 0.1));
        g.addColorStop(1, shade(base, 0.9 + r() * 0.15));
        x.fillStyle = g;
        x.fillRect(px, y0, len, ph);
        // grain
        for (let k = 0; k < 26; k++) {
          const gy = y0 + r() * ph;
          x.strokeStyle = shade(base, 0.65 + r() * 0.25);
          x.globalAlpha = 0.18 + r() * 0.25;
          x.lineWidth = 0.6 + r() * 1.6;
          x.beginPath();
          const amp = 1 + r() * 3, f = 0.004 + r() * 0.01, ph0 = r() * 6;
          for (let gx = px; gx < px + len; gx += 12) x.lineTo(gx, gy + Math.sin(gx * f + ph0) * amp);
          x.stroke();
        }
        // knot
        if (r() < 0.25) {
          const kx = px + r() * len, ky = y0 + ph * (0.3 + r() * 0.4);
          for (let k = 6; k > 0; k--) {
            x.globalAlpha = 0.12;
            x.strokeStyle = shade(base, 0.5);
            x.beginPath(); x.ellipse(kx, ky, k * 7, k * 2.6, 0, 0, Math.PI * 2); x.stroke();
          }
        }
        x.globalAlpha = 1;
        // seams
        x.fillStyle = "rgba(20,10,4,0.85)";
        x.fillRect(px, y0, 3, ph);
        x.fillRect(px, y0, len, 2.5);
        // roughness: waxed with traffic wear
        const rough = 70 + r() * 40;
        rx.fillStyle = `rgb(${rough},${rough},${rough})`;
        rx.fillRect(px, y0, len, ph);
        rx.fillStyle = "rgb(200,200,200)";
        rx.fillRect(px, y0, 3, ph); rx.fillRect(px, y0, len, 2.5);
        px += len;
      }
    }
    speckle(x, W, H, 9000, (v) => `rgba(${v > 0.5 ? "255,230,200" : "0,0,0"},0.06)`, r);
    speckle(rx, W, H, 14000, (v) => `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},0.08)`, r, 1, 3);
    return { map: tex(c), roughnessMap: tex(rc, { srgb: false }) };
  });
}

/** Furniture wood grain (lengthwise along u). */
export function woodGrain(base = "#5a3b24", seed = 5, contrast = 1) {
  return memo(`grain${base}${seed}${contrast}`, () => {
    const [c, x] = canvas(512, 512);
    const r = rng(seed);
    x.fillStyle = base; x.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 90; k++) {
      const y = r() * 512;
      x.strokeStyle = shade(base, 1 - (0.15 + r() * 0.35) * contrast);
      x.globalAlpha = 0.25 + r() * 0.35;
      x.lineWidth = 0.5 + r() * 2.5;
      x.beginPath();
      const amp = 2 + r() * 6, f = 0.006 + r() * 0.02, p0 = r() * 6;
      for (let gx = -10; gx < 530; gx += 8) x.lineTo(gx, y + Math.sin(gx * f + p0) * amp + Math.sin(gx * f * 3.1) * amp * 0.3);
      x.stroke();
    }
    x.globalAlpha = 1;
    speckle(x, 512, 512, 2500, () => "rgba(0,0,0,0.08)", r);
    return tex(c);
  });
}

// ---------------------------------------------------------------- fabric
export function plaid(base = "#7d1820", dark = "#2a0b0e", light = "#c7a273", seed = 2, scale = 1) {
  return memo(`plaid${base}${dark}${light}${seed}${scale}`, () => {
    const S = 512;
    const [c, x] = canvas(S, S);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    const bands = [
      [0, 120, dark, 0.55], [150, 26, dark, 0.7], [205, 10, light, 0.55],
      [256, 120, dark, 0.45], [400, 18, "#0c0c18", 0.6], [450, 6, light, 0.5],
    ];
    for (const [p, w, col, a] of bands) {
      x.globalAlpha = a; x.fillStyle = col;
      x.fillRect(p * scale, 0, w * scale, S);
      x.fillRect(0, p * scale, S, w * scale);
    }
    x.globalAlpha = 1;
    // twill weave
    x.globalAlpha = 0.08;
    x.strokeStyle = "#000";
    for (let i = -S; i < S; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); }
    x.globalAlpha = 1;
    const r = rng(seed);
    speckle(x, S, S, 6000, (v) => (v > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"), r);
    return tex(c);
  });
}

export function fabric(base = "#3c4a3e", seed = 7, weave = 4) {
  return memo(`fabric${base}${seed}${weave}`, () => {
    const S = 256;
    const [c, x] = canvas(S, S);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.globalAlpha = 0.12;
    for (let i = 0; i < S; i += weave) {
      x.fillStyle = "#000"; x.fillRect(i, 0, 1, S);
      x.fillStyle = "#fff"; x.fillRect(0, i + 1, S, 1);
    }
    x.globalAlpha = 1;
    const r = rng(seed);
    speckle(x, S, S, 3000, (v) => (v > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)"), r);
    return tex(c);
  });
}

/** Knit rib pattern, returns {map, bumpMap}. */
export function knit(base = "#1d1d22", seed = 4) {
  return memo(`knit${base}${seed}`, () => {
    const W = 256, H = 256;
    const [c, x] = canvas(W, H);
    const [bc, bx] = canvas(W, H);
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    bx.fillStyle = "#000"; bx.fillRect(0, 0, W, H);
    const cw = 16, ch = 12;
    for (let j = 0; j < H / ch + 1; j++) {
      for (let i = 0; i < W / cw; i++) {
        const cx = i * cw + cw / 2, cy = j * ch;
        for (const s of [-1, 1]) {
          const g = bx.createLinearGradient(cx, cy, cx + s * cw / 2, cy + ch);
          g.addColorStop(0, "#fff"); g.addColorStop(1, "#333");
          bx.fillStyle = g;
          bx.beginPath(); bx.ellipse(cx + s * cw * 0.22, cy + ch * 0.5, cw * 0.26, ch * 0.62, s * 0.5, 0, Math.PI * 2); bx.fill();
          x.fillStyle = shade(base, 1.25);
          x.globalAlpha = 0.35;
          x.beginPath(); x.ellipse(cx + s * cw * 0.22, cy + ch * 0.4, cw * 0.14, ch * 0.35, s * 0.5, 0, Math.PI * 2); x.fill();
          x.globalAlpha = 1;
        }
      }
    }
    return { map: tex(c), bumpMap: tex(bc, { srgb: false }) };
  });
}

// ---------------------------------------------------------------- vinyl
/**
 * 1D band texture for a lathe-built record: v runs centre -> rim -> back centre.
 * Bands encode the label, grooves and rim.
 */
export function vinylBands(labelColor = "#b3262c", labelInner = "#f1e4c8") {
  return memo(`vinyl${labelColor}`, () => {
    const W = 16, H = 1024;
    const [c, x] = canvas(W, H);
    const [rc, rx] = canvas(W, H);
    const r = rng(11);
    const side = (y0, y1, flip) => {
      const span = y1 - y0;
      for (let i = 0; i < span; i++) {
        const v = i / span; // 0 centre -> 1 rim
        const y = flip ? y1 - i - 1 : y0 + i;
        let col, rough;
        if (v < 0.035) { col = "#0b0b0b"; rough = 140; } // spindle area
        else if (v < 0.30) { col = v < 0.1 ? labelInner : labelColor; rough = 170; }
        else if (v < 0.33) { col = "#141414"; rough = 60; }
        else if (v > 0.965) { col = "#0e0e0e"; rough = 90; }
        else {
          const g = 0.06 + 0.035 * Math.sin(i * 1.7) + 0.02 * r();
          const track = Math.sin(v * 46) > 0.93 ? 0.6 : 1; // gaps between tracks
          const l = (g * track * 255) | 0;
          col = `rgb(${l},${l},${l + 2})`;
          rough = (Math.sin(i * 2.3) > 0 ? 55 : 95) * (track < 1 ? 1.6 : 1);
        }
        x.fillStyle = col; x.fillRect(0, y, W, 1);
        rx.fillStyle = `rgb(${rough | 0},${rough | 0},${rough | 0})`; rx.fillRect(0, y, W, 1);
      }
    };
    side(0, H * 0.47, false);
    x.fillStyle = "#101010"; x.fillRect(0, H * 0.47, W, H * 0.06);
    rx.fillStyle = "rgb(110,110,110)"; rx.fillRect(0, H * 0.47, W, H * 0.06);
    side(H * 0.53, H, true);
    const m = tex(c, { wrap: false });
    const rm = tex(rx.canvas, { srgb: false, wrap: false });
    m.flipY = false; rm.flipY = false;
    return { map: m, roughnessMap: rm };
  });
}

// ---------------------------------------------------------------- rug
export function persianRug(seed = 21) {
  return memo("rug" + seed, () => {
    const W = 1024, H = 768;
    const [c, x] = canvas(W, H);
    const r = rng(seed);
    const field = "#6a1717", navy = "#1b2340", cream = "#d9c39a", gold = "#b8893e", teal = "#24504f";
    x.fillStyle = navy; x.fillRect(0, 0, W, H);
    const band = (inset, w, col) => { x.fillStyle = col; x.fillRect(inset, inset, W - inset * 2, H - inset * 2); };
    band(18, 0, cream); band(26, 0, navy); band(70, 0, gold); band(76, 0, navy); band(86, 0, field);
    // border motifs
    x.fillStyle = cream;
    for (let i = 40; i < W - 40; i += 34) {
      for (const yy of [48, H - 48]) { x.save(); x.translate(i, yy); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore(); }
    }
    for (let j = 40; j < H - 40; j += 34) {
      for (const xx of [48, W - 48]) { x.save(); x.translate(xx, j); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore(); }
    }
    x.fillStyle = gold;
    for (let i = 40; i < W - 40; i += 34) for (const yy of [48, H - 48]) { x.beginPath(); x.arc(i + 17, yy, 3.5, 0, 7); x.fill(); }
    // field lattice
    x.strokeStyle = shade(field, 0.65); x.lineWidth = 2;
    for (let i = 86; i < W - 86; i += 48) {
      for (let j = 86; j < H - 86; j += 48) {
        x.beginPath(); x.moveTo(i + 24, j); x.lineTo(i + 48, j + 24); x.lineTo(i + 24, j + 48); x.lineTo(i, j + 24); x.closePath(); x.stroke();
        x.fillStyle = r() > 0.5 ? shade(gold, 0.8) : shade(cream, 0.75);
        x.globalAlpha = 0.55; x.beginPath(); x.arc(i + 24, j + 24, 3, 0, 7); x.fill(); x.globalAlpha = 1;
      }
    }
    // medallion
    const cx = W / 2, cy = H / 2;
    const ring = (rx, ry, col) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); };
    ring(210, 150, navy); ring(196, 138, cream); ring(186, 130, teal); ring(150, 104, field); ring(120, 84, gold);
    ring(104, 72, navy); ring(70, 48, cream); ring(52, 36, field);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      x.fillStyle = k % 2 ? gold : cream;
      x.save(); x.translate(cx + Math.cos(a) * 168, cy + Math.sin(a) * 117); x.rotate(a);
      x.beginPath(); x.moveTo(-14, 0); x.lineTo(0, -8); x.lineTo(14, 0); x.lineTo(0, 8); x.closePath(); x.fill(); x.restore();
    }
    // corner spandrels
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      x.fillStyle = navy;
      x.beginPath(); x.ellipse(sx > 0 ? 86 : W - 86, sy > 0 ? 86 : H - 86, 130, 95, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = teal;
      x.beginPath(); x.ellipse(sx > 0 ? 86 : W - 86, sy > 0 ? 86 : H - 86, 96, 68, 0, 0, Math.PI * 2); x.fill();
    }
    // wool & wear
    speckle(x, W, H, 60000, (v) => (v > 0.55 ? "rgba(255,240,220,0.07)" : "rgba(0,0,0,0.13)"), r, 0.6, 2.2);
    const wear = x.createRadialGradient(cx, cy * 1.1, 40, cx, cy, 380);
    wear.addColorStop(0, "rgba(255,230,200,0.10)"); wear.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = wear; x.fillRect(0, 0, W, H);
    return tex(c, { wrap: false });
  });
}

// ---------------------------------------------------------------- metal / paint
export function agedBrass(seed = 8) {
  return memo("brass" + seed, () => {
    const S = 512;
    const [c, x] = canvas(S, S);
    const [rc, rx] = canvas(S, S);
    const r = rng(seed);
    x.fillStyle = "#c79a54"; x.fillRect(0, 0, S, S);
    rx.fillStyle = "rgb(110,110,110)"; rx.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) {
      const px = r() * S, py = r() * S, rad = 6 + r() * 40;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      const kind = r();
      const col = kind < 0.55 ? "rgba(96,64,26,0.16)" : kind < 0.8 ? "rgba(80,110,80,0.14)" : "rgba(255,230,170,0.18)";
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      const rg = rx.createRadialGradient(px, py, 0, px, py, rad);
      rg.addColorStop(0, kind < 0.8 ? "rgba(220,220,220,0.5)" : "rgba(40,40,40,0.5)"); rg.addColorStop(1, "rgba(0,0,0,0)");
      rx.fillStyle = rg; rx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    speckle(x, S, S, 5000, () => "rgba(40,25,10,0.2)", r);
    return { map: tex(c), roughnessMap: tex(rc, { srgb: false }) };
  });
}

/** Painted plastic / painted metal with scratches and edge wear. */
export function paintedWear(base = "#c8202a", seed = 9, scratchColor = "#f0d0c0", dents = false) {
  return memo(`paint${base}${seed}${dents}`, () => {
    const S = 512;
    const [c, x] = canvas(S, S);
    const [rc, rx] = canvas(S, S);
    const r = rng(seed);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    rx.fillStyle = "rgb(105,105,105)"; rx.fillRect(0, 0, S, S);
    // soft tonal variation
    for (let i = 0; i < 40; i++) {
      const px = r() * S, py = r() * S, rad = 30 + r() * 90;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 70; i++) {
      const px = r() * S, py = r() * S, len = 6 + r() * 40, a = r() * Math.PI;
      x.strokeStyle = scratchColor; x.globalAlpha = 0.15 + r() * 0.35; x.lineWidth = 0.6 + r();
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
      rx.strokeStyle = "rgb(210,210,210)"; rx.globalAlpha = 0.6; rx.lineWidth = 1.5;
      rx.beginPath(); rx.moveTo(px, py); rx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); rx.stroke();
    }
    x.globalAlpha = 1; rx.globalAlpha = 1;
    if (dents) {
      for (let i = 0; i < 12; i++) {
        const px = r() * S, py = r() * S, rad = 6 + r() * 14;
        const g = x.createRadialGradient(px - 2, py - 2, 0, px, py, rad);
        g.addColorStop(0, "rgba(0,0,0,0.25)"); g.addColorStop(0.7, "rgba(255,255,255,0.08)"); g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
    }
    return { map: tex(c), roughnessMap: tex(rc, { srgb: false }) };
  });
}

// ---------------------------------------------------------------- walls
export function wallpaper(base = "#1d2b2c", seed = 13) {
  return memo(`wall${base}${seed}`, () => {
    const S = 512;
    const [c, x] = canvas(S, S);
    const r = rng(seed);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.globalAlpha = 0.16;
    x.fillStyle = shade(base, 1.6);
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const cx = i * 128 + (j % 2 ? 64 : 0), cy = j * 128 + 64;
        x.beginPath();
        x.moveTo(cx, cy - 46);
        x.bezierCurveTo(cx + 30, cy - 30, cx + 34, cy + 6, cx, cy + 46);
        x.bezierCurveTo(cx - 34, cy + 6, cx - 30, cy - 30, cx, cy - 46);
        x.fill();
        x.beginPath(); x.arc(cx, cy, 8, 0, 7); x.fill();
      }
    }
    x.globalAlpha = 1;
    speckle(x, S, S, 5000, (v) => (v > 0.5 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.07)"), r, 1, 3);
    return tex(c);
  });
}

// ---------------------------------------------------------------- graphics / labels
/** Album sleeve / framed art. */
export function albumArt(seed) {
  return memo("album" + seed, () => {
    const S = 256;
    const [c, x] = canvas(S, S);
    const r = rng(seed * 97 + 3);
    const pal = [["#e8d6b0", "#c0392b", "#1f2a44"], ["#1b1b1b", "#e0b040", "#d9d9d9"], ["#2f5d62", "#f1c27d", "#a23e48"],
      ["#3d2c4e", "#f08a5d", "#f9ed69"], ["#101820", "#f2aa4c", "#e2e2e2"], ["#d7263d", "#f4f4f4", "#1b998b"], ["#6a994e", "#f2e8cf", "#bc4749"]];
    const p = pal[(r() * pal.length) | 0];
    x.fillStyle = p[0]; x.fillRect(0, 0, S, S);
    const kind = (r() * 4) | 0;
    x.fillStyle = p[1];
    if (kind === 0) { x.beginPath(); x.arc(S * (0.3 + r() * 0.4), S * (0.3 + r() * 0.4), S * (0.18 + r() * 0.2), 0, 7); x.fill(); }
    else if (kind === 1) { for (let i = 0; i < 6; i++) { x.fillRect(0, i * S / 6, S * (0.2 + r() * 0.8), S / 14); } }
    else if (kind === 2) { x.beginPath(); x.moveTo(0, S); x.lineTo(S * r(), 0); x.lineTo(S, S); x.fill(); }
    else { for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(r() * S, r() * S, 6 + r() * 30, 0, 7); x.fill(); } }
    x.fillStyle = p[2];
    x.fillRect(S * 0.08, S * 0.82, S * (0.3 + r() * 0.5), S * 0.05);
    speckle(x, S, S, 1500, () => "rgba(0,0,0,0.12)", r);
    const t = tex(c, { wrap: false });
    return t;
  });
}

let fontsReady = null;
export function loadFonts(base = "./fonts/") {
  if (!fontsReady) {
    const faces = [
      new FontFace("PatrickHandSC", `url(${base}PatrickHandSC.woff2)`),
      new FontFace("Anton", `url(${base}Anton.woff2)`),
      new FontFace("InterUI", `url(${base}Inter-400.woff2)`, { weight: "400" }),
      new FontFace("InterUI", `url(${base}Inter-600.woff2)`, { weight: "600" }),
    ];
    fontsReady = Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff)).catch(() => null)));
  }
  return fontsReady;
}

/** Handwritten masking-tape label (English only). */
export function tapeLabel(text, seed = 1, w = 256, h = 96) {
  return memo(`tape${text}${seed}`, () => {
    const [c, x] = canvas(w, h);
    const r = rng(seed);
    x.fillStyle = "#e6d6a8";
    x.beginPath();
    x.moveTo(4, 6);
    for (let i = 4; i < w - 4; i += 10) x.lineTo(i, 4 + r() * 5);
    for (let j = 6; j < h - 6; j += 8) x.lineTo(w - 3 - r() * 4, j);
    for (let i = w - 4; i > 4; i -= 10) x.lineTo(i, h - 4 - r() * 5);
    for (let j = h - 6; j > 6; j -= 8) x.lineTo(3 + r() * 4, j);
    x.closePath(); x.fill();
    speckle(x, w, h, 500, () => "rgba(120,90,40,0.12)", r);
    x.fillStyle = "#1c1a18";
    x.font = `${Math.round(h * 0.56)}px PatrickHandSC, "Comic Sans MS", sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.save(); x.translate(w / 2, h / 2 + 3); x.rotate((r() - 0.5) * 0.08);
    x.fillText(text, 0, 0); x.restore();
    return tex(c, { wrap: false });
  });
}

/** Engraved metal dog tag. */
export function engravedTag(text = "BUDDY") {
  return memo("tag" + text, () => {
    const S = 256;
    const [c, x] = canvas(S, S);
    const g = x.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S / 2);
    g.addColorStop(0, "#f2d98c"); g.addColorStop(0.7, "#c9a24a"); g.addColorStop(1, "#7c5d22");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(90,60,20,0.8)"; x.lineWidth = 6;
    x.beginPath(); x.arc(S / 2, S / 2, S * 0.43, 0, 7); x.stroke();
    x.font = `bold ${S * 0.25}px Anton, Impact, sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "rgba(255,240,200,0.6)"; x.fillText(text, S / 2 + 2, S / 2 + 3);
    x.fillStyle = "#5a3d12"; x.fillText(text, S / 2, S / 2);
    return tex(c, { wrap: false });
  });
}

/** Diagonal-stripe tie fabric. */
export function stripes(base = "#1e3f8f", stripe = "#f2c230", seed = 3) {
  return memo(`stripes${base}${stripe}`, () => {
    const S = 256;
    const [c, x] = canvas(S, S);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    x.strokeStyle = stripe; x.lineWidth = 18;
    for (let i = -S; i < S * 2; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); }
    x.strokeStyle = shade(stripe, 0.7); x.lineWidth = 3;
    for (let i = -S + 22; i < S * 2; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); }
    speckle(x, S, S, 1500, () => "rgba(0,0,0,0.1)", rng(seed));
    return tex(c);
  });
}

/** Bully's skull band tee print (graphic only, no words). */
export function skullTee() {
  return memo("skulltee", () => {
    const W = 512, H = 512;
    const [c, x] = canvas(W, H);
    x.fillStyle = "#18181b"; x.fillRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.46;
    // red lightning burst behind
    x.fillStyle = "#c0262d";
    x.beginPath();
    const pts = [[-150, -40], [-60, -70], [-90, -130], [0, -80], [40, -150], [70, -70], [160, -60], [90, -10], [150, 50], [40, 20], [0, 90], [-40, 20], [-160, 40], [-90, -10]];
    pts.forEach(([px, py], i) => (i ? x.lineTo(cx + px, cy + py) : x.moveTo(cx + px, cy + py)));
    x.closePath(); x.fill();
    // skull
    x.fillStyle = "#ece6d6";
    x.beginPath(); x.ellipse(cx, cy - 6, 70, 64, 0, 0, Math.PI * 2); x.fill();
    x.fillRect(cx - 42, cy + 30, 84, 50);
    x.fillStyle = "#18181b";
    x.beginPath(); x.ellipse(cx - 28, cy - 4, 20, 22, 0.2, 0, 7); x.fill();
    x.beginPath(); x.ellipse(cx + 28, cy - 4, 20, 22, -0.2, 0, 7); x.fill();
    x.beginPath(); x.moveTo(cx, cy + 18); x.lineTo(cx - 9, cy + 36); x.lineTo(cx + 9, cy + 36); x.closePath(); x.fill();
    for (let i = -3; i <= 3; i++) x.fillRect(cx + i * 12 - 1.5, cy + 50, 3, 28);
    x.fillStyle = "#c0262d";
    x.beginPath(); x.arc(cx - 28, cy - 2, 6, 0, 7); x.fill();
    x.beginPath(); x.arc(cx + 28, cy - 2, 6, 0, 7); x.fill();
    // crossbones
    x.strokeStyle = "#ece6d6"; x.lineWidth = 16; x.lineCap = "round";
    x.beginPath(); x.moveTo(cx - 110, cy + 120); x.lineTo(cx + 110, cy + 175); x.stroke();
    x.beginPath(); x.moveTo(cx + 110, cy + 120); x.lineTo(cx - 110, cy + 175); x.stroke();
    // worn print
    speckle(x, W, H, 9000, () => "rgba(24,24,27,0.55)", rng(77), 1, 3);
    return tex(c, { wrap: false });
  });
}

/** Mug decal: black ODD HAUS house icon on white ceramic. */
export function mugDecal() {
  return memo("mug", () => {
    const W = 512, H = 256;
    const [c, x] = canvas(W, H);
    x.fillStyle = "#f3efe6"; x.fillRect(0, 0, W, H);
    const cx = W * 0.25, cy = H * 0.52, s = 70;
    x.fillStyle = "#151515";
    x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.85, cy - s * 0.1); x.lineTo(cx + s * 0.62, cy - s * 0.1);
    x.lineTo(cx + s * 0.62, cy + s * 0.75); x.lineTo(cx - s * 0.62, cy + s * 0.75); x.lineTo(cx - s * 0.62, cy - s * 0.1);
    x.lineTo(cx - s * 0.85, cy - s * 0.1); x.closePath(); x.fill();
    x.fillStyle = "#f3efe6";
    x.fillRect(cx - s * 0.25, cy + s * 0.05, s * 0.5, s * 0.45);
    x.fillStyle = "#151515";
    x.fillRect(cx - 2, cy + s * 0.05, 4, s * 0.45); x.fillRect(cx - s * 0.25, cy + s * 0.26, s * 0.5, 4);
    return tex(c, { wrap: false });
  });
}

/** Radial gradient alpha (contact shadows, glows). */
export function radial(inner = 1, outer = 0, soft = 0.5) {
  return memo(`radial${inner}${outer}${soft}`, () => {
    const S = 128;
    const [c, x] = canvas(S, S);
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, `rgba(255,255,255,${inner})`);
    g.addColorStop(soft, `rgba(255,255,255,${(inner + outer) * 0.45})`);
    g.addColorStop(1, `rgba(255,255,255,${outer})`);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return tex(c, { srgb: false, wrap: false });
  });
}

/** Night sky seen through windows. */
export function nightSky() {
  return memo("sky", () => {
    const W = 256, H = 512;
    const [c, x] = canvas(W, H);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1024"); g.addColorStop(0.6, "#18294d"); g.addColorStop(1, "#2a3d63");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = rng(5);
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(220,230,255,${0.2 + r() * 0.5})`; x.fillRect(r() * W, r() * H * 0.6, 1.2, 1.2); }
    // silhouettes of trees
    x.fillStyle = "#070b16";
    for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(r() * W, H * (0.82 + r() * 0.1), 30 + r() * 40, 0, 7); x.fill(); }
    x.fillRect(0, H * 0.9, W, H * 0.1);
    return tex(c, { wrap: false });
  });
}

/** Marker scrawl on transparent background (English only), e.g. "Bully" on the guitar. */
export function scrawl(text, color = "#111111", w = 512, h = 192, seed = 3) {
  return memo(`scrawl${text}${color}`, () => {
    const [c, x] = canvas(w, h);
    const r = rng(seed);
    x.fillStyle = color;
    x.font = `${Math.round(h * 0.7)}px PatrickHandSC, "Comic Sans MS", sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.save(); x.translate(w / 2, h / 2); x.rotate(-0.12 + (r() - 0.5) * 0.05);
    x.fillText(text, 0, 0);
    x.lineWidth = 3; x.strokeStyle = color; x.strokeText(text, 0, 0);
    x.beginPath(); x.moveTo(-w * 0.32, h * 0.32); x.quadraticCurveTo(0, h * 0.42, w * 0.34, h * 0.26); x.lineWidth = 6; x.stroke();
    x.restore();
    return tex(c, { wrap: false });
  });
}
