// Episode props, guests and sky objects, drawn in the same flat outlined style as the friends.
// Each draw function gets a context already translated to the prop's ground point.

import { INK, ellipse, rrect, fillStroke, stroke, star, heart, note, drawItem, drawFriend } from './draw.js';

const TAU = Math.PI * 2;

// Deterministic fluffy (scalloped) outline around an ellipse, for fur, foliage and clouds.
function fuzzyEllipse(ctx, cx, cy, rx, ry, bumps, depth, seed = 0) {
  ctx.beginPath();
  const pt = (a, k) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  ctx.moveTo(...pt(0, 1));
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * TAU;
    const a1 = ((i + 1) / bumps) * TAU;
    const k = 1 + depth * (1 + 0.4 * Math.sin(i * 7.3 + seed));
    ctx.quadraticCurveTo(...pt((a0 + a1) / 2, k), ...pt(a1, 1));
  }
  ctx.closePath();
}

function house(ctx, w, h, fill, roof) {
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -h * 0.6);
  ctx.lineTo(0, -h);
  ctx.lineTo(w / 2, -h * 0.6);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  fillStroke(ctx, fill, 2.2);
  if (roof) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 5, -h * 0.58);
    ctx.lineTo(0, -h - 5);
    ctx.lineTo(w / 2 + 5, -h * 0.58);
    stroke(ctx, 5, roof);
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 5, -h * 0.58);
    ctx.lineTo(0, -h - 5);
    ctx.lineTo(w / 2 + 5, -h * 0.58);
    stroke(ctx, 1.4);
  }
}

/** The ODD HAUS house icon (from Mr. ODD's mug and the logo). */
export function houseIcon(ctx, x, y, s, color = INK) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.lineTo(-6, -1);
  ctx.lineTo(0, -7);
  ctx.lineTo(6, -1);
  ctx.lineTo(6, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-2.2, 0, 1.9, 1.9);
  ctx.fillRect(0.3, 0, 1.9, 1.9);
  ctx.fillRect(-2.2, 2.4, 1.9, 1.9);
  ctx.fillRect(0.3, 2.4, 1.9, 1.9);
  ctx.restore();
}

function bulb(ctx, x, y, on, color, t, i) {
  ctx.save();
  ctx.translate(x, y);
  if (on) {
    const g = ctx.createRadialGradient(0, 4, 1, 0, 4, 16);
    g.addColorStop(0, `${color}cc`);
    g.addColorStop(1, `${color}00`);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.75 + Math.sin(t * 3 + i) * 0.2;
    ctx.fillRect(-16, -12, 32, 32);
    ctx.globalAlpha = 1;
  }
  rrect(ctx, -2.4, -3, 4.8, 3.6, 1);
  fillStroke(ctx, '#7c7468', 1.1);
  ellipse(ctx, 0, 4, 3.6, 5);
  fillStroke(ctx, on ? color : '#e9e4da', 1.2);
  ctx.restore();
}

const PROPS = {
  turntable(ctx, p, t) {
    rrect(ctx, -46, -22, 92, 22, 5);
    fillStroke(ctx, '#c98f5a', 2.2);
    rrect(ctx, -46, -22, 92, 6, 3);
    fillStroke(ctx, '#e3b07c', 1.6);
    ellipse(ctx, -8, -24, 30, 5);
    fillStroke(ctx, '#2a252b', 1.8);
    if (p.spinning) {
      ctx.beginPath();
      ctx.ellipse(-8, -24, 22, 3.5, 0, t * 6, t * 6 + 1.2);
      stroke(ctx, 1, 'rgba(255,255,255,0.5)');
    }
    ctx.beginPath();
    ctx.moveTo(34, -22);
    ctx.lineTo(34, -32);
    ctx.lineTo(14, p.needleDown ? -26 : -30);
    stroke(ctx, 2, '#8b8b93');
    ellipse(ctx, 34, -32, 3, 3);
    fillStroke(ctx, '#b9b9c2', 1.2);
    for (const x of [-30, 30]) {
      ellipse(ctx, x, -10, 3, 3);
      fillStroke(ctx, '#f3e2c0', 1.2);
    }
  },
  mat(ctx, p) {
    const w = p.w || 180;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 + 14, -12);
    ctx.lineTo(w / 2 - 14, -12);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    for (let i = -w / 2; i < w / 2; i += 12) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (Math.round(i / 12) + r) % 2 ? '#ff8f8f' : '#fff4ec';
        ctx.fillRect(i, -12 + r * 6, 12, 6);
      }
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 + 14, -12);
    ctx.lineTo(w / 2 - 14, -12);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    stroke(ctx, 2);
  },
  plate(ctx, p, t) {
    ellipse(ctx, 0, -4, 22, 5);
    fillStroke(ctx, '#fff', 1.8);
    const n = p.count ?? 5;
    for (let i = 0; i < n; i++) drawItem(ctx, p.food || 'cookie', -12 + i * 6, -6 - (i % 2) * 4, t);
  },
  basket(ctx) {
    ctx.beginPath();
    ctx.arc(0, -22, 13, Math.PI, 0);
    stroke(ctx, 2.6, '#a8743f');
    rrect(ctx, -17, -22, 34, 22, 5);
    fillStroke(ctx, '#d9a25a', 2);
    for (const y of [-15, -8]) {
      ctx.beginPath();
      ctx.moveTo(-15, y);
      ctx.lineTo(15, y);
      stroke(ctx, 1, '#a8743f');
    }
    rrect(ctx, -12, -27, 24, 6, 3);
    fillStroke(ctx, '#ff8f8f', 1.4);
  },
  blanket(ctx, p) {
    const w = p.w || 200;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-w / 2 + 6, -26, -w / 2 + 24, -28);
    for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(-w / 2 + 24 + (i + 0.5) * ((w - 48) / 6), -36, -w / 2 + 24 + (i + 1) * ((w - 48) / 6), -28);
    ctx.quadraticCurveTo(w / 2 - 6, -26, w / 2, 0);
    ctx.closePath();
    fillStroke(ctx, '#bcd7ff', 2.2);
    for (let x = -w / 2 + 30; x < w / 2 - 20; x += 22) star(ctx, x, -14, 3, 1.3, '#fff3a6');
  },
  box(ctx, p) {
    rrect(ctx, -26, -40, 52, 40, 2);
    fillStroke(ctx, '#d6a46a', 2.2);
    ctx.beginPath();
    ctx.moveTo(-26, -40);
    ctx.lineTo(-34, -50 - (p.open || 0) * 6);
    ctx.lineTo(-8, -48);
    ctx.lineTo(0, -40);
    ctx.moveTo(26, -40);
    ctx.lineTo(34, -50);
    ctx.lineTo(8, -48);
    ctx.lineTo(0, -40);
    ctx.fillStyle = '#e4b97f';
    ctx.fill();
    stroke(ctx, 2);
    ctx.beginPath();
    ctx.moveTo(-10, -22);
    ctx.lineTo(10, -22);
    stroke(ctx, 1.4, '#a8743f');
  },
  plant(ctx) {
    for (const [a, l] of [[-0.6, 42], [-0.2, 52], [0.25, 48], [0.7, 36]]) {
      ctx.save();
      ctx.translate(0, -26);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(12, -l / 2, 0, -l);
      ctx.quadraticCurveTo(-12, -l / 2, 0, 0);
      fillStroke(ctx, '#6fbf73', 1.8);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-16, -28);
    ctx.lineTo(16, -28);
    ctx.lineTo(12, 0);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    fillStroke(ctx, '#e07b52', 2.2);
  },
  finish(ctx, p) {
    const w = p.w || 120;
    for (const x of [-w / 2, w / 2]) {
      rrect(ctx, x - 2, -70, 4, 70, 2);
      fillStroke(ctx, '#fff', 1.5);
    }
    ctx.beginPath();
    ctx.moveTo(-w / 2, -64);
    ctx.quadraticCurveTo(0, -56 + (p.broken ? 30 : 0), w / 2, -64);
    stroke(ctx, 3, '#ff6b6b');
    ctx.font = '13px Jua, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.fillText('GOAL', 0, -74);
  },
  amp(ctx, p, t) {
    rrect(ctx, -18, -34, 36, 34, 4);
    fillStroke(ctx, '#2b2a2e', 2.2);
    ellipse(ctx, 0, -15, 11, 11);
    fillStroke(ctx, '#45434a', 1.4);
    ellipse(ctx, 0, -15, 4 + (p.on ? Math.abs(Math.sin(t * 12)) * 2 : 0), 4 + (p.on ? Math.abs(Math.sin(t * 12)) * 2 : 0));
    fillStroke(ctx, '#2b2a2e', 1.2);
    ellipse(ctx, 12, -30, 2, 2);
    ctx.fillStyle = p.on ? '#ff5b5b' : '#6b6670';
    ctx.fill();
  },
  cap(ctx, p, t) {
    // Bully's backwards black cap, upside down: a little boat
    ctx.save();
    ctx.rotate(Math.sin(t * 2) * 0.04);
    ctx.beginPath();
    ctx.moveTo(-60, -34);
    ctx.quadraticCurveTo(-58, 6, 0, 6);
    ctx.quadraticCurveTo(58, 6, 60, -34);
    ctx.closePath();
    fillStroke(ctx, '#2a2a2e', 2.6);
    ctx.beginPath();
    ctx.moveTo(-60, -34);
    ctx.lineTo(60, -34);
    stroke(ctx, 6, '#3a3a40');
    ctx.beginPath();
    ctx.moveTo(56, -36);
    ctx.quadraticCurveTo(96, -40, 104, -28);
    ctx.quadraticCurveTo(86, -22, 58, -28);
    ctx.closePath();
    fillStroke(ctx, '#2a2a2e', 2.2);
    ctx.font = '11px Jua, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('BULLY', 0, -10);
    ctx.restore();
  },
  mug(ctx, p, t) {
    rrect(ctx, -34, -78, 62, 78, 12);
    fillStroke(ctx, '#fff', 2.6);
    ctx.beginPath();
    ctx.arc(28, -40, 16, -1.2, 1.2);
    stroke(ctx, 6);
    ctx.beginPath();
    ctx.arc(28, -40, 16, -1.2, 1.2);
    stroke(ctx, 3, '#fff');
    houseIcon(ctx, -3, -40, 2.2);
    ellipse(ctx, -3, -76, 28, 4);
    fillStroke(ctx, '#7a4a2b', 1.6);
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.5 + i / 3) % 1;
      ctx.beginPath();
      ctx.moveTo(-14 + i * 11, -86 - k * 34);
      ctx.bezierCurveTo(-20 + i * 11, -96 - k * 34, -8 + i * 11, -104 - k * 34, -14 + i * 11, -114 - k * 34);
      ctx.globalAlpha = (1 - k) * 0.7;
      stroke(ctx, 2.4, '#ffffff');
      ctx.globalAlpha = 1;
    }
  },
  ball(ctx, p, t) {
    ctx.save();
    ctx.translate(0, -9);
    ctx.rotate(p.spin ?? t * 4);
    ellipse(ctx, 0, 0, 9, 9);
    fillStroke(ctx, '#d9f15b', 2);
    ctx.beginPath();
    ctx.arc(-9, 0, 8, -1, 1);
    ctx.arc(9, 0, 8, 2.1, 4.2);
    stroke(ctx, 1.4, '#fff');
    ctx.restore();
  },
  house(ctx, p, t) {
    const open = p.open || 0;
    house(ctx, 110, 120, '#f1d9b5', '#8b3d3d');
    rrect(ctx, -40, -66, 24, 22, 3);
    fillStroke(ctx, p.lit ? '#ffd77a' : '#9db3c9', 1.8);
    ctx.beginPath();
    ctx.moveTo(-28, -66);
    ctx.lineTo(-28, -44);
    ctx.moveTo(-40, -55);
    ctx.lineTo(-16, -55);
    stroke(ctx, 1.2);
    rrect(ctx, 6, -50, 28, 50, 4);
    fillStroke(ctx, '#ffcf6b', 1.8);
    if (open < 1) {
      ctx.save();
      ctx.translate(6, 0);
      ctx.scale(1 - open, 1);
      rrect(ctx, 0, -50, 28, 50, 4);
      fillStroke(ctx, '#8a5a35', 1.8);
      ellipse(ctx, 22, -24, 2, 2);
      fillStroke(ctx, '#f2c14e', 1);
      ctx.restore();
    } else {
      const g = ctx.createRadialGradient(20, -25, 4, 20, -25, 70);
      g.addColorStop(0, 'rgba(255,214,120,0.6)');
      g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-60, -100, 160, 110);
    }
    rrect(ctx, -30, -126, 60, 18, 4);
    fillStroke(ctx, '#fff8ea', 1.6);
    ctx.font = '12px Jua, sans-serif';
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.fillText('ODD HAUS', 0, -113);
    void t;
  },
  batterypack(ctx, p, t) {
    rrect(ctx, -30, -26, 60, 26, 4);
    fillStroke(ctx, '#55535c', 2.2);
    rrect(ctx, -24, -20, 22, 14, 3);
    fillStroke(ctx, p.filled ? '#f4c531' : '#2f2d33', 1.4);
    rrect(ctx, 2, -20, 22, 14, 3);
    fillStroke(ctx, '#f4c531', 1.4);
    ctx.beginPath();
    ctx.moveTo(30, -14);
    const n = p.bulbs || 6;
    const span = p.span || 260;
    for (let i = 0; i <= n; i++) ctx.lineTo(30 + (i / n) * span, -100 + Math.sin(i * 1.7) * 6 - (i ? 0 : -86));
    stroke(ctx, 1.4, '#4b4b4b');
    const colors = ['#ffd84d', '#ff8fa3', '#8fe3ff', '#b5f28c'];
    for (let i = 1; i <= n; i++) bulb(ctx, 30 + (i / n) * span, -100 + Math.sin(i * 1.7) * 6, p.lit, colors[i % 4], t, i);
  },
  door(ctx, p) {
    const open = p.open || 0;
    house(ctx, 64, 80, '#7a4f33', null);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-26, -44);
    ctx.lineTo(0, -68);
    ctx.lineTo(26, -44);
    ctx.lineTo(26, 0);
    ctx.closePath();
    ctx.fillStyle = open > 0 ? '#ffe2a0' : '#5b3a26';
    ctx.fill();
    ctx.clip();
    if (open > 0) {
      ctx.translate(-26, 0);
      ctx.scale(1 - open * 0.85, 1);
      ctx.translate(26, 0);
    }
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-26, -44);
    ctx.lineTo(0, -68);
    ctx.lineTo(26, -44);
    ctx.lineTo(26, 0);
    ctx.closePath();
    fillStroke(ctx, '#9a6644', 1.8);
    // keyhole shaped like Locke
    ellipse(ctx, 14, -30, 3.4, 3.4);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.fillRect(12.6, -30, 2.8, 8);
    ctx.restore();
  },
  chessboard(ctx, p) {
    const n = 4;
    const cell = 22;
    ctx.save();
    ctx.transform(1, 0, -0.35, 0.45, 0, 0);
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#7a5235' : '#f2e3c6';
        ctx.fillRect(-n * cell / 2 + c * cell, -n * cell + r * cell, cell, cell);
      }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.strokeRect(-n * cell / 2, -n * cell, n * cell, n * cell);
    if (p.highlight) {
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 3;
      ctx.strokeRect(-n * cell / 2 + 2 * cell + 2, -n * cell + 1 * cell + 2, cell - 4, cell - 4);
    }
    ctx.restore();
    for (const [x, y, w] of [[-34, -30, 1], [18, -36, 0], [30, -14, 1]]) {
      ellipse(ctx, x, y, 6, 2.5);
      fillStroke(ctx, w ? '#f6efe2' : '#3a2f2f', 1.2);
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.quadraticCurveTo(x - 3, y - 10, x, y - 14);
      ctx.quadraticCurveTo(x + 3, y - 10, x + 4, y);
      fillStroke(ctx, w ? '#f6efe2' : '#3a2f2f', 1.2);
      ellipse(ctx, x, y - 15, 3.2, 3.2);
      fillStroke(ctx, w ? '#f6efe2' : '#3a2f2f', 1.2);
    }
  },
  pumpkin(ctx, p, t) {
    const s = p.size || 1;
    ctx.scale(s, s);
    for (const [x, rx] of [[-10, 12], [10, 12], [0, 13]]) {
      ellipse(ctx, x, -14, rx, 14);
      fillStroke(ctx, '#ff9a3c', 1.8);
    }
    rrect(ctx, -2, -32, 4, 6, 1.5);
    fillStroke(ctx, '#5f8a3a', 1.2);
    const glow = p.lit ? `rgba(255,220,90,${0.8 + Math.sin(t * 8) * 0.2})` : INK;
    ctx.fillStyle = glow;
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * 8, -20);
      ctx.lineTo(s2 * 4, -16);
      ctx.lineTo(s2 * 11, -16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(-4, -7);
    ctx.lineTo(0, -10);
    ctx.lineTo(4, -7);
    ctx.lineTo(8, -10);
    ctx.lineTo(4, -5);
    ctx.lineTo(-4, -5);
    ctx.closePath();
    ctx.fill();
  },
  snowman(ctx, p) {
    const k = p.built ?? 1;
    ellipse(ctx, 0, -18, 22, 18);
    fillStroke(ctx, '#fff', 2.2);
    if (k > 0.33) {
      ellipse(ctx, 0, -46, 15, 13);
      fillStroke(ctx, '#fff', 2.2);
    }
    if (k > 0.66) {
      ellipse(ctx, 0, -68, 11, 10);
      fillStroke(ctx, '#fff', 2.2);
      ellipse(ctx, -4, -70, 1.4, 1.8);
      ctx.fillStyle = INK;
      ctx.fill();
      ellipse(ctx, 4, -70, 1.4, 1.8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -67);
      ctx.lineTo(9, -65);
      ctx.lineTo(0, -64);
      fillStroke(ctx, '#ff9a3c', 1);
      rrect(ctx, -10, -60, 20, 4, 2);
      fillStroke(ctx, '#ff6b6b', 1.2);
    }
  },
  tree(ctx, p, t) {
    rrect(ctx, -6, -14, 12, 14, 2);
    fillStroke(ctx, '#8a5a35', 1.8);
    for (const [y, w] of [[-14, 46], [-40, 38], [-62, 28]]) {
      ctx.beginPath();
      ctx.moveTo(-w, y);
      ctx.lineTo(0, y - 34);
      ctx.lineTo(w, y);
      ctx.closePath();
      fillStroke(ctx, '#3f9a5a', 2);
    }
    const colors = ['#ff6b6b', '#ffd34d', '#7fc6ff', '#ff9ad5'];
    [[-24, -22], [18, -26], [-10, -46], [14, -50], [-4, -68], [26, -18]].forEach(([x, y], i) => {
      ellipse(ctx, x, y, 3, 3);
      ctx.fillStyle = colors[(i + Math.floor(t * 2)) % 4];
      ctx.fill();
    });
    star(ctx, 0, -98, 8, 3.5, '#ffd34d', Math.sin(t * 2) * 0.1);
  },
  presents(ctx) {
    for (const [x, w, h, c] of [[-16, 22, 18, '#ff6b6b'], [8, 18, 24, '#7fc6ff'], [26, 14, 12, '#b5f28c']]) {
      rrect(ctx, x - w / 2, -h, w, h, 2);
      fillStroke(ctx, c, 1.8);
      ctx.beginPath();
      ctx.moveTo(x, -h);
      ctx.lineTo(x, 0);
      stroke(ctx, 2.4, '#fff');
    }
  },
  pillows(ctx) {
    for (const [x, y, r] of [[-30, -8, -0.2], [0, -12, 0.1], [28, -7, 0.25], [-12, -24, -0.1], [14, -26, 0.2]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      drawItem(ctx, 'pillow', 0, 4, 0);
      ctx.restore();
    }
  },
  lamp(ctx, p, t) {
    if (p.on) {
      const g = ctx.createRadialGradient(0, -46, 4, 0, -46, 90);
      g.addColorStop(0, 'rgba(255,214,120,0.55)');
      g.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-90, -136, 180, 136);
    }
    rrect(ctx, -2, -40, 4, 40, 2);
    fillStroke(ctx, '#8a5a35', 1.4);
    ellipse(ctx, 0, -1, 12, 3);
    fillStroke(ctx, '#8a5a35', 1.4);
    ctx.beginPath();
    ctx.moveTo(-10, -40);
    ctx.lineTo(-16, -60);
    ctx.lineTo(16, -60);
    ctx.lineTo(10, -40);
    ctx.closePath();
    fillStroke(ctx, p.on ? '#fff0b8' : '#f3e2c0', 1.8);
    void t;
  },
  sign(ctx, p) {
    rrect(ctx, -3, -50, 6, 50, 2);
    fillStroke(ctx, '#9a6644', 1.6);
    ctx.font = '14px Jua, sans-serif';
    const w = Math.max(60, ctx.measureText(p.text || '').width + 22);
    rrect(ctx, -w / 2, -74, w, 28, 5);
    fillStroke(ctx, '#f3d7a8', 2);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text || '', 0, -60);
  },
  campfire(ctx, p, t) {
    for (const r of [-0.4, 0.4]) {
      ctx.save();
      ctx.rotate(r);
      rrect(ctx, -18, -6, 36, 7, 3);
      fillStroke(ctx, '#8a5a35', 1.6);
      ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      const h = 22 + Math.sin(t * 9 + i * 2) * 5 - i * 4;
      ctx.beginPath();
      ctx.moveTo(-10 + i * 3, -4);
      ctx.quadraticCurveTo(-12 + i * 3, -h * 0.6, i * 3 - 2, -h);
      ctx.quadraticCurveTo(10 + i * 2, -h * 0.5, 8 - i * 2, -4);
      ctx.closePath();
      ctx.fillStyle = ['#ff7a3c', '#ffb23c', '#ffe27a'][i];
      ctx.fill();
    }
  },
  moon(ctx, p) {
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 80);
    g.addColorStop(0, 'rgba(255,240,180,0.45)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-80, -80, 160, 160);
    ellipse(ctx, 0, 0, 34, 34);
    fillStroke(ctx, '#fff1b8', 2);
    if (!p.full) {
      ellipse(ctx, 14, -8, 30, 30);
      ctx.fillStyle = 'rgba(30,40,80,0.0)';
      ctx.fill();
    }
    ellipse(ctx, -10, -6, 6, 5);
    ctx.fillStyle = 'rgba(220,200,140,0.6)';
    ctx.fill();
    ellipse(ctx, 8, 10, 4, 3.4);
    ctx.fill();
  },
  sun(ctx, p, t) {
    const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 110);
    g.addColorStop(0, 'rgba(255,190,110,0.6)');
    g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-110, -110, 220, 220);
    ellipse(ctx, 0, 0, 36, 36);
    fillStroke(ctx, '#ff9f5a', 2);
    void t;
  },
  blossom(ctx, p, t) {
    // a cherry tree in a pot of air: trunk + puffy pink crown
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-4, -50, -14, -90);
    ctx.lineTo(0, -92);
    ctx.quadraticCurveTo(6, -50, 8, 0);
    ctx.closePath();
    fillStroke(ctx, '#8a5a35', 2);
    for (const [x, y, r] of [[-40, -100, 30], [0, -126, 36], [38, -104, 30], [-16, -90, 26], [20, -86, 24]]) {
      fuzzyEllipse(ctx, x, y, r, r * 0.8, 9, 0.12, x);
      fillStroke(ctx, '#ffc4d6', 2);
    }
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4;
      ellipse(ctx, Math.cos(a) * 40, -110 + Math.sin(a) * 22, 2.4, 2);
      ctx.fillStyle = '#ff8fb0';
      ctx.fill();
    }
    void t;
  },
  bench(ctx) {
    rrect(ctx, -46, -22, 92, 6, 2);
    fillStroke(ctx, '#c98f5a', 1.8);
    for (const x of [-38, 34]) {
      rrect(ctx, x, -18, 4, 18, 1);
      fillStroke(ctx, '#8a5a35', 1.4);
    }
  },
  stall(ctx, p, t) {
    // a little ramen shop: counter, roof and a noren curtain
    const w = 170;
    rrect(ctx, -w / 2, -46, w, 46, 4);
    fillStroke(ctx, '#c98f5a', 2.4);
    rrect(ctx, -w / 2 - 6, -52, w + 12, 8, 3);
    fillStroke(ctx, '#e3b07c', 2);
    for (const x of [-w / 2 + 6, w / 2 - 10]) {
      rrect(ctx, x, -150, 4, 100, 1);
      fillStroke(ctx, '#8a5a35', 1.6);
    }
    ctx.beginPath(); // roof
    ctx.moveTo(-w / 2 - 18, -146);
    ctx.lineTo(w / 2 + 18, -146);
    ctx.lineTo(w / 2 + 4, -168);
    ctx.lineTo(-w / 2 - 4, -168);
    ctx.closePath();
    fillStroke(ctx, '#d6453f', 2.4);
    const sway = Math.sin(t * 2) * 1.5;
    for (let i = 0; i < 4; i++) {
      const x = -60 + i * 30;
      ctx.beginPath();
      ctx.moveTo(x, -146);
      ctx.lineTo(x + 28, -146);
      ctx.lineTo(x + 28 + sway, -112);
      ctx.lineTo(x + sway, -112);
      ctx.closePath();
      fillStroke(ctx, '#2f3b5c', 1.8);
    }
    ctx.font = '15px Jua, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('라', -46 + sway, -124);
    ctx.fillText('멘', -16 + sway, -124);
    ctx.fillText('가', 14 + sway, -124);
    ctx.fillText('게', 44 + sway, -124);
  },
  weeds(ctx, p, t) {
    const n = p.count ?? 6;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(-((p.span || 160) / 2) + (i + 0.5) * ((p.span || 160) / Math.max(n, 1)), 0);
      ctx.rotate(Math.sin(t * 2 + i) * 0.06);
      drawItem(ctx, 'weed', 0, -1, t);
      ctx.restore();
    }
  },
  board(ctx, p) {
    for (const x of [-38, 34]) {
      rrect(ctx, x, -70, 4, 70, 1);
      fillStroke(ctx, '#8a5a35', 1.6);
    }
    rrect(ctx, -48, -96, 96, 56, 4);
    fillStroke(ctx, '#c98f5a', 2.4);
    const papers = p.papers || ['풀 뽑기', '토벌', '배달'];
    ctx.font = '10px Jua, sans-serif';
    ctx.textAlign = 'center';
    papers.forEach((text, i) => {
      const x = -30 + i * 30;
      rrect(ctx, x - 13, -90, 26, 32, 2);
      fillStroke(ctx, i === p.pick ? '#fff3a6' : '#fffaf0', 1.4);
      ctx.fillStyle = INK;
      ctx.fillText(text, x, -72);
      ellipse(ctx, x, -88, 1.6, 1.6);
      ctx.fillStyle = '#e0483f';
      ctx.fill();
    });
  },
  stage(ctx, p, t) {
    const w = p.w || 150;
    rrect(ctx, -w / 2, -18, w, 18, 3);
    fillStroke(ctx, '#c98f5a', 2.2);
    for (let i = 0; i < 5; i++) {
      const x = -w / 2 + 14 + i * ((w - 28) / 4);
      ellipse(ctx, x, -9, 3.2, 3.2);
      ctx.fillStyle = p.lit && (Math.floor(t * 4) + i) % 2 ? '#ffe066' : '#f3e2c0';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    if (p.lit) {
      const g = ctx.createRadialGradient(0, -70, 10, 0, -70, 110);
      g.addColorStop(0, 'rgba(255,240,170,0.45)');
      g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-120, -180, 240, 162);
    }
  },
  boat(ctx, p, t) {
    ctx.save();
    ctx.rotate(Math.sin(t * 2) * 0.05);
    ctx.beginPath();
    ctx.moveTo(-62, -26);
    ctx.lineTo(62, -26);
    ctx.quadraticCurveTo(52, 4, 0, 4);
    ctx.quadraticCurveTo(-52, 4, -62, -26);
    ctx.closePath();
    fillStroke(ctx, '#f2f2f2', 2.6);
    ctx.beginPath();
    ctx.moveTo(-58, -17);
    ctx.quadraticCurveTo(0, -11, 58, -17);
    stroke(ctx, 4, '#e0483f');
    rrect(ctx, -2, -96, 4, 72, 1);
    fillStroke(ctx, '#8a5a35', 1.6);
    ctx.beginPath();
    ctx.moveTo(2, -94);
    ctx.quadraticCurveTo(40 + Math.sin(t * 3) * 3, -70, 4, -34);
    ctx.closePath();
    fillStroke(ctx, '#fffaf0', 2);
    ctx.restore();
  },
  table(ctx) {
    rrect(ctx, -44, -30, 88, 8, 2);
    fillStroke(ctx, '#f6f1e6', 2);
    ctx.beginPath();
    ctx.moveTo(-44, -22);
    ctx.lineTo(-40, 0);
    ctx.lineTo(40, 0);
    ctx.lineTo(44, -22);
    ctx.closePath();
    fillStroke(ctx, '#e06a6a', 2);
  },
  cord(ctx, p, t) {
    // a string of fairy lights hanging from the top of the screen down to y = 0
    const len = p.len || 400;
    const sway = p.sway || 0;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    for (let y = -len; y <= 0; y += 16) {
      const k = (y + len) / len;
      ctx.lineTo(Math.sin(y / 22 + t * 2) * 4 * k + sway * k, y);
    }
    stroke(ctx, 2.6, '#6f7a3e');
    const colors = ['#ffd84d', '#ff8fa3', '#8fe3ff', '#b5f28c'];
    let i = 0;
    for (let y = -len + 30; y < -20; y += 46, i++) {
      const k = (y + len) / len;
      bulb(ctx, Math.sin(y / 22 + t * 2) * 4 * k + sway * k, y, p.lit, colors[(i + (p.seed || 0)) % 4], t, i);
    }
  },
  waves(ctx, p, t, view) {
    // a band of water across the whole screen bottom (ignores the prop x)
    const h = (p.h || 70) * (p.rise ?? 1);
    if (h < 1) return;
    ctx.save();
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const base = view.h;
    for (let layer = 0; layer < 2; layer++) {
      ctx.beginPath();
      ctx.moveTo(0, base);
      for (let x = 0; x <= view.w + 20; x += 20) {
        const y = base - h + layer * 16 + Math.sin(x / 60 + t * (1.4 + layer * 0.6) + layer) * 7;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(view.w, base);
      ctx.closePath();
      ctx.fillStyle = layer ? '#8fd0f5' : '#bfe6fb';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    ctx.restore();
  },
};

export function drawProp(ctx, p, t, view) {
  const fn = PROPS[p.type];
  if (!fn) return;
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;
  ctx.translate(p.x - view.x, p.y - view.y);
  const s = (p.s || 1) * view.scale;
  ctx.scale(s * (p.flip ? -1 : 1), s);
  fn(ctx, p, t, view);
  ctx.restore();
}

// ------------------------------------------------------------------ guests

function skinHand(ctx, color = '#f5c9a5', reach = 1600) {
  // a chunky cartoon hand reaching down from off-screen, fingertips at y = 0
  ctx.beginPath();
  ctx.moveTo(-34, -reach);
  ctx.lineTo(-30, -40);
  ctx.quadraticCurveTo(-46, -30, -40, -6);
  ctx.quadraticCurveTo(-34, 6, -26, -2);
  ctx.lineTo(-22, 8);
  ctx.quadraticCurveTo(-14, 16, -8, 6);
  ctx.quadraticCurveTo(0, 16, 6, 6);
  ctx.quadraticCurveTo(14, 14, 20, 4);
  ctx.quadraticCurveTo(30, 6, 30, -12);
  ctx.lineTo(32, -reach);
  ctx.closePath();
  fillStroke(ctx, color, 3);
  for (const x of [-15, 1, 15]) {
    ctx.beginPath();
    ctx.moveTo(x, -12);
    ctx.lineTo(x + 1, 2);
    stroke(ctx, 2);
  }
}

const GUESTS = {
  /** Any friend drawn huge, peeking in from an edge (the parallel-world visitor). */
  giant(ctx, g, t) {
    drawFriend(ctx, g.id, { pose: g.pose || 'stand', expr: g.expr || null, look: g.look || [0, 0], seed: 3, t0: 0, acc: g.acc || [] }, t);
  },
  buddy(ctx, g, t) {
    // side view, facing +x; feet at y = 0
    const walk = g.walking ? g.phase || t * 6 : 0;
    const wag = Math.sin(t * (g.happy ? 14 : 5)) * (g.happy ? 0.5 : 0.25);
    const legs = [
      [62, 0],
      [46, Math.PI],
      [-50, Math.PI],
      [-66, 0],
    ];
    const fur = '#9c8a78';
    const dark = '#6f5f52';
    for (const [x, off] of legs) {
      const sw = g.walking ? Math.sin(walk + off) * 9 : 0;
      ctx.beginPath();
      ctx.moveTo(x - 13, -74);
      ctx.quadraticCurveTo(x - 14 + sw * 0.5, -36, x - 12 + sw, -10);
      ctx.quadraticCurveTo(x - 12 + sw, 1, x + 2 + sw, 0);
      ctx.quadraticCurveTo(x + 16 + sw, 0, x + 14 + sw, -10);
      ctx.quadraticCurveTo(x + 14 + sw * 0.5, -36, x + 13, -74);
      ctx.closePath();
      fillStroke(ctx, off ? dark : fur, 2.4);
      ctx.beginPath();
      ctx.moveTo(x - 6 + sw, -4);
      ctx.lineTo(x - 5 + sw, -1);
      ctx.moveTo(x + 2 + sw, -4);
      ctx.lineTo(x + 3 + sw, -1);
      stroke(ctx, 1.2);
    }
    ctx.save(); // tail
    ctx.translate(-88, -104);
    ctx.rotate(-0.9 + wag);
    fuzzyEllipse(ctx, 0, -22, 12, 26, 8, 0.25, 3);
    fillStroke(ctx, fur, 2.4);
    ctx.restore();
    const bob = g.walking ? Math.abs(Math.sin(walk)) * 3 : Math.sin(t * 2) * 1;
    ctx.translate(0, -bob);
    fuzzyEllipse(ctx, -4, -96, 92, 40, 22, 0.12, 1);
    fillStroke(ctx, fur, 2.6);
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(-70 + i * 16, -112 + (i % 3) * 8);
      ctx.quadraticCurveTo(-64 + i * 16, -100 + (i % 3) * 8, -72 + i * 16, -88 + (i % 3) * 8);
      stroke(ctx, 1.4, dark);
    }
    fuzzyEllipse(ctx, 70, -96, 26, 30, 10, 0.18, 2); // chest ruff
    fillStroke(ctx, '#e8dcc6', 2.2);
    // collar & tie
    ctx.beginPath();
    ctx.moveTo(62, -128);
    ctx.lineTo(80, -110);
    ctx.lineTo(98, -128);
    ctx.lineTo(92, -112);
    ctx.lineTo(80, -104);
    ctx.lineTo(68, -112);
    ctx.closePath();
    fillStroke(ctx, '#fff', 2);
    ctx.save();
    ctx.translate(80, -104);
    ctx.rotate(Math.sin(t * 3) * 0.08);
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.lineTo(7, 30);
    ctx.lineTo(0, 38);
    ctx.lineTo(-7, 30);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    for (let y = -4; y < 44; y += 8) {
      ctx.fillStyle = '#2c3e70';
      ctx.fillRect(-10, y, 20, 4);
      ctx.fillStyle = '#e2b54a';
      ctx.fillRect(-10, y + 4, 20, 4);
    }
    ctx.restore();
    stroke(ctx, 2);
    ctx.restore();
    ellipse(ctx, 96, -100, 9, 9);
    fillStroke(ctx, '#f2c14e', 1.8);
    ctx.font = '6px Jua, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.fillText('BUDDY', 96, -98);
    // head
    ctx.save();
    ctx.translate(96, -150);
    ctx.rotate(g.tilt ?? (g.sniff ? Math.sin(t * 10) * 0.05 + 0.15 : 0));
    fuzzyEllipse(ctx, 0, 0, 40, 36, 16, 0.16, 4);
    fillStroke(ctx, fur, 2.6);
    fuzzyEllipse(ctx, 30, 14, 22, 18, 10, 0.2, 5); // muzzle + beard
    fillStroke(ctx, '#e8dcc6', 2.2);
    ellipse(ctx, 50, 4, 8, 6.5);
    fillStroke(ctx, '#2a2326', 1.8);
    ellipse(ctx, 48, 2, 2.4, 1.6);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    ellipse(ctx, 14, -8, 7, 7.5);
    ctx.fillStyle = '#1b1416';
    ctx.fill();
    ellipse(ctx, 12, -11, 2.4, 2.6);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -20);
    ctx.quadraticCurveTo(14, -24, 22, -19);
    stroke(ctx, 2.4, dark);
    if (g.happy) {
      ctx.beginPath();
      ctx.moveTo(34, 24);
      ctx.quadraticCurveTo(42, 40, 50, 24);
      fillStroke(ctx, '#ef8a9a', 1.8);
    }
    ellipse(ctx, 22, 12, 5, 3);
    ctx.fillStyle = 'rgba(255,128,150,0.45)';
    ctx.fill();
    ctx.save(); // floppy ear
    ctx.translate(-14, -22);
    ctx.rotate(0.3 + Math.sin(t * 4) * (g.walking ? 0.15 : 0.05));
    fuzzyEllipse(ctx, 0, 24, 14, 30, 9, 0.2, 6);
    fillStroke(ctx, dark, 2.4);
    ctx.restore();
    ctx.restore();
    if (g.item) drawItem(ctx, g.item, 146, -140, t);
  },

  /** Bully's head and shoulders rising from the bottom of the screen. */
  bully(ctx, g, t) {
    const grin = g.grin ?? 1;
    // skull tee shoulders
    ctx.beginPath();
    ctx.moveTo(-230, 40);
    ctx.quadraticCurveTo(-210, -60, -90, -70);
    ctx.lineTo(90, -70);
    ctx.quadraticCurveTo(210, -60, 230, 40);
    ctx.closePath();
    fillStroke(ctx, '#232227', 4);
    ellipse(ctx, 0, -10, 26, 22);
    fillStroke(ctx, '#f2f0ea', 2.4);
    ellipse(ctx, -9, -12, 6, 7);
    ctx.fillStyle = '#232227';
    ctx.fill();
    ellipse(ctx, 9, -12, 6, 7);
    ctx.fill();
    // head
    ellipse(ctx, 0, -200, 150, 140);
    fillStroke(ctx, '#f5c9a5', 4);
    // hair under the cap
    for (let i = 0; i < 13; i++) {
      const a = Math.PI + 0.25 + (i / 12) * (Math.PI - 0.5);
      const x = Math.cos(a) * 150;
      const y = -200 + Math.sin(a) * 120;
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 6);
      ctx.quadraticCurveTo(x + Math.cos(a) * 26, y + 40, x + 16, y - 4);
      fillStroke(ctx, '#f2d06b', 3);
    }
    // backwards cap
    ctx.beginPath();
    ctx.moveTo(-150, -250);
    ctx.quadraticCurveTo(-140, -360, 0, -360);
    ctx.quadraticCurveTo(140, -360, 150, -250);
    ctx.quadraticCurveTo(0, -270, -150, -250);
    ctx.closePath();
    fillStroke(ctx, '#2a2a2e', 4);
    ctx.beginPath(); // brim sticking out the back
    ctx.moveTo(-140, -262);
    ctx.quadraticCurveTo(-230, -270, -250, -236);
    ctx.quadraticCurveTo(-200, -230, -146, -246);
    ctx.closePath();
    fillStroke(ctx, '#2a2a2e', 3.4);
    rrect(ctx, -30, -280, 60, 20, 6);
    fillStroke(ctx, '#3a3a40', 2.4);
    // face
    for (const s of [-1, 1]) {
      ellipse(ctx, s * 55, -200, 17, 22);
      ctx.fillStyle = '#1b1416';
      ctx.fill();
      ellipse(ctx, s * 55 - 6, -210, 6, 7);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ellipse(ctx, s * 95, -158, 26, 15);
      ctx.fillStyle = 'rgba(255,120,120,0.5)';
      ctx.fill();
    }
    ctx.beginPath(); // gap-toothed grin
    ctx.moveTo(-60, -150);
    ctx.quadraticCurveTo(0, -140 + 50 * grin, 60, -150);
    ctx.quadraticCurveTo(0, -128, -60, -150);
    ctx.closePath();
    fillStroke(ctx, '#7a2f3a', 3);
    rrect(ctx, -26, -147, 20, 16, 3);
    fillStroke(ctx, '#fff', 2);
    rrect(ctx, 6, -147, 20, 16, 3);
    fillStroke(ctx, '#fff', 2);
    void t;
  },

  /** Bully's hand reaching down from the top (or holding a guitar neck). */
  hand(ctx, g) {
    if (g.sleeve) {
      rrect(ctx, -46, -1600, 92, 1470, 10);
      fillStroke(ctx, '#8e2b33', 3);
      ctx.save();
      ctx.clip();
      for (let y = -1600; y < -120; y += 36) {
        ctx.fillStyle = 'rgba(40,10,20,0.35)';
        ctx.fillRect(-50, y, 100, 10);
      }
      ctx.fillStyle = 'rgba(255,200,200,0.18)';
      ctx.fillRect(-12, -1600, 10, 1500);
      ctx.restore();
    }
    if (g.wrist) {
      rrect(ctx, -36, -150, 72, 22, 6);
      fillStroke(ctx, '#2a2a2e', 3);
      for (let i = -2; i <= 2; i++) {
        ellipse(ctx, i * 13, -139, 3.6, 3.6);
        fillStroke(ctx, '#c9c9d0', 1.4);
      }
    }
    skinHand(ctx, g.color, g.sleeve ? 140 : 1600);
    if (g.item === 'mug') {
      ctx.save();
      ctx.translate(-4, 74);
      PROPS.mug(ctx, {}, g.t || 0);
      ctx.restore();
    } else if (g.item === 'plate') {
      ctx.save();
      ctx.translate(0, 14);
      PROPS.plate(ctx, { count: 4 }, 0);
      ctx.restore();
    } else if (g.item) {
      drawItem(ctx, g.item, 0, 14, 0);
    }
  },

  /** Mr. ODD peeking in from the right edge: curls, brows, walrus moustache, the frown. */
  odd(ctx, g, t) {
    const smile = g.smile || 0;
    ctx.beginPath(); // plaid robe shoulder
    ctx.moveTo(-60, 230);
    ctx.quadraticCurveTo(-40, 140, 60, 120);
    ctx.lineTo(260, 120);
    ctx.lineTo(260, 230);
    ctx.closePath();
    fillStroke(ctx, '#8e2b33', 4);
    ctx.save();
    ctx.clip();
    for (let x = -60; x < 260; x += 34) {
      ctx.fillStyle = 'rgba(40,10,20,0.35)';
      ctx.fillRect(x, 120, 10, 120);
    }
    for (let y = 130; y < 240; y += 34) {
      ctx.fillStyle = 'rgba(255,200,200,0.18)';
      ctx.fillRect(-60, y, 320, 8);
    }
    ctx.restore();
    ellipse(ctx, 70, 0, 150, 160);
    fillStroke(ctx, '#f0c39c', 4);
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 1.05 + (i / 15) * Math.PI * 0.95;
      ellipse(ctx, 70 + Math.cos(a) * 140, -10 + Math.sin(a) * 150, 30, 26);
      fillStroke(ctx, i % 4 === 0 ? '#7d7779' : '#3b3133', 3);
    }
    ellipse(ctx, -76, 10, 22, 32); // ear
    fillStroke(ctx, '#e8b48c', 3.4);
    for (const s of [-1, 1]) {
      const ex = 70 + s * 58;
      ctx.beginPath(); // heavy brows
      ctx.moveTo(ex - 40, -64 + (s > 0 ? 10 : 0) * (1 - smile));
      ctx.quadraticCurveTo(ex, -92, ex + 40, -64 + (s < 0 ? 10 : 0) * (1 - smile));
      stroke(ctx, 18, '#2f2628');
      ellipse(ctx, ex, -30, 14, smile ? 9 : 12);
      ctx.fillStyle = '#1b1416';
      ctx.fill();
      ellipse(ctx, ex - 4, -34, 4, 4);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ellipse(ctx, 70, 20, 30, 34); // nose
    fillStroke(ctx, '#e8a985', 3.4);
    ctx.beginPath(); // walrus moustache
    ctx.moveTo(70, 44);
    ctx.bezierCurveTo(20, 30, -30, 60, -40, 110);
    ctx.bezierCurveTo(10, 100, 40, 84, 70, 74);
    ctx.bezierCurveTo(100, 84, 130, 100, 180, 110);
    ctx.bezierCurveTo(170, 60, 120, 30, 70, 44);
    ctx.closePath();
    fillStroke(ctx, '#2a2224', 3.4);
    ctx.beginPath(); // the frown, which softens into a tiny smile
    ctx.moveTo(44, 108);
    ctx.quadraticCurveTo(70, 108 - 16 + smile * 30, 96, 108);
    stroke(ctx, 4);
    void t;
  },
};

export function drawGuest(ctx, g, t, view) {
  const fn = GUESTS[g.type];
  if (!fn) return;
  ctx.save();
  ctx.globalAlpha = g.alpha ?? 1;
  ctx.translate(g.x - view.x, g.y - view.y);
  const s = (g.s || 1) * view.scale;
  ctx.scale(s * (g.flip ? -1 : 1), s);
  if (g.rot) ctx.rotate(g.rot);
  fn(ctx, g, t);
  ctx.restore();
}

export { PROPS, GUESTS, heart, note, star };
