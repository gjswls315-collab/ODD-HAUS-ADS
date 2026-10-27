import { H, W } from '../../core/constants';
import { Rng } from '../../core/math';
import { Ctx, makeCanvas } from '../canvas';

// Stage 1 parallax layers (docs/05 §2-§3), generated procedurally at 640x360 logical pixels.

export type Section = 'A' | 'B' | 'C' | 'R' | 'D';

export interface Light {
  x: number;
  y: number;
  color: 'orange' | 'violet' | 'red' | 'cyan';
  r: number;
}

const SKY_TOP = '#0C0E15', SKY_MID = '#171C26', SKY_LOW = '#241B31';

export function makeSky(seed = 3) {
  const [c, g] = makeCanvas(W, H);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, SKY_TOP);
  grd.addColorStop(0.55, SKY_MID);
  grd.addColorStop(1, SKY_LOW);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  // ordered dither bands so the gradient reads as pixel art
  const rng = new Rng(seed);
  for (let i = 0; i < 260; i++) {
    const x = rng.int(0, W - 1), y = rng.int(0, 200);
    g.fillStyle = rng.next() < 0.15 ? '#8C8FA6' : '#4A4C62';
    g.fillRect(x, y, 1, 1);
  }
  return c;
}

/** Blood eclipse: dark disk, red corona ring. */
export function makeMoon(r: number, seed = 7) {
  const size = r * 2 + 12;
  const [c, g] = makeCanvas(size, size);
  const cx = size / 2, cy = size / 2;
  const rng = new Rng(seed);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const i = (y * size + x) * 4;
      let col: number[] | null = null;
      if (d < r - 1) {
        const shade = d < r * 0.8 ? [18, 8, 14] : [32, 10, 18];
        col = shade;
        if (rng.next() < 0.02) col = [44, 14, 22];
      } else if (d < r + 0.6) col = [217, 76, 58];
      else if (d < r + 1.8) col = rng.next() < 0.75 ? [179, 38, 59] : [217, 76, 58];
      else if (d < r + 4.5) col = rng.next() < (r + 4.5 - d) / 4 ? [120, 24, 40] : null;
      if (col) {
        img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
      }
    }
  g.putImageData(img, 0, 0);
  return c;
}

export function makeClouds(seed = 11) {
  const w = 1280, h = 120;
  const [c, g] = makeCanvas(w, h);
  const rng = new Rng(seed);
  for (let i = 0; i < 46; i++) {
    const x = rng.range(0, w), y = rng.range(10, 100), rx = rng.range(40, 120), ry = rng.range(6, 16);
    const col = rng.next() < 0.5 ? '#1D1A28' : '#221C2E';
    for (const ox of [0, -w, w]) {
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x + ox, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2E2338';
      g.fillRect(Math.round(x + ox - rx * 0.6), Math.round(y - ry + 1), Math.round(rx * 1.2), 1);
    }
  }
  crispAlpha(c);
  return c;
}

function crispAlpha(c: HTMLCanvasElement) {
  const g = c.getContext('2d')!;
  const img = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 90 ? 255 : 0;
  g.putImageData(img, 0, 0);
}

function wrapDraw(w: number, draw: (ox: number) => void) {
  for (const ox of [-w, 0, w]) draw(ox);
}

function gothicWindow(g: Ctx, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + w / 2);
  g.quadraticCurveTo(x + w / 2, y - w * 0.3, x + w, y + w / 2);
  g.lineTo(x + w, y + h);
  g.closePath();
  g.fill();
}

/** Far cathedral skyline, 1280x200 loop. */
export function makeFar(seed = 21) {
  const w = 1280, h = 200;
  const [c, g] = makeCanvas(w, h);
  const rng = new Rng(seed);
  const body = '#1B1E2B', rim = '#2C2F42', win = '#5A2430', winHot = '#9A3A3A';
  let x = 0;
  while (x < w) {
    const bw = rng.range(40, 110);
    const bh = rng.range(50, 110);
    const kind = rng.next();
    wrapDraw(w, (ox) => {
      g.fillStyle = body;
      g.fillRect(x + ox, h - bh, bw, bh);
      // gable roof
      g.beginPath();
      g.moveTo(x + ox - 2, h - bh);
      g.lineTo(x + ox + bw / 2, h - bh - bw * 0.35);
      g.lineTo(x + ox + bw + 2, h - bh);
      g.fill();
      if (kind < 0.55) {
        // spire tower
        const tw = rng.range(10, 18), th = rng.range(40, 80);
        const tx = x + ox + rng.range(4, bw - tw - 4);
        g.fillRect(tx, h - bh - th, tw, th);
        g.beginPath();
        g.moveTo(tx - 1, h - bh - th);
        g.lineTo(tx + tw / 2, h - bh - th - tw * 2.6);
        g.lineTo(tx + tw + 1, h - bh - th);
        g.fill();
        g.fillStyle = rim;
        g.fillRect(tx, h - bh - th, 1, th);
        gothicWindow(g, tx + tw / 2 - 2, h - bh - th + 8, 4, 8, rng.next() < 0.4 ? winHot : win);
      }
      // rose window
      if (bw > 60 && rng.next() < 0.6) {
        g.fillStyle = win;
        g.beginPath();
        g.arc(x + ox + bw / 2, h - bh + 18, 7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = body;
        g.fillRect(x + ox + bw / 2 - 0.5, h - bh + 11, 1, 14);
        g.fillRect(x + ox + bw / 2 - 7, h - bh + 17.5, 14, 1);
      }
      for (let i = 0; i < Math.floor(bw / 14); i++) {
        if (rng.next() < 0.5) gothicWindow(g, x + ox + 6 + i * 14, h - bh + 36, 5, 12, rng.next() < 0.2 ? winHot : win);
      }
      g.fillStyle = rim;
      g.fillRect(x + ox, h - bh, bw, 1);
    });
    x += bw + rng.range(-10, 20);
  }
  crispAlpha(c);
  return c;
}

/** Mid layer: bell towers, broken arches, chains. 1600x260 loop. */
export function makeMid(seed = 31) {
  const w = 1600, h = 260;
  const [c, g] = makeCanvas(w, h);
  const rng = new Rng(seed);
  const body = '#121319', rim = '#262838', hole = '#0A0A0E';
  let x = 20;
  while (x < w - 40) {
    const kind = rng.next();
    if (kind < 0.45) {
      // bell tower
      const tw = rng.range(28, 44), th = rng.range(150, 230);
      wrapDraw(w, (ox) => {
        const tx = x + ox;
        g.fillStyle = body;
        g.fillRect(tx, h - th, tw, th);
        g.beginPath();
        g.moveTo(tx - 3, h - th);
        g.lineTo(tx + tw / 2, h - th - tw * 1.4);
        g.lineTo(tx + tw + 3, h - th);
        g.fill();
        g.fillRect(tx - 3, h - th, tw + 6, 3);
        // belfry opening with a hanging bell
        gothicWindow(g, tx + tw / 2 - 7, h - th + 10, 14, 26, hole);
        g.fillStyle = '#3A2E1C';
        g.beginPath();
        g.moveTo(tx + tw / 2 - 4, h - th + 30);
        g.quadraticCurveTo(tx + tw / 2, h - th + 18, tx + tw / 2 + 4, h - th + 30);
        g.fill();
        g.fillStyle = rim;
        g.fillRect(tx, h - th, 1, th);
        for (let i = 0; i < 3; i++) gothicWindow(g, tx + tw / 2 - 2, h - th + 54 + i * 34, 4, 12, hole);
      });
      x += tw + rng.range(40, 120);
    } else {
      // broken arcade / bridge arches
      const aw = rng.range(120, 220), ah = rng.range(60, 110);
      wrapDraw(w, (ox) => {
        const ax = x + ox;
        g.fillStyle = body;
        g.fillRect(ax, h - ah, aw, ah);
        const n = Math.max(2, Math.floor(aw / 40));
        for (let i = 0; i < n; i++) {
          const cw = aw / n;
          gothicWindow(g, ax + i * cw + 6, h - ah + 16, cw - 12, ah, hole);
        }
        // broken top
        g.fillStyle = hole;
        g.fillRect(ax + aw * 0.6, h - ah - 1, aw * 0.25, 9);
        g.fillStyle = rim;
        g.fillRect(ax, h - ah, aw * 0.6, 1);
        // chains
        g.fillStyle = '#2A2C38';
        for (let i = 0; i < 3; i++) {
          const cx = ax + rng.range(10, aw - 10), len = rng.range(10, 30);
          for (let j = 0; j < len; j += 3) g.fillRect(Math.round(cx), h - ah + 16 + j, 1, 2);
        }
      });
      x += aw + rng.range(30, 90);
    }
  }
  crispAlpha(c);
  return c;
}

/** One terrain chunk (320 wide, bottom 140 px) styled by section; returns the canvas and its lights. */
export function makeChunk(index: number, section: Section): { c: HTMLCanvasElement; lights: Light[]; crosses: number[] } {
  const w = 320, h = 140;
  const [c, g] = makeCanvas(w, h);
  const rng = new Rng(1000 + index * 97 + section.charCodeAt(0));
  const lights: Light[] = [];
  const crosses: number[] = [];
  const ground = '#0D0E13', rim = '#2A2733', prop = '#08090C', propRim = '#25222F';
  const base = section === 'B' ? 38 : section === 'C' ? 30 : 26; // ground height from bottom
  const gy = (x: number) => h - base - (section === 'C' ? Math.sin((index * w + x) / 70) * 8 : Math.sin((index * w + x) / 40) * 2);
  // ground
  g.fillStyle = ground;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) g.lineTo(x, Math.round(gy(x)));
  g.lineTo(w, h);
  g.fill();
  g.fillStyle = rim;
  for (let x = 0; x < w; x++) if (rng.next() < 0.85) g.fillRect(x, Math.round(gy(x)), 1, 1);
  for (let x = 0; x < w; x += rng.int(3, 9)) g.fillRect(x, Math.round(gy(x)) - rng.int(1, 3), 1, 2);

  const tomb = (x: number) => {
    const tw = rng.int(6, 11), th = rng.int(9, 16);
    const y = Math.round(gy(x));
    g.fillStyle = prop;
    g.fillRect(x, y - th + 3, tw, th);
    g.beginPath();
    g.arc(x + tw / 2, y - th + 3, tw / 2, Math.PI, 0);
    g.fill();
    g.fillStyle = propRim;
    g.fillRect(x, y - th + 3, 1, th - 2);
  };
  const crossProp = (x: number, big = false) => {
    const y = Math.round(gy(x));
    const ch = big ? rng.int(34, 44) : rng.int(12, 20), cw = big ? 16 : rng.int(7, 10), t = big ? 4 : 2;
    const lean = rng.range(-0.12, 0.12);
    g.save();
    g.translate(x, y + 2);
    g.rotate(lean);
    g.fillStyle = prop;
    g.fillRect(-t / 2, -ch, t, ch);
    g.fillRect(-cw / 2, -ch * 0.72, cw, t);
    g.fillStyle = propRim;
    g.fillRect(-t / 2, -ch, 1, ch);
    g.restore();
  };
  const tree = (x: number) => {
    const y = Math.round(gy(x));
    const branch = (bx: number, by: number, ang: number, len: number, wid: number, depth: number) => {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      g.strokeStyle = prop;
      g.lineWidth = wid;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(ex, ey);
      g.stroke();
      if (depth > 0) {
        branch(ex, ey, ang - rng.range(0.25, 0.7), len * rng.range(0.55, 0.75), Math.max(1, wid * 0.65), depth - 1);
        branch(ex, ey, ang + rng.range(0.2, 0.6), len * rng.range(0.5, 0.7), Math.max(1, wid * 0.6), depth - 1);
      }
    };
    branch(x, y + 2, -Math.PI / 2 + rng.range(-0.25, 0.25), rng.range(22, 34), 4, 4);
  };
  const lantern = (x: number) => {
    const y = Math.round(gy(x));
    g.fillStyle = prop;
    g.fillRect(x, y - 30, 2, 30);
    g.fillRect(x - 6, y - 30, 8, 2);
    g.fillRect(x - 7, y - 28, 1, 4);
    g.fillStyle = '#3A2A1A';
    g.fillRect(x - 9, y - 24, 5, 6);
    g.fillStyle = '#FFB060';
    g.fillRect(x - 8, y - 23, 3, 4);
    lights.push({ x: x - 6.5, y: y - 21, color: 'orange', r: 22 });
  };

  if (section === 'A') {
    for (let x = rng.int(4, 20); x < w - 8; x += rng.int(14, 34)) {
      const k = rng.next();
      if (k < 0.5) tomb(x);
      else if (k < 0.8) crossProp(x);
      else if (k < 0.92) tree(x);
      else lantern(x);
    }
  } else if (section === 'B') {
    // causeway deck with arches beneath and balustrade
    g.fillStyle = '#14141B';
    g.fillRect(0, Math.round(gy(0)) - 2, w, 8);
    g.fillStyle = rim;
    g.fillRect(0, Math.round(gy(0)) - 2, w, 1);
    g.fillStyle = '#07070A';
    for (let i = 0; i < 4; i++) gothicWindow(g, i * 80 + 12, h - base + 14, 56, base, '#07070A');
    for (let x = 6; x < w; x += 40) {
      g.fillStyle = prop;
      g.fillRect(x, Math.round(gy(x)) - 14, 4, 14);
      g.fillRect(x - 1, Math.round(gy(x)) - 16, 6, 2);
    }
    g.fillStyle = prop;
    g.fillRect(0, Math.round(gy(0)) - 10, w, 2);
    for (let x = rng.int(20, 60); x < w - 10; x += rng.int(60, 110)) {
      if (rng.next() < 0.5) lantern(x);
      else {
        crossProp(x, true);
        crosses.push(x);
      }
    }
  } else if (section === 'C') {
    for (let x = rng.int(8, 30); x < w - 8; x += rng.int(24, 60)) {
      const k = rng.next();
      if (k < 0.5) tomb(x);
      else if (k < 0.75) crossProp(x);
      else {
        // gallows with a hanging bell
        const y = Math.round(gy(x));
        g.fillStyle = prop;
        g.fillRect(x, y - 40, 3, 40);
        g.fillRect(x, y - 40, 16, 3);
        g.fillRect(x + 13, y - 37, 1, 6);
        g.fillStyle = '#2A2318';
        g.beginPath();
        g.moveTo(x + 9, y - 24);
        g.quadraticCurveTo(x + 13.5, y - 36, x + 18, y - 24);
        g.fill();
        lights.push({ x: x + 13.5, y: y - 26, color: 'violet', r: 14 });
      }
    }
  } else {
    // rubble and broken pillars before the belfry
    for (let x = rng.int(4, 20); x < w - 8; x += rng.int(18, 40)) {
      const y = Math.round(gy(x));
      if (rng.next() < 0.4) {
        const ph = rng.int(20, 46);
        g.fillStyle = prop;
        g.fillRect(x, y - ph, 8, ph);
        g.fillRect(x - 2, y - ph, 12, 3);
        g.fillStyle = propRim;
        g.fillRect(x, y - ph, 1, ph);
      } else {
        g.fillStyle = prop;
        g.beginPath();
        g.moveTo(x, y + 1);
        g.lineTo(x + rng.int(4, 8), y - rng.int(4, 9));
        g.lineTo(x + rng.int(9, 16), y + 1);
        g.fill();
      }
    }
  }
  crispAlpha(c);
  return { c, lights, crosses };
}

/** Foreground silhouettes (top branches / bottom fence), 1280 loop each. */
export function makeForeground(seed = 41) {
  const w = 1280;
  const [top, gt] = makeCanvas(w, 46);
  const [bot, gb] = makeCanvas(w, 36);
  const rng = new Rng(seed);
  const col = '#040406', rim = '#1C1826';
  for (let i = 0; i < 9; i++) {
    const x = rng.range(0, w);
    wrapDraw(w, (ox) => {
      const draw = (bx: number, by: number, ang: number, len: number, wid: number, d: number) => {
        const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
        gt.strokeStyle = col;
        gt.lineWidth = wid;
        gt.lineCap = 'round';
        gt.beginPath();
        gt.moveTo(bx, by);
        gt.lineTo(ex, ey);
        gt.stroke();
        if (d > 0) {
          draw(ex, ey, ang + rng.range(-0.8, -0.2), len * 0.6, Math.max(1, wid * 0.6), d - 1);
          draw(ex, ey, ang + rng.range(0.2, 0.8), len * 0.55, Math.max(1, wid * 0.6), d - 1);
        }
      };
      draw(x + ox, -2, Math.PI / 2 + rng.range(-0.6, 0.6), rng.range(14, 28), 3, 3);
    });
  }
  for (let x = 0; x < w; x += 7) {
    const hgt = 10 + ((x * 37) % 9);
    gb.fillStyle = col;
    gb.fillRect(x, 36 - hgt, 2, hgt);
    gb.beginPath();
    gb.moveTo(x - 1, 36 - hgt);
    gb.lineTo(x + 1, 36 - hgt - 4);
    gb.lineTo(x + 3, 36 - hgt);
    gb.fill();
    gb.fillStyle = rim;
    gb.fillRect(x, 36 - hgt, 1, 1);
  }
  gb.fillStyle = col;
  gb.fillRect(0, 26, w, 2);
  gb.fillRect(0, 31, w, 5);
  for (let x = 0; x < w; x += rng.int(2, 6)) gb.fillRect(x, 31 - rng.int(1, 6), 1, 6);
  crispAlpha(top);
  crispAlpha(bot);
  return { top, bot };
}

/** Soft fog blob for drifting fog banks. */
export function makeFogBlob(w: number, h: number, color = '#2A2733') {
  const [c, g] = makeCanvas(w, h);
  g.imageSmoothingEnabled = true;
  const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grd.addColorStop(0, color + 'CC');
  grd.addColorStop(0.5, color + '66');
  grd.addColorStop(1, color + '00');
  g.save();
  g.scale(1, h / w);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, w);
  g.restore();
  return c;
}

/** The Silenced Belfry: boss backdrop tower, 300x330. */
export function makeBelfry() {
  const w = 300, h = 330;
  const [c, g] = makeCanvas(w, h);
  const body = '#15131C', rim = '#3A1E28', hole = '#0A090D', glow = '#5A2430';
  // flanking buttresses
  g.fillStyle = '#100F15';
  g.fillRect(20, 120, 50, h - 120);
  g.fillRect(230, 140, 50, h - 140);
  g.beginPath(); g.moveTo(15, 120); g.lineTo(45, 70); g.lineTo(75, 120); g.fill();
  g.beginPath(); g.moveTo(225, 140); g.lineTo(255, 96); g.lineTo(285, 140); g.fill();
  // main tower
  g.fillStyle = body;
  g.fillRect(80, 60, 140, h - 60);
  g.beginPath(); g.moveTo(74, 62); g.lineTo(150, -10); g.lineTo(226, 62); g.fill();
  // broken spire notch
  g.fillStyle = 'rgba(0,0,0,0)';
  g.clearRect(150, 0, 30, 30);
  // great belfry arch (empty: its bell is on Abaddon's back)
  gothicWindow(g, 112, 86, 76, 96, hole);
  g.fillStyle = '#2A2318';
  g.fillRect(110, 100, 80, 4);
  for (let i = 0; i < 4; i++) gothicWindow(g, 96 + i * 30, 214, 16, 30, glow);
  for (let i = 0; i < 3; i++) gothicWindow(g, 104 + i * 38, 270, 14, 40, hole);
  g.fillStyle = rim;
  g.fillRect(80, 60, 1, h - 60);
  g.fillRect(219, 60, 1, h - 60);
  crispAlpha(c);
  return c;
}
