// Intertitles, iris and the picture house around the 4:3 gate.
// decoBorder() is adapted from Lemo-Opuscar's styles/silent-film/demo/engine/cards.js (MIT, engine/LICENSE-MIT.txt);
// the Korean/English card layout, the logo card, footlights and curtains are this film's own.
export const CARD_BG = "#0e0d0b", CARD_FG = "#ece5d5";
export const F_KO = '"JDV Card KO", serif', F_EN = '"Old Standard TT", serif', F_TITLE = '"JDV Card Title", serif';

const hash = (n) => { const s = Math.sin(n * 91.3458 + 17.123) * 47453.5453; return s - Math.floor(s); };

// level 0 = one heavy rule (a shout), 1 = double rule + stepped corners + fans, 2 = + vines and small flowers
export function decoBorder(g, x, y, w, h, level = 1, col = CARD_FG, seed = 1, heavy = false) {
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineCap = "square";
  const wob = (v, i) => v + Math.sin(i * 12.9898 + seed * 78.233) * 0.6;
  if (level === 0) { g.lineWidth = 9; g.strokeRect(x + 30, y + 30, w - 60, h - 60); g.restore(); return; }
  const m1 = 34, m2 = 54, s = 36;
  g.lineWidth = 2.2; g.strokeRect(wob(x + m1, 1), wob(y + m1, 2), w - 2 * m1, h - 2 * m1);
  g.lineWidth = heavy ? 9 : 5.5;
  const X0 = x + m2, Y0 = y + m2, X1 = x + w - m2, Y1 = y + h - m2;
  g.beginPath();
  g.moveTo(X0 + s, Y0); g.lineTo(X1 - s, Y0); g.lineTo(X1 - s, Y0 + s * 0.5); g.lineTo(X1 - s * 0.5, Y0 + s * 0.5); g.lineTo(X1 - s * 0.5, Y0 + s); g.lineTo(X1, Y0 + s);
  g.lineTo(X1, Y1 - s); g.lineTo(X1 - s * 0.5, Y1 - s); g.lineTo(X1 - s * 0.5, Y1 - s * 0.5); g.lineTo(X1 - s, Y1 - s * 0.5); g.lineTo(X1 - s, Y1);
  g.lineTo(X0 + s, Y1); g.lineTo(X0 + s, Y1 - s * 0.5); g.lineTo(X0 + s * 0.5, Y1 - s * 0.5); g.lineTo(X0 + s * 0.5, Y1 - s); g.lineTo(X0, Y1 - s);
  g.lineTo(X0, Y0 + s); g.lineTo(X0 + s * 0.5, Y0 + s); g.lineTo(X0 + s * 0.5, Y0 + s * 0.5); g.lineTo(X0 + s, Y0 + s * 0.5); g.closePath();
  g.stroke();
  const fan = (cx, cy, a0) => { g.lineWidth = 1.6; for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); g.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); g.stroke(); } g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill(); };
  fan(x + m1, y + m1, 0); fan(x + w - m1, y + m1, Math.PI / 2); fan(x + w - m1, y + h - m1, Math.PI); fan(x + m1, y + h - m1, Math.PI * 1.5);
  const dia = (cx, cy) => { g.beginPath(); g.moveTo(cx, cy - 11); g.lineTo(cx + 16, cy); g.lineTo(cx, cy + 11); g.lineTo(cx - 16, cy); g.closePath(); g.fill(); g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 120, cy); g.lineTo(cx - 26, cy); g.moveTo(cx + 26, cy); g.lineTo(cx + 120, cy); g.stroke(); g.beginPath(); g.arc(cx - 132, cy, 3, 0, 7); g.arc(cx + 132, cy, 3, 0, 7); g.fill(); };
  dia(x + w / 2, y + m2 + 30); dia(x + w / 2, y + h - m2 - 30);
  if (level >= 2) {
    g.lineWidth = 1.5;
    for (const side of [0, 1]) {
      const sx = side ? x + w - m2 - 28 : x + m2 + 28;
      g.beginPath();
      for (let i = 0; i <= 60; i++) { const u = i / 60, yy = y + m2 + 72 + u * (h - 2 * m2 - 144), xx = sx + Math.sin(u * Math.PI * 5) * 9 * (side ? -1 : 1); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
      for (let k = 0; k < 5; k++) {
        const u = (k + 0.5) / 5, yy = y + m2 + 72 + u * (h - 2 * m2 - 144), xx = sx + Math.sin(u * Math.PI * 5) * 9 * (side ? -1 : 1);
        for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; g.beginPath(); g.ellipse(xx + Math.cos(a) * 5, yy + Math.sin(a) * 5, 4.2, 2.4, a, 0, 7); g.fill(); }
        g.fillStyle = CARD_BG; g.beginPath(); g.arc(xx, yy, 2, 0, 7); g.fill(); g.fillStyle = col;
      }
    }
  }
  g.restore();
}

/** A black painted card: Korean line(s) on top, English beneath; optional brand script above. */
export function intertitle(g, W, H, spec, logo = null) {
  g.save();
  g.fillStyle = CARD_BG; g.fillRect(0, 0, W, H);
  // painted card: faint fibres and uneven black
  const grd = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.7);
  grd.addColorStop(0, "rgba(40,36,30,0.35)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.07;
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgb(${140 + hash(i) * 70 | 0},${130 + hash(i) * 60 | 0},${110 + hash(i) * 50 | 0})`; g.fillRect(hash(i * 3.1) * W, hash(i * 7.7) * H, 1 + hash(i * 2.3) * 3, 1); }
  g.globalAlpha = 1;
  decoBorder(g, 0, 0, W, H, spec.level ?? 1, CARD_FG, spec.seed ?? 1, spec.heavy);
  g.fillStyle = CARD_FG; g.textAlign = "center"; g.textBaseline = "middle";
  const ko = spec.ko || [], koSize = spec.koSize ?? (ko.length > 1 ? 104 : 96), enSize = spec.enSize ?? 44;
  let blockH = ko.length * koSize * 1.32 + 30 + enSize * 1.3;
  let logoH = 0;
  if (logo) { logoH = 250; blockH += logoH + 40; }
  let y = H / 2 - blockH / 2;
  if (logo) {
    const lw = Math.min(W * 0.62, logoH * logo.width / logo.height), lh = lw * logo.height / logo.width;
    g.drawImage(logo, W / 2 - lw / 2, y + (logoH - lh) / 2, lw, lh);
    y += logoH + 40;
  }
  g.font = `800 ${koSize}px ${F_KO}`;
  for (const line of ko) { g.fillText(line, W / 2, y + koSize * 0.66); y += koSize * 1.32; }
  // small rule between the languages
  g.fillRect(W / 2 - 70, y + 8, 140, 2);
  y += 30;
  g.font = `italic 400 ${enSize}px ${F_EN}`;
  g.fillText(spec.en, W / 2, y + enSize * 0.65);
  g.restore();
}

/** Black outside a circle with a soft optical edge. */
export function iris(g, W, H, cx, cy, r, feather = 4) {
  if (r > Math.hypot(W, H)) return;
  const rr = Math.max(0.01, r);
  const gr = g.createRadialGradient(cx, cy, Math.max(0, rr - feather), cx, cy, rr + feather);
  gr.addColorStop(0, "rgba(8,7,6,0)"); gr.addColorStop(1, "rgba(8,7,6,1)");
  g.save(); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}

/** The house: dark auditorium, proscenium, footlights. Drawn under the print. */
export function house(g, W, H, spill) {
  g.save();
  g.fillStyle = "#060505"; g.fillRect(0, 0, W, H);
  const fl = g.createLinearGradient(0, H, 0, H * 0.55);
  fl.addColorStop(0, `rgba(150,90,40,${0.28 + spill * 0.1})`); fl.addColorStop(1, "rgba(150,90,40,0)");
  g.fillStyle = fl; g.fillRect(0, 0, W, H);
  g.restore();
}

/** Velvet curtains, lit by the screen's spill and the footlights; open = 1 fully apart, 0 closed. */
export function curtains(g, W, H, gate, spill, open) {
  g.save();
  const side = gate.x + 26;                       // drapes overlap the gate edge a little
  const travel = (1 - open) * (W / 2 - side + 8);
  const draw = (x0, x1, dir) => {
    const n = 8, cw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * cw;
      const near = dir < 0 ? (i + 1) / n : 1 - i / n;
      const L = 0.05 + spill * 0.2 * Math.pow(near, 1.4) + (1 - open) * 0.03;
      const gr = g.createLinearGradient(xa, 0, xa + cw, 0);
      gr.addColorStop(0, `rgb(${L * 330 | 0},${L * 120 | 0},${L * 100 | 0})`);
      gr.addColorStop(0.5, `rgb(${L * 130 | 0},${L * 45 | 0},${L * 40 | 0})`);
      gr.addColorStop(1, `rgb(${L * 300 | 0},${L * 110 | 0},${L * 92 | 0})`);
      g.fillStyle = gr; g.fillRect(xa, 0, cw + 1, H);
    }
    const tg = g.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, "rgba(0,0,0,.78)"); tg.addColorStop(0.22, "rgba(0,0,0,.18)"); tg.addColorStop(0.78, "rgba(0,0,0,.05)"); tg.addColorStop(1, "rgba(60,30,10,.25)");
    g.fillStyle = tg; g.fillRect(x0, 0, x1 - x0, H);
    // footlight warmth on the hem
    const fh = g.createLinearGradient(0, H, 0, H * 0.7);
    fh.addColorStop(0, "rgba(230,150,70,.30)"); fh.addColorStop(1, "rgba(230,150,70,0)");
    g.fillStyle = fh; g.fillRect(x0, 0, x1 - x0, H);
  };
  draw(-8, side + travel, -1);
  draw(W - side - travel, W + 8, 1);
  // valance across the top
  const vg = g.createLinearGradient(0, 0, 0, 70);
  vg.addColorStop(0, "#1a0807"); vg.addColorStop(1, `rgb(${60 + spill * 50 | 0},${18 + spill * 14 | 0},${14 + spill * 10 | 0})`);
  g.fillStyle = vg; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 46);
  for (let i = 0; i <= 24; i++) { const x = W - (i / 24) * W; g.quadraticCurveTo(x + W / 48, 64, x, 46); }
  g.closePath(); g.fill();
  g.restore();
}

/** The print burning through: a bubbling hole from a point, brown rim, the white of the lamp beyond. */
export function burn(g, gate, k, frame) {
  if (k <= 0) return;
  const cx = gate.x + gate.w * 0.56, cy = gate.h * 0.44;
  const R = (0.02 + k * k) * gate.w * 0.95;
  g.save();
  g.beginPath(); g.rect(gate.x, 0, gate.w, gate.h); g.clip();
  // a bubbling, blistering edge: low-frequency lobes plus small boiling bumps that change every frame
  const path = (scale) => {
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const lobes = Math.sin(a * 3 + 1.3) * 0.12 + Math.sin(a * 7 + frame * 0.05) * 0.06;
      const boil = Math.sin(a * 23 + frame * 0.9) * 0.025 + Math.sin(a * 41 - frame * 1.3) * 0.015;
      const r = R * (0.86 + lobes + boil) * scale;
      i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
    }
    g.closePath();
  };
  // scorched halo, glowing rim, white lamp light
  path(1.18); g.fillStyle = "rgba(70,34,12,0.55)"; g.fill();
  path(1.06); g.fillStyle = "rgba(210,110,30,0.9)"; g.fill();
  path(1.0); const flick = 0.9 + hash(frame) * 0.1; g.fillStyle = `rgb(${255 * flick | 0},${246 * flick | 0},${226 * flick | 0})`; g.fill();
  g.restore();
}
