// Procedural material textures, painted on canvases at load time.
// Everything is tileable unless noted; colours are sRGB.
import * as THREE from "three";

export const PAL = {
  navy: "#1f2b45",
  navyDeep: "#161f33",
  red: "#a6382a",
  burgundy: "#6d2226",
  cream: "#f1e5cc",
  plaster: "#eadcc1",
  forest: "#1e4a2f",
  brass: "#c39a4c",
  walnut: "#6b3a1f",
};

// ---------- noise ----------
function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, p, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
  const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Tileable fBm over u,v in [0,1). */
export function fbm(u, v, base = 4, oct = 4, seed = 1) {
  let sum = 0, amp = 0.5, f = base, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise(u * f, v * f, f, seed + o * 101);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function canvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

/** Low-frequency fBm field painted small then upscaled (fast). Returns a canvas of size w×h. */
function cloudLayer(w, h, small, base, oct, seed, c0, c1) {
  const s = canvas(small, Math.round(small * h / w));
  const g = s.getContext("2d");
  const img = g.createImageData(s.width, s.height);
  const A = hexRgb(c0), B = hexRgb(c1);
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const n = fbm(x / s.width, y / s.height, base, oct, seed);
    const t = Math.min(1, Math.max(0, (n - 0.25) / 0.5));
    const i = (y * s.width + x) * 4;
    img.data[i] = A[0] + (B[0] - A[0]) * t; img.data[i + 1] = A[1] + (B[1] - A[1]) * t; img.data[i + 2] = A[2] + (B[2] - A[2]) * t; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const out = canvas(w, h);
  const o = out.getContext("2d");
  o.imageSmoothingEnabled = true; o.imageSmoothingQuality = "high";
  // draw 3x3 so edges blend tileably when upscaled
  o.drawImage(s, 0, 0, w, h);
  return out;
}

export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function grain(ctx, w, h, amount, seed = 3) {
  const img = ctx.getImageData(0, 0, w, h);
  const r = rng(seed);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export function tex(c, { repeat = [1, 1], srgb = true, aniso = 8, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  return t;
}

/** Height map (Float32, 0..1) → tangent-space normal map canvas. */
function normalFromHeight(hgt, w, h, strength = 2) {
  const c = canvas(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = hgt[y * w + ((x - 1 + w) % w)], r = hgt[y * w + ((x + 1) % w)];
    const u = hgt[((y - 1 + h) % h) * w + x], d = hgt[((y + 1) % h) * w + x];
    let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz);
    const i = (y * w + x) * 4;
    img.data[i] = (nx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ---------- surfaces ----------

export function plaster(base = PAL.plaster, seed = 7) {
  const w = 1024;
  const c = cloudLayer(w, w, 96, 3, 4, seed, shade(base, -0.035), shade(base, 0.03));
  const g = c.getContext("2d");
  // trowel strokes
  const r = rng(seed);
  g.globalAlpha = 0.05;
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = r() > 0.5 ? "#fff8ea" : "#b9a888";
    g.lineWidth = 6 + r() * 30;
    g.beginPath();
    const x = r() * w, y = r() * w, a = r() * Math.PI;
    g.arc(x, y, 60 + r() * 160, a, a + 0.6 + r() * 0.8);
    g.stroke();
  }
  g.globalAlpha = 1;
  grain(g, w, w, 10, seed);
  return c;
}

export function concreteFloor() {
  const w = 1024;
  const c = cloudLayer(w, w, 128, 3, 5, 11, "#7a7672", "#a29e98");
  const g = c.getContext("2d");
  const r = rng(12);
  // broad polish clouds
  g.globalCompositeOperation = "soft-light";
  const c2 = cloudLayer(w, w, 64, 2, 3, 19, "#5c5a57", "#c4c0b8");
  g.drawImage(c2, 0, 0);
  g.globalCompositeOperation = "source-over";
  // aggregate specks
  for (let i = 0; i < 9000; i++) {
    const v = r();
    g.fillStyle = v > 0.6 ? `rgba(230,220,205,${0.25 + r() * 0.3})` : `rgba(55,48,42,${0.2 + r() * 0.35})`;
    const s = 0.8 + r() * (v > 0.97 ? 4 : 1.6);
    g.beginPath(); g.arc(r() * w, r() * w, s, 0, 7); g.fill();
  }
  // saw-cut joint along the tile edges (repeat = 2.4 m)
  g.fillStyle = "rgba(40,34,30,0.75)";
  g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, w);
  grain(g, w, w, 8, 4);
  return c;
}

export function concreteFloorRough() {
  const w = 512;
  const c = cloudLayer(w, w, 64, 3, 4, 23, "#4a4a4a", "#8a8a8a"); // roughness ~0.3..0.55
  return c;
}

export function boardConcrete(seed = 31, base = "#8f8e8b") {
  // board-formed concrete: 0.12 m planks, tie holes every 0.6 m; covers 2.4 m.
  const w = 1024, planks = 20, ph = w / planks;
  const c = cloudLayer(w, w, 96, 3, 4, seed, shade(base, -0.06), shade(base, 0.05));
  const g = c.getContext("2d");
  const r = rng(seed);
  for (let i = 0; i < planks; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "30,30,30"},${0.01 + r() * 0.025})`;
    g.fillRect(0, i * ph, w, ph);
    // wood grain imprint
    g.strokeStyle = "rgba(50,50,50,0.03)";
    g.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      g.beginPath();
      const y = i * ph + r() * ph;
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + k) * 2 * r());
      g.stroke();
    }
    g.fillStyle = "rgba(60,60,60,0.18)";
    g.fillRect(0, i * ph, w, 1);
  }
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
    const cx = (x + 0.5) * w / 4, cy = (y + 0.5) * w / 4 + ph * 0.5;
    const grd = g.createRadialGradient(cx, cy, 1, cx, cy, 9);
    grd.addColorStop(0, "rgba(30,28,26,0.9)"); grd.addColorStop(0.6, "rgba(60,56,52,0.5)"); grd.addColorStop(1, "rgba(60,56,52,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill();
  }
  grain(g, w, w, 12, seed);
  return c;
}

export function wood({ dark = "#4a2412", light = "#8d5531", seed = 41, w = 1024, h = 512, rings = 22 } = {}) {
  // grain runs along u (x)
  const c = canvas(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const A = hexRgb(dark), B = hexRgb(light);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const warp = fbm(u, v, 3, 3, seed) * 3.0 + fbm(u, v * 1.0, 8, 2, seed + 5) * 0.6;
      let t = Math.sin((v * rings + warp) * Math.PI * 2) * 0.5 + 0.5;
      t = Math.pow(t, 1.6);
      const fine = fbm(u * 1, v, 64, 2, seed + 9);
      let k = 0.25 + t * 0.55 + (fine - 0.5) * 0.35;
      k = Math.max(0, Math.min(1, k));
      const i = (y * w + x) * 4;
      img.data[i] = A[0] + (B[0] - A[0]) * k;
      img.data[i + 1] = A[1] + (B[1] - A[1]) * k;
      img.data[i + 2] = A[2] + (B[2] - A[2]) * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // pores
  const r = rng(seed);
  g.fillStyle = "rgba(25,10,4,0.25)";
  for (let i = 0; i < 2500; i++) g.fillRect(r() * w, r() * h, 3 + r() * 10, 1);
  return c;
}

export function greenTile() {
  // 4×4 tiles of 10 cm; texture covers 0.4 m
  const w = 512, n = 4, t = w / n, grout = 5;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  const r = rng(51);
  g.fillStyle = "#e3dccb"; g.fillRect(0, 0, w, w);
  const hgt = new Float32Array(w * w);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * t + grout / 2, y = j * t + grout / 2, s = t - grout;
    const k = (r() - 0.5) * 0.14;
    const base = shade("#20492f", k);
    const grd = g.createLinearGradient(x, y, x + s, y + s);
    grd.addColorStop(0, shade(base, 0.08)); grd.addColorStop(0.5, base); grd.addColorStop(1, shade(base, -0.1));
    g.fillStyle = grd;
    roundRect(g, x, y, s, s, 6); g.fill();
    // glaze pooling at the edges
    g.strokeStyle = "rgba(10,30,18,0.5)"; g.lineWidth = 3; roundRect(g, x + 1.5, y + 1.5, s - 3, s - 3, 5); g.stroke();
    g.strokeStyle = "rgba(160,200,170,0.18)"; g.lineWidth = 2; roundRect(g, x + 5, y + 5, s - 10, s - 10, 4); g.stroke();
    for (let py = 0; py < t; py++) for (let px = 0; px < t; px++) {
      const gx = i * t + px, gy = j * t + py;
      const dx = Math.min(px, t - px) - grout / 2, dy = Math.min(py, t - py) - grout / 2;
      const d = Math.min(dx, dy);
      hgt[gy * w + gx] = d <= 0 ? 0 : Math.min(1, Math.sqrt(d / 7));
    }
  }
  // subtle surface wave in glaze
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) hgt[y * w + x] += (fbm(x / w, y / w, 8, 2, 52) - 0.5) * 0.06;
  return { map: c, normal: normalFromHeight(hgt, w, w, 3.2) };
}

export function brushedSteel() {
  const w = 512;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, w, w);
  const r = rng(61);
  for (let i = 0; i < 2200; i++) {
    const v = 110 + r() * 60;
    g.fillStyle = `rgba(${v},${v},${v},${0.12 + r() * 0.2})`;
    g.fillRect(r() * w - 100, r() * w, 80 + r() * 400, 1 + r() * 1.5);
  }
  return c; // used as roughness (greyscale) and mild colour variation
}

export function galvanized() {
  const w = 512;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  const r = rng(71);
  const pts = Array.from({ length: 70 }, () => [r() * w, r() * w, 150 + r() * 50]);
  const img = g.createImageData(w, w);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    let best = 1e9, second = 1e9, val = 0;
    for (const p of pts) {
      let dx = Math.abs(x - p[0]), dy = Math.abs(y - p[1]);
      dx = Math.min(dx, w - dx); dy = Math.min(dy, w - dy);
      const d = dx * dx + dy * dy;
      if (d < best) { second = best; best = d; val = p[2]; } else if (d < second) second = d;
    }
    const edge = Math.sqrt(second) - Math.sqrt(best) < 2 ? -18 : 0;
    const v = val + edge + (r() - 0.5) * 8;
    const i = (y * w + x) * 4;
    img.data[i] = v; img.data[i + 1] = v + 2; img.data[i + 2] = v + 4; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function rug() {
  const w = 1024, h = 768;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#e3cfab"; g.fillRect(0, 0, w, h);
  const bands = [
    [0, 26, "#d9c29b"], [26, 70, "#a6382a"], [70, 84, "#e8d7b5"], [84, 112, "#6d2226"],
    [112, 126, "#e8d7b5"], [126, 150, "#a6382a"], [150, 166, "#e3cfab"], [166, 174, "#6d2226"],
  ];
  for (const [a, b, col] of bands) {
    g.fillStyle = col;
    g.fillRect(a, a, w - 2 * a, b - a); g.fillRect(a, h - b, w - 2 * a, b - a);
    g.fillRect(a, a, b - a, h - 2 * a); g.fillRect(w - b, a, b - a, h - 2 * a);
  }
  // inner field: faint diamond lattice
  g.strokeStyle = "rgba(160,120,80,0.18)"; g.lineWidth = 3;
  for (let i = -20; i < 40; i++) {
    g.beginPath(); g.moveTo(190 + i * 60, 190); g.lineTo(190 + i * 60 + (h - 380), h - 190); g.stroke();
    g.beginPath(); g.moveTo(190 + i * 60, h - 190); g.lineTo(190 + i * 60 + (h - 380), 190); g.stroke();
  }
  g.fillStyle = "#e3cfab"; g.fillRect(0, 0, w, 174); g.fillRect(0, h - 174, w, 174); g.fillRect(0, 0, 174, h); g.fillRect(w - 174, 0, 174, h);
  for (const [a, b, col] of bands) {
    g.fillStyle = col;
    g.fillRect(a, a, w - 2 * a, b - a); g.fillRect(a, h - b, w - 2 * a, b - a);
    g.fillRect(a, a, b - a, h - 2 * a); g.fillRect(w - b, a, b - a, h - 2 * a);
  }
  // weave texture
  const img = g.getImageData(0, 0, w, h);
  const r = rng(81);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const weave = ((x >> 1) + (y >> 1)) % 2 ? 6 : -6;
    const n = (r() - 0.5) * 22 + weave;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function deck() {
  // boards 14 cm wide along x, 6 mm gaps; texture covers 2.1 m (15 boards)
  const w = 1024, n = 15, bh = w / n;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  const r = rng(91);
  const woodC = wood({ dark: "#7a5434", light: "#bf9466", seed: 93, w: 1024, h: 256, rings: 9 });
  for (let i = 0; i < n; i++) {
    const off = r() * 1024;
    g.save();
    g.beginPath(); g.rect(0, i * bh, w, bh); g.clip();
    g.drawImage(woodC, -off, i * bh - r() * 120, 1024, 256);
    g.drawImage(woodC, 1024 - off, i * bh - r() * 120, 1024, 256);
    g.fillStyle = `rgba(${r() > 0.5 ? "255,230,200" : "40,25,10"},${r() * 0.12})`;
    g.fillRect(0, i * bh, w, bh);
    // butt joint
    const jx = r() * w;
    g.fillStyle = "rgba(20,12,6,0.8)"; g.fillRect(jx, i * bh, 3, bh);
    // screws
    g.fillStyle = "rgba(30,30,30,0.7)";
    for (let k = 0; k < 4; k++) { const sx = (k + 0.5) * w / 4; g.beginPath(); g.arc(sx, i * bh + bh * 0.25, 2.5, 0, 7); g.arc(sx, i * bh + bh * 0.75, 2.5, 0, 7); g.fill(); }
    g.restore();
    g.fillStyle = "#1c120b"; g.fillRect(0, i * bh, w, 4);
  }
  return c;
}

export function concreteBlock() {
  // terrace side wall: board-formed concrete, lighter, weathered
  return boardConcrete(131, "#a7a096");
}

export function reededGlass() {
  const w = 256, h = 64;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  const reed = 8;
  for (let x = 0; x < w; x++) {
    const t = (x % reed) / reed;
    const k = Math.sin(t * Math.PI);
    const v = 0.55 + 0.45 * k;
    g.fillStyle = `rgb(${Math.round(150 * v + 60)},${Math.round(170 * v + 60)},${Math.round(190 * v + 60)})`;
    g.fillRect(x, 0, 1, h);
  }
  return c;
}

// ---------- foliage ----------

export function pothosLeaf(seed = 1) {
  const w = 256;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  const r = rng(seed);
  // heart-shaped leaf, tip at top (v=1), petiole at bottom centre
  const path = new Path2D();
  path.moveTo(128, 236);
  path.bezierCurveTo(40, 230, 6, 150, 40, 90);
  path.bezierCurveTo(70, 40, 110, 22, 128, 6);
  path.bezierCurveTo(146, 22, 186, 40, 216, 90);
  path.bezierCurveTo(250, 150, 216, 230, 128, 236);
  const grd = g.createLinearGradient(0, 0, w, w);
  grd.addColorStop(0, "#5f9a3a"); grd.addColorStop(0.5, "#3f7a2a"); grd.addColorStop(1, "#2c5e22");
  g.fillStyle = grd; g.fill(path);
  g.save(); g.clip(path);
  // golden variegation streaks
  g.globalAlpha = 0.5;
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = r() > 0.4 ? "#d6d47a" : "#b8c96a";
    g.lineWidth = 2 + r() * 7;
    g.beginPath();
    const x0 = 128 + (r() - 0.5) * 30;
    g.moveTo(x0, 220);
    g.quadraticCurveTo(128 + (r() - 0.5) * 220, 120, 128 + (r() - 0.5) * 160, 20 + r() * 60);
    g.stroke();
  }
  g.globalAlpha = 1;
  // sheen
  const sh = g.createRadialGradient(100, 90, 5, 100, 90, 120);
  sh.addColorStop(0, "rgba(255,255,220,0.22)"); sh.addColorStop(1, "rgba(255,255,220,0)");
  g.fillStyle = sh; g.fillRect(0, 0, w, w);
  g.restore();
  // midrib and veins
  g.strokeStyle = "rgba(200,220,140,0.55)"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(128, 234); g.quadraticCurveTo(124, 120, 128, 10); g.stroke();
  g.lineWidth = 1.5; g.strokeStyle = "rgba(200,220,140,0.3)";
  for (let i = 0; i < 5; i++) {
    const y = 200 - i * 38;
    g.beginPath(); g.moveTo(127, y); g.quadraticCurveTo(80, y - 30, 50 + i * 8, y - 50); g.stroke();
    g.beginPath(); g.moveTo(129, y); g.quadraticCurveTo(176, y - 30, 206 - i * 8, y - 50); g.stroke();
  }
  return c;
}

export function broadLeaf() {
  // fiddle-leaf style, for the floor plant
  const w = 256;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  const path = new Path2D();
  path.moveTo(128, 250);
  path.bezierCurveTo(70, 240, 60, 180, 80, 140);
  path.bezierCurveTo(40, 100, 50, 20, 128, 6);
  path.bezierCurveTo(206, 20, 216, 100, 176, 140);
  path.bezierCurveTo(196, 180, 186, 240, 128, 250);
  const grd = g.createLinearGradient(40, 0, 220, 256);
  grd.addColorStop(0, "#4f8a35"); grd.addColorStop(1, "#24521f");
  g.fillStyle = grd; g.fill(path);
  g.strokeStyle = "rgba(190,215,130,0.6)"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(128, 248); g.lineTo(128, 12); g.stroke();
  g.lineWidth = 1.6; g.strokeStyle = "rgba(190,215,130,0.35)";
  for (let i = 0; i < 7; i++) {
    const y = 225 - i * 30;
    g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(100, y - 18, 70, y - 30); g.stroke();
    g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(156, y - 18, 186, y - 30); g.stroke();
  }
  return c;
}

export function foliageCluster(seed = 5, hue = 0) {
  // a card of many small leaves for tree canopies and hedges
  const w = 512;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  const r = rng(seed);
  const cols = hue === 0
    ? ["#2f5a22", "#3d6e2a", "#4f8233", "#5f9238", "#6fa040", "#88b34a", "#a5c45a"]
    : ["#3a5a26", "#4a6a2c", "#5d7d34", "#71903c", "#8aa548"];
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * 230;
    const x = 256 + Math.cos(a) * rad, y = 256 + Math.sin(a) * rad;
    const s = 9 + r() * 13;
    g.save(); g.translate(x, y); g.rotate(r() * Math.PI * 2);
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.beginPath(); g.ellipse(0, 0, s * 0.45, s, 0, 0, 7); g.fill();
    g.restore();
  }
  return c;
}

// ---------- helpers ----------
export function shade(hex, k) {
  const [r, g, b] = hexRgb(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
