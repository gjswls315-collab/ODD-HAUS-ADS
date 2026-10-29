// UI art (placeholder): 5x7 bitmap font atlas, HUD icons, pixel-lettered logo, select-screen portraits.
import { readFileSync, writeFileSync } from 'node:fs';
import { Bitmap } from './lib/raster.mjs';
import { ASSETS, Sheet, writeImage } from './lib/sheet.mjs';

// ------------------------------------------------------------------ font
function font() {
  const G = JSON.parse(readFileSync(new URL('./font5x7.json', import.meta.url), 'utf8'));
  const chars = Object.keys(G).join('');
  const cols = 16, rows = Math.ceil(chars.length / cols), b = new Bitmap(cols * 6, rows * 8);
  [...chars].forEach((ch, i) => {
    const rowsStr = G[ch].split(' '), ox = (i % cols) * 6, oy = Math.floor(i / cols) * 8;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rowsStr[y]?.[x] === '#') b.plot(ox + x, oy + y, 'N11');
  });
  writeImage('ui/font5x7', b);
  writeFileSync(ASSETS + 'ui/font5x7.font.json', JSON.stringify({ chars, cols, cell: [6, 8], glyph: [5, 7], advance: 6, space: 4 }, null, 1));
  return { path: 'ui/font5x7', w: b.w, h: b.h };
}

// ------------------------------------------------------------------ HUD icons
function hud() {
  const s = new Sheet('ui/hud', { maxWidth: 256 });
  const diamond = (fill, hi, empty) => {
    const b = new Bitmap(9, 9);
    b.poly([[4.5, 0], [9, 4.5], [4.5, 9], [0, 4.5]], 'N0');
    if (empty) { b.poly([[4.5, 1.4], [7.6, 4.5], [4.5, 7.6], [1.4, 4.5]], 'N5'); b.poly([[4.5, 2.6], [6.4, 4.5], [4.5, 6.4], [2.6, 4.5]], 'N1'); }
    else { b.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 7.8], [1.2, 4.5]], fill); b.poly([[4.5, 1.2], [7.8, 4.5], [4.5, 4.5]], hi); }
    return b;
  };
  s.add('hp', [diamond('B4', 'B5'), diamond(null, null, true), diamond('R4', 'R5')], { duration: 1000 });
  const bell = (on) => {
    const b = new Bitmap(9, 10);
    b.poly([[4.5, 0.5], [8, 7], [1, 7]], 'N0'); b.rect(0, 7, 9, 2, 'N0'); b.rect(3, 9, 3, 1, 'N0');
    b.poly([[4.5, 1.8], [7, 7], [2, 7]], on ? 'Z3' : 'N4'); b.rect(1, 7, 7, 1, on ? 'Z5' : 'N5'); if (on) b.plot(3, 4, 'Z5');
    return b;
  };
  s.add('bomb', [bell(true), bell(false)], { duration: 1000 });
  const pip = (c) => { const b = new Bitmap(5, 8); b.rect(0, 0, 5, 8, 'N0'); b.rect(1, 1, 3, 6, c ? c + '2' : 'N3'); if (c) b.rect(1, 1, 3, 1, c + '3'); return b; };
  s.add('pip', [pip(null), pip('G'), pip('A'), pip('V')], { duration: 1000 });
  const icon = (id) => {
    const b = new Bitmap(16, 16);
    if (id === 'seraphine') { b.ellRing(7, 5, 5, 4.4, 1, 'G2'); b.ell(8, 9, 4.6, 4.6, 'N6'); b.ell(9, 9, 3, 3.4, 'B4'); b.plot(10, 9, 'N2'); b.rect(4, 13, 9, 3, 'B3'); }
    else if (id === 'noctis') { b.ell(8, 9, 5, 5, 'N4'); b.rect(9, 9, 4, 2, 'N3'); b.plot(11, 9, 'A4'); b.line(6, 5, 3, 1, 'N7'); b.line(8, 5, 7, 0, 'N7'); b.rect(3, 13, 10, 3, 'N7'); }
    else { b.ell(7, 8, 5, 5.4, 'N1'); b.rect(8, 7, 3, 4, 'B4'); b.plot(9, 11, 'V3'); b.poly([[2, 4], [12, 3], [7, 0]], 'N2'); b.rect(3, 13, 10, 3, 'N2'); b.plot(13, 12, 'V4'); }
    return b.selout();
  };
  for (const id of ['seraphine', 'noctis', 'morgana']) s.add('icon_' + id, [icon(id)], { duration: 1000 });
  s.add('cursor', [0, 1].map((f) => { const b = new Bitmap(7, 7); b.poly([[3.5, 0], [7, 3.5], [3.5, 7], [0, 3.5]], 'N0'); b.poly([[3.5, 1.2], [5.8, 3.5], [3.5, 5.8], [1.2, 3.5]], f ? 'U0' : 'U1'); return b; }), { duration: 400 });
  s.add('skull', [(() => { const b = new Bitmap(9, 9); b.ell(4.5, 4, 4, 4, 'N0'); b.ell(4.5, 4, 3, 3, 'B3'); b.rect(3, 6, 4, 2, 'B3'); b.plot(3, 4, 'R4'); b.plot(6, 4, 'R4'); b.plot(4, 7, 'N1'); return b; })()], { duration: 1000 });
  return s.write();
}

// ------------------------------------------------------------------ logo
/** Letters on a 14x20 design grid, rasterised at scale k. Thick stems, hairline bars, wedge serifs. */
function logo() {
  const k = 1.45, H = Math.round(20 * k);
  const L = {
    E: [11, (b, x, s) => { s.stem(x, 0, 20); s.bar(x, 0, 11, 2); s.bar(x, 9, 8, 1.5); s.bar(x, 18, 11.5, 2); s.serif(x + 10, 0, 4); s.serif(x + 10.5, 15.5, 4.5); }],
    C: [13, (b, x, s) => { s.arc(x + 7, 10, 6.5, 10, 30, 330, 3); s.serif(x + 11.5, 1.5, 4); s.serif(x + 11.5, 14.5, 4); }],
    L: [11, (b, x, s) => { s.stem(x, 0, 20); s.bar(x, 18, 11, 2); s.serif(x + 10, 15, 5); }],
    I: [5, (b, x, s) => { s.stem(x + 1, 0, 20); s.bar(x, 0, 5, 1.5); s.bar(x, 18.5, 5, 1.5); }],
    P: [12, (b, x, s) => { s.stem(x, 0, 20); s.bar(x, 0, 7, 2); s.bar(x, 10, 7, 1.5); s.arc(x + 6.5, 5.6, 5, 5.6, -90, 90, 2.8); s.bar(x - 1, 18.5, 5.5, 1.5); }],
    S: [11, (b, x, s) => { s.arc(x + 5.6, 5, 5, 5, 100, 330, 2.6); s.arc(x + 5.6, 15, 5, 5, -80, 150, 2.6); s.serif(x + 10, 1, 3.5); s.serif(x + 0.5, 15.5, 3.5); }],
    R: [13, (b, x, s) => { s.stem(x, 0, 20); s.bar(x, 0, 7, 2); s.bar(x, 10, 7, 1.5); s.arc(x + 6.5, 5.6, 5, 5.6, -90, 90, 2.8); s.diag(x + 5, 10, x + 12, 20, 2.8); s.bar(x - 1, 18.5, 5.5, 1.5); }],
    Q: [14, (b, x, s) => { s.arc(x + 7, 10, 6.6, 10, 0, 360, 3); s.diag(x + 8, 16, x + 14, 22, 2.2); }],
    U: [13, (b, x, s) => { s.stem(x, 0, 14); s.stem(x + 10, 0, 14, 1.6); s.arc(x + 6.3, 13, 6.3, 7, 0, 180, 2.8); s.bar(x - 1, 0, 6, 1.5); s.bar(x + 8.5, 0, 5, 1.5); }],
    M: [17, (b, x, s) => { s.stem(x, 0, 20, 1.6); s.stem(x + 14, 0, 20); s.diag(x + 1, 0, x + 8.5, 16, 2.8); s.diag(x + 16, 0, x + 8.5, 16, 1.5); s.bar(x - 1, 18.5, 4.5, 1.5); s.bar(x + 12.5, 18.5, 5.5, 1.5); }],
  };
  const words = ['ECLIPSE', 'REQUIEM'], gap = 3.2;
  const widthOf = (w) => [...w].reduce((a, ch) => a + L[ch][0] + gap, -gap) * k;
  const W = Math.ceil(Math.max(...words.map(widthOf))) + 8, HH = H * 2 + 18;
  const glyphs = new Bitmap(W, HH);
  const mk = (b, oy) => ({
    stem: (x, y0, y1, w = 3) => b.rect(Math.round(x * k), Math.round(oy + y0 * k), Math.max(1, Math.round(w * k)), Math.round((y1 - y0) * k), 'N11'),
    bar: (x, y, len, w) => b.rect(Math.round(x * k), Math.round(oy + y * k), Math.round(len * k), Math.max(1, Math.round(w * k * 0.75)), 'N11'),
    serif: (x, y, len) => b.rect(Math.round(x * k), Math.round(oy + y * k), Math.max(1, Math.round(1.6 * k)), Math.round(len * k), 'N11'),
    diag: (x0, y0, x1, y1, w) => b.bar(x0 * k, oy + y0 * k, x1 * k, oy + y1 * k, w * k, 'N11'),
    arc: (cx, cy, rx, ry, a0, a1, t) => {
      for (let a = a0; a <= a1; a += 1) {
        const r = a * Math.PI / 180, thick = t * (0.45 + 0.55 * Math.abs(Math.cos(r)));
        const px = cx + Math.cos(r) * rx, py = cy + Math.sin(r) * ry;
        b.ell(px * k, oy + py * k, Math.max(0.6, (thick * k) / 2), Math.max(0.6, (thick * k * 0.6) / 2), 'N11');
      }
    },
  });
  words.forEach((wd, li) => {
    const oy = 4 + li * (H + 14);
    let x = (W / k - widthOf(wd) / k) / 2;
    const s = mk(glyphs, oy);
    for (const ch of wd) { L[ch][1](glyphs, x, s); x += L[ch][0] + gap; }
  });
  // colour: bone with a lower shade band, outline + drop shadow
  const out = new Bitmap(W + 2, HH + 2);
  const shadow = glyphs.silhouette('N0');
  out.blit(shadow, 2, 2);
  const col = new Bitmap(W, HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) {
    if (!glyphs.alphaAt(x, y)) continue;
    const ly = (y - 4) % (H + 14);
    col.plot(x, y, ly > H * 0.62 ? 'B3' : ly < 2 ? 'B5' : 'B4');
  }
  col.outline('N0');
  out.blit(col, 0, 0);
  return { out };
}

// ------------------------------------------------------------------ select portraits (96x144 full body, pivot bottom centre)
function portrait(id) {
  const b = new Bitmap(96, 148);
  if (id === 'seraphine') {
    b.ellRing(46, 20, 13, 13, 2.2, 'N6'); b.ring(46, 20, 11, 13, 'G2', (dx, dy) => dx > 2 && dy < -2); b.plot(55, 10, 'G4');
    b.poly([[34, 32], [58, 32], [66, 132], [26, 132]], 'B3');
    b.poly([[34, 32], [42, 32], [36, 132], [26, 132]], 'B2');
    b.poly([[58, 32], [62, 33], [68, 130], [64, 132]], 'B4');
    b.poly([[31, 32], [61, 30], [64, 56], [30, 56]], 'N5'); b.poly([[46, 30], [61, 30], [64, 56], [52, 56]], 'N6'); b.line(61, 30, 64, 56, 'N8');
    b.ell(32, 36, 7, 6, 'N5'); b.ell(60, 35, 7, 6, 'N6'); b.ell(61, 33, 4, 2.4, 'N8');
    b.rect(38, 56, 22, 4, 'N4'); b.rect(47, 57, 3, 2, 'G2');
    for (let y = 70; y < 128; y += 20) { b.rect(45, y, 4, 10, 'G1'); b.rect(42, y + 3, 10, 3, 'G1'); }
    b.poly([[36, 10], [54, 8], [60, 20], [58, 34], [34, 34], [32, 20]], 'N6'); b.ell(47, 18, 10, 11, 'N7');
    b.poly([[40, 14], [54, 14], [55, 28], [41, 28]], 'B4'); b.rect(50, 19, 2, 2, 'N2'); b.rect(44, 19, 2, 2, 'N3'); b.line(46, 25, 50, 25, 'B2'); b.line(55, 14, 55, 27, 'B5');
    b.poly([[34, 30], [26, 38], [22, 118], [30, 120], [34, 44]], 'B1');
    b.rect(28, 132, 14, 12, 'N4'); b.rect(50, 132, 14, 12, 'N5'); b.rect(26, 142, 18, 4, 'N3'); b.rect(50, 142, 18, 4, 'N3');
    b.bar(72, 2, 72, 146, 3, 'N7'); b.rect(73, 2, 1, 144, 'N9');
    b.poly([[68, 3], [72, -10], [76, 3]], 'G3'); b.poly([[69, 4], [72, -2], [75, 4], [72, 12]], 'G2');
    b.poly([[58, 42], [66, 44], [72, 64], [68, 68], [60, 52]], 'N5'); b.ell(71, 67, 3.4, 3.4, 'B3');
    b.poly([[64, 62], [80, 62], [72, 78]], 'N6');
  } else if (id === 'noctis') {
    // folded moth wings hang like a cloak behind the body
    b.poly([[30, 30], [20, 60], [16, 112], [26, 104], [34, 60]], 'N5'); b.line(30, 30, 16, 112, 'N7'); b.ell(22, 82, 3, 4, 'A1'); b.plot(22, 82, 'A3');
    b.poly([[62, 30], [74, 60], [78, 116], [68, 106], [60, 60]], 'N6'); b.line(62, 30, 78, 116, 'N8'); b.ell(73, 86, 3, 4, 'A1'); b.plot(73, 86, 'A4');
    b.bar(30, 20, 66, 60, 3, 'T3'); b.stroke([[26, 16], [20, 10], [16, 14], [14, 22]], 4, 1, 'N8'); // scythe over the shoulder
    b.poly([[36, 34], [58, 34], [62, 100], [52, 136], [40, 136], [32, 100]], 'N4');
    b.poly([[36, 34], [44, 34], [40, 100], [38, 136], [32, 100]], 'N3'); b.line(58, 34, 62, 100, 'N6');
    b.rect(40, 70, 18, 3, 'N2'); b.rect(48, 70, 2, 3, 'A2');
    b.poly([[38, 32], [56, 32], [60, 44], [52, 50], [30, 104], [26, 100]], 'N7'); b.poly([[52, 50], [58, 48], [48, 110], [44, 108]], 'N8'); // scarf
    b.ell(47, 22, 10, 11, 'N4'); b.ell(49, 20, 6, 6, 'N6');
    b.rect(44, 22, 12, 9, 'N7'); b.rect(51, 19, 3, 2, 'A4'); b.rect(46, 19, 2, 2, 'N2');
    b.stroke([[42, 13], [36, 4], [30, 0]], 2, 1, 'N7'); b.stroke([[48, 12], [46, 2], [42, -2]], 2, 1, 'N7');
    b.rect(40, 136, 8, 10, 'N3'); b.rect(50, 136, 8, 10, 'N4');
    b.poly([[58, 56], [70, 64], [72, 70], [60, 64]], 'N5'); b.rect(70, 62, 8, 3, 'N6'); b.line(76, 56, 77, 72, 'N7'); b.plot(79, 63, 'A3');
  } else {
    // upright coffin behind, veil, long mourning dress, lantern staff lighting the face from below
    b.poly([[54, 10], [76, 4], [86, 20], [84, 140], [58, 140], [52, 22]], 'T3'); b.poly([[54, 10], [62, 8], [60, 140], [58, 140], [52, 22]], 'T2'); b.line(76, 4, 86, 20, 'T5');
    b.rect(54, 52, 30, 3, 'N6'); b.rect(54, 98, 30, 3, 'N6');
    b.poly([[30, 30], [58, 30], [66, 140], [20, 140]], 'N1'); b.poly([[30, 30], [38, 30], [30, 140], [20, 140]], 'N0'); b.line(58, 30, 66, 140, 'N3');
    b.poly([[34, 28], [56, 26], [52, 40], [38, 40]], 'N2');
    b.poly([[30, 10], [56, 6], [62, 30], [60, 70], [26, 72], [24, 30]], { c: 'N2', d: 12 }); // lace veil
    b.ell(44, 20, 9, 10, 'N1'); b.rect(42, 16, 10, 12, 'B4'); b.rect(48, 19, 2, 2, 'N2'); b.rect(43, 19, 2, 1, 'N2'); b.line(44, 27, 50, 27, 'V1'); b.rect(42, 26, 10, 2, 'V2');
    b.poly([[30, 6], [58, 4], [60, 10], [28, 12]], 'N1');
    b.line(28, 52, 18, 140, 'N6'); b.poly([[30, 48], [38, 48], [34, 60], [26, 58]], 'N2'); b.ell(28, 54, 3, 3, 'B3');
    b.line(18, 100, 14, 106, 'N6'); b.box(9, 106, 10, 14, 'N5'); b.rect(10, 108, 8, 10, 'V3'); b.rect(12, 110, 4, 6, 'V4');
    b.ell(14, 113, 14, 14, { c: 'V1', d: 3 });
  }
  b.rim('M0', 'rt', (x, y, p) => p[0] + p[1] + p[2] < 260);
  return b.selout();
}

export function buildUI() {
  const out = [font(), hud()];
  const { out: lg } = logo();
  out.push(writeImage('ui/logo', lg));
  const s = new Sheet('ui/portraits', { maxWidth: 512 });
  for (const id of ['seraphine', 'noctis', 'morgana']) s.add(id, [portrait(id)], { duration: 1000, pivot: [48, 147] });
  out.push(s.write());
  return out;
}
