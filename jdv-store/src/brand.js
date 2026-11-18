// JEON DE VERO brand graphics. The mural, script and mascot artwork are the real
// marks extracted from the store reference (src/assets/brandArt.js); signage,
// packaging and merchandise prints are composed from them on canvases.
import * as THREE from "three";
import { MURAL, SCRIPT_CREAM, SCRIPT_NAVY, MASCOT_NAVY, MASCOT_CREAM } from "./assets/brandArt.js";
import { canvas, tex, PAL, rng, roundRect, shade, fbm } from "./textures.js";

export const FONT_DISPLAY = '"Archivo Black", "Arial Black", Impact, sans-serif';
export const FONT_TEXT = '"Archivo", "Helvetica Neue", Arial, sans-serif';
export const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

export const img = {};

function load(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
}

export async function loadBrand() {
  const [mural, scriptCream, scriptNavy, mascotNavy, mascotCream] = await Promise.all([MURAL, SCRIPT_CREAM, SCRIPT_NAVY, MASCOT_NAVY, MASCOT_CREAM].map(load));
  Object.assign(img, { mural, scriptCream, scriptNavy, mascotNavy, mascotCream });
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`64px "Archivo Black"`),
        document.fonts.load(`600 32px "Archivo"`),
        document.fonts.load(`800 32px "Archivo"`),
        document.fonts.load(`500 20px "IBM Plex Mono"`),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* fallback fonts are fine */ }
}

function drawFit(g, im, x, y, w, h, align = "center") {
  const s = Math.min(w / im.width, h / im.height);
  const dw = im.width * s, dh = im.height * s;
  const dx = align === "left" ? x : x + (w - dw) / 2;
  g.drawImage(im, dx, y + (h - dh) / 2, dw, dh);
}

function fabricNoise(g, w, h, amt = 14, seed = 5) {
  const d = g.getImageData(0, 0, w, h);
  const r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const k = ((x + (y & 1)) % 2 ? 1 : -1) * amt * 0.25 + (r() - 0.5) * amt;
    d.data[i] += k; d.data[i + 1] += k; d.data[i + 2] += k;
  }
  g.putImageData(d, 0, 0);
}

// ---------------------------------------------------------------------------

export function muralTexture() {
  const t = new THREE.Texture(img.mural);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

/** Plain text label canvas. */
export function textCanvas(lines, { w = 512, h = 256, bg = null, color = PAL.navy, font = FONT_DISPLAY, size = 120, gap = 1.0, align = "center", pad = 24 } = {}) {
  const c = canvas(w, h);
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = color; g.textAlign = align; g.textBaseline = "middle";
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = size * gap;
  const y0 = h / 2 - ((arr.length - 1) * lh) / 2;
  arr.forEach((ln, i) => {
    const s = typeof ln === "object" ? ln : { t: ln };
    g.font = `${s.weight || ""} ${s.size || size}px ${s.font || font}`;
    g.fillStyle = s.color || color;
    g.fillText(s.t, align === "center" ? w / 2 : align === "left" ? pad : w - pad, y0 + i * lh + (s.dy || 0), w - pad * 2);
  });
  return c;
}

export function lightboxFace() {
  const w = 1024, h = 668;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, "#fff6e2"); grd.addColorStop(1, "#f1e2c2");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = PAL.navyDeep; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.font = `300px ${FONT_DISPLAY}`;
  g.fillText("JDV", w / 2, 330);
  g.font = `800 170px ${FONT_TEXT}`;
  g.fillText("Records", w / 2, 540);
  return c;
}

export function capFront(fg = PAL.cream, bg = PAL.navy) {
  // wraps the cap crown (SphereGeometry u: front = 0.25)
  const w = 1024, h = 512;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  fabricNoise(g, w, h, 10, 9);
  // panel seams
  g.strokeStyle = shade(bg, -0.25); g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const x = (i / 6) * w + w * 0.25 - w / 12; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.save();
  g.translate(w * 0.25, h * 0.62);
  g.scale(1, 1.35);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `118px ${FONT_DISPLAY}`;
  g.fillText("JDV", 0, 0);
  g.restore();
  return c;
}

export function mugPrint(fg = PAL.navy, bg = "#f4efe4") {
  const w = 1024, h = 384;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `150px ${FONT_DISPLAY}`;
  // cylinder u=0.25 faces +z after rotation; we place print at u 0.25
  g.fillText("JDV", w * 0.25, h * 0.52);
  drawFit(g, img.scriptNavy, w * 0.62, h * 0.2, w * 0.3, h * 0.6);
  return c;
}

export function sweatPrint(kind) {
  // kind: "script" (navy, cream script) | "mascot" (cream, navy mascot) | "jdv" (cream, navy JDV)
  const w = 512, h = 512;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  const bg = kind === "script" ? PAL.navy : kind === "burgundy" ? PAL.burgundy : PAL.cream;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  fabricNoise(g, w, h, 12, kind.length);
  if (kind === "script" || kind === "burgundy") drawFit(g, img.scriptCream, w * 0.12, h * 0.3, w * 0.76, h * 0.4);
  else if (kind === "mascot") drawFit(g, img.mascotNavy, w * 0.22, h * 0.14, w * 0.56, h * 0.6);
  else if (kind === "jdv") { g.fillStyle = PAL.navy; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `150px ${FONT_DISPLAY}`; g.fillText("JDV", w / 2, h * 0.45); }
  return c;
}

export function fabric(color, seed = 1) {
  const c = canvas(256, 256);
  const g = c.getContext("2d");
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  fabricNoise(g, 256, 256, 12, seed);
  return c;
}

export function toteFace() {
  const w = 512, h = 600;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#ece2cc"; g.fillRect(0, 0, w, h);
  fabricNoise(g, w, h, 18, 3);
  drawFit(g, img.scriptNavy, w * 0.1, h * 0.32, w * 0.8, h * 0.36);
  return c;
}

export function figureBoxArt(part) {
  // part: "top" band | "bottom" band | "back" (inside) | "side"
  const W = { top: [512, 160], bottom: [512, 128], back: [512, 640], side: [256, 760] }[part];
  const c = canvas(W[0], W[1]);
  const g = c.getContext("2d");
  const red = "#9e2f24";
  g.fillStyle = red; g.fillRect(0, 0, W[0], W[1]);
  const r = rng(part.length * 7);
  // printed card texture
  const d = g.getImageData(0, 0, W[0], W[1]);
  for (let i = 0; i < d.data.length; i += 4) { const k = (r() - 0.5) * 10; d.data[i] += k; d.data[i + 1] += k; d.data[i + 2] += k; }
  g.putImageData(d, 0, 0);
  if (part === "top") drawFit(g, img.scriptCream, 30, 18, W[0] - 60, W[1] - 36);
  if (part === "bottom") {
    g.fillStyle = PAL.cream; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 52px ${FONT_TEXT}`; g.fillText("RECORDS & GOODS", W[0] / 2, W[1] / 2, W[0] - 40);
  }
  if (part === "back") {
    const grd = g.createLinearGradient(0, 0, 0, W[1]);
    grd.addColorStop(0, "#f3e3c4"); grd.addColorStop(1, "#e2c89c");
    g.fillStyle = grd; g.fillRect(0, 0, W[0], W[1]);
    g.globalAlpha = 0.12; drawFit(g, img.mascotNavy, 40, 60, W[0] - 80, W[1] - 120); g.globalAlpha = 1;
  }
  if (part === "side") {
    g.save(); g.translate(W[0] / 2, W[1] / 2); g.rotate(-Math.PI / 2);
    drawFit(g, img.scriptCream, -W[1] / 2 + 40, -W[0] / 2 + 30, W[1] - 80, W[0] - 60);
    g.restore();
  }
  g.strokeStyle = "rgba(255,240,220,0.35)"; g.lineWidth = 6; g.strokeRect(8, 8, W[0] - 16, W[1] - 16);
  return c;
}

export function recordLabel(main = "#f0a020", text = PAL.navy) {
  const w = 256;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, w, w);
  g.fillStyle = main; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, 7); g.fill();
  g.fillStyle = text; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `64px ${FONT_DISPLAY}`; g.fillText("JDV", w / 2, w * 0.36);
  g.font = `600 17px ${FONT_TEXT}`; g.fillText("RECORDS & GOODS", w / 2, w * 0.66);
  g.font = `500 14px ${FONT_MONO}`; g.fillText("33⅓ · SIDE A", w / 2, w * 0.76);
  g.fillStyle = "#111"; g.beginPath(); g.arc(w / 2, w / 2, 6, 0, 7); g.fill();
  return c;
}

export function vinylGrooves() {
  const w = 512;
  const c = canvas(w, w);
  const g = c.getContext("2d");
  g.fillStyle = "#0a0a0a"; g.fillRect(0, 0, w, w);
  for (let r = 92; r < 252; r += 1.5) {
    const k = 12 + Math.random() * 14 + (r % 40 < 2 ? -10 : 0);
    g.strokeStyle = `rgb(${k},${k},${k})`; g.lineWidth = 0.8;
    g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke();
  }
  return c;
}

export function menuBoard() {
  const w = 1024, h = 680;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = PAL.navyDeep; g.fillRect(0, 0, w, h);
  const r = rng(77);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.03})`; g.fillRect(r() * w, r() * h, 2, 2); }
  g.fillStyle = PAL.cream; g.textBaseline = "alphabetic";
  g.font = `64px ${FONT_DISPLAY}`; g.textAlign = "left"; g.fillText("COFFEE", 64, 112);
  drawFit(g, img.scriptCream, 560, 40, 400, 110);
  g.fillStyle = "#c9a24f"; g.fillRect(64, 140, w - 128, 4);
  const items = [
    ["Espresso", "Vero No.1 house blend"], ["Americano", "hot / iced"], ["Flat white", "whole or oat"],
    ["Hand drip", "single origin, rotating"], ["Cold brew", "18-hour steep"], ["Vanilla latte", "house syrup"],
  ];
  g.font = `600 44px ${FONT_TEXT}`;
  items.forEach(([a, b], i) => {
    const y = 220 + i * 74;
    g.fillStyle = PAL.cream; g.font = `700 42px ${FONT_TEXT}`; g.fillText(a, 64, y);
    g.fillStyle = "rgba(241,229,204,0.62)"; g.font = `400 28px ${FONT_MONO}`; g.fillText(b, 470, y - 4);
  });
  g.fillStyle = "rgba(241,229,204,0.5)"; g.font = `500 24px ${FONT_MONO}`;
  g.fillText("ASK ABOUT TODAY'S RECORD — WE'LL PUT IT ON.", 64, h - 40);
  return c;
}

export function openSign() {
  const w = 512, h = 256;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = PAL.cream; roundRect(g, 4, 4, w - 8, h - 8, 24); g.fill();
  g.strokeStyle = PAL.navy; g.lineWidth = 8; roundRect(g, 18, 18, w - 36, h - 36, 16); g.stroke();
  g.fillStyle = PAL.navy; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `120px ${FONT_DISPLAY}`; g.fillText("OPEN", w / 2, h / 2 + 6);
  return c;
}

export function windowVinyl() {
  // street-facing lettering, seen mirrored from inside
  const w = 2048, h = 1024;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.translate(w, 0); g.scale(-1, 1);
  drawFit(g, img.scriptCream, w * 0.18, h * 0.12, w * 0.64, h * 0.44);
  g.fillStyle = PAL.cream; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 92px ${FONT_TEXT}`; g.fillText("RECORDS  ·  GOODS  ·  COFFEE", w / 2, h * 0.7);
  return c;
}

export function coffeeBag(color = "#b8936a") {
  const w = 256, h = 384;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  const r = rng(3);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "60,40,20" : "255,240,220"},${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 2); }
  g.fillStyle = PAL.cream; g.fillRect(28, 130, w - 56, 170);
  drawFit(g, img.scriptNavy, 40, 150, w - 80, 70);
  g.fillStyle = PAL.navy; g.textAlign = "center"; g.font = `600 22px ${FONT_TEXT}`; g.fillText("VERO No.1", w / 2, 250);
  g.font = `400 15px ${FONT_MONO}`; g.fillText("HOUSE BLEND · 200g", w / 2, 278);
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 30, w, 6);
  return c;
}

export function awningValance() {
  const w = 2048, h = 160;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = PAL.navy; g.fillRect(0, 0, w, h);
  fabricNoise(g, w, h, 10, 4);
  drawFit(g, img.scriptCream, w * 0.06, 14, w * 0.3, h - 28);
  g.fillStyle = PAL.cream; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `700 64px ${FONT_TEXT}`; g.fillText("RECORDS & GOODS  ·  COFFEE", w * 0.68, h / 2 + 4);
  return c;
}

export function newArrivals() {
  return textCanvas([{ t: "NEW", size: 64, font: FONT_DISPLAY }, { t: "ARRIVALS", size: 64, font: FONT_DISPLAY }], { w: 512, h: 256, bg: PAL.cream, color: PAL.navy, gap: 1.05 });
}

export function aBoard() {
  const w = 512, h = 768;
  const c = canvas(w, h);
  const g = c.getContext("2d");
  g.fillStyle = "#1b1d1c"; g.fillRect(0, 0, w, h);
  const r = rng(12);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 2, 2); }
  g.fillStyle = "#f3ead8"; g.textAlign = "center";
  drawFit(g, img.scriptCream, 40, 40, w - 80, 150);
  g.font = `56px ${FONT_DISPLAY}`; g.fillText("RECORDS", w / 2, 290); g.fillText("& GOODS", w / 2, 350);
  g.strokeStyle = "rgba(243,234,216,0.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(90, 400); g.lineTo(w - 90, 400); g.stroke();
  g.font = `700 40px ${FONT_TEXT}`; g.fillText("Coffee on the terrace", w / 2, 470);
  g.font = `400 30px ${FONT_MONO}`; g.fillText("hand drip · cold brew", w / 2, 525);
  g.fillText("crate digging welcome", w / 2, 575);
  g.fillStyle = "#e0a25a"; g.font = `700 34px ${FONT_TEXT}`; g.fillText("Come on in →", w / 2, 680);
  return c;
}

// ---------------------------------------------------------------------------
// Records: 64 procedurally designed sleeves + catalogue metadata
// ---------------------------------------------------------------------------
const ARTISTS = ["The Walnut Trio", "Mina Seo Quartet", "Harbor Lights", "Dae-ho & The Velvets", "Orchid Avenue", "Sunroom Society",
  "Paloma Ruiz", "The Low Tides", "Cassette Club", "Nora Blue", "Midnight Diner Band", "June & The Moons", "Ray Okafor",
  "The Lindens", "Yuna Park", "Coastline", "Lou Marchetti Orchestra", "Velvet Hours", "Brass Pocket", "Elm Street Players",
  "Hana & Theo", "Sundial", "The Copper Kettles", "Marisol Duarte", "Felix Arbor", "Room 204", "Grey Heron", "Willa Kim"];
const TITLES = ["Golden Hour Walk", "Late Bloom", "Corner Shop Blues", "Slow Afternoon", "Night Bus Home", "Tiles & Tea",
  "Warm Static", "Second Pressing", "Open Late", "Sunday Crate", "Brick & Ivy", "After the Rain", "Velvet Room",
  "Long Weekend", "Back Booth", "Small Hours", "Copper Sky", "Mezzanine", "Avenue Lights", "Side B Feelings",
  "Seventh Floor", "Linen Season", "Moon Over Main St.", "Low Tide Lullaby", "Dust & Diamonds", "Good Company",
  "Window Seat", "Easy Does It", "The Long Table", "Northbound", "Fireside", "Matinee"];
const GENRES = ["Jazz", "Soul", "Bossa nova", "Funk", "Folk", "Ambient", "Disco", "Library music", "Lounge", "Psych rock", "R&B", "Instrumental hip-hop"];
const GRADES = ["NM", "VG+", "VG+", "EX", "M (sealed)", "VG"];

export function recordCatalogue(n = 64) {
  const r = rng(2024);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const list = [];
  for (let i = 0; i < n; i++) {
    const house = i % 16 === 5;
    list.push({
      idx: i,
      title: house ? `JDV House Sessions Vol.${(i >> 4) + 1}` : TITLES[(i * 7 + 3) % TITLES.length],
      artist: house ? "Jeon de Vero Selects" : ARTISTS[(i * 5 + 1) % ARTISTS.length],
      year: house ? 2024 + (i >> 4) % 2 : 1962 + Math.floor(r() * 28),
      genre: house ? "Selector mix" : pick(GENRES),
      grade: pick(GRADES),
    });
  }
  return list;
}

const COVER_PALETTES = [
  ["#e8d9b8", "#c2452d", "#1f2b45", "#e9a23b"], ["#1e3a32", "#e8c07a", "#f3ead8", "#c8553d"],
  ["#f2e4c8", "#2a6f6b", "#e07a3c", "#2b2b2b"], ["#22223b", "#f2a65a", "#f5e6c8", "#9a031e"],
  ["#d9cfb8", "#3d5a80", "#ee6c4d", "#293241"], ["#f4d35e", "#0d3b66", "#faf0ca", "#ee964b"],
  ["#2f3e46", "#cad2c5", "#84a98c", "#e9c46a"], ["#5f0f40", "#fb8b24", "#f5e9d4", "#0f4c5c"],
  ["#efe1c6", "#8c1c13", "#2c1b0e", "#d4a373"], ["#14213d", "#fca311", "#e5e5e5", "#a23e48"],
];

export function coverAtlas(cat) {
  const N = 8, S = 256, W = N * S;
  const c = canvas(W, W);
  const g = c.getContext("2d");
  for (let i = 0; i < N * N; i++) {
    const x = (i % N) * S, y = Math.floor(i / N) * S;
    g.save(); g.beginPath(); g.rect(x, y, S, S); g.clip(); g.translate(x, y);
    if (i === 63) drawBackCover(g, S);
    else drawCover(g, S, i, cat[i]);
    g.restore();
  }
  return c;
}

function drawBackCover(g, S) {
  g.fillStyle = "#e9dfca"; g.fillRect(0, 0, S, S);
  g.fillStyle = "rgba(40,30,20,0.55)";
  for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) g.fillRect(24 + k * 112, 40 + i * 18, 60 + (i * 37 % 40), 5);
  g.fillRect(24, S - 40, 90, 14);
  g.fillStyle = "rgba(40,30,20,0.25)"; g.fillRect(S - 70, S - 46, 46, 26);
}

function drawCover(g, S, i, meta) {
  const r = rng(i * 131 + 7);
  const pal = COVER_PALETTES[i % COVER_PALETTES.length];
  const style = meta.genre === "Selector mix" ? "house" : ["sun", "forest", "bauhaus", "type", "waves", "portrait", "grid", "stripes"][(i * 3 + Math.floor(i / 8)) % 8];
  const [bg, a, b, cc] = pal;
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  if (style === "sun") {
    const grd = g.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, cc); grd.addColorStop(0.65, a); grd.addColorStop(1, b);
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.fillStyle = bg; g.beginPath(); g.arc(S * (0.3 + r() * 0.4), S * 0.55, S * (0.18 + r() * 0.1), 0, 7); g.fill();
    g.fillStyle = b; for (let k = 0; k < 6; k++) g.fillRect(0, S * 0.62 + k * 14, S, 7 - k * 0.6);
  } else if (style === "forest") {
    const grd = g.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, cc); grd.addColorStop(1, bg);
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    for (let layer = 0; layer < 3; layer++) {
      g.fillStyle = shade(b, -0.2 * layer);
      for (let k = 0; k < 9; k++) {
        const x = r() * S, hh = S * (0.25 + r() * 0.3) + layer * 18, base = S * (0.75 + layer * 0.09);
        g.beginPath(); g.moveTo(x, base - hh); g.lineTo(x - hh * 0.28, base); g.lineTo(x + hh * 0.28, base); g.fill();
      }
      g.fillRect(0, S * (0.75 + layer * 0.09) - 2, S, S);
    }
  } else if (style === "bauhaus") {
    for (let k = 0; k < 5; k++) {
      g.fillStyle = [a, b, cc][k % 3];
      const t = r();
      if (t < 0.4) { g.beginPath(); g.arc(r() * S, r() * S, 20 + r() * 70, 0, Math.PI * (1 + Math.round(r()))); g.fill(); }
      else if (t < 0.7) g.fillRect(r() * S * 0.7, r() * S * 0.7, 30 + r() * 100, 30 + r() * 100);
      else { g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + 90, y + 10); g.lineTo(x + 30, y + 100); g.fill(); }
    }
  } else if (style === "type") {
    g.fillStyle = a; g.fillRect(0, 0, S, S);
    g.fillStyle = bg; g.textAlign = "left"; g.textBaseline = "top";
    const words = meta.title.toUpperCase().split(" ");
    let y = 18;
    for (const wd of words.slice(0, 3)) { g.font = `${54}px ${FONT_DISPLAY}`; g.fillText(wd, 14, y, S - 28); y += 56; }
    g.fillStyle = cc; g.fillRect(14, S - 52, 60, 8);
  } else if (style === "waves") {
    g.strokeStyle = a; g.lineWidth = 5;
    for (let k = 0; k < 16; k++) {
      g.strokeStyle = k % 3 === 0 ? cc : a;
      g.beginPath();
      for (let x = 0; x <= S; x += 8) g.lineTo(x, 30 + k * 14 + Math.sin(x * 0.04 + k * 0.5) * 8);
      g.stroke();
    }
  } else if (style === "portrait") {
    g.fillStyle = a; g.fillRect(0, 0, S, S);
    g.fillStyle = b;
    g.beginPath(); g.arc(S * 0.5, S * 0.42, S * 0.2, 0, 7); g.fill();
    g.beginPath(); g.ellipse(S * 0.5, S * 0.95, S * 0.36, S * 0.3, 0, 0, 7); g.fill();
    g.fillStyle = cc; g.beginPath(); g.arc(S * 0.5, S * 0.42, S * 0.36, -0.6, 0.6); g.lineWidth = 10; g.strokeStyle = cc; g.stroke();
  } else if (style === "grid") {
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const d = Math.hypot(x - 5.5, y - 5.5);
      g.fillStyle = d < 3 ? cc : d < 5 ? a : b;
      g.beginPath(); g.arc(14 + x * 20.5, 14 + y * 20.5, 8 - d * 0.6, 0, 7); g.fill();
    }
  } else if (style === "stripes") {
    for (let k = 0; k < 7; k++) { g.fillStyle = [a, b, cc, bg][k % 4]; g.fillRect(0, k * S / 7, S, S / 7 + 1); }
    g.fillStyle = bg; g.beginPath(); g.arc(S * 0.72, S * 0.3, 34, 0, 7); g.fill();
  } else if (style === "house") {
    g.fillStyle = PAL.navy; g.fillRect(0, 0, S, S);
    drawFit(g, img.mascotCream, S * 0.18, S * 0.08, S * 0.64, S * 0.56);
    drawFit(g, img.scriptCream, S * 0.1, S * 0.64, S * 0.8, S * 0.2);
    g.fillStyle = PAL.red; g.fillRect(0, S - 18, S, 18);
  }
  if (style !== "type" && style !== "house") {
    g.fillStyle = r() > 0.5 ? b : bg; g.textAlign = "left"; g.textBaseline = "alphabetic";
    g.font = `700 15px ${FONT_TEXT}`; g.fillText(meta.artist.toUpperCase(), 14, S - 30, S - 28);
    g.font = `400 14px ${FONT_TEXT}`; g.fillText(meta.title, 14, S - 13, S - 28);
  }
  // print grain + ring wear + corner wear
  const d = g.getImageData(0, 0, S, S);
  const rr = rng(i + 999);
  for (let p = 0; p < d.data.length; p += 4) { const k = (rr() - 0.5) * 16; d.data[p] += k; d.data[p + 1] += k; d.data[p + 2] += k; }
  g.putImageData(d, 0, 0);
  if (r() > 0.35) { g.strokeStyle = "rgba(255,250,235,0.16)"; g.lineWidth = 7; g.beginPath(); g.arc(S / 2, S / 2, S * 0.43, 0, 7); g.stroke(); }
  g.strokeStyle = "rgba(255,250,235,0.25)"; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
}

export function spineAtlas() {
  // 32 columns x 4 rows of 32x256 book spines
  const c = canvas(1024, 1024);
  const g = c.getContext("2d");
  const r = rng(404);
  const cols = ["#efe6d2", "#1f2b45", "#6d2226", "#2f4a34", "#c9a66b", "#2b2b2b", "#e2d3b5", "#8c6a43", "#a6382a", "#d8cfbd", "#3b4f6b", "#f2efe6"];
  for (let i = 0; i < 128; i++) {
    const x = (i % 32) * 32, y = Math.floor(i / 32) * 256;
    const col = cols[Math.floor(r() * cols.length)];
    g.fillStyle = col; g.fillRect(x, y, 32, 256);
    const ink = ["#1f2b45", "#2b2b2b", "#6d2226", "#0f0f0f"].includes(col) ? "rgba(241,229,204,0.85)" : "rgba(30,25,20,0.8)";
    g.fillStyle = ink;
    g.fillRect(x + 6, y + 30 + r() * 30, 20, 3);
    g.fillRect(x + 12, y + 80, 8, 100 + r() * 40);
    g.fillRect(x + 8, y + 220, 16, 14);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x, y, 2, 256); g.fillRect(x + 30, y, 2, 256);
  }
  // cell 127: page edges
  g.fillStyle = "#ece2cc"; g.fillRect(992, 768, 32, 256);
  g.fillStyle = "rgba(120,100,80,0.18)"; for (let k = 0; k < 32; k += 2) g.fillRect(992 + k, 768, 1, 256);
  return c;
}

export { tex };
