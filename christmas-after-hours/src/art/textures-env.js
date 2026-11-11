// Painted surfaces for the street and the shop shell. All drawn in code with the ink toolkit.
import { PAL } from '../config.js';
import { rng, lerp } from '../core/util.js';
import { paint, canvas, toTexture, wash, ink, inkRect, inkCircle, hatch, text, wordmark, rgba, mix, FONT } from '../core/paint.js';

const INK = PAL.black;

// ---------------------------------------------------------------- brick
function brickCanvas(seed, tone = 0) {
  const S = 1024, rows = 27, rh = S / rows, cols = 8, bw = S / cols;
  const c = canvas(S, S), g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = '#15120f'; g.fillRect(0, 0, S, S);
  const palette = ['#6b4532', '#7a4e37', '#5a3a2b', '#84573b', '#4b3127', '#6e3f2c', '#8b5a3a', '#3d2a22'];
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * bw * 0.5 + (r() - 0.5) * 6;
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + off, y = j * rh;
      let col = r.pick(palette);
      if (r() < 0.12) col = mix(col, '#c98a55', 0.35);      // the odd over-fired orange brick
      if (r() < 0.16) col = mix(col, '#1c1714', 0.55);      // soot-black header
      col = mix(col, '#171717', 0.12 + tone);
      const m = 2.2 + r() * 1.6;
      for (const dx of [0, -S, S]) {
        g.fillStyle = col; g.fillRect(x + dx + m, y + m, bw - m * 2, rh - m * 2);
        // worn face: lighter top edge, chips
        g.fillStyle = rgba('#e0b68a', 0.05 + r() * 0.07); g.fillRect(x + dx + m, y + m, bw - m * 2, 3);
        g.fillStyle = rgba('#000000', 0.12 + r() * 0.12); g.fillRect(x + dx + m, y + rh - m - 4, bw - m * 2, 4);
      }
      const n = 3 + r.int(0, 5);
      for (let k = 0; k < n; k++) {
        g.fillStyle = rgba(r() < 0.5 ? '#000000' : '#d6a57c', r() * 0.16);
        const px = (x + m + r() * (bw - 2 * m) + S) % S;
        g.fillRect(px, y + m + r() * (rh - 2 * m), r.range(2, 14), r.range(1, 4));
      }
    }
    // inked bed joint, broken and unsure of itself
    ink(g, [[0, j * rh], [S, j * rh]], { width: 2.4, color: '#0d0b0a', alpha: 0.85, wobble: 1.6, seed: seed + j, dry: 0.1 });
  }
  // damp streaks and soot
  for (let i = 0; i < 26; i++) {
    const x = r() * S, w = r.range(20, 90), y = r() * S, h = r.range(120, 420);
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, rgba('#000000', r() * 0.22)); gr.addColorStop(1, rgba('#000000', 0));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 5000; i++) { g.fillStyle = rgba(r() < 0.6 ? '#000000' : '#e6c9a8', r() * 0.12); g.fillRect(r() * S, r() * S, 1.5, 1.5); }
  return c;
}

// ---------------------------------------------------------------- whole neighbour facades (2.5D)
function windowUnit(g, x, y, w, h, r, { lit = 0, panes = [2, 3], sill = true, snow = true } = {}) {
  // reveal
  g.fillStyle = '#0b0b0d'; g.fillRect(x - 8, y - 8, w + 16, h + 16);
  // glass
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  if (lit > 0) { gr.addColorStop(0, mix('#3a2a17', '#e0a45c', lit)); gr.addColorStop(1, mix('#2a1c10', '#b97a3c', lit)); }
  else { gr.addColorStop(0, '#111a26'); gr.addColorStop(0.5, '#18283a'); gr.addColorStop(1, '#0d141d'); }
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  if (lit > 0) { // a drawn blind or curtain
    g.fillStyle = rgba('#2a1a0e', 0.45); g.fillRect(x, y, w, h * r.range(0.2, 0.55));
  } else {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = rgba('#8fa6bb', 0.10); g.lineWidth = w * 0.12;
    g.beginPath(); g.moveTo(x - w * 0.2, y + h * r.range(0.5, 0.9)); g.lineTo(x + w * 1.2, y + h * r.range(0.0, 0.3)); g.stroke();
    if (r() < 0.5) { g.fillStyle = rgba('#000000', 0.5); g.fillRect(x, y, w, h * r.range(0.3, 0.7)); }
    g.restore();
  }
  // frame + glazing bars
  const fc = mix('#6c665a', '#171717', 0.35);
  g.strokeStyle = fc; g.lineWidth = 9; g.strokeRect(x, y, w, h);
  g.lineWidth = 5;
  for (let i = 1; i < panes[0]; i++) { g.beginPath(); g.moveTo(x + (w * i) / panes[0], y); g.lineTo(x + (w * i) / panes[0], y + h); g.stroke(); }
  for (let j = 1; j < panes[1]; j++) { g.beginPath(); g.moveTo(x, y + (h * j) / panes[1]); g.lineTo(x + w, y + (h * j) / panes[1]); g.stroke(); }
  inkRect(g, x - 5, y - 5, w + 10, h + 10, { width: 2.6, color: INK, seed: x + y, wobble: 1.4 });
  if (sill) {
    g.fillStyle = '#3b352f'; g.fillRect(x - 16, y + h + 6, w + 32, 16);
    ink(g, [[x - 16, y + h + 22], [x + w + 16, y + h + 22]], { width: 3, color: INK, seed: x });
    if (snow) {
      g.fillStyle = '#c4d0da';
      g.beginPath(); g.moveTo(x - 18, y + h + 8);
      for (let i = 0; i <= 10; i++) g.lineTo(x - 18 + ((w + 36) * i) / 10, y + h + 8 - r.range(5, 13));
      g.lineTo(x + w + 18, y + h + 8); g.closePath(); g.fill();
    }
  }
}

function facadeCanvas(seed, { floors = 3, bays = 3, wall = 'brick', shop = 'shutter', sign = '', lit = [], tone = 0.25, groundFrac = 0.3 } = {}) {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = rng(seed);
  if (wall === 'brick') {
    const b = brickCanvas(seed + 3, tone);
    g.drawImage(b, 0, 0, 512, 512); g.drawImage(b, 512, 0, 512, 512); g.drawImage(b, 0, 512, 512, 512); g.drawImage(b, 512, 512, 512, 512);
  } else {
    wash(g, 0, 0, S, S, mix('#57504a', '#171717', tone), { seed, blot: 0.2, speck: 0.14 });
    for (let i = 0; i < 9; i++) ink(g, [[r() * S, r() * S], [r() * S, r() * S]], { width: 1.2, alpha: 0.25, color: INK, seed: seed + i, wobble: 6 });
  }
  const gy = S * (1 - groundFrac);
  // upper windows
  const fh = gy / floors;
  let k = 0;
  for (let f = 0; f < floors; f++) {
    for (let b = 0; b < bays; b++) {
      const bwid = S / bays, w = bwid * 0.42, h = fh * 0.58;
      const x = b * bwid + (bwid - w) / 2, y = f * fh + fh * 0.2;
      windowUnit(g, x, y, w, h, r, { lit: lit.includes(k) ? r.range(0.45, 0.8) : 0 });
      // soldier-course lintel
      g.fillStyle = rgba('#000000', 0.35); g.fillRect(x - 14, y - 30, w + 28, 20);
      for (let i = 0; i <= 12; i++) ink(g, [[x - 14 + ((w + 28) * i) / 12, y - 30], [x - 14 + ((w + 28) * i) / 12, y - 10]], { width: 1.6, color: INK, alpha: 0.7, seed: i + k });
      k++;
    }
  }
  // string course
  g.fillStyle = '#2a2623'; g.fillRect(0, gy - 26, S, 26);
  ink(g, [[0, gy - 26], [S, gy - 26]], { width: 3, color: INK, seed });
  ink(g, [[0, gy], [S, gy]], { width: 3.5, color: INK, seed: seed + 1 });
  g.fillStyle = '#c0ccd6';
  g.beginPath(); g.moveTo(0, gy - 26); for (let i = 0; i <= 40; i++) g.lineTo((S * i) / 40, gy - 26 - r.range(4, 12)); g.lineTo(S, gy - 26); g.closePath(); g.fill();

  // ground floor
  const gh = S - gy;
  if (groundFrac > 0.01) { g.fillStyle = '#121214'; g.fillRect(40, gy + 70, S - 80, gh - 70); }
  if (sign) {
    g.fillStyle = mix('#3a332c', '#171717', 0.3); g.fillRect(40, gy + 8, S - 80, 60);
    inkRect(g, 40, gy + 8, S - 80, 60, { width: 2.5, color: INK, seed });
    text(g, sign, S / 2, gy + 54, 46, { font: FONT.heavy, color: '#8d8672', rough: 1.6, seed, track: 6 });
  }
  if (shop === 'shutter') {
    const x = 70, w = S - 140, y = gy + 78, h = gh - 86;
    g.fillStyle = '#34363a'; g.fillRect(x, y, w, h);
    for (let yy = y; yy < y + h; yy += 13) {
      g.fillStyle = rgba('#000000', 0.35); g.fillRect(x, yy + 8, w, 5);
      g.fillStyle = rgba('#aab4bf', 0.07); g.fillRect(x, yy, w, 3);
    }
    hatch(g, x, y, w, h * 0.5, { angle: 1.3, gap: 26, alpha: 0.22, seed, width: 2 });
    inkRect(g, x, y, w, h, { width: 3, color: INK, seed: seed + 5 });
    // a pasted bill or two
    for (let i = 0; i < 2; i++) { const px = x + r() * (w - 90), py = y + r() * (h - 110); g.fillStyle = rgba('#9a9079', 0.5); g.fillRect(px, py, 70, 96); inkRect(g, px, py, 70, 96, { width: 1.2, alpha: 0.5, seed: i }); }
  } else if (shop === 'dark') {
    const y = gy + 78, h = gh - 150;
    windowUnit(g, 80, y, S * 0.56, h, r, { panes: [3, 1], sill: false });
    // door
    g.fillStyle = '#1c1a18'; g.fillRect(S * 0.7, y, S * 0.2, gh - 86);
    inkRect(g, S * 0.7, y, S * 0.2, gh - 86, { width: 3, color: INK, seed });
    g.fillStyle = '#0f1620'; g.fillRect(S * 0.725, y + 24, S * 0.15, (gh - 86) * 0.5);
    g.fillStyle = '#2d2925'; g.fillRect(60, y + h + 6, S * 0.6, gh - h - 90);
    inkRect(g, 60, y + h + 6, S * 0.6, gh - h - 90, { width: 2.5, color: INK, seed: seed + 2 });
  } else if (shop === 'house') {
    // residential doorway and a barred window
    g.fillStyle = '#211c18'; g.fillRect(S * 0.12, gy + 60, S * 0.2, gh - 66);
    inkRect(g, S * 0.12, gy + 60, S * 0.2, gh - 66, { width: 3, color: INK, seed });
    inkRect(g, S * 0.15, gy + 90, S * 0.14, (gh - 66) * 0.4, { width: 2, color: INK, seed: seed + 1, alpha: 0.7 });
    windowUnit(g, S * 0.5, gy + 90, S * 0.34, gh * 0.5, r, { panes: [3, 2] });
  }
  // drainpipe and grime
  g.fillStyle = '#1a1a1c'; g.fillRect(S - 34, 0, 14, S);
  ink(g, [[S - 34, 0], [S - 34, S]], { width: 2, color: INK, seed: seed + 9 });
  for (let i = 0; i < 6; i++) { g.fillStyle = '#101012'; g.fillRect(S - 38, (S * i) / 6 + 30, 22, 8); }
  const gr = g.createLinearGradient(0, S, 0, S - 220);
  gr.addColorStop(0, rgba('#0b0e13', 0.55)); gr.addColorStop(1, rgba('#0b0e13', 0));
  g.fillStyle = gr; g.fillRect(0, S - 220, S, 220);
  return c;
}

// ---------------------------------------------------------------- snow ground
function roadCanvas() {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = rng(41);
  // setts under slush
  wash(g, 0, 0, S, S, '#2a2c30', { seed: 4, blot: 0.2, speck: 0.2, tile: true });
  const bw = 64, bh = 34;
  for (let j = 0; j < S / bh; j++) for (let i = -1; i < S / bw + 1; i++) {
    const x = i * bw + (j % 2) * bw * 0.5, y = j * bh;
    g.fillStyle = rgba(r() < 0.5 ? '#3a3b3e' : '#232427', 0.6); g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    for (const dx of [0, S]) inkRect(g, x - dx + 2, y + 2, bw - 4, bh - 4, { width: 1.3, alpha: 0.5, color: '#0c0c0d', seed: i * 31 + j, over: 0, wobble: 1.2 });
  }
  // snow cover, thinner in the wheel tracks (tracks run along U)
  const snow = canvas(S, S), s = snow.getContext('2d');
  wash(s, 0, 0, S, S, '#b9c6d2', { seed: 9, blot: 0.12, speck: 0.08, dark: '#6b7f93', light: '#ffffff', tile: true });
  s.globalCompositeOperation = 'destination-out';
  for (const ty of [0.3, 0.44, 0.63, 0.77]) {
    for (let k = 0; k < 420; k++) {
      const x = r() * S, y = ty * S + (r() - 0.5) * 70 * (0.4 + r());
      const rad = r.range(8, 34);
      for (const dx of [0, -S, S]) {
        const gr = s.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
        gr.addColorStop(0, `rgba(0,0,0,${r.range(0.25, 0.75)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        s.fillStyle = gr; s.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
      }
    }
  }
  for (let k = 0; k < 1500; k++) { s.fillStyle = `rgba(0,0,0,${r() * 0.5})`; s.beginPath(); s.arc(r() * S, r() * S, r.range(1, 5), 0, 7); s.fill(); }
  g.drawImage(snow, 0, 0);
  for (const ty of [0.3, 0.44, 0.63, 0.77]) ink(g, [[0, ty * S + 36], [S, ty * S + 36]], { width: 1.6, alpha: 0.28, color: '#3e4d5d', wobble: 8, seed: ty * 100, dry: 0.3 });
  return c;
}

function pavementCanvas() {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = rng(77);
  wash(g, 0, 0, S, S, '#3b3c3f', { seed: 6, blot: 0.2, speck: 0.2, tile: true });
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) {
    const w = S / 3, h = S / 4, x = i * w + (j % 2) * w * 0.5, y = j * h;
    for (const dx of [0, S]) inkRect(g, x - dx, y, w, h, { width: 2, alpha: 0.7, color: '#101012', seed: i + j * 5, over: 0, wobble: 1.5 });
  }
  const snow = canvas(S, S), s = snow.getContext('2d');
  wash(s, 0, 0, S, S, '#c3cfd9', { seed: 12, blot: 0.12, speck: 0.07, dark: '#6b7f93', light: '#ffffff', tile: true });
  s.globalCompositeOperation = 'destination-out';
  // a trodden path along the shopfronts (V ~ 0.5) and scattered footprints
  for (let k = 0; k < 520; k++) {
    const x = r() * S, y = S * 0.5 + (r() - 0.5) * 300 * (0.25 + r() * 0.75), rad = r.range(10, 30);
    for (const dx of [0, -S, S]) {
      const gr = s.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
      gr.addColorStop(0, `rgba(0,0,0,${r.range(0.15, 0.55)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      s.fillStyle = gr; s.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
    }
  }
  for (let k = 0; k < 26; k++) {
    const x = r() * S, y = S * 0.5 + (r() - 0.5) * 420, a = (r() - 0.5) * 0.5 + (r() < 0.5 ? 0 : Math.PI);
    s.save(); s.translate(x, y); s.rotate(a); s.fillStyle = `rgba(0,0,0,${r.range(0.5, 0.85)})`;
    s.beginPath(); s.ellipse(0, 0, 26, 11, 0, 0, 7); s.fill(); s.beginPath(); s.ellipse(-36, 0, 11, 9, 0, 0, 7); s.fill(); s.restore();
  }
  g.drawImage(snow, 0, 0);
  return c;
}

// ---------------------------------------------------------------- interior shell
function floorCanvas() {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = rng(5);
  const rows = 9, ph = S / rows;
  for (let j = 0; j < rows; j++) {
    let x = -r() * 300;
    while (x < S) {
      const w = r.range(260, 520), col = mix(r.pick(['#6a4a33', '#5c3f2c', '#74533a', '#523726']), '#171717', r.range(0.05, 0.25));
      for (const dx of [0, S]) {
        g.fillStyle = col; g.fillRect(x - dx + S * 0, j * ph, w, ph);
        g.fillStyle = col; g.fillRect(x + dx, j * ph, w, ph);
      }
      for (let k = 0; k < 9; k++) {
        const yy = j * ph + r() * ph;
        ink(g, [[x, yy], [x + w, yy + (r() - 0.5) * 8]], { width: r.range(0.6, 1.6), alpha: r.range(0.12, 0.3), color: '#1d130c', seed: j * 100 + k + x, wobble: 2, dry: 0.25 });
      }
      ink(g, [[x, j * ph], [x, (j + 1) * ph]], { width: 2.2, color: '#120c08', alpha: 0.9, seed: x + j });
      g.fillStyle = '#120c08'; g.beginPath(); g.arc(x + 12, j * ph + 12, 2.2, 0, 7); g.arc(x + 12, (j + 1) * ph - 12, 2.2, 0, 7); g.fill();
      x += w;
    }
    ink(g, [[0, j * ph], [S, j * ph]], { width: 2.6, color: '#120c08', alpha: 0.9, seed: j, wobble: 1.2 });
  }
  // wear: a paler traffic lane, scuffs
  for (let i = 0; i < 700; i++) { g.fillStyle = rgba(r() < 0.5 ? '#d9b78f' : '#000000', r() * 0.07); g.fillRect(r() * S, r() * S, r.range(4, 40), r.range(1, 3)); }
  return c;
}

function woodCanvas(seed, base = '#5a3d2a', dark = 0.2) {
  const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rng(seed);
  wash(g, 0, 0, S, S, mix(base, '#171717', dark), { seed, blot: 0.16, speck: 0.1, tile: true });
  for (let i = 0; i < 90; i++) {
    const y = r() * S;
    ink(g, [[0, y], [S * 0.33, y + (r() - 0.5) * 10], [S * 0.66, y + (r() - 0.5) * 10], [S, y]], { width: r.range(0.6, 2), alpha: r.range(0.1, 0.35), color: '#150e09', seed: seed + i, wobble: 1.5, dry: 0.2 });
  }
  for (let i = 0; i < 3; i++) { const x = r() * S, y = r() * S; for (let k = 1; k < 5; k++) inkCircle(g, x, y, k * 5, { width: 1, alpha: 0.3, color: '#150e09', seed: i * 9 + k }); }
  return c;
}

function wallCanvas() {
  // 4 m wide x 3.2 m tall; tiles horizontally
  const W = 1280, H = 1024, c = canvas(W, H), g = c.getContext('2d'), r = rng(88);
  const dado = H * 0.66;
  wash(g, 0, 0, W, dado, '#b7a784', { seed: 3, blot: 0.2, speck: 0.12, fibre: 0.08, dark: '#3d2c1a', light: '#fff3d6', tile: true });
  // nicotine gradient towards the ceiling, hairline cracks, tape ghosts where bills used to hang
  const gr = g.createLinearGradient(0, 0, 0, dado * 0.6); gr.addColorStop(0, rgba('#3a2814', 0.5)); gr.addColorStop(1, rgba('#3a2814', 0));
  g.fillStyle = gr; g.fillRect(0, 0, W, dado);
  for (let i = 0; i < 7; i++) { let x = r() * W, y = r() * dado * 0.8; const pts = [[x, y]]; for (let k = 0; k < 6; k++) { x += r.range(-30, 30); y += r.range(15, 45); pts.push([x, y]); } ink(g, pts, { width: 1, alpha: 0.3, color: '#3a2c1c', seed: i }); }
  for (let i = 0; i < 5; i++) { const x = r() * (W - 160), y = 80 + r() * (dado - 320); g.fillStyle = rgba('#fff4d8', 0.09); g.fillRect(x, y, r.range(90, 150), r.range(120, 200)); }
  // picture rail
  g.fillStyle = '#3a2a1e'; g.fillRect(0, 96, W, 14); ink(g, [[0, 96], [W, 96]], { width: 2, color: INK, seed: 2 }); ink(g, [[0, 110], [W, 110]], { width: 2.5, color: INK, seed: 3 });
  // tongue-and-groove dado
  const wood = woodCanvas(31, '#4a3324', 0.3);
  g.save(); g.translate(0, dado); g.rotate(0);
  for (let x = 0; x < W; x += 512) g.drawImage(wood, x, 0, 512, H - dado);
  g.restore();
  for (let x = 0; x <= W; x += W / 16) ink(g, [[x, dado + 22], [x, H - 40]], { width: 2.2, color: '#0f0a07', alpha: 0.85, seed: x });
  g.fillStyle = '#2c1f16'; g.fillRect(0, dado, W, 22); g.fillRect(0, H - 40, W, 40);
  ink(g, [[0, dado], [W, dado]], { width: 3, color: INK, seed: 5 }); ink(g, [[0, dado + 22], [W, dado + 22]], { width: 2, color: INK, seed: 6 }); ink(g, [[0, H - 40], [W, H - 40]], { width: 2.5, color: INK, seed: 7 });
  hatch(g, 0, dado + 22, W, 60, { angle: 1.4, gap: 12, alpha: 0.2, seed: 4 });
  return c;
}

// ---------------------------------------------------------------- signage
function signCanvas() {
  const W = 2048, H = 300, c = canvas(W, H), g = c.getContext('2d'), r = rng(12);
  wash(g, 0, 0, W, H, '#1b1a19', { seed: 2, blot: 0.25, speck: 0.2, light: '#8a7a66' });
  for (let i = 0; i < 40; i++) ink(g, [[r() * W, 0], [r() * W, H]], { width: 1, alpha: 0.06, color: '#c9b79a', seed: i, wobble: 3 });
  inkRect(g, 22, 20, W - 44, H - 40, { width: 4, color: '#cbbf9f', alpha: 0.85, seed: 3, wobble: 1.5 });
  inkRect(g, 36, 34, W - 72, H - 68, { width: 1.5, color: '#cbbf9f', alpha: 0.6, seed: 4 });
  wordmark(g, W / 2, H * 0.80, 236, { color: '#E3D9BF', rough: 0.9, seed: 5, track: 14 });
  text(g, 'RECORDS', 300, H * 0.5, 62, { font: FONT.hand, color: '#D79A57', rough: 0.8, track: 6 });
  text(g, '& TAPES', 300, H * 0.5 + 62, 50, { font: FONT.hand, color: '#cbbf9f', rough: 0.8, track: 6 });
  text(g, 'GARMENTS', W - 300, H * 0.5, 62, { font: FONT.hand, color: '#D79A57', rough: 0.8, track: 6 });
  text(g, '& OBJECTS', W - 300, H * 0.5 + 62, 50, { font: FONT.hand, color: '#cbbf9f', rough: 0.8, track: 6 });
  return c;
}

function bladeCanvas() {
  const S = 512, c = canvas(S, S), g = c.getContext('2d');
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 6, 0, 7); g.clip();
  wash(g, 0, 0, S, S, '#d8cdb0', { seed: 8, blot: 0.2, speck: 0.15, dark: '#4a3924' });
  g.restore();
  inkCircle(g, S / 2, S / 2, S / 2 - 12, { width: 8, color: INK, seed: 1 });
  inkCircle(g, S / 2, S / 2, S / 2 - 34, { width: 2.5, color: INK, seed: 2 });
  wordmark(g, S / 2, S * 0.46, 150, { color: INK, rough: 0.8, stacked: true, seed: 3, track: 4 });
  text(g, '· RECORDS ·', S / 2, S * 0.2, 34, { font: FONT.hand, color: INK, track: 5 });
  return c;
}

// glass decal for the shop window: gilt lettering, frost creeping in from the edges, snow in the corners
function windowDecalCanvas() {
  const W = 2048, H = 1380, c = canvas(W, H), g = c.getContext('2d'), r = rng(64);
  // faint sheet reflection
  const gr0 = g.createLinearGradient(0, 0, W, H); gr0.addColorStop(0, 'rgba(150,175,200,0.05)'); gr0.addColorStop(0.5, 'rgba(150,175,200,0.0)'); gr0.addColorStop(1, 'rgba(150,175,200,0.06)');
  g.fillStyle = gr0; g.fillRect(0, 0, W, H);
  // frost
  for (let i = 0; i < 4200; i++) {
    const u = r(), v = r();
    const edge = Math.min(u, 1 - u, v * 1.6, (1 - v) * 0.5);
    if (r() > Math.exp(-edge * 15)) continue;
    const x = u * W, y = v * H, rad = r.range(8, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(205,220,232,${r.range(0.03, 0.13)})`); gr.addColorStop(1, 'rgba(205,220,232,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // frost ferns: little branching ink strokes in white
  for (let i = 0; i < 150; i++) {
    const side = r.int(0, 2); let x = side === 0 ? r() * 260 : side === 1 ? W - r() * 260 : r() * W, y = side === 2 ? H - r() * 200 : r() * H;
    let a = r() * 6.28;
    for (let k = 0; k < 5; k++) {
      const l = r.range(14, 46), nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
      ink(g, [[x, y], [nx, ny]], { width: 1.2, color: '#e6f0f8', alpha: 0.35, seed: i * 7 + k, wobble: 1 });
      ink(g, [[nx, ny], [nx + Math.cos(a + 1) * l * 0.5, ny + Math.sin(a + 1) * l * 0.5]], { width: 1, color: '#e6f0f8', alpha: 0.28, seed: i * 7 + k + 100 });
      x = nx; y = ny; a += r.range(-0.7, 0.7);
    }
  }
  // snow resting in the bottom corners and along the bead
  g.fillStyle = 'rgba(214,226,236,0.94)';
  g.beginPath(); g.moveTo(0, H);
  for (let i = 0; i <= 60; i++) { const u = i / 60; const hgt = 26 + 150 * Math.pow(Math.abs(u - 0.5) * 2, 3.2) + r.range(0, 14); g.lineTo(u * W, H - hgt); }
  g.lineTo(W, H); g.closePath(); g.fill();
  // gilt lettering with a dark drop shade, the way an old signwriter would do it
  const gold = '#D9B77A';
  text(g, 'ODD HAUS', W / 2 + 5, 496, 150, { font: FONT.heavy, color: 'rgba(12,10,7,0.6)', track: 12 });
  text(g, 'ODD HAUS', W / 2, 490, 150, { font: FONT.heavy, color: rgba(gold, 0.9), track: 12, rough: 0.5 });
  text(g, 'RECORDS  ·  GARMENTS  ·  OBJECTS', W / 2, 548, 42, { font: FONT.heavy, color: rgba(gold, 0.82), track: 8, rough: 0.5 });
  ink(g, [[760, 568], [W - 760, 568]], { width: 2.5, color: gold, alpha: 0.7, seed: 4 });
  text(g, 'BOUGHT — SOLD — TRADED', W / 2, 610, 34, { font: FONT.hand, color: rgba('#E8DFC8', 0.75), track: 6 });
  // worn gilding
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.5})`; g.fillRect(660 + r() * 730, 370 + r() * 250, r.range(1, 4), r.range(1, 2)); }
  g.globalCompositeOperation = 'source-over';
  return c;
}

function doorDecalCanvas() {
  const W = 512, H = 900, c = canvas(W, H), g = c.getContext('2d'), r = rng(19);
  for (let i = 0; i < 900; i++) {
    const u = r(), v = r(), edge = Math.min(u, 1 - u, v, (1 - v) * 0.6);
    if (r() > Math.exp(-edge * 10)) continue;
    const x = u * W, y = v * H, rad = r.range(8, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(205,220,232,${r.range(0.06, 0.22)})`); gr.addColorStop(1, 'rgba(205,220,232,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // hanging card
  g.save(); g.translate(W / 2, 330); g.rotate(-0.04);
  ink(g, [[-70, -150], [0, -210], [70, -150]], { width: 2, color: '#2a2018', seed: 2 });
  g.fillStyle = '#ded3b6'; g.fillRect(-120, -150, 240, 150);
  inkRect(g, -120, -150, 240, 150, { width: 3, color: INK, seed: 3 });
  text(g, 'OPEN', 0, -78, 76, { font: FONT.heavy, color: INK, rough: 0.6 });
  text(g, 'LATE TONIGHT', 0, -30, 34, { font: FONT.hand, color: '#79543D' });
  g.restore();
  text(g, 'PUSH', W / 2, 560, 36, { font: FONT.heavy, color: 'rgba(217,183,122,0.7)', track: 8 });
  text(g, 'MON–SAT 12–8', W / 2, 640, 30, { font: FONT.hand, color: 'rgba(232,223,200,0.6)' });
  text(g, 'DEC 24 · TIL LATE', W / 2, 678, 30, { font: FONT.hand, color: 'rgba(232,223,200,0.6)' });
  return c;
}

function skylineCanvas() {
  const W = 2048, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = rng(202);
  let x = 0;
  while (x < W) {
    const w = r.range(70, 190), h = r.range(150, 430);
    g.fillStyle = mix('#131c29', '#1d2b3f', r()); g.fillRect(x, H - h, w, h);
    if (r() < 0.5) { g.fillRect(x + w * 0.3, H - h - r.range(10, 40), w * 0.15, 40); }
    for (let k = 0; k < 4; k++) if (r() < 0.45) { g.fillStyle = rgba('#D79A57', r.range(0.25, 0.6)); g.fillRect(x + r() * (w - 12), H - h + 20 + r() * (h - 60), 7, 10); }
    x += w - 6;
  }
  return c;
}

function glowCanvas() {
  const S = 256, c = canvas(S, S), g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return c;
}

function aFrameCanvas() {
  const W = 512, H = 800, c = canvas(W, H), g = c.getContext('2d');
  wash(g, 0, 0, W, H, '#1a1a1a', { seed: 14, blot: 0.2, speck: 0.3, light: '#9a9a9a' });
  inkRect(g, 26, 26, W - 52, H - 52, { width: 4, color: '#d8cdb0', seed: 2, alpha: 0.8 });
  text(g, 'OPEN', W / 2, 170, 150, { font: FONT.heavy, color: '#E8DFC8', rough: 1 });
  text(g, 'LATE', W / 2, 300, 150, { font: FONT.heavy, color: '#D79A57', rough: 1 });
  ink(g, [[70, 340], [W - 70, 340]], { width: 4, color: '#E8DFC8', seed: 3 });
  ['LPs · 45s · TAPES', 'WORKWEAR', 'GIFT WRAP', 'INSIDE →'].forEach((s, i) => text(g, s, W / 2, 430 + i * 92, 66, { font: FONT.hand, color: '#E8DFC8', rough: 0.9, seed: i }));
  return c;
}

export function makeEnvTextures() {
  const rep = { repeat: true };
  const T = {};
  T.brick = toTexture(brickCanvas(1, 0.05), rep);
  T.brickDark = toTexture(brickCanvas(2, 0.3), rep);
  T.facades = [
    facadeCanvas(11, { floors: 3, bays: 3, shop: 'shutter', sign: 'HARDWARE & PAINT', lit: [1], tone: 0.3 }),
    facadeCanvas(12, { floors: 2, bays: 2, shop: 'dark', sign: 'TAILOR · ALTERATIONS', wall: 'plaster', tone: 0.35 }),
    facadeCanvas(13, { floors: 3, bays: 2, shop: 'house', tone: 0.4, lit: [3] }),
    facadeCanvas(14, { floors: 3, bays: 4, shop: 'shutter', sign: 'PRINT SHOP', wall: 'plaster', tone: 0.45 }),
    facadeCanvas(15, { floors: 2, bays: 3, shop: 'dark', sign: 'CAFE', tone: 0.35, lit: [4] }),
  ].map((c) => toTexture(c));
  T.upper = toTexture(facadeCanvas(21, { floors: 1, bays: 3, shop: 'none', groundFrac: 0.0, tone: 0.1 }));
  T.road = toTexture(roadCanvas(), rep);
  T.pavement = toTexture(pavementCanvas(), rep);
  T.floor = toTexture(floorCanvas(), rep);
  T.wood = toTexture(woodCanvas(3), rep);
  T.woodDark = toTexture(woodCanvas(4, '#3a2a20', 0.35), rep);
  T.woodPale = toTexture(woodCanvas(5, '#a9824f', 0.08), rep);
  T.wall = toTexture(wallCanvas(), rep);
  T.sign = toTexture(signCanvas());
  T.blade = toTexture(bladeCanvas());
  T.windowDecal = toTexture(windowDecalCanvas());
  T.doorDecal = toTexture(doorDecalCanvas());
  T.skyline = toTexture(skylineCanvas());
  T.glow = toTexture(glowCanvas());
  T.aframe = toTexture(aFrameCanvas());
  return T;
}

export { woodCanvas, brickCanvas };
// keep imports used by other modules tree-shake friendly
export const _unused = [paint, lerp];
