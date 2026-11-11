// Painted props: the poster and every printed thing in the shop. The original ODD HAUS character
// appears only as a flat print (printCharacter) - it is never redrawn or altered.
import { PAL } from '../config.js';
import { rng } from '../core/util.js';
import { canvas, toTexture, wash, ink, inkRect, inkCircle, hatch, text, wordmark, paper, rgba, mix, FONT } from '../core/paint.js';
import { printCharacter } from './character.js';
import { woodCanvas } from './textures-env.js';

const INK = PAL.black;

function creases(g, x, y, w, h, r, n = 5, a = 0.16) {
  for (let i = 0; i < n; i++) {
    const hz = r() < 0.5, p = r.range(0.15, 0.85);
    const pts = hz ? [[x, y + h * p], [x + w, y + h * (p + r.range(-0.02, 0.02))]] : [[x + w * p, y], [x + w * (p + r.range(-0.02, 0.02)), y + h]];
    ink(g, pts, { width: 2.2, color: '#fff7e2', alpha: a, seed: i + 1, wobble: 2 });
    ink(g, pts.map(([px, py]) => [px + 2, py + 2]), { width: 1.6, color: '#2b1e10', alpha: a * 1.3, seed: i + 50, wobble: 2 });
  }
}

function ringWear(g, cx, cy, rad, seed = 1, a = 0.16) {
  for (let k = 0; k < 3; k++) inkCircle(g, cx, cy, rad - k * 3, { width: 5 - k, color: '#fff9ea', alpha: a, seed: seed + k, wobble: 3, dry: 0.3 });
  inkCircle(g, cx, cy, rad + 4, { width: 2, color: '#2b1e10', alpha: a * 0.8, seed: seed + 9, wobble: 3, dry: 0.4 });
}

// ---------------------------------------------------------------- THE POSTER
function posterCanvas(ch) {
  const W = 1448, H = 2048, c = canvas(W, H), g = c.getContext('2d'), r = rng(2026);
  paper(g, 0, 0, W, H, { color: '#dccfae', seed: 7, age: 1.5 });
  // old paste-ups: paler and darker patches where the sheet was laid over older bills
  for (let i = 0; i < 9; i++) { g.fillStyle = rgba(r() < 0.5 ? '#f3e7c6' : '#8a6f47', r.range(0.05, 0.14)); g.fillRect(r() * W * 0.8, r() * H * 0.9, r.range(120, 420), r.range(120, 520)); }
  creases(g, 0, 0, W, H, r, 7, 0.2);
  const m = W * 0.06;
  const rect = printCharacter(g, ch, m, H * 0.035, W - m * 2, H * 0.90, { wear: 1.0, seed: 3 });
  text(g, 'ODD HAUS RECORDS · GARMENTS · OBJECTS', m, H - 44, 30, { font: FONT.hand, color: rgba(INK, 0.75), align: 'left', track: 3 });
  text(g, 'CHRISTMAS AFTER HOURS — 24.12.2026', W - m, H - 44, 30, { font: FONT.hand, color: rgba(INK, 0.75), align: 'right', track: 3 });
  // stains, a water mark, torn edge nicks
  for (let i = 0; i < 6; i++) { const x = r() * W, y = r() * H, rad = r.range(60, 220); const gr = g.createRadialGradient(x, y, rad * 0.6, x, y, rad); gr.addColorStop(0, 'rgba(90,60,25,0)'); gr.addColorStop(0.9, `rgba(90,60,25,${r.range(0.05, 0.13)})`); gr.addColorStop(1, 'rgba(90,60,25,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 46; i++) {
    const side = r.int(0, 3), t = r(), s = r.range(6, 30);
    const x = side === 0 ? 0 : side === 1 ? W : t * W, y = side === 2 ? 0 : side === 3 ? H : t * H;
    g.beginPath(); g.moveTo(x - s, y - s * r()); g.lineTo(x + s * r(), y - s); g.lineTo(x + s, y + s * r()); g.lineTo(x - s * r(), y + s); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // masking tape on the corners
  for (const [x, y, a] of [[40, 40, -0.7], [W - 40, 46, 0.75], [44, H - 44, 0.8], [W - 46, H - 40, -0.75]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(226,205,150,0.92)'; g.fillRect(-90, -30, 180, 60);
    hatch(g, -90, -30, 180, 60, { angle: 1.57, gap: 9, alpha: 0.12, color: '#6a5326', seed: x });
    inkRect(g, -90, -30, 180, 60, { width: 1.5, alpha: 0.35, color: '#3b2c12', seed: y, over: 0 });
    g.restore();
  }
  return { c, tip: { u: rect.tipX / W, v: 1 - rect.tipY / H } };
}

// ---------------------------------------------------------------- flyers on the walls
function flyerCanvas(kind, ch) {
  const W = 512, H = 720, c = canvas(W, H), g = c.getContext('2d'), r = rng(300 + kind);
  if (kind === 0) {
    wash(g, 0, 0, W, H, '#1c1b1a', { seed: 1, blot: 0.2, speck: 0.3, light: '#a09684' });
    text(g, 'LATE', W / 2, 190, 190, { color: '#E8DFC8', rough: 1 }); text(g, 'NIGHT', W / 2, 350, 170, { color: '#E8DFC8', rough: 1 });
    text(g, 'JAZZ BREAKS', W / 2, 440, 78, { color: '#D79A57', rough: 1, track: 4 });
    ink(g, [[50, 470], [W - 50, 470]], { width: 4, color: '#E8DFC8' });
    ['EVERY FRIDAY · 9 TIL CLOSE', 'IN THE BACK ROOM', 'NO REQUESTS'].forEach((s, i) => text(g, s, W / 2, 530 + i * 54, 40, { font: FONT.hand, color: '#E8DFC8' }));
  } else if (kind === 1) {
    paper(g, 0, 0, W, H, { color: '#d9cfae', seed: 4, age: 1.3 });
    for (let k = 1; k < 13; k++) inkCircle(g, W / 2, 270, k * 15, { width: k % 4 === 0 ? 4 : 1.6, color: INK, seed: k, wobble: 1.5 });
    g.fillStyle = INK; g.beginPath(); g.arc(W / 2, 270, 5, 0, 7); g.fill();
    text(g, '45s · LPs · TAPES', W / 2, 540, 62, { color: INK, rough: 0.8 });
    text(g, 'WE BUY COLLECTIONS', W / 2, 610, 44, { font: FONT.hand, color: '#79543D' });
    text(g, 'ASK AT THE COUNTER', W / 2, 660, 36, { font: FONT.hand, color: INK });
  } else if (kind === 2) {
    wash(g, 0, 0, W, H, '#1c2a3f', { seed: 6, blot: 0.2, speck: 0.25 });
    text(g, 'WINTER', W / 2, 170, 150, { color: '#E8DFC8', rough: 1 }); text(g, 'WORKWEAR', W / 2, 300, 118, { color: '#E8DFC8', rough: 1 });
    inkRect(g, 110, 350, W - 220, 230, { width: 4, color: '#D79A57', seed: 3 });
    hatch(g, 110, 350, W - 220, 230, { gap: 12, color: '#D79A57', alpha: 0.5, seed: 2 });
    text(g, 'DROP 26 — IN STORE NOW', W / 2, 650, 42, { font: FONT.hand, color: '#E8DFC8' });
  } else {
    paper(g, 0, 0, W, H, { color: '#cdbf9a', seed: 9, age: 1.6 });
    printCharacter(g, ch, 40, 30, W - 80, H - 170, { wear: 1.2, seed: 5 });
    text(g, 'CHRISTMAS AFTER HOURS', W / 2, H - 78, 50, { color: INK, rough: 0.9 });
    text(g, 'DEC 24 · OPEN LATE', W / 2, H - 32, 36, { font: FONT.hand, color: '#79543D' });
  }
  creases(g, 0, 0, W, H, r, 3, 0.14);
  return c;
}

// ---------------------------------------------------------------- record sleeves
function sleeveCanvas(kind) {
  const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rng(500 + kind);
  const title = (a, b, col, y = S - 70) => { text(g, a, 30, y, 54, { color: col, align: 'left', rough: 0.8 }); text(g, b, 32, y + 40, 28, { font: FONT.hand, color: col, align: 'left' }); };
  if (kind === 0) {
    wash(g, 0, 0, S, S, '#1b1a19', { seed: 2, speck: 0.25, light: '#998f7d' });
    for (let k = 0; k < 9; k++) { g.strokeStyle = rgba('#E8DFC8', 0.9); g.lineWidth = 9; g.beginPath(); g.arc(S, 0, 60 + k * 40, Math.PI / 2, Math.PI); g.stroke(); }
    title('LATE NIGHT BREAKS', 'VOL. 3 — THE BACK ROOM TAPES', '#E8DFC8');
  } else if (kind === 1) {
    wash(g, 0, 0, S, S, '#7a553d', { seed: 3, speck: 0.2 });
    g.fillStyle = '#e3d9bf'; g.beginPath(); g.arc(S * 0.5, S * 0.42, 150, 0, 7); g.fill();
    g.fillStyle = '#1c2a3f'; g.fillRect(0, S * 0.38, S, 44);
    title('SLOW SMOKE', 'QUARTET · LIVE AT THE CELLAR', '#E8DFC8');
  } else if (kind === 2) {
    paper(g, 0, 0, S, S, { color: '#ddd2b4', seed: 5, age: 1.2 });
    for (let j = 0; j < 7; j++) for (let i = 0; i < 9; i++) { g.fillStyle = INK; g.beginPath(); g.arc(60 + i * 49, 60 + j * 49, 5 + ((i * j) % 5) * 3.2, 0, 7); g.fill(); }
    title('DUST & WAX', 'SIDE ONE / SIDE TWO', INK);
  } else if (kind === 3) {
    wash(g, 0, 0, S, S, '#1c2a3f', { seed: 6, speck: 0.2 });
    g.fillStyle = '#D79A57'; g.beginPath(); g.arc(S / 2, S * 0.62, 170, Math.PI, 0); g.fill();
    for (let k = 0; k < 6; k++) { g.fillStyle = '#1c2a3f'; g.fillRect(0, S * 0.62 - 26 - k * 30, S, 6 + k * 2); }
    title('WINTER SESSIONS', 'RECORDED AFTER CLOSING', '#E8DFC8');
  } else if (kind === 4) {
    paper(g, 0, 0, S, S, { color: '#e0d6b9', seed: 7 });
    g.save(); g.rotate(-0.5); for (let k = -6; k < 14; k++) { g.fillStyle = k % 2 ? INK : '#79543D'; g.fillRect(-300, k * 62, 1100, 30); } g.restore();
    g.fillStyle = '#e0d6b9'; g.fillRect(0, S - 130, S, 130);
    title('ODD JOBS', 'INSTRUMENTALS FOR NIGHT SHIFTS', INK);
  } else {
    wash(g, 0, 0, S, S, '#201f1e', { seed: 8, speck: 0.25, light: '#998f7d' });
    for (let k = 0; k < 16; k++) { const pts = []; let x = 30, y = 60 + k * 21; for (let i = 0; i < 16; i++) { pts.push([x, y + (r() - 0.5) * 26 * Math.sin(i * 0.4 + k)]); x += 30; } ink(g, pts, { width: 2.4, color: '#E8DFC8', seed: k, wobble: 2 }); }
    title('B-SIDES', 'AND OTHER GOOD MISTAKES', '#D79A57');
  }
  ringWear(g, S / 2, S / 2, S * 0.4, kind);
  inkRect(g, 2, 2, S - 4, S - 4, { width: 3, color: '#0c0b0a', alpha: 0.7, seed: kind, over: 0 });
  return c;
}

function heroSleeveCanvas(ch) {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = rng(909);
  paper(g, 0, 0, S, S, { color: '#ddd0ae', seed: 11, age: 1.4 });
  g.fillStyle = '#1b1a19'; g.fillRect(0, 0, S, 96);
  text(g, 'ODD HAUS RECORDS', 36, 66, 50, { color: '#E8DFC8', align: 'left', rough: 0.7, track: 3 });
  text(g, 'OH-026 · STEREO · 33⅓', S - 36, 64, 36, { font: FONT.hand, color: '#D79A57', align: 'right' });
  printCharacter(g, ch, S * 0.36, 130, S * 0.62, S - 170, { wear: 0.9, seed: 8 });
  text(g, 'AFTER', 40, 300, 170, { color: '#79543D', align: 'left', rough: 0.9 });
  text(g, 'HOURS', 40, 455, 170, { color: INK, align: 'left', rough: 0.9 });
  ink(g, [[40, 490], [390, 490]], { width: 5, color: INK, seed: 2 });
  ['A1  SNOW ON THE SIGN', 'A2  LAST CUSTOMER', 'A3  WRAP IT UP', 'B1  KETTLE ON', 'B2  CLOSING TIME BLUES', 'B3  LIGHTS OUT'].forEach((s, i) =>
    text(g, s, 44, 548 + i * 50 + (i > 2 ? 26 : 0), 36, { font: FONT.hand, color: INK, align: 'left' }));
  text(g, 'A CHRISTMAS RECORD FOR PEOPLE', 44, S - 96, 30, { font: FONT.hand, color: '#79543D', align: 'left' });
  text(g, 'WHO ARE STILL AT WORK.', 44, S - 60, 30, { font: FONT.hand, color: '#79543D', align: 'left' });
  ringWear(g, S / 2, S / 2 + 20, S * 0.41, 4, 0.22);
  creases(g, 0, 0, S, S, r, 2, 0.12);
  inkRect(g, 3, 3, S - 6, S - 6, { width: 3, color: '#0c0b0a', alpha: 0.6, over: 0 });
  return c;
}

function spinesCanvas(seed) {
  const W = 1024, H = 256, c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
  const cols = ['#d8cdb0', '#1b1a19', '#79543D', '#1c2a3f', '#c9b48a', '#3a332c', '#8c6a4b', '#a7b0b3', '#2a2623', '#b88a55', '#55606a', '#e5dcc4'];
  let x = 0;
  while (x < W) {
    const w = r.range(5, 13), col = r.pick(cols), lean = r() < 0.06 ? r.range(-6, 6) : 0, top = r.range(0, 10);
    g.fillStyle = mix(col, '#171717', r.range(0, 0.3));
    g.beginPath(); g.moveTo(x + lean, top); g.lineTo(x + w + lean, top); g.lineTo(x + w, H); g.lineTo(x, H); g.closePath(); g.fill();
    if (r() < 0.5) { g.fillStyle = rgba(r() < 0.5 ? '#171717' : '#E8DFC8', 0.6); g.fillRect(x + w * 0.3, r.range(30, 120), Math.max(1.5, w * 0.3), r.range(40, 110)); }
    ink(g, [[x + lean, top], [x, H]], { width: 1.4, color: '#0c0b0a', alpha: 0.8, seed: x });
    x += w;
  }
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.25, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}

function labelCanvas() {
  const S = 512, c = canvas(S, S), g = c.getContext('2d');
  g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.clip();
  wash(g, 0, 0, S, S, '#b9783f', { seed: 4, blot: 0.15, speck: 0.15 });
  g.fillStyle = '#1b1a19'; g.fillRect(0, 0, S, S * 0.36);
  g.restore();
  inkCircle(g, S / 2, S / 2, S / 2 - 10, { width: 4, color: INK, seed: 1 });
  wordmark(g, S / 2, S * 0.27, 96, { color: '#E8DFC8', rough: 0.6, seed: 2 });
  text(g, 'AFTER HOURS', S / 2, S * 0.70, 58, { color: INK, rough: 0.6 });
  text(g, 'SIDE A · 33⅓ RPM · OH-026', S / 2, S * 0.80, 26, { font: FONT.hand, color: INK });
  text(g, 'STEREO', S * 0.2, S * 0.54, 24, { font: FONT.hand, color: INK }); text(g, '℗ 2026', S * 0.8, S * 0.54, 24, { font: FONT.hand, color: INK });
  g.fillStyle = '#0a0a0a'; g.beginPath(); g.arc(S / 2, S / 2, 14, 0, 7); g.fill();
  return c;
}

// ---------------------------------------------------------------- hi-fi
function ttTopCanvas() {
  const W = 1024, H = 800, c = canvas(W, H), g = c.getContext('2d');
  wash(g, 0, 0, W, H, '#2a2927', { seed: 3, blot: 0.15, speck: 0.22, light: '#aaa397' });
  hatch(g, 0, 0, W, H, { angle: 0.02, gap: 5, alpha: 0.07, color: '#d8d0bf', seed: 2, wobble: 0.6 });
  inkRect(g, 12, 12, W - 24, H - 24, { width: 4, color: '#0b0b0b', seed: 1 });
  inkCircle(g, 400, 400, 372, { width: 5, color: '#0b0b0b', seed: 4 });
  // controls
  g.fillStyle = '#c8bfa9'; g.fillRect(40, 650, 110, 110); inkRect(g, 40, 650, 110, 110, { width: 3, color: INK, seed: 5 });
  text(g, 'START', 95, 700, 26, { font: FONT.sans, weight: '600', color: INK }); text(g, 'STOP', 95, 732, 26, { font: FONT.sans, weight: '600', color: INK });
  for (const [x, s] of [[190, '33'], [270, '45']]) { g.fillStyle = '#c8bfa9'; g.fillRect(x, 700, 62, 60); inkRect(g, x, 700, 62, 60, { width: 2.5, color: INK, seed: x }); text(g, s, x + 31, 742, 30, { font: FONT.sans, weight: '600', color: INK }); }
  g.fillStyle = '#ff9d3c'; g.beginPath(); g.arc(221, 684, 6, 0, 7); g.fill();
  // pitch fader
  g.fillStyle = '#121212'; g.fillRect(930, 380, 26, 340); inkRect(g, 930, 380, 26, 340, { width: 2, color: '#000', seed: 8 });
  for (let i = 0; i <= 16; i++) { g.fillStyle = '#c8bfa9'; g.fillRect(900, 392 + i * 20, i % 4 === 0 ? 22 : 12, 2); }
  g.fillStyle = '#c8bfa9'; g.fillRect(918, 530, 50, 30); inkRect(g, 918, 530, 50, 30, { width: 2, color: INK, seed: 9 });
  text(g, 'PITCH', 943, 760, 22, { font: FONT.sans, weight: '600', color: '#c8bfa9' });
  text(g, 'ODD HAUS HI-FI', 880, 60, 26, { font: FONT.sans, weight: '600', color: '#c8bfa9', align: 'right', track: 3 });
  text(g, 'DIRECT DRIVE', 880, 92, 20, { font: FONT.sans, color: '#8d8672', align: 'right', track: 3 });
  // tonearm rest board
  inkCircle(g, 880, 200, 70, { width: 3, color: '#0b0b0b', seed: 12 });
  return c;
}

function ampCanvas() {
  const W = 1024, H = 256, c = canvas(W, H), g = c.getContext('2d');
  wash(g, 0, 0, W, H, '#b5ad9a', { seed: 7, blot: 0.1, speck: 0.12, dark: '#3a352c' });
  hatch(g, 0, 0, W, H, { angle: 0.0, gap: 3, alpha: 0.1, color: '#4a4338', seed: 2, wobble: 0.5 });
  inkRect(g, 6, 6, W - 12, H - 12, { width: 4, color: INK, seed: 1 });
  for (const x of [90, 330]) { // VU windows
    g.fillStyle = '#e8b56a'; g.fillRect(x, 50, 200, 110); inkRect(g, x, 50, 200, 110, { width: 3.5, color: INK, seed: x });
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.2 + 0.6 * (i / 10)); g.strokeStyle = i > 7 ? '#8a2a14' : INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 100 + Math.cos(a) * 78, 170 + Math.sin(a) * 78); g.lineTo(x + 100 + Math.cos(a) * 90, 170 + Math.sin(a) * 90); g.stroke(); }
    text(g, 'VU', x + 100, 150, 20, { font: FONT.sans, weight: '600', color: INK });
  }
  for (const [x, rr, s] of [[640, 44, 'VOLUME'], [770, 30, 'BASS'], [860, 30, 'TREBLE'], [950, 30, 'INPUT']]) {
    g.fillStyle = '#26241f'; g.beginPath(); g.arc(x, 112, rr, 0, 7); g.fill(); inkCircle(g, x, 112, rr, { width: 3, color: '#000', seed: x });
    for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.28; ink(g, [[x + Math.cos(a) * rr * 0.7, 112 + Math.sin(a) * rr * 0.7], [x + Math.cos(a) * rr * 0.95, 112 + Math.sin(a) * rr * 0.95]], { width: 1.5, color: '#55504a', seed: k }); }
    g.strokeStyle = '#e8dfc8'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 112); g.lineTo(x - rr * 0.6, 112 - rr * 0.6); g.stroke();
    text(g, s, x, 196, 20, { font: FONT.sans, weight: '600', color: INK, track: 2 });
  }
  text(g, 'STEREO RECEIVER', 90, 214, 22, { font: FONT.sans, weight: '600', color: INK, align: 'left', track: 4 });
  g.fillStyle = '#ffab4d'; g.beginPath(); g.arc(566, 60, 7, 0, 7); g.fill();
  return c;
}

function speakerCanvas() {
  const W = 512, H = 820, c = canvas(W, H), g = c.getContext('2d');
  g.drawImage(woodCanvas(17, '#6a482f', 0.15), 0, 0, W, H);
  g.fillStyle = '#161514'; g.fillRect(34, 34, W - 68, H - 68);
  wash(g, 34, 34, W - 68, H - 68, '#1a1918', { seed: 9, speck: 0.3, light: '#8d8474' });
  inkRect(g, 34, 34, W - 68, H - 68, { width: 4, color: '#000', seed: 2 });
  // tweeter
  g.fillStyle = '#2b2925'; g.beginPath(); g.arc(W / 2, 150, 62, 0, 7); g.fill(); inkCircle(g, W / 2, 150, 62, { width: 3.5, color: '#000', seed: 3 });
  g.fillStyle = '#b8a888'; g.beginPath(); g.arc(W / 2, 150, 24, 0, 7); g.fill(); inkCircle(g, W / 2, 150, 24, { width: 2.5, color: '#000', seed: 4 });
  for (const [x, y] of [[W / 2 - 50, 100], [W / 2 + 50, 100], [W / 2 - 50, 200], [W / 2 + 50, 200]]) { g.fillStyle = '#6e6658'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  // woofer surround ring (the cone itself is geometry)
  inkCircle(g, W / 2, 500, 198, { width: 6, color: '#000', seed: 5 });
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(W / 2, 500, 190, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28 + 0.39; g.fillStyle = '#6e6658'; g.beginPath(); g.arc(W / 2 + Math.cos(a) * 204, 500 + Math.sin(a) * 204, 5, 0, 7); g.fill(); }
  // port + badge
  g.fillStyle = '#060606'; g.beginPath(); g.arc(110, 740, 30, 0, 7); g.fill(); inkCircle(g, 110, 740, 30, { width: 3, color: '#000', seed: 6 });
  g.fillStyle = '#b8a888'; g.fillRect(W - 200, 722, 130, 36); inkRect(g, W - 200, 722, 130, 36, { width: 2, color: INK, seed: 7 });
  text(g, 'ODD HAUS', W - 135, 749, 24, { color: INK });
  return c;
}

function coneCanvas() {
  const S = 512, c = canvas(S, S), g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2);
  gr.addColorStop(0, '#3a3832'); gr.addColorStop(0.22, '#24231f'); gr.addColorStop(0.8, '#34322d'); gr.addColorStop(0.86, '#141413'); gr.addColorStop(1, '#2a2926');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let k = 3; k < 13; k++) inkCircle(g, S / 2, S / 2, k * 17, { width: 1.3, color: '#0a0a0a', alpha: 0.5, seed: k });
  inkCircle(g, S / 2, S / 2, 56, { width: 4, color: '#000', seed: 20 }); inkCircle(g, S / 2, S / 2, 218, { width: 5, color: '#000', seed: 21 });
  g.fillStyle = 'rgba(232,223,200,0.10)'; g.beginPath(); g.moveTo(S / 2, S / 2); g.arc(S / 2, S / 2, 210, -2.3, -1.7); g.closePath(); g.fill();
  return c;
}

// ---------------------------------------------------------------- garments (painted in cm, scaled to the canvas)
function clothFill(g, path, W, H, base, { seed = 1, twill = 0, s = 18 } = {}) {
  const r = rng(seed);
  g.save(); path(); g.clip();
  wash(g, 0, 0, W, H, base, { seed, blot: 0.035, speck: 0.1, dark: '#000000', light: '#cfd6e0' });
  if (twill > 0) {
    const gap = Math.max(3, 0.3 * s);
    g.lineWidth = Math.max(1, gap * 0.36);
    for (let d = -H; d < W + H; d += gap) {
      g.strokeStyle = rgba('#aebfd6', twill * r.range(0.4, 1));
      g.beginPath(); g.moveTo(d, 0); g.lineTo(d + H * 0.75, H); g.stroke();
      g.strokeStyle = rgba('#000000', twill * 0.8 * r.range(0.4, 1));
      g.beginPath(); g.moveTo(d + gap * 0.5, 0); g.lineTo(d + gap * 0.5 + H * 0.75, H); g.stroke();
    }
  } else {
    const gap = Math.max(2.5, 0.16 * s); // jersey ribs
    g.lineWidth = 1;
    for (let x = 0; x < W; x += gap) { g.strokeStyle = rgba('#5a4a30', 0.07 * r.range(0.4, 1)); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  }
  g.restore();
}

function jacketCanvas(W, H, s, ox, oy) {
  const c = canvas(W, H), g = c.getContext('2d');
  const P = (x, y) => [ox + x * s, oy + y * s];
  const poly = (pts) => () => { g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
  const line = (pts, o = {}) => ink(g, pts.map(([x, y]) => P(x, y)), { color: '#0b0d12', width: 0.28 * s, wobble: 0.1 * s, step: 2.2 * s, dry: 0.03, ...o });
  const stitch = (pts, o = {}) => {
    // double row of topstitching
    for (const off of [0, 0.45]) {
      g.save(); g.setLineDash([0.34 * s, 0.24 * s]); g.lineWidth = Math.max(1, 0.085 * s); g.strokeStyle = rgba('#c9c1a8', o.alpha ?? 0.8); g.lineCap = 'butt';
      g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x + (o.nx ?? 0) * off, y + (o.ny ?? 0) * off); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); g.restore();
    }
  };
  const NAVY = '#263852';
  const sleeveL = [[-24, 6], [-34, 11], [-45, 63], [-35, 66], [-26.5, 30]];
  const sleeveR = sleeveL.map(([x, y]) => [-x, y]);
  const body = [[-24, 5.5], [-9, 1], [0, 9], [9, 1], [24, 5.5], [27, 30], [26.2, 79], [-26.2, 79], [-27, 30]];
  for (const [pts, sd] of [[sleeveL, 3], [sleeveR, 4], [body, 5]]) clothFill(g, poly(pts), W, H, NAVY, { seed: sd, twill: 0.13, s });
  // shading: sleeves sit behind, hem and side seams fall off
  const shade = (pts, x0, x1, a) => { g.save(); poly(pts)(); g.clip(); const [ax] = P(x0, 0), [bx] = P(x1, 0); const gr = g.createLinearGradient(ax, 0, bx, 0); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); };
  shade(sleeveL, -26, -40, 0.5); shade(sleeveR, 26, 40, 0.5); shade(body, -27, -17, 0.35); shade(body, 27, 17, 0.35);
  g.save(); poly(body)(); g.clip(); const [, hy0] = P(0, 60), [, hy1] = P(0, 79); const hg = g.createLinearGradient(0, hy0, 0, hy1); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = hg; g.fillRect(0, 0, W, H);
  // drape folds
  const r = rng(71);
  for (let i = 0; i < 12; i++) { const x = r.range(-22, 22), y = r.range(14, 50); ink(g, [P(x, y), P(x + r.range(-3, 3), y + r.range(12, 28))], { width: r.range(0.5, 1.6) * s, color: r() < 0.6 ? '#05070b' : '#6f86a8', alpha: r.range(0.05, 0.13), wobble: s, seed: i, step: 4 * s, dry: 0 }); }
  g.restore();
  // neck opening (lining) behind the collar
  g.fillStyle = '#0c0f15'; poly([[-9, 1], [9, 1], [0, 9]])(); g.fill();
  hatch(g, P(-9, 1)[0], P(0, 1)[1], 18 * s, 8 * s, { angle: 0, gap: 0.5 * s, alpha: 0.25, color: '#55606f', seed: 3, width: 0.06 * s });
  // collar
  const colL = [[-9, 1], [-0.6, 10], [-10.5, 18], [-15.5, 6.5], [-12, 2.2]], colR = colL.map(([x, y]) => [-x, y]);
  for (const [pts, sd] of [[colL, 8], [colR, 9]]) { clothFill(g, poly(pts), W, H, mix(NAVY, '#3a4f6e', 0.4), { seed: sd, twill: 0.13, s }); line([...pts, pts[0]]); }
  stitch([[-10, 2.4], [-1.9, 10.2], [-10.3, 16.6], [-14.4, 6.8]], { alpha: 0.7 }); stitch([[10, 2.4], [1.9, 10.2], [10.3, 16.6], [14.4, 6.8]], { alpha: 0.7 });
  // outlines
  line([...sleeveL, sleeveL[0]]); line([...sleeveR, sleeveR[0]]);
  line([[-24, 5.5], [-27, 30], [-26.2, 79], [26.2, 79], [27, 30], [24, 5.5]]);
  line([[-24, 5.5], [-12, 2.2]]); line([[24, 5.5], [12, 2.2]]);
  // shoulder + armhole seams, cuffs, hem
  stitch([[-24, 6], [-26.4, 29]], { nx: 1 }); stitch([[24, 6], [26.4, 29]], { nx: -1 });
  stitch([[-43.8, 58], [-34.2, 61]], { ny: -1 }); stitch([[43.8, 58], [34.2, 61]], { ny: -1 });
  stitch([[-25.6, 76.6], [25.6, 76.6]], { ny: -1 });
  // placket + buttons
  line([[0.2, 9.5], [0, 79]], { width: 0.2 * s }); stitch([[2.6, 12], [2.6, 78]], { nx: 1 });
  for (const y of [15, 28, 41, 54, 67]) {
    const [bx, by] = P(1.3, y);
    g.fillStyle = '#2a2018'; g.beginPath(); g.arc(bx + 0.12 * s, by + 0.14 * s, 1.08 * s, 0, 7); g.fill();
    g.fillStyle = '#8a6a4a'; g.beginPath(); g.arc(bx, by, 1.0 * s, 0, 7); g.fill();
    inkCircle(g, bx, by, 1.0 * s, { width: 0.14 * s, color: '#0b0d12', seed: y, wobble: 0.04 * s }); inkCircle(g, bx, by, 0.62 * s, { width: 0.07 * s, color: '#2a2018', seed: y + 1, wobble: 0.02 * s });
    for (const [dx, dy] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) { g.fillStyle = '#120d09'; g.beginPath(); g.arc(bx + dx * s, by + dy * s, 0.11 * s, 0, 7); g.fill(); }
    g.strokeStyle = '#c9c1a8'; g.lineWidth = 0.07 * s; g.beginPath(); g.moveTo(bx - 0.24 * s, by - 0.24 * s); g.lineTo(bx + 0.24 * s, by + 0.24 * s); g.moveTo(bx + 0.24 * s, by - 0.24 * s); g.lineTo(bx - 0.24 * s, by + 0.24 * s); g.stroke();
  }
  // patch pockets
  const pocket = (x0, y0, x1, y1, seed) => {
    const pts = [[x0, y0], [x1, y0], [x1, y1 - 1.6], [(x0 + x1) / 2, y1], [x0, y1 - 1.6]];
    clothFill(g, poly(pts), W, H, mix(NAVY, '#34496a', 0.35), { seed, twill: 0.14, s });
    line([...pts, pts[0]], { width: 0.2 * s });
    stitch([[x0 + 0.6, y0 + 0.6], [x0 + 0.6, y1 - 2], [(x0 + x1) / 2, y1 - 0.8], [x1 - 0.6, y1 - 2], [x1 - 0.6, y0 + 0.6]], { alpha: 0.85 });
    stitch([[x0 + 0.4, y0 + 1.8], [x1 - 0.4, y0 + 1.8]], { ny: 1, alpha: 0.85 });
    for (const bx of [x0 + 0.5, x1 - 0.5]) { const [px, py] = P(bx, y0 + 0.5); g.fillStyle = '#c9c1a8'; g.fillRect(px - 0.3 * s, py - 0.12 * s, 0.6 * s, 0.34 * s); } // bartacks
  };
  pocket(8, 23, 21, 38, 21); pocket(-22, 50, -5, 69, 22); pocket(5, 50, 22, 69, 23);
  // small woven flag on the chest pocket
  const [fx, fy] = P(21, 27); g.fillStyle = '#d8cdb0'; g.fillRect(fx, fy, 1.5 * s, 2.6 * s); g.fillStyle = INK; g.fillRect(fx + 0.3 * s, fy + 0.5 * s, 0.9 * s, 0.35 * s); g.fillRect(fx + 0.3 * s, fy + 1.2 * s, 0.9 * s, 0.35 * s);
  return c;
}

function teeCanvas(ch) {
  const W = 1792, H = 1792, s = 20, ox = W / 2, oy = 60, c = canvas(W, H), g = c.getContext('2d');
  const P = (x, y) => [ox + x * s, oy + y * s];
  const poly = (pts) => () => { g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
  const line = (pts, o = {}) => ink(g, pts.map(([x, y]) => P(x, y)), { color: '#1c1710', width: 0.26 * s, wobble: 0.1 * s, step: 2.2 * s, dry: 0.03, ...o });
  const CREAM = '#d9cfb4';
  const slL = [[-24, 5], [-40, 17], [-34, 29], [-26, 23]], slR = slL.map(([x, y]) => [-x, y]);
  const body = [[-24, 5], [-9.5, 0.8], [-5, 5.2], [0, 6.4], [5, 5.2], [9.5, 0.8], [24, 5], [26, 23], [25.4, 78], [-25.4, 78], [-26, 23]];
  for (const [pts, sd] of [[slL, 3], [slR, 4], [body, 5]]) clothFill(g, poly(pts), W, H, CREAM, { seed: sd, s });
  g.save(); poly(body)(); g.clip();
  const r = rng(13);
  for (let i = 0; i < 14; i++) { const x = r.range(-22, 22), y = r.range(10, 55); ink(g, [P(x, y), P(x + r.range(-4, 4), y + r.range(12, 26))], { width: r.range(0.6, 1.8) * s, color: r() < 0.65 ? '#4a3a22' : '#fffaf0', alpha: r.range(0.04, 0.1), wobble: s, seed: i, step: 4 * s, dry: 0 }); }
  const [lx] = P(-26, 0), [rx] = P(-16, 0); let gr = g.createLinearGradient(lx, 0, rx, 0); gr.addColorStop(0, 'rgba(60,40,15,0.3)'); gr.addColorStop(1, 'rgba(60,40,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const [lx2] = P(26, 0), [rx2] = P(16, 0); gr = g.createLinearGradient(lx2, 0, rx2, 0); gr.addColorStop(0, 'rgba(60,40,15,0.3)'); gr.addColorStop(1, 'rgba(60,40,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
  // the print: the original drawing, one colour, washed-black plastisol that has been through the wash
  const [px0, py0] = P(-15.5, 13), [px1, py1] = P(15.5, 58);
  printCharacter(g, ch, px0, py0, px1 - px0, py1 - py0, { wear: 1.4, seed: 21, alpha: 0.93 });
  // collar rib
  g.fillStyle = '#0f0d0a'; poly([[-9.5, 0.8], [-5, 5.2], [0, 6.4], [5, 5.2], [9.5, 0.8], [5, 2.4], [0, 3.2], [-5, 2.4]])(); g.fill();
  const rib = [[-9.5, 0.8], [-5.4, 5.6], [0, 7.2], [5.4, 5.6], [9.5, 0.8]], ribIn = [[-8, 1.2], [-4.6, 4.2], [0, 5.1], [4.6, 4.2], [8, 1.2]];
  g.fillStyle = mix(CREAM, '#b9ad8c', 0.5); poly([...rib, ...ribIn.reverse()])(); g.fill();
  line(rib, { width: 0.2 * s }); line(ribIn, { width: 0.14 * s });
  for (let i = 0; i < 40; i++) { const t = i / 39, a = [-9.5 + 19 * t, 0]; const yy = 0.8 + 6.4 * (1 - Math.pow(Math.abs(t - 0.5) * 2, 1.5)); ink(g, [P(a[0], yy), P(a[0] * 0.86, yy - 1.5)], { width: 0.05 * s, alpha: 0.4, color: '#3a2e1c', seed: i, step: s }); }
  line([...slL, slL[0]]); line([...slR, slR[0]]);
  line([[-24, 5], [-26, 23], [-25.4, 78], [25.4, 78], [26, 23], [24, 5]]); line([[-24, 5], [-9.5, 0.8]]); line([[24, 5], [9.5, 0.8]]);
  g.save(); g.setLineDash([0.34 * s, 0.24 * s]); g.strokeStyle = 'rgba(90,75,50,0.6)'; g.lineWidth = 0.08 * s;
  for (const yy of [75.6, 76.4]) { g.beginPath(); g.moveTo(...P(-25, yy)); g.lineTo(...P(25, yy)); g.stroke(); }
  g.restore();
  return c;
}

function wovenLabelCanvas() {
  const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = rng(31);
  g.fillStyle = '#16151a'; g.fillRect(0, 0, W, H);
  wordmark(g, W / 2, 250, 190, { color: '#E3D9BF', rough: 0, track: 10 });
  text(g, 'MADE FOR AFTER HOURS', W / 2, 340, 54, { font: FONT.heavy, color: '#D79A57', track: 10 });
  text(g, 'RECORDS · GARMENTS · OBJECTS', W / 2, 410, 36, { font: FONT.sans, weight: '600', color: '#E3D9BF', track: 6 });
  text(g, 'M', W - 90, 110, 70, { font: FONT.heavy, color: '#E3D9BF' });
  inkRect(g, 40, 40, W - 80, H - 80, { width: 3, color: '#E3D9BF', alpha: 0.8, seed: 2, over: 0 });
  // the weave: every row is a thread
  for (let y = 0; y < H; y += 4) { g.fillStyle = `rgba(0,0,0,${0.22 + r() * 0.16})`; g.fillRect(0, y + 2, W, 2); }
  for (let x = 0; x < W; x += 3) { g.fillStyle = `rgba(255,255,255,${r() * 0.035})`; g.fillRect(x, 0, 1, H); }
  // stitched down at both ends
  g.setLineDash([16, 10]); g.strokeStyle = '#c9c1a8'; g.lineWidth = 5; for (const x of [18, W - 18]) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x, H - 10); g.stroke(); }
  g.setLineDash([]);
  return c;
}

function sideGarmentCanvas(col, seed) {
  const W = 256, H = 1024, c = canvas(W, H), g = c.getContext('2d'), r = rng(seed);
  const path = () => { g.beginPath(); g.moveTo(96, 40); g.lineTo(170, 48); g.lineTo(214, 120); g.lineTo(226, 560); g.lineTo(200, H * r.range(0.8, 0.96)); g.lineTo(60, H * r.range(0.8, 0.96)); g.lineTo(34, 520); g.lineTo(50, 110); g.closePath(); };
  g.save(); path(); g.clip();
  wash(g, 0, 0, W, H, col, { seed, blot: 0.2, speck: 0.15 });
  for (let i = 0; i < 9; i++) ink(g, [[r.range(50, 210), 80], [r.range(40, 220), H * 0.9]], { width: r.range(4, 14), color: r() < 0.6 ? '#000000' : '#ffffff', alpha: r.range(0.05, 0.16), seed: i, wobble: 6, step: 60, dry: 0 });
  g.restore();
  path(); g.lineWidth = 5; g.strokeStyle = '#0b0b0d'; g.stroke();
  return c;
}

// ---------------------------------------------------------------- wrapping table
function wrapCanvas() {
  const S = 1024, c = canvas(S, S), g = c.getContext('2d'), r = rng(404);
  wash(g, 0, 0, S, S, '#b08a5e', { seed: 5, blot: 0.1, speck: 0.14, fibre: 0.12, dark: '#4a3320', light: '#f1d9ae', tile: true });
  const cell = S / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x = i * cell + cell / 2 + (j % 2) * cell / 2, y = j * cell + cell / 2;
    for (const dx of [0, -S]) {
      g.save(); g.translate(x + dx, y); g.rotate(-0.22);
      if ((i + j) % 2 === 0) wordmark(g, 0, 22, 62, { color: '#1b1a19', rough: 0.9, seed: i + j * 4, track: 2 });
      else { // an inked snow star
        for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; ink(g, [[0, 0], [Math.cos(a) * 30, Math.sin(a) * 30]], { width: 3, color: '#1b1a19', seed: k + i * 7 }); ink(g, [[Math.cos(a) * 18, Math.sin(a) * 18], [Math.cos(a + 0.5) * 27, Math.sin(a + 0.5) * 27]], { width: 2, color: '#1b1a19', seed: k + 40 }); }
      }
      g.restore();
    }
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = rgba('#E8DFC8', 0.5); g.beginPath(); g.arc(r() * S, r() * S, r.range(1.5, 3.5), 0, 7); g.fill(); }
  return c;
}

function bagCanvas() {
  const W = 512, H = 640, c = canvas(W, H), g = c.getContext('2d'), r = rng(8);
  wash(g, 0, 0, W, H, '#b8946a', { seed: 15, blot: 0.12, speck: 0.14, fibre: 0.14, dark: '#4a3320', light: '#f6e0b8' });
  creases(g, 0, 0, W, H, r, 5, 0.16);
  wordmark(g, W / 2, 300, 190, { color: '#1b1a19', rough: 0.9, stacked: true, seed: 2, track: 6 });
  ink(g, [[110, 520], [W - 110, 520]], { width: 4, color: '#1b1a19', seed: 3 });
  text(g, 'RECORDS · GARMENTS · OBJECTS', W / 2, 566, 30, { font: FONT.hand, color: '#1b1a19', track: 2 });
  g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, W, 34); ink(g, [[0, 34], [W, 34]], { width: 2, color: '#3a2a18', alpha: 0.6 });
  return c;
}

function giftCanvas() {
  const S = 512, c = canvas(S, S), g = c.getContext('2d');
  paper(g, 0, 0, S, S, { color: '#ddd2b4', seed: 21, age: 0.8 });
  for (let x = 0; x < S; x += 32) { g.fillStyle = 'rgba(28,42,63,0.55)'; g.fillRect(x, 0, 3, S); }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { g.save(); g.translate(128 + i * 256 + (j % 2) * 40 - 20, 80 + j * 128); wordmark(g, 0, 0, 44, { color: '#1b1a19', rough: 0.7, seed: i + j }); g.restore(); }
  return c;
}

function tagCanvas() {
  const W = 320, H = 200, c = canvas(W, H), g = c.getContext('2d');
  paper(g, 0, 0, W, H, { color: '#e2d8bd', seed: 4 });
  inkRect(g, 8, 8, W - 16, H - 16, { width: 2.5, color: INK, seed: 1, over: 0 });
  g.fillStyle = '#3a2a18'; g.beginPath(); g.arc(34, H / 2, 9, 0, 7); g.fill();
  text(g, 'TO: YOU', 64, 82, 46, { font: FONT.hand, color: INK, align: 'left' });
  text(g, 'FROM: ODD HAUS', 64, 142, 40, { font: FONT.hand, color: '#79543D', align: 'left' });
  return c;
}

function cassetteCanvas() {
  const W = 640, H = 400, c = canvas(W, H), g = c.getContext('2d');
  wash(g, 0, 0, W, H, '#1c1b1a', { seed: 6, speck: 0.3, light: '#8d8474' });
  inkRect(g, 6, 6, W - 12, H - 12, { width: 4, color: '#000', seed: 1, over: 0 });
  g.fillStyle = '#ded3b6'; g.fillRect(44, 36, W - 88, 250); inkRect(g, 44, 36, W - 88, 250, { width: 3, color: INK, seed: 2, over: 0 });
  for (let i = 0; i < 3; i++) ink(g, [[70, 78 + i * 34], [W - 70, 78 + i * 34]], { width: 1.5, color: '#79543D', alpha: 0.7, seed: i });
  text(g, 'AFTER HOURS MIX', 76, 72, 40, { font: FONT.hand, color: INK, align: 'left' });
  text(g, "XMAS '26 — SIDE A", 76, 106, 32, { font: FONT.hand, color: '#79543D', align: 'left' });
  g.fillStyle = '#16151a'; g.fillRect(170, 150, 300, 110); inkRect(g, 170, 150, 300, 110, { width: 3, color: '#000', seed: 3, over: 0 });
  for (const x of [240, 400]) { g.fillStyle = '#d8cdb0'; g.beginPath(); g.arc(x, 205, 34, 0, 7); g.fill(); inkCircle(g, x, 205, 34, { width: 3, color: '#000', seed: x }); g.fillStyle = '#16151a'; g.beginPath(); g.arc(x, 205, 14, 0, 7); g.fill(); for (let k = 0; k < 6; k++) { const a = k * 1.047; ink(g, [[x + Math.cos(a) * 14, 205 + Math.sin(a) * 14], [x + Math.cos(a) * 22, 205 + Math.sin(a) * 22]], { width: 3, color: '#16151a', seed: k }); } }
  g.fillStyle = '#3a2a1a'; g.fillRect(274, 180, 92, 50);
  text(g, 'ODD HAUS · TYPE I · 60', W / 2, 330, 26, { font: FONT.sans, weight: '600', color: '#c8bfa9', track: 3 });
  for (const [x, y] of [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]]) { g.fillStyle = '#6e6658'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); ink(g, [[x - 5, y], [x + 5, y]], { width: 2, color: '#000', seed: x }); }
  return c;
}

function windowCardCanvas(ch) {
  const W = 640, H = 900, c = canvas(W, H), g = c.getContext('2d');
  paper(g, 0, 0, W, H, { color: '#e0d5b6', seed: 30, age: 1 });
  inkRect(g, 22, 22, W - 44, H - 44, { width: 4, color: INK, seed: 1 });
  printCharacter(g, ch, 50, 50, W - 100, H - 250, { wear: 0.6, seed: 2 });
  text(g, 'CHRISTMAS', W / 2, H - 132, 78, { color: INK, rough: 0.7 });
  text(g, 'AFTER HOURS', W / 2, H - 58, 78, { color: '#79543D', rough: 0.7 });
  return c;
}

function rugCanvas() {
  const W = 1024, H = 640, c = canvas(W, H), g = c.getContext('2d'), r = rng(55);
  wash(g, 0, 0, W, H, '#5c3b2c', { seed: 3, blot: 0.2, speck: 0.3, light: '#d8b890' });
  for (const [m, col] of [[20, '#1c2a3f'], [56, '#c9b48a'], [78, '#1c2a3f']]) { g.strokeStyle = col; g.lineWidth = m === 20 ? 26 : 8; g.strokeRect(m, m, W - m * 2, H - m * 2); }
  for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
    const x = 180 + i * 166, y = 170 + j * 150;
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4);
    g.fillStyle = (i + j) % 2 ? '#1c2a3f' : '#c9b48a'; g.fillRect(-42, -42, 84, 84); g.fillStyle = '#5c3b2c'; g.fillRect(-22, -22, 44, 44);
    inkRect(g, -42, -42, 84, 84, { width: 2.5, color: '#120c08', seed: i + j * 5, over: 0 }); g.restore();
  }
  for (let y = 0; y < H; y += 5) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.1})`; g.fillRect(0, y, W, 2); }
  for (let i = 0; i < 400; i++) { g.fillStyle = rgba('#d9c4a0', r() * 0.12); g.fillRect(r() * W, r() * H, r.range(10, 80), r.range(2, 8)); }
  return c;
}

function counterCanvas() {
  const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = rng(60);
  const wd = woodCanvas(44, '#4a3324', 0.25);
  g.drawImage(wd, 0, 0, 512, 512); g.drawImage(wd, 512, 0, 512, 512);
  for (let i = 0; i < 4; i++) inkRect(g, 20 + i * 250, 26, 232, H - 60, { width: 3, color: '#0f0a07', seed: i });
  for (let i = 0; i < 4; i++) inkRect(g, 40 + i * 250, 46, 192, H - 100, { width: 1.6, color: '#0f0a07', alpha: 0.7, seed: i + 9 });
  const stick = (x, y, w, h, bg, fn, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = bg; g.fillRect(-w / 2, -h / 2, w, h); inkRect(g, -w / 2, -h / 2, w, h, { width: 2, color: INK, seed: x, over: 0 }); fn(); g.restore(); };
  stick(150, 180, 150, 70, '#ded3b6', () => wordmark(g, 0, 20, 52, { color: INK, rough: 0.5 }), -0.08);
  stick(420, 330, 170, 60, '#1b1a19', () => text(g, 'SUPPORT YOUR LOCAL', 0, 10, 20, { font: FONT.sans, weight: '600', color: '#E8DFC8' }), 0.05);
  stick(660, 160, 120, 120, '#D79A57', () => text(g, '45', 0, 34, 90, { color: INK }), 0.1);
  stick(880, 300, 150, 60, '#ded3b6', () => text(g, 'CASH ONLY-ISH', 0, 12, 30, { font: FONT.hand, color: INK }), -0.04);
  for (let i = 0; i < 200; i++) { g.fillStyle = rgba('#000000', r() * 0.15); g.fillRect(r() * W, H - r() * 120, r.range(4, 30), 2); }
  return c;
}

function openLateCanvas() {
  const W = 512, H = 200, c = canvas(W, H), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f0b262'); gr.addColorStop(1, '#c9853f');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  inkRect(g, 10, 10, W - 20, H - 20, { width: 5, color: INK, seed: 2, over: 0 });
  text(g, 'OPEN LATE', W / 2, 142, 128, { color: INK, rough: 0.5, track: 4 });
  return c;
}

function dividerCanvas(label, seed) {
  const W = 256, H = 96, c = canvas(W, H), g = c.getContext('2d');
  paper(g, 0, 0, W, H, { color: '#e2d8bd', seed });
  inkRect(g, 3, 3, W - 6, H - 6, { width: 2.5, color: INK, seed, over: 0 });
  text(g, label, W / 2, 66, 50, { font: FONT.hand, color: INK });
  return c;
}

// ---------------------------------------------------------------- end card (display-referred, not lit)
function endCardCanvas(ch) {
  const W = 1920, H = 1080, c = canvas(W, H), g = c.getContext('2d'), r = rng(2626);
  paper(g, 0, 0, W, H, { color: '#E8DFC8', seed: 77, age: 0.9 });
  creases(g, 0, 0, W, H, r, 2, 0.08);
  printCharacter(g, ch, 230, 96, 620, 890, { wear: 0.25, seed: 4 });
  const x = 960;
  const ww = wordmark(g, x, 500, 236, { color: '#171717', rough: 0.35, seed: 9, align: 'left', track: 6 });
  ink(g, [[x + 4, 548], [x + ww, 548]], { width: 7, color: '#171717', seed: 5, wobble: 1.5 });
  text(g, 'CHRISTMAS AFTER HOURS', x + 2, 634, 80, { color: '#79543D', align: 'left', rough: 0.4, track: 4 });
  text(g, 'RECORDS · GARMENTS · OBJECTS', x + 4, 704, 40, { font: FONT.hand, color: '#171717', align: 'left', track: 4 });
  text(g, 'WINTER 2026', x + 4, 752, 40, { font: FONT.hand, color: '#182333', align: 'left', track: 4 });
  // registration ticks, like a printer's proof
  for (const [px, py] of [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]]) { ink(g, [[px - 22, py], [px + 22, py]], { width: 2, color: '#171717', alpha: 0.6, seed: px }); ink(g, [[px, py - 22], [px, py + 22]], { width: 2, color: '#171717', alpha: 0.6, seed: py }); }
  return c;
}

export function makePropTextures(ch) {
  const T = {};
  const poster = posterCanvas(ch);
  T.poster = toTexture(poster.c, { aniso: 16 }); T.posterTip = poster.tip;
  T.flyers = [0, 1, 2, 3].map((k) => toTexture(flyerCanvas(k, ch)));
  T.sleeves = [0, 1, 2, 3, 4, 5].map((k) => toTexture(sleeveCanvas(k)));
  T.heroSleeve = toTexture(heroSleeveCanvas(ch), { aniso: 16 });
  T.spines = [toTexture(spinesCanvas(1), { repeat: true }), toTexture(spinesCanvas(2), { repeat: true })];
  T.label = toTexture(labelCanvas());
  T.ttTop = toTexture(ttTopCanvas());
  T.amp = toTexture(ampCanvas());
  T.speaker = toTexture(speakerCanvas());
  T.cone = toTexture(coneCanvas());
  T.jacket = toTexture(jacketCanvas(2048, 1700, 20, 1024, 50), { aniso: 16 });
  // the same jacket painted again at 4x for the close-up of the chest pocket (cm 3..26 x 19..42)
  T.jacketDetail = toTexture(jacketCanvas(1840, 1840, 80, -3 * 80, -19 * 80), { aniso: 16 });
  T.tee = toTexture(teeCanvas(ch), { aniso: 16 });
  T.wovenLabel = toTexture(wovenLabelCanvas(), { aniso: 16 });
  T.sideGarments = [['#3a2a20', 1], ['#1b1a19', 2], ['#28364d', 3], ['#b9ad8c', 4], ['#5c4634', 5], ['#20262e', 6]].map(([c, s]) => toTexture(sideGarmentCanvas(c, s)));
  T.wrap = toTexture(wrapCanvas(), { repeat: true });
  T.bag = toTexture(bagCanvas());
  T.gift = toTexture(giftCanvas(), { repeat: true });
  T.tag = toTexture(tagCanvas());
  T.cassette = toTexture(cassetteCanvas());
  T.windowCard = toTexture(windowCardCanvas(ch));
  T.rug = toTexture(rugCanvas());
  T.counter = toTexture(counterCanvas());
  T.openLate = toTexture(openLateCanvas());
  T.dividers = ['JAZZ', 'SOUL', 'BREAKS', 'NEW IN', 'DUB', '45s'].map((s, i) => toTexture(dividerCanvas(s, i + 1)));
  T.endCard = toTexture(endCardCanvas(ch), { srgb: false });
  T.endCard.generateMipmaps = false; T.endCard.minFilter = 1006; // LinearFilter
  return T;
}
