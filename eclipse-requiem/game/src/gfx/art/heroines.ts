import { Ctx } from '../canvas';
import { blob, circ, curve, ell, feather, line, poly, sprite } from '../pix';

// The three exiles, flying to the right. One parametric drawing is used for the in-game sprite (s=1)
// and for the large key art (s>=4), which adds facial detail, strands and feather lines.

export type HeroId = 'seraphine' | 'noctis' | 'morgana';

const SKIN = ['#F2DCCB', '#D6B4A0', '#A9806E'];

export const HERO_PAL: Record<HeroId, string[]> = {
  seraphine: ['#F0EADC', '#C9C0AE', '#8E8676', '#5E584E', ...SKIN, '#1C1A22', '#2E2A36', '#DCD6CA', '#D8B35E', '#F3E6C4', '#9C7A34', '#B3263B', '#F4F0E8', '#BDB6A8', '#7E786C'],
  noctis: ['#2B2236', '#45375A', '#6E5A8F', '#16111D', ...SKIN, '#221A30', '#3A2B52', '#B3263B', '#C8D2EA', '#8E99B3', '#4A3A32', '#7B5CC7', '#120E18', '#2C2340', '#5A4A80', '#E05060'],
  morgana: ['#A8326E', '#D1508F', '#6E1F49', '#3E1029', ...SKIN, '#1A1420', '#3A2440', '#B3263B', '#2A1630', '#4A2350', '#6E1F49', '#5A3B2A', '#9D86E0', '#E8DDFF', '#7A5FC0', '#D8B35E'],
};

export const HERO_EYE: Record<HeroId, string> = { seraphine: '#D8B35E', noctis: '#E05060', morgana: '#B79CFF' };

/** Draws the heroine into a 40x30 unit box scaled by s. flap in [-1,1]. */
export function drawHeroine(g: Ctx, who: HeroId, s: number, flap: number, detail = s >= 3) {
  g.save();
  g.scale(s, s);
  g.translate(0, 4);
  if (who === 'seraphine') seraphine(g, flap, detail, s);
  else if (who === 'noctis') noctis(g, flap, detail, s);
  else morgana(g, flap, detail, s);
  g.restore();
}

function face(g: Ctx, eye: string, detail: boolean, hairFront: string, hairLight: string) {
  ell(g, 27.2, 9.3, 2.5, 2.9, 0.15, SKIN[0]);
  ell(g, 25.2, 10.2, 0.7, 1.9, 0.25, SKIN[1]);
  // bangs
  blob(g, [[23.4, 5.2], [27, 4.6], [30.2, 6.2], [30.6, 8], [29.2, 7.2], [28.4, 8.1], [27.1, 7.1], [25.6, 8.6], [24.2, 8.2]], hairFront);
  if (detail) {
    curve(g, [[24.2, 5.4], [26.5, 5], [29.6, 6.4]], 0.25, hairLight);
    ell(g, 28.5, 9.1, 0.55, 0.75, 0, eye);
    circ(g, 28.65, 8.85, 0.18, '#FFFFFF');
    line(g, 27.8, 8.15, 29.2, 8.05, 0.22, '#3E3640');
    line(g, 28.9, 11.2, 29.5, 11.1, 0.2, '#A9806E');
  } else {
    g.fillStyle = eye;
    g.fillRect(28.2, 8.6, 1, 1);
  }
}

function seraphine(g: Ctx, flap: number, d: boolean, s: number) {
  const [HL, HM, HD] = ['#F0EADC', '#C9C0AE', '#8E8676'];
  // wings
  const sx = 19, sy = 11;
  for (let i = 0; i < 6; i++) {
    const a = (-88 - i * 15 + flap * 9) * (Math.PI / 180);
    const len = 16.5 - i * 1.4;
    feather(g, sx, sy - 1, a, len, 2.1, i % 2 ? '#BDB6A8' : '#F4F0E8');
    if (d) feather(g, sx, sy - 1, a, len * 0.85, 0.5, '#7E786C');
  }
  feather(g, sx, sy, (-120 + flap * 9) * (Math.PI / 180), 8, 3.4, '#F4F0E8');
  // halo
  g.save();
  g.translate(25.5, 3.6);
  g.rotate(-0.25);
  g.beginPath();
  g.ellipse(0, 0, 3.8, 1, 0, 0, Math.PI * 2);
  g.lineWidth = d ? 0.45 : 0.8;
  g.strokeStyle = '#D8B35E';
  g.stroke();
  g.restore();
  // hair (long, streaming)
  blob(g, [[25, 4.4], [19, 4.2], [13, 5.4], [7, 7.2], [2.5, 9.5], [6.5, 9.6], [2, 12.4], [8.5, 11.8], [13, 12.6], [18.5, 12.2], [23.5, 11.4], [25.8, 8]], HM);
  blob(g, [[24, 5], [17, 5.2], [10, 7], [6, 9], [11, 8.9], [17, 8.6], [23, 7.4]], HL);
  if (d) {
    for (let i = 0; i < 6; i++) curve(g, [[24, 6 + i * 0.9], [16, 6.5 + i * 1.1], [5 + i, 9 + i * 0.6]], 0.22, i % 2 ? HD : '#F7F3EA');
  } else line(g, 22, 9.8, 9, 10.6, 0.9, HD);
  // legs
  line(g, 12.5, 19.2, 3.2, 21.6, 1.7, '#DCD6CA');
  line(g, 13.6, 20.2, 5.2, 23.6, 1.7, '#C9C0AE');
  line(g, 3.6, 21.5, 2.2, 21.9, 1.9, '#1C1A22');
  // skirt
  blob(g, [[18.5, 14.6], [20.4, 18.6], [14.5, 21.2], [7, 21.8], [9.5, 18.2], [13.5, 15.6]], '#1C1A22');
  curve(g, [[7, 21.6], [14.4, 21], [20.2, 18.5]], d ? 0.5 : 0.9, '#D8B35E');
  if (d) blob(g, [[16, 16.5], [18.8, 18.2], [14.2, 19.8], [10.5, 20.2]], '#2E2A36');
  // torso
  poly(g, [[22.2, 11.4], [25.2, 12.9], [22.2, 16.6], [17.6, 16.1], [16.9, 14]], '#1C1A22');
  poly(g, [[22.4, 11.6], [24.6, 12.9], [22.6, 14.2], [20.6, 12.6]], '#DCD6CA');
  line(g, 17.6, 15.6, 22.4, 16.2, d ? 0.5 : 0.8, '#D8B35E');
  // arm + lance
  line(g, 22.6, 13.1, 27.6, 14.1, 1.8, '#2E2A36');
  circ(g, 28.3, 14.1, 0.9, SKIN[0]);
  line(g, 13.5, 15.8, 38.2, 12.6, d ? 0.75 : 1.1, '#D8B35E');
  if (d) line(g, 13.5, 15.6, 38, 12.4, 0.25, '#F3E6C4');
  poly(g, [[38.6, 12.5], [35.8, 11.4], [36.2, 12.8], [35.8, 13.9]], '#F3E6C4');
  line(g, 30.8, 11.6, 31.4, 14.6, d ? 0.6 : 1, '#D8B35E');
  // head
  circ(g, 25.6, 8.3, 3.6, HM);
  face(g, '#D8B35E', d, HL, '#F7F3EA');
  if (d) {
    // ribbon and lace
    curve(g, [[23.2, 6.4], [22.2, 5.4], [21.4, 6.2]], 0.45, '#B3263B');
    curve(g, [[23.2, 6.4], [22.4, 7.4], [21.6, 7.6]], 0.45, '#B3263B');
    for (let i = 0; i < 6; i++) circ(g, 8.5 + i * 2, 21.4 - i * 0.18 - (i > 3 ? (i - 3) * 0.8 : 0), 0.35, '#F4F0E8');
  }
  void s;
}

function noctis(g: Ctx, flap: number, d: boolean, s: number) {
  const [HM, HL, HX] = ['#2B2236', '#45375A', '#6E5A8F'];
  // black wings, jagged
  const sx = 19, sy = 11;
  for (let i = 0; i < 7; i++) {
    const a = (-92 - i * 13 + flap * 11) * (Math.PI / 180);
    const len = 17 - Math.abs(i - 2) * 1.2;
    feather(g, sx, sy, a, len, 1.9, i % 2 ? '#2C2340' : '#120E18');
    if (d) feather(g, sx, sy, a, len * 0.85, 0.6, '#5A4A80');
  }
  // scythe (behind body)
  line(g, 14.5, 17.4, 33.5, 8.6, d ? 0.7 : 1.1, '#4A3A32');
  g.beginPath();
  g.moveTo(33.6, 8.4);
  g.quadraticCurveTo(31, 1.4, 22.5, 1.8);
  g.quadraticCurveTo(29.5, 3.6, 32.4, 9.4);
  g.closePath();
  g.fillStyle = '#C8D2EA';
  g.fill();
  curve(g, [[33.4, 8.2], [31, 2], [23, 2]], d ? 0.35 : 0.6, '#8E99B3');
  if (d) curve(g, [[32.6, 8.8], [30.4, 3.6], [24.2, 2.4]], 0.25, '#E05060');
  // short hair
  blob(g, [[25, 4.6], [20, 4.4], [15, 5.8], [10.5, 8.2], [15.5, 8.8], [12.5, 10.6], [18.5, 11], [24, 11.2], [26, 8]], HM);
  blob(g, [[24, 5.2], [18, 5.6], [13, 7.6], [19, 7.6], [23.6, 7.2]], HL);
  if (d) for (let i = 0; i < 4; i++) curve(g, [[24, 6 + i], [18, 6.6 + i], [12 + i, 8.6 + i * 0.5]], 0.22, HX);
  // legs (boots)
  line(g, 12.6, 18.6, 4, 20.4, 1.6, '#221A30');
  line(g, 13.6, 19.6, 6, 22.6, 1.6, '#3A2B52');
  line(g, 4.6, 20.3, 2.6, 20.8, 2, '#120E18');
  line(g, 6.6, 22.4, 4.6, 23.2, 2, '#120E18');
  // body suit
  blob(g, [[22.4, 11.2], [25, 12.8], [21.6, 16.4], [16.2, 18.6], [13, 18.2], [17, 14.6]], '#221A30');
  line(g, 16.6, 16.8, 22.6, 13.2, d ? 0.5 : 0.8, '#B3263B');
  if (d) blob(g, [[21.8, 12], [24.2, 12.9], [21.4, 14.6]], '#3A2B52');
  // arm forward (holding scythe shaft)
  line(g, 22.8, 13, 28.4, 12, 1.7, '#3A2B52');
  circ(g, 29, 11.9, 0.9, SKIN[0]);
  // scarf trailing
  curve(g, [[23.4, 11.4], [17, 10.6], [11, 13.6]], d ? 0.9 : 1.2, '#B3263B');
  // head
  circ(g, 25.6, 8.3, 3.5, HM);
  face(g, '#E05060', d, HL, HX);
  void s;
}

function morgana(g: Ctx, flap: number, d: boolean, s: number) {
  const [HM, HL, HD] = ['#A8326E', '#D1508F', '#6E1F49'];
  // cape
  const f = flap * 1.2;
  blob(g, [[21.5, 10.6], [16, 9.6], [9, 10.2 - f], [2, 12.6 - f], [6, 14.6], [1.6, 18.2 + f * 0.5], [9.5, 18.8], [17, 16.8]], '#2A1630');
  blob(g, [[20, 11.4], [14, 11], [8, 12.6 - f], [6, 15], [11, 16.6], [17, 15.2]], '#6E1F49');
  // long hair under the hat
  blob(g, [[24.4, 6.8], [18, 7], [11, 9.4 - f * 0.5], [5.6, 12.4], [10.6, 12.6], [7.6, 15], [15.6, 13.8], [22.2, 12.2], [25.6, 9]], HM);
  blob(g, [[23.6, 7.4], [17, 7.8], [11.6, 10], [17.6, 9.6], [23, 8.8]], HL);
  if (d) for (let i = 0; i < 5; i++) curve(g, [[24, 8 + i * 0.8], [16, 9 + i], [7 + i, 12.5 + i * 0.4]], 0.22, i % 2 ? HD : '#E07AAE');
  // legs
  line(g, 12.6, 18.6, 4.2, 20.8, 1.6, '#1A1420');
  line(g, 13.6, 19.6, 6.2, 22.8, 1.6, '#3A2440');
  // dress
  blob(g, [[22.2, 11.4], [25, 12.8], [21.6, 16.2], [19, 19], [12, 20.4], [10.6, 18.6], [16.4, 14.6]], '#3A2440');
  curve(g, [[11, 19.6], [16, 19.4], [19.2, 18.4]], d ? 0.5 : 0.8, '#B3263B');
  if (d) blob(g, [[21.4, 12.2], [23.8, 13], [21, 14.6], [19.6, 13.4]], '#4A2350');
  // staff + orb
  line(g, 15.2, 16.6, 36.4, 13.2, d ? 0.75 : 1.1, '#5A3B2A');
  curve(g, [[36.4, 13.2], [38.6, 11.4], [37.4, 9.6]], d ? 0.6 : 0.9, '#5A3B2A');
  circ(g, 37.9, 12.6, 1.9, '#7A5FC0');
  circ(g, 37.5, 12.2, 1.1, '#E8DDFF');
  // arm
  line(g, 22.8, 13, 28.6, 14.2, 1.7, '#2A1630');
  circ(g, 29.2, 14.2, 0.9, SKIN[0]);
  // head + face
  circ(g, 25.6, 8.4, 3.5, HM);
  face(g, '#B79CFF', d, HL, '#E07AAE');
  // witch hat, tip falling back
  ell(g, 25.6, 5.6, 6.2, 1.35, -0.12, '#1A1420');
  blob(g, [[21.8, 5.4], [28.2, 4.9], [24.6, 1.6], [19.4, -0.2], [14.6, 0.6], [19.6, 1.8]], '#3A2440');
  line(g, 22.2, 4.9, 27.8, 4.4, d ? 0.6 : 0.9, '#B3263B');
  if (d) {
    circ(g, 14.8, 0.7, 0.6, '#D8B35E');
    curve(g, [[20, 1.2], [23.6, 2.4], [26.8, 4.4]], 0.25, '#5A4A80');
  }
  void s;
}

/** In-game frames (3 flap poses) at 1 logical px per unit. */
export function heroFrames(who: HeroId) {
  return [-1, 0, 1].map((flap) => sprite(40, 34, (g) => drawHeroine(g, who, 1, flap), HERO_PAL[who]));
}

/** Sprite pixel that sits on the hitbox (torso centre) for the in-game frames. */
export const HERO_ANCHOR = { x: 21, y: 19.5 };

/** Key art for title / select: rotated before quantisation so the pixels stay crisp. */
export function heroKeyArt(who: HeroId, s: number, rot: number) {
  const w = Math.round(48 * s), h = Math.round(48 * s);
  return sprite(w, h, (g) => {
    g.translate(w / 2, h / 2);
    g.rotate(rot);
    g.translate(-20 * s, -19 * s);
    drawHeroine(g, who, s, 0, true);
  }, HERO_PAL[who]);
}

/** Large key-art version. */
export function heroPortrait(who: HeroId, s: number, flap = 0) {
  return sprite(40 * s, 34 * s, (g) => drawHeroine(g, who, s, flap, true), HERO_PAL[who]);
}
