// The Chiikawa pack: Chiikawa, Hachiware and Usagi, plus the guests who drop by
// (Momonga, Kurimanju, Rakko, Shisa, Yoroi-san and a chimera). Fan-drawn in code for personal,
// non-commercial use. Characters © nagano / chiikawa committee.
// Each one is a round, stubby 'blob' friend drawn with the same rig as the rest of the app.

import { registerBlob, ellipse, rrect, fillStroke, stroke, INK } from './draw.js';

const TAU = Math.PI * 2;

/** The soft rice-cake silhouette all of them share: round top, flat-ish bottom. */
function mochi(ctx, w, h, bottom = -3) {
  const top = bottom - h;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.bezierCurveTo(w * 0.56, top, w * 0.56, bottom - h * 0.12, w * 0.3, bottom);
  ctx.quadraticCurveTo(0, bottom + 2.2, -w * 0.3, bottom);
  ctx.bezierCurveTo(-w * 0.56, bottom - h * 0.12, -w * 0.56, top, 0, top);
  ctx.closePath();
}

function fluff(ctx, cx, cy, rx, ry, bumps, depth) {
  ctx.beginPath();
  const pt = (a, k) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  ctx.moveTo(...pt(0, 1));
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * TAU;
    const a1 = ((i + 1) / bumps) * TAU;
    ctx.quadraticCurveTo(...pt((a0 + a1) / 2, 1 + depth), ...pt(a1, 1));
  }
  ctx.closePath();
}

const common = { hip: [[-8, -10], [8, -10]], arm: 5.5, armW: 6.5, footR: 4.8, pawR: 3.8, mouth: 'w' };

// ------------------------------------------------------------------ the three

registerBlob(
  'chiikawa',
  { ...common, h: 44, top: -54, head: -47, hw: 23, face: [0, -24], sp: 7.4, faceScale: 1.22, sh: [[-19, -12], [19, -12]], desk: { s: 2.3, feet: 260 } },
  {
    color: '#ffffff',
    back(ctx) {
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 12.5, -45, 6.6, 6.4);
        fillStroke(ctx, '#ffffff', 2.4);
      }
    },
    shape: (ctx) => mochi(ctx, 46, 44),
  },
);

const HACHI = '#86a8cc';
registerBlob(
  'hachiware',
  { ...common, h: 44, top: -56, head: -47, hw: 23, face: [0, -23], sp: 7.4, faceScale: 1.2, sh: [[-19, -12], [19, -12]], desk: { s: 2.3, feet: 260 } },
  {
    color: '#ffffff',
    back(ctx) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 21, -36);
        ctx.quadraticCurveTo(s * 20, -50, s * 16.5, -56);
        ctx.quadraticCurveTo(s * 10, -50, s * 4, -45);
        ctx.closePath();
        fillStroke(ctx, HACHI, 2.4);
      }
    },
    shape: (ctx) => mochi(ctx, 47, 44),
    front(ctx) {
      // the "hachiware" cap, split in the middle of the forehead
      ctx.beginPath();
      ctx.moveTo(-30, -60);
      ctx.lineTo(30, -60);
      ctx.lineTo(30, -26);
      ctx.quadraticCurveTo(15, -35, 4.5, -32);
      ctx.quadraticCurveTo(0.5, -38, 0, -42.5);
      ctx.quadraticCurveTo(-0.5, -38, -4.5, -32);
      ctx.quadraticCurveTo(-15, -35, -30, -26);
      ctx.closePath();
      ctx.fillStyle = HACHI;
      ctx.fill();
    },
  },
);

registerBlob(
  'usagi',
  { ...common, h: 46, top: -78, head: -49, hw: 21, face: [0, -26], sp: 7, faceScale: 1.05, sh: [[-17, -13], [17, -13]], desk: { s: 2.2, feet: 262 } },
  {
    color: '#fae7b2',
    back(ctx) {
      ellipse(ctx, 18, -11, 5.2, 5);
      fillStroke(ctx, '#fae7b2', 2.2);
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 7.5, -60);
        ctx.rotate(s * 0.14);
        ellipse(ctx, 0, 0, 5.6, 16);
        fillStroke(ctx, '#fae7b2', 2.4);
        ctx.restore();
      }
    },
    shape: (ctx) => mochi(ctx, 42, 46),
  },
);

// ------------------------------------------------------------------ guests

registerBlob(
  'momonga',
  { ...common, h: 38, top: -46, head: -41, hw: 20, face: [0, -21], sp: 6.6, faceScale: 1.35, sh: [[-16, -11], [16, -11]], arm: 5, armW: 6, footR: 4.2 },
  {
    color: '#ffffff',
    back(ctx, st, t) {
      ctx.save();
      ctx.translate(-16, -22);
      ctx.rotate(-0.35 + Math.sin(t * 3) * 0.06);
      fluff(ctx, 0, -10, 12, 18, 11, 0.12);
      fillStroke(ctx, '#fbf6ec', 2.2);
      ctx.restore();
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 10.5, -39, 5, 5);
        fillStroke(ctx, '#ffffff', 2.2);
      }
    },
    shape: (ctx) => mochi(ctx, 40, 38),
    over(ctx) {
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 6.6 * 1.35 + 1.5, -21 + 1.5, 0.7, 0.7); // the second sparkle in each big eye
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    },
  },
);

registerBlob(
  'kurimanju',
  { ...common, h: 40, top: -50, head: -43, hw: 24, face: [0, -19], sp: 8, faceScale: 0.9, sh: [[-21, -11], [21, -11]] },
  {
    color: '#f3d4a1',
    shape: (ctx) => mochi(ctx, 48, 40),
    front(ctx) {
      ctx.beginPath();
      ctx.moveTo(-30, -60);
      ctx.lineTo(30, -60);
      ctx.lineTo(30, -29);
      for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(26 - i * 9 - 4.5, -26, 26 - (i + 1) * 9 + 0.01, -29.5);
      ctx.lineTo(-30, -29);
      ctx.closePath();
      ctx.fillStyle = '#a8693c';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-9, -38, 6, 3.6, 4.6);
      stroke(ctx, 2, 'rgba(255,255,255,0.35)');
    },
    over(ctx) {
      ctx.beginPath(); // the chestnut's little point
      ctx.moveTo(-3.5, -42.6);
      ctx.quadraticCurveTo(0, -50, 3.5, -42.6);
      fillStroke(ctx, '#8d5530', 2);
    },
  },
);

registerBlob(
  'rakko',
  { ...common, h: 58, top: -64, head: -61, hw: 28, face: [0, -35], sp: 9, faceScale: 0.95, sh: [[-24, -18], [24, -18]], arm: 7, armW: 8, footR: 5.6, pawR: 4.6 },
  {
    color: '#c7b09a',
    back(ctx) {
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 17, -57, 4.4, 4.2);
        fillStroke(ctx, '#c7b09a', 2.2);
      }
    },
    shape: (ctx) => mochi(ctx, 54, 58),
    front(ctx) {
      ellipse(ctx, 0, -27.5, 13.5, 9.5);
      ctx.fillStyle = '#f4e8d8';
      ctx.fill();
    },
    over(ctx) {
      ellipse(ctx, 0, -31, 2.4, 1.7);
      ctx.fillStyle = INK;
      ctx.fill();
      for (const s of [-1, 1]) {
        for (const dy of [-1.5, 1.5]) {
          ellipse(ctx, s * 7, -27 + dy, 0.6, 0.6);
          ctx.fill();
        }
      }
    },
  },
);

registerBlob(
  'shisa',
  { ...common, h: 44, top: -60, head: -47, hw: 27, face: [0, -23], sp: 7.6, faceScale: 1.1, brows: 'proud', sh: [[-18, -12], [18, -12]] },
  {
    color: '#f7cf78',
    back(ctx) {
      fluff(ctx, 0, -34, 27, 24, 14, 0.13);
      fillStroke(ctx, '#e8873a', 2.4);
    },
    shape: (ctx) => mochi(ctx, 44, 42),
    front(ctx) {
      ellipse(ctx, 0, -14, 9, 6); // lighter tummy
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    },
  },
);

registerBlob(
  'yoroi',
  { ...common, h: 72, top: -80, head: -75, hw: 19, face: [0, -60], sp: 7, sh: [[-16, -44], [16, -44]], arm: 11, armW: 7, footR: 5 },
  {
    color: '#dccb8f',
    armColor: '#cdbb7f',
    back(ctx, st, t) {
      ctx.beginPath(); // plume
      ctx.moveTo(0, -75);
      ctx.quadraticCurveTo(-8 + Math.sin(t * 3), -88, -14, -80);
      ctx.quadraticCurveTo(-8, -83, -2, -73);
      fillStroke(ctx, '#e0626a', 2);
    },
    shape: (ctx) => {
      ctx.beginPath();
      ctx.roundRect(-18, -75, 36, 72, [17, 17, 10, 10]);
    },
    front(ctx) {
      rrect(ctx, -14, -64, 28, 6, 3);
      ctx.fillStyle = '#4a3f2c';
      ctx.fill();
      ctx.fillRect(-1.4, -64, 2.8, 15);
      ctx.beginPath();
      ctx.moveTo(-18, -49);
      ctx.lineTo(18, -49);
      ctx.moveTo(-18, -22);
      ctx.lineTo(18, -22);
      stroke(ctx, 2, '#a8955a');
      ctx.beginPath();
      ctx.arc(0, -52, 12, 0.4, Math.PI - 0.4);
      stroke(ctx, 1.6, '#a8955a');
      ctx.beginPath();
      ctx.moveTo(-10, -72);
      ctx.quadraticCurveTo(-6, -74, -2, -73);
      stroke(ctx, 2, 'rgba(255,255,255,0.55)');
    },
    face() {}, // the visor is the face
  },
);

registerBlob(
  'chimera',
  { ...common, h: 46, top: -62, head: -49, hw: 27, face: [0, -27], sp: 9, sh: [[-24, -14], [24, -14]], arm: 6.5, armW: 8, footR: 5.4, pawR: 4.6 },
  {
    color: '#8c6bb8',
    back(ctx) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 7, -46);
        ctx.quadraticCurveTo(s * 15, -58, s * 12, -63);
        ctx.quadraticCurveTo(s * 18, -52, s * 17, -42);
        ctx.closePath();
        fillStroke(ctx, '#f2e6c9', 2.2);
      }
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(18 + i * 3, -40 + i * 9);
        ctx.lineTo(28 + i * 2, -40 + i * 9 + 2);
        ctx.lineTo(20 + i * 3, -33 + i * 9);
        ctx.closePath();
        fillStroke(ctx, '#6d4f95', 2);
      }
    },
    shape: (ctx) => mochi(ctx, 54, 46),
    face(ctx, { t, st }) {
      const hurt = st.expr && st.expr.eyes === 'dizzy';
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 9, -30, 4.6, 3.6);
        fillStroke(ctx, '#fff8e8', 1.6);
        if (hurt) {
          ctx.beginPath();
          ctx.moveTo(s * 9 - 2.4, -32.4);
          ctx.lineTo(s * 9 + 2.4, -27.6);
          ctx.moveTo(s * 9 + 2.4, -32.4);
          ctx.lineTo(s * 9 - 2.4, -27.6);
          stroke(ctx, 1.6);
        } else {
          ellipse(ctx, s * 9 + s * 0.6, -29.6, 1.7, 2.1);
          ctx.fillStyle = '#d33a4a';
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(s * 15, -37);
        ctx.lineTo(s * 4, -33.5);
        stroke(ctx, 2.4);
      }
      const open = 4 + Math.abs(Math.sin(t * 6)) * 2;
      ctx.beginPath();
      ctx.moveTo(-12, -20);
      ctx.quadraticCurveTo(0, -20 + open * 2.6, 12, -20);
      ctx.closePath();
      fillStroke(ctx, '#3a1f3f', 2);
      ctx.fillStyle = '#fff';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4.4 - 1.8, -20);
        ctx.lineTo(i * 4.4, -16.6);
        ctx.lineTo(i * 4.4 + 1.8, -20);
        ctx.fill();
      }
    },
  },
);

export const CHIIKAWA_FRIENDS = ['chiikawa', 'hachiware', 'usagi'];
export const CHIIKAWA_GUESTS = ['momonga', 'kurimanju', 'rakko', 'shisa', 'yoroi', 'chimera'];
