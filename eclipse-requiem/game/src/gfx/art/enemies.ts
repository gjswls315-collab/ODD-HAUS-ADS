import { Ctx } from '../canvas';
import { blob, circ, curve, ell, feather, line, poly, sprite } from '../pix';

// Stage 1 enemies (docs/05 §5). All face LEFT (toward the player). Every enemy has at least one glowing point (eyes / flame).

const BONE = ['#E4DCC8', '#B8AE98', '#857C6C'];

// ---------------- Wraith Bat 24x20 ----------------
const BAT_PAL = ['#1B1622', '#2C2436', '#4A4058', '#6A5F7A', '#59B7C9', '#BFF4FF', '#857C6C'];
export function batFrames() {
  return [-1, 0, 1, 0].map((f) =>
    sprite(24, 20, (g) => {
      const tipY = 3 + (f + 1) * 5; // wings up -> down
      for (const sgn of [-1, 1]) {
        const cx = 12;
        const pts = [[cx + sgn * 2, 9], [cx + sgn * 6, tipY - 1], [cx + sgn * 11.5, tipY], [cx + sgn * 10, tipY + 4], [cx + sgn * 8, 12.5], [cx + sgn * 6, 11.5], [cx + sgn * 4, 13.5], [cx + sgn * 2, 12]];
        poly(g, pts, '#2C2436');
        line(g, cx + sgn * 2, 10, cx + sgn * 11.3, tipY + 0.3, 0.8, '#6A5F7A');
        line(g, cx + sgn * 6, tipY - 0.5, cx + sgn * 6, 11.5, 0.6, '#4A4058');
      }
      ell(g, 12, 11.5, 3, 3.6, 0, '#1B1622');
      circ(g, 12, 8, 2.8, '#2C2436');
      poly(g, [[10, 6.4], [9.6, 3.6], [11.4, 5.6]], '#2C2436');
      poly(g, [[14, 6.4], [14.4, 3.6], [12.6, 5.6]], '#2C2436');
      line(g, 10.5, 12, 13.5, 12, 0.6, '#857C6C');
      line(g, 10.8, 13.4, 13.2, 13.4, 0.6, '#857C6C');
      g.fillStyle = '#BFF4FF';
      g.fillRect(10, 7, 1, 1);
      g.fillRect(13, 7, 1, 1);
    }, BAT_PAL),
  );
}

// ---------------- Candle Revenant 16x30 ----------------
const CANDLE_PAL = ['#8A8F99', '#C8D2EA', '#4E525C', '#D9D4C8', '#A9A296', '#2A2733', '#0B0B0F', '#7B5CC7', '#B79CFF', '#3A2B52'];
export function candleFrames() {
  return [0, 1, 2, 3].map((k) =>
    sprite(16, 30, (g) => {
      // dish + stem
      ell(g, 8, 27, 6, 1.7, 0, '#8A8F99');
      ell(g, 8, 26.5, 4.5, 0.9, 0, '#C8D2EA');
      poly(g, [[7, 19], [9, 19], [9.6, 26.5], [6.4, 26.5]], '#8A8F99');
      line(g, 7.6, 19.5, 7.4, 26, 0.6, '#C8D2EA');
      ell(g, 8, 18.6, 4.4, 1.3, 0, '#8A8F99');
      // wax with drips
      poly(g, [[5.2, 9.4], [10.8, 9], [10.8, 18.2], [5.2, 18.2]], '#D9D4C8');
      line(g, 5.6, 10, 5.6, 14.5 + (k % 2), 1, '#D9D4C8');
      line(g, 10.4, 10, 10.6, 12.5 + ((k + 1) % 3), 1, '#D9D4C8');
      line(g, 9.8, 11, 9.8, 17.6, 0.8, '#A9A296');
      // ghost face in the wax
      g.fillStyle = '#2A2733';
      g.fillRect(6, 12, 1.5, 2);
      g.fillRect(8.8, 12, 1.5, 2);
      ell(g, 8.2, 15.6, 0.9, 1.1, 0, '#2A2733');
      // black flame with violet rim
      const sway = [0, 0.8, 0, -0.8][k];
      const top = [0.4, 1.2, 0, 0.9][k];
      blob(g, [[8, 9.2], [10.6, 6.8], [9.6 + sway, 3 + top], [8 + sway * 1.5, top], [6.4 + sway, 3.4 + top], [5.6, 7]], '#7B5CC7');
      blob(g, [[8, 8.8], [9.6, 6.8], [8.6 + sway, 3.6 + top], [7.4 + sway, 4 + top], [6.6, 7]], '#0B0B0F');
      circ(g, 8, 7.8, 0.6, '#B79CFF');
    }, CANDLE_PAL),
  );
}

// ---------------- Bell Acolyte Skeleton 40x48 ----------------
const SKEL_PAL = [...BONE, '#2A2633', '#3D3747', '#55506A', '#1A1720', '#B08A3E', '#D8B35E', '#F3E6C4', '#5A4420', '#59B7C9', '#BFF4FF'];
export function skeletonFrames() {
  return [0, 1].map((ring) =>
    sprite(40, 48, (g) => {
      // tattered robe
      blob(g, [[14, 15], [26, 14], [31, 26], [33, 40], [29, 46], [25, 41], [22, 47], [18, 41], [13, 46], [10, 38], [11, 26]], '#2A2633');
      blob(g, [[17, 17], [25, 16], [28, 28], [26, 40], [21, 36], [16, 40], [14, 28]], '#3D3747');
      for (let i = 0; i < 4; i++) line(g, 17 + i * 2.6, 20, 15 + i * 3, 40, 0.6, '#1A1720');
      // rib cage glimpse
      for (let i = 0; i < 3; i++) curve(g, [[16, 19 + i * 2.2], [20, 18 + i * 2.2], [24, 19 + i * 2.2]], 0.9, BONE[1]);
      line(g, 20, 17, 20, 26, 1, BONE[2]);
      // hood rim + skull
      blob(g, [[11, 9], [17, 3], [24, 5], [25, 13], [20, 16], [13, 15]], '#1A1720');
      circ(g, 17, 10, 4.8, BONE[0]);
      ell(g, 15, 13.4, 2.8, 2, 0, BONE[1]);
      poly(g, [[13, 13], [17, 13], [16.5, 15.5], [13.5, 15.5]], BONE[1]);
      for (let i = 0; i < 4; i++) g.fillRect(13.3 + i, 14, 0.5, 1.2);
      circ(g, 14.6, 9.6, 1.5, '#1A1720');
      circ(g, 18.6, 9.4, 1.5, '#1A1720');
      g.fillStyle = '#BFF4FF';
      g.fillRect(14, 9, 1, 1);
      g.fillRect(18, 9, 1, 1);
      // arm + bell
      const by = ring ? 13 : 25;
      line(g, 17, 20, 10, ring ? 15 : 23, 1.3, BONE[1]);
      line(g, 10, ring ? 15 : 23, 7, by - 2, 1.1, BONE[0]);
      blob(g, [[7, by - 4], [10, by - 2], [11, by + 4], [3, by + 4], [4, by - 2]], '#B08A3E');
      blob(g, [[6.4, by - 3], [8, by - 2], [8, by + 2], [5, by + 2]], '#D8B35E');
      ell(g, 7, by + 4, 4.2, 1, 0, '#5A4420');
      circ(g, 7, by + 5, 0.9, '#B08A3E');
      // other arm
      line(g, 24, 20, 27, 28, 1.1, BONE[1]);
      line(g, 27, 28, 25, 33, 0.9, BONE[2]);
    }, SKEL_PAL),
  );
}

// ---------------- Scythe Cleric 40x48 ----------------
const CLERIC_PAL = ['#14101A', '#2A2236', '#3F3352', '#5A4A80', '#D9D4C8', '#A9A296', '#B3263B', '#E05060', '#C8D2EA', '#8E99B3', '#4A3A32'];
export function clericFrames() {
  return [0, 1].map((swing) =>
    sprite(40, 48, (g) => {
      // wing afterimage
      for (let i = 0; i < 5; i++) feather(g, 26, 16, (-40 - i * 18) * (Math.PI / 180), 15 - i, 2, i % 2 ? '#2A2236' : '#3F3352');
      // scythe
      const hx = swing ? 6 : 12, hy = swing ? 10 : 4;
      line(g, hx + 2, hy + 2, 28, 44, 1.2, '#4A3A32');
      g.beginPath();
      g.moveTo(hx + 2, hy + 2);
      g.quadraticCurveTo(hx + 12, hy - 4, hx + 22, hy + 6);
      g.quadraticCurveTo(hx + 12, hy - 0.5, hx + 1, hy + 5);
      g.closePath();
      g.fillStyle = '#C8D2EA';
      g.fill();
      curve(g, [[hx + 2, hy + 3.5], [hx + 12, hy - 1.5], [hx + 21, hy + 5.5]], 0.6, '#E05060');
      // robe with long tail to the right
      blob(g, [[14, 12], [22, 9], [28, 16], [30, 28], [38, 40], [32, 44], [26, 40], [20, 46], [14, 38], [12, 24]], '#14101A');
      blob(g, [[16, 16], [22, 13], [26, 22], [25, 34], [19, 36], [15, 26]], '#2A2236');
      line(g, 17, 22, 24, 22, 0.8, '#B3263B');
      // hood + mask
      blob(g, [[11, 9], [16, 3], [24, 4], [26, 11], [22, 16], [14, 16]], '#14101A');
      ell(g, 17, 10.5, 3.6, 4.2, 0.15, '#D9D4C8');
      ell(g, 18.4, 12, 1.6, 2.6, 0.2, '#A9A296');
      line(g, 14.6, 9.8, 16.6, 10.2, 0.9, '#E05060');
      line(g, 17.8, 10.2, 19.4, 9.8, 0.9, '#E05060');
      // hand on shaft
      circ(g, 16, 26, 1.4, '#D9D4C8');
    }, CLERIC_PAL),
  );
}

// ---------------- Grave Sentinel 72x80 ----------------
const SENT_PAL = ['#3A3742', '#5E5A66', '#8A8594', '#B9B3AA', '#2A2733', '#1A1820', '#5A1A26', '#8A2A36', '#D94C3A', '#FF8A6A', '#6E6A60', '#9A9484'];
export function sentinelFrames() {
  return ['walkA', 'walkB', 'guard', 'broken'].map((mode) =>
    sprite(72, 80, (g) => {
      const leg = mode === 'walkB' ? 3 : 0;
      // cape
      blob(g, [[34, 18], [52, 20], [62, 46], [58, 66], [50, 60], [44, 70], [38, 58]], '#5A1A26');
      blob(g, [[38, 22], [50, 24], [56, 44], [50, 56], [42, 50]], '#8A2A36');
      // legs
      poly(g, [[30, 54], [37, 54], [36 - leg, 74], [28 - leg, 74]], '#3A3742');
      poly(g, [[40, 54], [47, 54], [49 + leg, 74], [41 + leg, 74]], '#5E5A66');
      poly(g, [[26 - leg, 73], [37 - leg, 73], [37 - leg, 78], [24 - leg, 78]], '#2A2733');
      poly(g, [[40 + leg, 73], [51 + leg, 73], [52 + leg, 78], [40 + leg, 78]], '#2A2733');
      // torso armour
      blob(g, [[28, 22], [48, 20], [52, 38], [48, 56], [30, 56], [26, 38]], '#5E5A66');
      blob(g, [[31, 25], [44, 24], [46, 36], [42, 48], [32, 48], [30, 36]], '#8A8594');
      line(g, 38, 25, 38, 48, 1, '#3A3742');
      line(g, 31, 36, 45, 36, 1, '#3A3742');
      // pauldrons
      ell(g, 30, 24, 6, 4, -0.3, '#8A8594');
      ell(g, 48, 23, 6, 4, 0.3, '#5E5A66');
      // helm with iron mask
      blob(g, [[30, 6], [40, 3], [46, 9], [45, 19], [36, 21], [30, 16]], '#3A3742');
      blob(g, [[31, 9], [39, 7], [42, 12], [40, 17], [33, 17]], '#2A2733');
      line(g, 31.5, 12, 39, 12, 1.4, '#D94C3A');
      g.fillStyle = '#FF8A6A';
      g.fillRect(33, 11.5, 2, 1);
      line(g, 40, 3, 44, -1, 1.4, '#8A2A36');
      // mace arm (behind shield side, right)
      line(g, 48, 26, 56, 40, 3, '#5E5A66');
      line(g, 56, 40, 60, 30, 1.6, '#3A3742');
      circ(g, 60.5, 28.5, 3.4, '#3A3742');
      // shield (front, left) — the part that blocks normal shots
      const sx = mode === 'guard' ? 6 : 9, sy = mode === 'guard' ? 18 : 22;
      if (mode === 'broken') {
        poly(g, [[6, 34], [24, 30], [26, 58], [14, 70], [4, 60]], '#6E6A60');
        line(g, 12, 32, 20, 62, 1.2, '#1A1820');
        line(g, 6, 48, 25, 44, 1.2, '#1A1820');
      } else {
        poly(g, [[sx, sy], [sx + 20, sy - 2], [sx + 22, sy + 34], [sx + 11, sy + 50], [sx, sy + 34]], '#9A9484');
        poly(g, [[sx + 2, sy + 2], [sx + 18, sy], [sx + 19.5, sy + 33], [sx + 11, sy + 46], [sx + 2, sy + 33]], '#6E6A60');
        line(g, sx + 10.5, sy + 4, sx + 10.5, sy + 40, 3, '#B9B3AA');
        line(g, sx + 3.5, sy + 15, sx + 17.5, sy + 14, 3, '#B9B3AA');
        circ(g, sx + 10.5, sy + 14.5, 2.2, '#D94C3A');
      }
    }, SENT_PAL),
  );
}

// ---------------- Gravekeeper Graven (midboss) 128x112 ----------------
const GRAVEN_PAL = ['#1A1820', '#2A2733', '#3A3742', '#5E5A66', '#8A8594', '#3A2418', '#5A3A24', '#7A5234', '#8A8F99', '#C8D2EA', '#4E525C', ...BONE, '#59B7C9', '#BFF4FF', '#B3263B', '#5A1A26'];
export function gravenFrames() {
  return ['idle', 'lash', 'open'].map((mode) =>
    sprite(128, 112, (g) => drawGraven(g, mode), GRAVEN_PAL),
  );
}
function drawGraven(g: Ctx, mode: string) {
  // coffin on the back, tilted
  g.save();
  g.translate(84, 44);
  g.rotate(0.22);
  poly(g, [[-16, -38], [16, -38], [22, -14], [14, 40], [-14, 40], [-22, -14]], '#3A2418');
  poly(g, [[-13, -35], [13, -35], [18, -14], [11, 37], [-11, 37], [-18, -14]], mode === 'open' ? '#59B7C9' : '#5A3A24');
  if (mode === 'open') {
    poly(g, [[-8, -26], [8, -26], [10, -10], [6, 28], [-6, 28], [-10, -10]], '#BFF4FF');
    poly(g, [[14, -38], [40, -30], [44, -6], [34, 42], [16, 40]], '#5A3A24');
  }
  line(g, 0, -30, 0, 26, 3, '#7A5234');
  line(g, -10, -14, 10, -14, 3, '#7A5234');
  for (const yy of [-30, 4, 30]) line(g, -20, yy, 20, yy, 1.6, '#8A8F99');
  g.restore();
  // chains
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    ell(g, 62 + t * 40, 30 + Math.sin(t * 3) * 6 + t * 20, 2.2, 1.4, t, i % 2 ? '#8A8F99' : '#4E525C');
  }
  // legs
  poly(g, [[46, 78], [56, 78], [54, 104], [42, 104]], '#2A2733');
  poly(g, [[60, 78], [70, 78], [74, 104], [62, 104]], '#3A3742');
  poly(g, [[38, 102], [55, 102], [55, 108], [36, 108]], '#1A1820');
  poly(g, [[60, 102], [77, 102], [78, 108], [60, 108]], '#1A1820');
  // torso
  blob(g, [[40, 36], [70, 34], [76, 56], [72, 80], [44, 80], [38, 58]], '#3A3742');
  blob(g, [[44, 40], [66, 38], [70, 56], [64, 74], [48, 74], [44, 58]], '#5E5A66');
  for (let i = 0; i < 4; i++) curve(g, [[48, 48 + i * 6], [56, 45 + i * 6], [64, 48 + i * 6]], 1.2, BONE[1]);
  blob(g, [[40, 70], [76, 70], [80, 86], [70, 92], [60, 86], [50, 94], [38, 86]], '#5A1A26');
  // helm skull
  blob(g, [[40, 14], [54, 8], [66, 14], [66, 30], [56, 36], [42, 32]], '#2A2733');
  circ(g, 52, 22, 8.5, BONE[0]);
  poly(g, [[44, 25], [56, 25], [55, 33], [46, 33]], BONE[1]);
  for (let i = 0; i < 5; i++) g.fillRect(45.5 + i * 2, 28, 0.8, 2.4);
  circ(g, 48.5, 21, 2.6, '#1A1820');
  circ(g, 55.5, 21, 2.6, '#1A1820');
  g.fillStyle = '#BFF4FF';
  g.fillRect(48, 20, 1.5, 1.5);
  g.fillRect(55, 20, 1.5, 1.5);
  line(g, 44, 12, 38, 2, 2, '#3A3742');
  line(g, 62, 12, 68, 2, 2, '#3A3742');
  // arm with chain whip
  if (mode === 'lash') {
    line(g, 44, 42, 26, 46, 4, '#5E5A66');
    circ(g, 24, 46, 3, '#8A8594');
    for (let i = 0; i < 9; i++) ell(g, 20 - i * 2.4, 46 + Math.sin(i) * 2, 1.6, 1.1, 0, i % 2 ? '#C8D2EA' : '#8A8F99');
  } else {
    line(g, 44, 42, 34, 60, 4, '#5E5A66');
    circ(g, 33, 62, 3, '#8A8594');
    for (let i = 0; i < 7; i++) ell(g, 32 - i * 0.6, 66 + i * 2.6, 1.6, 1.1, 1.3, i % 2 ? '#C8D2EA' : '#8A8F99');
  }
}
