// Loads the ORIGINAL ODD HAUS character drawing and prepares it as a print plate:
// the white paper is keyed out so only the ink remains (transparent PNG-style canvas).
// The pixels of the drawing are never redrawn, warped or animated anywhere in the film.
import { CHARACTER } from '../config.js';
import { canvas, ink, text, FONT } from '../core/paint.js';

function loadImage(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.naturalWidth > 8 ? im : null);
    im.onerror = () => res(null);
    im.src = src;
  });
}

export async function loadCharacter() {
  let im = null;
  for (const src of CHARACTER.candidates) { im = await loadImage(src); if (im) break; }
  if (!im) return { present: false, aspect: 0.72, tip: { u: 0.2, v: 0.3 } };

  const W = im.naturalWidth, H = im.naturalHeight;
  const c = canvas(W, H);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  const id = g.getImageData(0, 0, W, H);
  const d = id.data;

  let transparent = 0;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) transparent++;
  const hasAlpha = transparent / (d.length / (4 * 97)) > 0.02;
  const mode = CHARACTER.key === 'auto' ? (hasAlpha ? 'alpha' : 'luma') : CHARACTER.key;

  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (mode === 'luma') {
        const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
        // ink coverage: black = opaque, paper white = clear; greys of the wash stay as partial ink
        const a = Math.min(1, Math.max(0, (0.93 - l) / 0.62));
        d[i] = d[i + 1] = d[i + 2] = 20; // washed-black printing ink
        d[i + 3] = Math.round(a * 255);
      }
      if (d[i + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  g.putImageData(id, 0, 0);

  // crop to the drawing so every layout places it by its real silhouette
  const pad = Math.round(Math.max(W, H) * 0.01);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const plate = canvas(cw, ch);
  plate.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);

  let tipCfg = CHARACTER.cigTip;
  try { const s = JSON.parse(localStorage.getItem('oddhaus.cigTip') || 'null'); if (s && typeof s.u === 'number') tipCfg = s; } catch { /* storage unavailable */ }
  const tip = { u: (tipCfg.u * W - x0) / cw, v: (tipCfg.v * H - y0) / ch };
  return { present: true, plate, aspect: cw / ch, tip, source: im };
}

// Print the plate inside the box (contain-fit, anchored to the bottom by default).
// Returns the rect it occupies and where the cigarette tip landed, in canvas pixels.
export function printCharacter(g, ch, x, y, w, h, { alpha = 1, anchor = 'bottom', tint = null, wear = 0, seed = 1 } = {}) {
  const s = Math.min(w / ch.aspect, h);
  const dw = s * ch.aspect, dh = s;
  const dx = x + (w - dw) / 2;
  const dy = anchor === 'bottom' ? y + h - dh : y + (h - dh) / 2;
  if (!ch.present) {
    // The original artwork is missing: leave an honest printer's slot, never a substitute figure.
    ink(g, [[dx, dy], [dx + dw, dy], [dx + dw, dy + dh], [dx, dy + dh], [dx, dy]], { width: Math.max(1.5, dw * 0.006), color: tint || '#171717', alpha: 0.55 * alpha, seed });
    text(g, 'ORIGINAL ARTWORK', dx + dw / 2, dy + dh / 2 - dw * 0.02, dw * 0.075, { font: FONT.hand, color: tint || '#171717', align: 'center' });
    text(g, 'assets/oddhaus-character.png', dx + dw / 2, dy + dh / 2 + dw * 0.07, dw * 0.05, { font: FONT.hand, color: tint || '#171717', align: 'center' });
    return { x: dx, y: dy, w: dw, h: dh, tipX: dx + dw * ch.tip.u, tipY: dy + dh * ch.tip.v };
  }
  let src = ch.plate;
  if (tint || wear > 0) {
    const c = canvas(Math.ceil(dw), Math.ceil(dh));
    const cg = c.getContext('2d');
    cg.drawImage(ch.plate, 0, 0, c.width, c.height);
    if (tint) { cg.globalCompositeOperation = 'source-in'; cg.fillStyle = tint; cg.fillRect(0, 0, c.width, c.height); }
    if (wear > 0) {
      // uneven ink lay-down of a cheap press: speckle where the plate did not quite print
      cg.globalCompositeOperation = 'destination-out';
      let sd = seed * 9301 + 49297;
      const r = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
      const n = (c.width * c.height) / 900 * wear;
      for (let i = 0; i < n; i++) {
        cg.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.55})`;
        const rad = r() < 0.85 ? 0.5 + r() * 1.2 : 1.5 + r() * 3.5;
        cg.beginPath(); cg.arc(r() * c.width, r() * c.height, rad * (c.width / 700), 0, 7); cg.fill();
      }
    }
    src = c;
  }
  g.save(); g.globalAlpha = alpha;
  g.drawImage(src, dx, dy, dw, dh);
  g.restore();
  return { x: dx, y: dy, w: dw, h: dh, tipX: dx + dw * ch.tip.u, tipY: dy + dh * ch.tip.v };
}
