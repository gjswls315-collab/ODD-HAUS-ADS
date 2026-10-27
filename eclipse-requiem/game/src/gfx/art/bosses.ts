import { blob, circ, curve, ell, line, poly, sprite } from '../pix';

// Bellkeeper Abaddon (docs/05 §11): a priest-like undead carrying a huge cursed bell; soul lantern in the chest is the core.
// Drawn as separate layers so the bell can swing and the arms can animate.

const ROBE = ['#120E18', '#1C1724', '#2E2440', '#45375A', '#5A4A80'];
const BONE = ['#E4DCC8', '#B8AE98', '#857C6C', '#5A5246'];
const BRONZE = ['#3A2A12', '#6E5426', '#9C7A34', '#D8B35E', '#F3E6C4'];
const RED = ['#5A1A26', '#8A2A36', '#B3263B', '#D94C3A', '#FF8A6A'];
const SOUL = ['#1E5A66', '#59B7C9', '#BFF4FF', '#FFFFFF'];
const PAL = [...ROBE, ...BONE, ...BRONZE, ...RED, ...SOUL, '#0B0B0F'];

/** Body: 200x220, faces left. Core (soul lantern) at (96,118). */
export function abaddonBody() {
  return sprite(200, 220, (g) => {
    // robe mass, ragged hem
    blob(g, [[62, 74], [128, 64], [168, 96], [186, 150], [194, 204], [176, 194], [166, 214], [150, 198], [136, 218], [120, 200], [104, 216], [90, 198], [72, 214], [60, 196], [46, 206], [50, 150], [44, 110]], ROBE[1]);
    blob(g, [[74, 84], [124, 76], [156, 104], [168, 150], [170, 190], [150, 184], [130, 196], [110, 186], [88, 194], [66, 184], [64, 140], [60, 108]], ROBE[2]);
    for (let i = 0; i < 6; i++) curve(g, [[86 + i * 14, 100], [84 + i * 16, 150], [74 + i * 19, 196]], 1.2, ROBE[0]);
    curve(g, [[150, 92], [176, 140], [186, 196]], 1.4, ROBE[3]);
    // stole
    blob(g, [[78, 82], [92, 80], [86, 150], [92, 206], [78, 210], [72, 150]], RED[0]);
    curve(g, [[82, 84], [80, 150], [85, 204]], 1.2, RED[2]);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = BRONZE[3];
      g.fillRect(80, 110 + i * 22, 3, 6);
      g.fillRect(78.5, 112 + i * 22, 6, 2);
    }
    // chest cavity with ribs
    blob(g, [[88, 92], [120, 88], [130, 112], [122, 140], [92, 142], [84, 116]], '#0B0B0F');
    for (let i = 0; i < 5; i++) curve(g, [[88, 98 + i * 9], [106, 92 + i * 9], [126, 98 + i * 9]], 2.2, i % 2 ? BONE[1] : BONE[0]);
    line(g, 107, 88, 107, 144, 3, BONE[2]);
    // soul lantern (core)
    poly(g, [[90, 106], [102, 106], [104, 130], [88, 130]], BRONZE[1]);
    poly(g, [[92, 109], [100, 109], [101, 127], [91, 127]], SOUL[1]);
    ell(g, 96, 118, 3.2, 6, 0, SOUL[2]);
    ell(g, 96, 118, 1.4, 3, 0, SOUL[3]);
    for (const x of [91, 96, 101]) line(g, x, 106, x, 130, 0.9, BRONZE[2]);
    line(g, 96, 100, 96, 106, 1.2, BRONZE[2]);
    // neck vertebrae
    for (let i = 0; i < 4; i++) ell(g, 82 - i * 3, 82 - i * 5, 3.4, 2.2, -0.6, BONE[1]);
    // hood
    blob(g, [[38, 40], [60, 22], [88, 26], [100, 52], [96, 82], [78, 92], [52, 84], [38, 66]], ROBE[1]);
    blob(g, [[44, 46], [62, 32], [84, 34], [90, 56], [84, 78], [62, 82], [46, 70]], ROBE[0]);
    // skull, elongated, jaw open
    blob(g, [[50, 46], [62, 38], [76, 42], [80, 56], [74, 68], [58, 70], [50, 60]], BONE[0]);
    blob(g, [[54, 66], [70, 68], [72, 80], [60, 88], [52, 80]], BONE[1]);
    poly(g, [[56, 70], [70, 70], [69, 76], [57, 76]], '#0B0B0F');
    for (let i = 0; i < 6; i++) g.fillRect(56.5 + i * 2.2, 69.5, 1.1, 2.2);
    for (let i = 0; i < 5; i++) g.fillRect(57.5 + i * 2.2, 74, 1.1, 2);
    circ(g, 58, 54, 4.6, '#0B0B0F');
    circ(g, 70, 53, 4.2, '#0B0B0F');
    circ(g, 58, 54, 1.8, RED[3]);
    circ(g, 70, 53, 1.6, RED[3]);
    g.fillStyle = RED[4];
    g.fillRect(57, 53, 1.4, 1.4);
    g.fillRect(69, 52, 1.4, 1.4);
    poly(g, [[63, 58], [66, 58], [64.5, 63]], '#0B0B0F');
    curve(g, [[52, 46], [60, 40], [72, 42]], 1, BONE[3]);
    // crown of rusted iron spikes
    for (let i = 0; i < 5; i++) poly(g, [[48 + i * 8, 40 - (i === 2 ? 0 : 2)], [52 + i * 8, 26 - (i === 2 ? 8 : (i % 2) * 4)], [56 + i * 8, 40]], i % 2 ? BRONZE[1] : BRONZE[2]);
  }, PAL);
}

/** Bell carried over the shoulder, mouth facing the player (left). 180x150, mouth centre at BELL_MOUTH. */
export const BELL_MOUTH = { x: 51, y: 89 };
export function abaddonBell(cracks = 0) {
  return sprite(180, 150, (g) => {
    g.save();
    g.translate(100, 72);
    g.rotate(1.25);
    // bell body
    blob(g, [[-14, -58], [14, -58], [26, -40], [32, 0], [46, 40], [52, 52], [-52, 52], [-46, 40], [-32, 0], [-26, -40]], BRONZE[1]);
    blob(g, [[-8, -54], [10, -54], [20, -38], [24, 0], [36, 40], [-20, 44], [-24, 0], [-18, -38]], BRONZE[2]);
    curve(g, [[-6, -50], [-14, -6], [-30, 42]], 3, BRONZE[3]);
    curve(g, [[-5, -48], [-11, -10], [-24, 36]], 1.2, BRONZE[4]);
    // inscription bands
    line(g, -30, -2, 30, -2, 2.4, BRONZE[0]);
    line(g, -46, 38, 46, 38, 3, BRONZE[0]);
    for (let i = 0; i < 9; i++) g.fillRect(-26 + i * 6, -6, 2.4, 2.4);
    // crown/yoke
    poly(g, [[-18, -58], [18, -58], [12, -70], [-12, -70]], BRONZE[0]);
    ell(g, 0, -72, 10, 5, 0, BRONZE[1]);
    // mouth (dark)
    ell(g, 0, 52, 52, 10, 0, '#0B0B0F');
    ell(g, 0, 50, 46, 7, 0, SOUL[0]);
    // cracks
    if (cracks > 0) {
      g.lineWidth = 2;
      const cl = [[[6, -50], [0, -30], [10, -14], [4, 6]], [[-24, 0], [-12, 14], [-20, 28], [-8, 46]], [[26, 8], [18, 22], [30, 38], [22, 50]]];
      for (let i = 0; i < Math.min(3, cracks); i++) {
        const pts = cl[i];
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.strokeStyle = cracks >= 3 ? SOUL[2] : '#0B0B0F';
        g.stroke();
      }
    }
    g.restore();
  }, PAL);
}

/** Ghost faces inside the bell mouth: 0 = calm, 1 = screaming. 56x24 */
export function ghostFaces(scream: number) {
  return sprite(56, 24, (g) => {
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 13, y = 12 + (i % 2) * 2;
      ell(g, x, y, 5, 7, 0, i % 2 ? SOUL[1] : SOUL[2]);
      circ(g, x - 1.8, y - 2, 1.3, SOUL[0]);
      circ(g, x + 1.8, y - 2, 1.3, SOUL[0]);
      ell(g, x, y + 3, 1.4, scream ? 3 : 1, 0, SOUL[0]);
    }
  }, PAL, null);
}

/** Arm (front, toward player): 'down' | 'raise' | 'reach'. 150x150, shoulder at (110,30). */
export function abaddonArm(pose: 'down' | 'raise' | 'reach', back = false) {
  return sprite(150, 150, (g) => {
    const sh = [110, 30];
    const elbow = pose === 'raise' ? [78, 6] : pose === 'reach' ? [66, 44] : [84, 78];
    const hand = pose === 'raise' ? [40, 2] : pose === 'reach' ? [16, 56] : [52, 124];
    const robe = back ? ROBE[0] : ROBE[1];
    // sleeve
    line(g, sh[0], sh[1], elbow[0], elbow[1], 18, robe);
    curve(g, [[sh[0] + 6, sh[1] + 8], [elbow[0] + 10, elbow[1] + 14], [elbow[0] - 6, elbow[1] + 18]], 4, back ? ROBE[1] : ROBE[2]);
    // forearm bones
    line(g, elbow[0], elbow[1], hand[0], hand[1], 4, back ? BONE[2] : BONE[1]);
    line(g, elbow[0] + 2, elbow[1] + 2, hand[0] + 2, hand[1] + 1, 2, back ? BONE[3] : BONE[0]);
    // hooked hand
    const ang = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]);
    g.save();
    g.translate(hand[0], hand[1]);
    g.rotate(ang);
    circ(g, 0, 0, 4.5, back ? BONE[2] : BONE[1]);
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(2, i * 3);
      g.quadraticCurveTo(16, i * 6, 18, i * 4 + 8);
      g.quadraticCurveTo(14, i * 5 + 2, 2, i * 3 + 1.6);
      g.closePath();
      g.fillStyle = back ? '#4E525C' : '#8A8F99';
      g.fill();
    }
    g.restore();
  }, PAL);
}
