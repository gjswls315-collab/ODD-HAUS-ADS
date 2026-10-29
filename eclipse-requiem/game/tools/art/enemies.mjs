// Stage 1 enemies + midboss (placeholder art). All face left, back-lit (cold rim on the right/top edges),
// built from bone / ash / stone / bronze ramps; crimson only on eyes and weak points.
import { Bitmap } from './lib/raster.mjs';
import { Sheet } from './lib/sheet.mjs';

function finish(b, rim = 'M0') {
  b.rim(rim, 'rt', (x, y, p) => p[0] + p[1] + p[2] < 360);
  return b.selout();
}

function bat(f) {
  const b = new Bitmap(26, 18), up = [-5, -1, 4, -1][f];
  // wings (far, near)
  b.poly([[13, 8], [17, 3 + up * 0.6], [23, 2 + up], [25, 6 + up * 0.5], [21, 8], [18, 10]], 'N4');
  b.poly([[11, 8], [7, 3 + up], [2, 2 + up * 1.1], [0, 7 + up * 0.5], [4, 9], [8, 11]], 'N5');
  b.line(11, 8, 2, 2 + up * 1.1, 'N7'); b.line(7, 3 + up, 5, 9, 'N6'); b.line(13, 8, 23, 2 + up, 'N6');
  b.ell(12, 10, 3.6, 3, 'N3'); b.ell(10, 9, 2.4, 2.2, 'N4');
  b.poly([[9, 7], [9, 4], [11, 7]], 'N4'); b.poly([[12, 7], [13, 4], [14, 7]], 'N4');
  b.plot(9, 9, 'R4'); b.plot(11, 9, 'R4'); b.plot(10, 11, 'B4');
  return finish(b);
}

function candle(f, tele) {
  const b = new Bitmap(18, 32);
  const fl = tele ? 1.6 : 1, sw = [0, 1, 0, -1][f % 4];
  // cold flame
  b.ell(9 + sw * 0.5, 6, 2.6 * fl, 4.2 * fl, 'M0'); b.ell(9 + sw * 0.5, 7, 1.6 * fl, 2.6 * fl, 'M1'); b.plot(9 + sw, 3 - (tele ? 3 : 0), 'M1');
  b.ell(9, 8, 1, 1.5, 'M2');
  // wax body with drips and carved face
  b.rect(5, 11, 8, 15, 'B3'); b.rect(5, 11, 2, 15, 'B2'); b.rect(11, 12, 1, 6, 'B4');
  b.rect(7, 10, 1, 3, 'B4'); b.rect(12, 11, 1, 7, 'B4'); b.rect(6, 14, 1, 5, 'B4');
  b.ell(9, 11, 4, 1.4, 'B4');
  b.rect(6, 16, 2, 2, 'N1'); b.rect(10, 16, 2, 2, 'N1'); b.plot(7, 16, tele ? 'R6' : 'R4'); b.plot(11, 16, tele ? 'R6' : 'R4');
  b.rect(7, 20, 4, 1, 'N2');
  // bronze holder
  b.rect(3, 26, 12, 3, 'Z2'); b.rect(3, 26, 12, 1, 'Z4'); b.rect(7, 29, 4, 2, 'Z1'); b.ell(9, 31, 4, 1, 'Z2');
  return finish(b);
}

function skeleton(f, tele) {
  const b = new Bitmap(36, 48);
  const sway = f ? 1 : 0;
  // robe
  b.poly([[13, 14], [24, 13], [29, 44], [25, 46], [19, 44], [13, 46], [7, 44]], 'N4');
  b.poly([[13, 14], [17, 14], [14, 44], [13, 46], [7, 44]], 'N3');
  b.line(24, 13, 29, 44, 'N6');
  b.rect(12, 30, 16, 2, 'N2'); b.plot(16, 31, 'Z3');
  // hood + skull
  b.ell(19, 10, 6.5, 6.5, 'N4'); b.ell(20, 9, 4, 4, 'N5');
  b.ell(15, 11, 3.8, 4, 'B3'); b.rect(12, 13, 4, 3, 'B3'); b.ell(14, 10, 1.2, 1.4, 'N0'); b.plot(14, 10, tele ? 'R6' : 'R4');
  for (let x = 12; x < 16; x += 2) b.plot(x, 15, 'N1');
  // arm + hand bell
  const by = tele ? -10 : 0, bx = tele ? 2 : 0;
  b.bar(14, 19, 7 + bx, 25 + by, 2, 'B2'); b.ell(6 + bx, 25 + by, 1.6, 1.6, 'B3');
  b.poly([[2 + bx + sway, 26 + by], [8 + bx + sway, 26 + by], [9 + bx + sway, 33 + by], [1 + bx + sway, 33 + by]], 'Z3');
  b.line(3 + bx + sway, 26 + by, 1 + bx + sway, 33 + by, 'Z2'); b.rect(1 + bx + sway, 33 + by, 9, 1, 'Z4'); b.plot(5 + bx + sway, 35 + by, 'Z2');
  return finish(b);
}

function cleric(f, tele) {
  const b = new Bitmap(46, 54), w = f ? 1.5 : -1;
  // tattered robe floating
  b.poly([[17, 15], [30, 14], [36, 36], [38, 48 + w], [33, 45], [29, 50 - w], [25, 45], [20, 50 + w], [16, 45], [11, 48 - w], [12, 34]], 'N4');
  b.poly([[17, 15], [22, 15], [17, 34], [16, 45], [11, 48 - w], [12, 34]], 'N3');
  b.line(30, 14, 36, 36, 'N6'); b.line(36, 36, 38, 48 + w, 'N6');
  b.rect(16, 27, 18, 2, 'N2');
  // hood and bone mask
  b.ell(24, 10, 7, 7.5, 'N4'); b.ell(25, 9, 4.6, 4.6, 'N5');
  b.poly([[16, 8], [23, 7], [23, 16], [18, 17]], 'B3'); b.line(17, 12, 22, 12, 'B2');
  b.plot(18, 10, tele ? 'R6' : 'R4'); b.plot(21, 10, tele ? 'R6' : 'R4');
  // scythe
  const raise = tele ? 1 : 0;
  const hx = 13, hy = 24 - raise * 6;
  b.bar(hx + 8, hy + 18 - raise * 8, hx - 2, hy - 14 - raise * 4, 2, 'T3');
  const tx = hx - 2, ty = hy - 14 - raise * 4;
  b.stroke([[tx, ty], [tx - 6, ty + 2], [tx - 11, ty + 7], [tx - 13, ty + 13]], 3, 1, 'N8');
  b.line(tx, ty - 1, tx - 11, ty + 6, 'N10');
  b.ell(hx + 1, hy, 1.8, 1.8, 'B2');
  return finish(b);
}

function sentinel(f, state) {
  const b = new Bitmap(74, 82), br = f ? 1 : 0;
  // legs
  b.rect(30, 58, 8, 20, 'N4'); b.rect(42, 58, 8, 20, 'N3'); b.rect(28, 76, 12, 4, 'N3'); b.rect(41, 76, 12, 4, 'N2');
  // body armour
  b.poly([[28, 26 - br], [52, 26 - br], [55, 60], [26, 60]], 'N5');
  b.poly([[28, 26 - br], [36, 26 - br], [32, 60], [26, 60]], 'N4');
  b.line(52, 26 - br, 55, 60, 'N7'); b.rect(27, 44, 28, 2, 'N3'); b.plot(40, 45, 'Z4');
  b.ell(50, 28 - br, 7, 5, 'N6'); b.ell(51, 27 - br, 4, 2.4, 'N8');
  // helmet with crimson slit
  b.ell(40, 18 - br, 9, 10, 'N5'); b.rect(31, 18 - br, 18, 10, 'N5'); b.ell(42, 15 - br, 5, 5, 'N7');
  b.rect(31, 18 - br, 11, 2, 'N0'); b.rect(32, 18 - br, 7, 1, state === 'tele' ? 'R6' : 'R4');
  b.poly([[40, 8 - br], [44, 0], [46, 9 - br]], 'N6');
  // tower shield in front (left)
  const sy = state === 'tele' ? -8 : 0, broken = state === 'break';
  b.rect(8, 22 + sy, 22, 52, 'N6'); b.rect(10, 24 + sy, 18, 48, 'N5');
  b.rect(8, 22 + sy, 22, 2, 'N8'); b.rect(28, 22 + sy, 2, 52, 'N7');
  b.rect(17, 30 + sy, 4, 34, 'T4'); b.rect(12, 40 + sy, 14, 4, 'T4');
  if (broken) { b.line(12, 26 + sy, 20, 46 + sy, 'N0'); b.line(20, 46 + sy, 14, 70 + sy, 'N0'); b.poly([[8, 60 + sy], [14, 70 + sy], [8, 74 + sy]], null); }
  // spear
  b.bar(52, 66, 60, 2, 2, 'T3'); b.poly([[58, 6], [61, -2], [64, 7]], 'N8');
  return finish(b);
}

function graven(f, pose) {
  const b = new Bitmap(124, 124), br = f ? 1 : 0;
  // coffin on his back (right)
  const open = pose === 'open';
  b.poly([[66, 20], [104, 28], [108, 76], [70, 84], [62, 52]], 'T3');
  b.poly([[66, 20], [104, 28], [106, 34], [68, 26]], 'T4'); b.line(104, 28, 108, 76, 'T5');
  b.rect(70, 44, 36, 3, 'N6'); b.rect(72, 64, 34, 3, 'N6');
  if (open) { b.poly([[70, 30], [102, 36], [104, 70], [72, 78]], 'N0'); b.poly([[74, 36], [98, 41], [100, 66], [76, 72]], { c: 'M0', d: 6 }); b.poly([[104, 24], [118, 10], [122, 50], [108, 70]], 'T3'); b.line(118, 10, 122, 50, 'T5'); }
  // straps
  b.line(58, 40, 70, 30, 'N2'); b.line(58, 60, 72, 70, 'N2');
  // body: hunched long coat
  b.poly([[36, 34 - br], [64, 30 - br], [72, 70], [70, 104], [60, 110], [48, 104], [36, 110], [30, 90]], 'N4');
  b.poly([[36, 34 - br], [46, 32 - br], [40, 70], [36, 110], [30, 90]], 'N3');
  b.line(64, 30 - br, 72, 70, 'N6');
  b.rect(36, 66, 34, 3, 'T2'); b.plot(52, 67, 'Z4');
  // head: hood + skull with lantern-lit eyes
  b.ell(46, 24 - br, 11, 11, 'N4'); b.ell(48, 22 - br, 7, 7, 'N5');
  b.ell(40, 28 - br, 7, 7.5, 'B2'); b.ell(41, 26 - br, 5, 5, 'B3');
  b.ell(37, 27 - br, 1.6, 1.8, 'N0'); b.ell(43, 27 - br, 1.6, 1.8, 'N0'); b.plot(37, 27 - br, 'R4'); b.plot(43, 27 - br, 'R4');
  b.rect(36, 33 - br, 9, 2, 'B4'); for (let x = 37; x < 45; x += 2) b.plot(x, 34 - br, 'N1');
  // arm and chain
  if (pose === 'lash') {
    b.bar(40, 44, 18, 50, 4, 'N4'); b.ell(16, 50, 3, 3, 'B3');
    for (let k = 0; k < 9; k++) b.ellRing(12 - k * 4, 51 + (k % 2), 2, 1.5, 1, 'N7');
    b.poly([[-2, 48], [3, 50], [-1, 56]], 'N8');
  } else {
    b.bar(40, 44, 30, 66, 4, 'N4'); b.ell(30, 68, 3, 3, 'B3');
    for (let k = 0; k < 7; k++) b.ellRing(28 - k * 1.2, 74 + k * 4, 1.5, 2, 1, 'N7');
    b.poly([[20, 100], [24, 104], [21, 108], [18, 104]], 'N8');
  }
  return finish(b);
}

export function buildEnemies() {
  const s = new Sheet('sprites/enemies', { maxWidth: 512 });
  s.add('bat', [0, 1, 2, 3].map(bat), { duration: 100, pivot: [12, 9] });
  s.add('candle', [0, 1, 2, 3].map((f) => candle(f, false)), { duration: 125, pivot: [9, 18] });
  s.add('candle_tele', [0, 1].map((f) => candle(f, true)), { duration: 80, pivot: [9, 18] });
  s.add('skeleton', [0, 1].map((f) => skeleton(f, false)), { duration: 400, pivot: [18, 24] });
  s.add('skeleton_tele', [0, 1].map((f) => skeleton(f, true)), { duration: 100, pivot: [18, 24] });
  s.add('cleric', [0, 1].map((f) => cleric(f, false)), { duration: 300, pivot: [24, 28] });
  s.add('cleric_tele', [0, 1].map((f) => cleric(f, true)), { duration: 100, pivot: [24, 28] });
  s.add('sentinel', [0, 1].map((f) => sentinel(f, 'idle')), { duration: 500, pivot: [38, 40] });
  s.add('sentinel_tele', [sentinel(0, 'tele')], { duration: 500, pivot: [38, 40] });
  s.add('sentinel_break', [sentinel(0, 'break')], { duration: 500, pivot: [38, 40] });
  s.add('graven', [0, 1].map((f) => graven(f, 'idle')), { duration: 500, pivot: [58, 62] });
  s.add('graven_lash', [graven(0, 'lash')], { duration: 500, pivot: [58, 62] });
  s.add('graven_open', [graven(0, 'open')], { duration: 500, pivot: [58, 62] });
  return [{ sheet: s, info: s.write() }];
}
