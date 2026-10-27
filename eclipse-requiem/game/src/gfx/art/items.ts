import { makeCanvas } from '../canvas';
import { circ, ell, line, poly, sprite } from '../pix';
import { worldPixelText } from '../pixelfont';

// Items (docs/05 §7), bullets (docs/05 §6) and player shots. Enemy bullets: white core + colour glow + 1px dark outline.
// Player shots: no outline, they are drawn with additive blending.

function letter(c: HTMLCanvasElement, ch: string, color: string, dy = 0) {
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  worldPixelText(g, ch, c.width / 2 + 0.5, (c.height - 7) / 2 + dy, color, 'center');
  return c;
}

export function itemFrames(kind: 'P' | 'H' | 'B' | 'S') {
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < 4; f++) {
    const squash = [1, 0.7, 0.35, 0.7][f];
    if (kind === 'P') {
      const c = sprite(12, 12, (g) => {
        ell(g, 6, 6, 6 * squash + 0.3, 6, 0, '#9C7A34');
        ell(g, 6, 6, 5 * squash + 0.2, 5, 0, '#D8B35E');
        if (f === 0) for (let i = 0; i < 4; i++) g.fillRect(5.5 + Math.cos(i * 1.57) * 4.5, 5.5 + Math.sin(i * 1.57) * 4.5, 1, 1);
      }, ['#9C7A34', '#D8B35E', '#F3E6C4']);
      frames.push(f === 0 || f === 1 ? letter(c, 'P', '#3A2A12') : c);
    } else if (kind === 'H') {
      const c = sprite(12, 12, (g) => {
        poly(g, [[6, 0 + (f % 2)], [10, 6], [9, 10], [3, 10], [2, 6]], '#2E9C78');
        poly(g, [[6, 2.5 + (f % 2)], [8.5, 6.5], [7.6, 9], [4.4, 9], [3.6, 6.5]], '#5FD1A8');
        circ(g, 6, 7.5, 1.6, '#D8FFF0');
      }, ['#2E9C78', '#5FD1A8', '#D8FFF0']);
      frames.push(c);
    } else if (kind === 'B') {
      const c = sprite(12, 12, (g) => {
        poly(g, [[6, 0], [6 + 5 * squash, 4], [6 + 3 * squash, 11], [6 - 3 * squash, 11], [6 - 5 * squash, 4]], '#8A2A36');
        poly(g, [[6, 1.5], [6 + 3.4 * squash, 4.4], [6 + 2 * squash, 9.6], [6 - 2 * squash, 9.6], [6 - 3.4 * squash, 4.4]], '#B3263B');
        line(g, 6, 2, 6 - 2 * squash, 6, 0.8, '#FF8A6A');
      }, ['#8A2A36', '#B3263B', '#FF8A6A', '#8A8F99']);
      frames.push(f === 0 ? letter(c, 'B', '#F3E6C4') : c);
    } else {
      const c = sprite(8, 8, (g) => {
        poly(g, [[4, 0], [4 + 3 * squash, 4], [4, 8], [4 - 3 * squash, 4]], '#7B5CC7');
        poly(g, [[4, 1.5], [4 + 1.6 * squash, 4], [4, 6.5], [4 - 1.6 * squash, 4]], '#C9C9D6');
      }, ['#7B5CC7', '#9D86E0', '#C9C9D6']);
      frames.push(c);
    }
  }
  return frames;
}

/** Round enemy bullet: outline, glow ring, core. */
function orb(d: number, glow: string, mid: string, core: string) {
  const [c, g] = makeCanvas(d, d);
  const r = d / 2;
  g.fillStyle = '#0B0B0F';
  g.beginPath(); g.arc(r, r, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = glow;
  g.beginPath(); g.arc(r, r, r - 1, 0, Math.PI * 2); g.fill();
  g.fillStyle = mid;
  g.beginPath(); g.arc(r, r, Math.max(1, r - 2.2), 0, Math.PI * 2); g.fill();
  g.fillStyle = core;
  g.beginPath(); g.arc(r - 0.3, r - 0.3, Math.max(0.8, r * 0.38), 0, Math.PI * 2); g.fill();
  return crispen(c);
}

/** Threshold alpha so a small canvas drawn with arcs looks hand-pixelled. */
function crispen(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
  g.putImageData(img, 0, 0);
  return c;
}

export function bulletSprites() {
  const out: Record<string, HTMLCanvasElement> = {};
  out.B01 = orb(8, '#E0384E', '#FF7A86', '#FFE3E3');
  out.B02 = orb(10, '#8E6BEA', '#B9A2FF', '#F0E6FF');
  out.B05 = orb(18, '#6A4CC7', '#9A7CF0', '#F0E6FF');
  out.B02r = orb(10, '#E0384E', '#FF7A86', '#FFE3E3');
  // needle (points right)
  {
    const [c, g] = makeCanvas(14, 5);
    g.fillStyle = '#0B0B0F'; g.fillRect(0, 1, 14, 3); g.fillRect(1, 0, 11, 5);
    g.fillStyle = '#E0384E'; g.fillRect(1, 1, 12, 3);
    g.fillStyle = '#FFE3E3'; g.fillRect(3, 2, 9, 1);
    out.B03 = c;
  }
  // spirit flame (points right)
  {
    const [c, g] = makeCanvas(14, 12);
    g.fillStyle = '#0B0B0F';
    g.beginPath(); g.moveTo(13.5, 6); g.quadraticCurveTo(7, -0.5, 0.5, 3); g.quadraticCurveTo(4, 6, 0.5, 9); g.quadraticCurveTo(7, 12.5, 13.5, 6); g.fill();
    g.fillStyle = '#59B7C9';
    g.beginPath(); g.moveTo(12.4, 6); g.quadraticCurveTo(7, 1, 2, 3.6); g.quadraticCurveTo(5, 6, 2, 8.4); g.quadraticCurveTo(7, 11, 12.4, 6); g.fill();
    g.fillStyle = '#E6FBFF';
    g.beginPath(); g.arc(9.6, 6, 2, 0, Math.PI * 2); g.fill();
    out.B04 = crispen(c);
  }
  // wave segment (flat ellipse, long axis vertical => travel to the left/right)
  {
    const [c, g] = makeCanvas(8, 16);
    g.fillStyle = '#0B0B0F'; g.beginPath(); g.ellipse(4, 8, 4, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#59B7C9'; g.beginPath(); g.ellipse(4, 8, 3, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8E6BEA'; g.beginPath(); g.ellipse(4, 8, 2.2, 5.8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#F0E6FF'; g.beginPath(); g.ellipse(4.2, 8, 1, 3.6, 0, 0, Math.PI * 2); g.fill();
    out.B06 = crispen(c);
  }
  // soul mote
  {
    const [c, g] = makeCanvas(4, 4);
    g.fillStyle = '#9D86E0'; g.fillRect(1, 0, 2, 4); g.fillRect(0, 1, 4, 2);
    g.fillStyle = '#F0E6FF'; g.fillRect(1, 1, 2, 2);
    out.mote = c;
  }
  return out;
}

export function shotSprites() {
  const out: Record<string, HTMLCanvasElement> = {};
  {
    const [c, g] = makeCanvas(14, 3);
    g.fillStyle = '#D8B35E'; g.fillRect(0, 1, 12, 1); g.fillRect(4, 0, 9, 3);
    g.fillStyle = '#FFF6DA'; g.fillRect(6, 1, 8, 1);
    out.seraphine = c;
  }
  {
    const [c, g] = makeCanvas(16, 2);
    g.fillStyle = '#7B5CC7'; g.fillRect(0, 0, 6, 2);
    g.fillStyle = '#C8D2EA'; g.fillRect(5, 0, 11, 2);
    g.fillStyle = '#FFFFFF'; g.fillRect(10, 0, 6, 1);
    out.noctis = c;
  }
  {
    const [c, g] = makeCanvas(9, 7);
    g.fillStyle = '#A8326E';
    g.beginPath(); g.moveTo(9, 3.5); g.quadraticCurveTo(4, -1, 0.5, 3.5); g.quadraticCurveTo(4, 8, 9, 3.5); g.fill();
    g.fillStyle = '#E89AC9'; g.beginPath(); g.arc(5.6, 3.5, 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFF0F8'; g.fillRect(5, 3, 2, 1);
    out.morgana = crispen(c);
  }
  return out;
}

/** Soft radial light used in the high-resolution glow pass. */
export function glowTexture(color: string, size = 128) {
  const [c, g] = makeCanvas(size, size);
  g.imageSmoothingEnabled = true;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, color);
  grd.addColorStop(0.25, color + 'AA');
  grd.addColorStop(0.6, color + '33');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}
