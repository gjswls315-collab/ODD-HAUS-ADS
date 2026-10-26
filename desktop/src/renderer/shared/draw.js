// Canvas drawing for the ODD HAUS small friends: flat colours, thick soft outlines,
// rubber-hose arms and legs, white gloves, sneakers, blushing cheeks.
// Every friend is drawn in "units" with the feet at (0, 0) and up being -y; one unit is one
// pixel at size 1. Everything here is a pure function of (state, time).

export const INK = '#3d2c2e';
const LINE = 2.3;
const BLUSH = 'rgba(255, 128, 150, 0.55)';
const HATCH = '#e46f88';

export const FRIEND_IDS = ['vin', 'picker', 'aa', 'locke', 'rex'];

// Rig anchors per friend (units). sh = shoulders, hip = leg tops, face = centre between the eyes.
export const RIG = {
  vin: { top: -63, head: -63, face: [0, -46], sh: [[-21, -36], [21, -36]], hip: [[-6, -15], [6, -15]], hw: 24, eye: 'pie', mouth: 'smile', brows: null, shoe: ['#e0483f', '#fff'] },
  picker: { top: -66, head: -66, face: [0, -51], sh: [[-16, -47], [16, -47]], hip: [[-5, -17], [5, -17]], hw: 25, eye: 'bead', mouth: 'frown', brows: 'angry', shoe: ['#e0483f', '#fff'] },
  aa: { top: -80, head: -67, face: [0, -55], sh: [[-15, -39], [15, -39]], hip: [[-7, -15], [7, -15]], hw: 16, eye: 'bead', mouth: 'w', brows: 'worried', shoe: ['#2b2a2e', '#fff'] },
  locke: { top: -80, head: -73, face: [0, -57], sh: [[-11, -40], [11, -40]], hip: [[-6, -15], [6, -15]], hw: 16, eye: 'bead', mouth: 'smile', brows: null, shoe: ['#7a4a2b', '#f3e6d0'] },
  rex: { top: -92, head: -75, face: [0, -61], sh: [[-12, -44], [12, -44]], hip: [[-7, -14], [7, -14]], hw: 18, eye: 'bead', mouth: 'flat', brows: 'proud', shoe: ['#2b2a2e', '#57525a'] },
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ primitives

export function stroke(ctx, w = LINE, color = INK) {
  ctx.lineWidth = w;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function fillStroke(ctx, fill, w = LINE) {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, w);
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function hose(ctx, x1, y1, x2, y2, bend, w = 2.6) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx - (dy / len) * bend, my + (dx / len) * bend, x2, y2);
  stroke(ctx, w);
}

export function glove(ctx, x, y, r = 4.4, side = 1) {
  ellipse(ctx, x + side * 2.6, y - 1.2, 2.1, 1.8);
  fillStroke(ctx, '#fff', 1.5);
  ellipse(ctx, x, y, r, r * 0.95);
  fillStroke(ctx, '#fff', 1.6);
}

function sneaker(ctx, x, y, [top, sole]) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-4.5, 0);
  ctx.lineTo(-4.5, -4.6);
  ctx.quadraticCurveTo(-4.5, -7, -1.5, -7);
  ctx.lineTo(1.5, -7);
  ctx.quadraticCurveTo(3, -4, 7, -3.6);
  ctx.quadraticCurveTo(9.4, -3.2, 9.4, -1.2);
  ctx.lineTo(9.4, 0);
  ctx.closePath();
  fillStroke(ctx, top, 1.6);
  rrect(ctx, -4.8, -2.2, 14.4, 2.4, 1.2);
  fillStroke(ctx, sole, 1.4);
  ctx.beginPath();
  ctx.moveTo(-0.5, -5.6);
  ctx.lineTo(1.6, -4.4);
  stroke(ctx, 1, sole);
  ctx.restore();
}

// ------------------------------------------------------------------ faces

function blush(ctx, x, y, s = 1) {
  ellipse(ctx, x, y, 3.8 * s, 2.3 * s);
  ctx.fillStyle = BLUSH;
  ctx.fill();
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    ctx.moveTo(x + i * 1.6 * s - 0.6 * s, y + 1.1 * s);
    ctx.lineTo(x + i * 1.6 * s + 0.6 * s, y - 1.1 * s);
  }
  stroke(ctx, 0.8, HATCH);
}

function eye(ctx, x, y, kind, style, look, side, onDark) {
  const lx = look[0] * 1.4;
  const ly = look[1] * 1.2;
  switch (kind) {
    case 'happy':
      ctx.beginPath();
      ctx.moveTo(x - 2.8, y + 0.8);
      ctx.quadraticCurveTo(x, y - 3.4, x + 2.8, y + 0.8);
      stroke(ctx, 1.7, onDark ? '#fff' : INK);
      return;
    case 'closed':
      ctx.beginPath();
      ctx.moveTo(x - 2.8, y);
      ctx.quadraticCurveTo(x, y + 2.2, x + 2.8, y);
      stroke(ctx, 1.6, onDark ? '#fff' : INK);
      return;
    case 'line':
      ctx.beginPath();
      ctx.moveTo(x - 2.6, y);
      ctx.lineTo(x + 2.6, y);
      stroke(ctx, 1.6, onDark ? '#fff' : INK);
      return;
    case 'dizzy': {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.3) {
        const r = a * 0.33;
        const px = x + Math.cos(a * side) * r;
        const py = y + Math.sin(a * side) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      stroke(ctx, 1, onDark ? '#fff' : INK);
      return;
    }
    case 'cross':
      ctx.beginPath();
      ctx.moveTo(x - 2.2, y - 2.2);
      ctx.lineTo(x + 2.2, y + 2.2);
      ctx.moveTo(x + 2.2, y - 2.2);
      ctx.lineTo(x - 2.2, y + 2.2);
      stroke(ctx, 1.5, onDark ? '#fff' : INK);
      return;
    case 'star':
      star(ctx, x, y, 3.4, 1.5, '#ffd34d');
      return;
    default:
      break;
  }
  const big = kind === 'wide' ? 1.25 : kind === 'small' ? 0.7 : 1;
  if (style === 'pie') {
    ellipse(ctx, x, y, 3.5 * big, 4.6 * big);
    fillStroke(ctx, '#fff', 1.3);
    ellipse(ctx, x + lx * 0.9, y + ly + 0.8, 1.8 * big, 2.5 * big);
    ctx.fillStyle = '#1b1416';
    ctx.fill();
    ellipse(ctx, x + lx * 0.9 - 0.6, y + ly - 0.4, 0.6, 0.7);
    ctx.fillStyle = '#fff';
    ctx.fill();
  } else {
    ellipse(ctx, x + lx, y + ly, 2.3 * big, 3 * big);
    ctx.fillStyle = '#1b1416';
    ctx.fill();
    ellipse(ctx, x + lx - 0.7, y + ly - 1.1, 0.85 * big, 0.95 * big);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  if (kind === 'sad') {
    ellipse(ctx, x + 1.6, y + 4.2, 0.9, 1.4);
    ctx.fillStyle = '#7fc6ff';
    ctx.fill();
  }
}

function mouth(ctx, x, y, kind, t, onDark) {
  const ink = onDark ? '#fff' : INK;
  ctx.beginPath();
  switch (kind) {
    case 'w':
      ctx.moveTo(x - 2.8, y - 0.4);
      ctx.quadraticCurveTo(x - 1.4, y + 1.8, x, y);
      ctx.quadraticCurveTo(x + 1.4, y + 1.8, x + 2.8, y - 0.4);
      stroke(ctx, 1.3, ink);
      return;
    case 'smile':
      ctx.moveTo(x - 2.4, y - 0.5);
      ctx.quadraticCurveTo(x, y + 2.2, x + 2.4, y - 0.5);
      stroke(ctx, 1.3, ink);
      return;
    case 'frown':
      ctx.moveTo(x - 2.2, y + 1);
      ctx.quadraticCurveTo(x, y - 1.2, x + 2.2, y + 1);
      stroke(ctx, 1.3, ink);
      return;
    case 'flat':
      ctx.moveTo(x - 2, y + 0.4);
      ctx.lineTo(x + 2, y + 0.4);
      stroke(ctx, 1.3, ink);
      return;
    case 'wavy':
      ctx.moveTo(x - 3, y);
      for (let i = 1; i <= 4; i++) ctx.lineTo(x - 3 + i * 1.5, y + (i % 2 ? -0.9 : 0.9));
      stroke(ctx, 1.1, ink);
      return;
    case 'o':
      ellipse(ctx, x, y + 0.6, 1.5, 1.8);
      fillStroke(ctx, '#7a2f3a', 1.1);
      return;
    case 'eat': {
      const open = Math.sin(t * 14) > 0;
      if (open) {
        ellipse(ctx, x, y + 0.6, 2, 1.6);
        fillStroke(ctx, '#7a2f3a', 1.1);
      } else {
        ctx.moveTo(x - 2.8, y - 0.4);
        ctx.quadraticCurveTo(x - 1.4, y + 1.8, x, y);
        ctx.quadraticCurveTo(x + 1.4, y + 1.8, x + 2.8, y - 0.4);
        stroke(ctx, 1.3, ink);
      }
      return;
    }
    case 'open':
    case 'sing': {
      const h = kind === 'sing' ? 2.4 + Math.sin(t * 9) * 0.7 : 2.8;
      ctx.moveTo(x - 3, y - 0.6);
      ctx.quadraticCurveTo(x, y - 0.2, x + 3, y - 0.6);
      ctx.quadraticCurveTo(x + 2.6, y + h * 1.4, x, y + h * 1.4);
      ctx.quadraticCurveTo(x - 2.6, y + h * 1.4, x - 3, y - 0.6);
      fillStroke(ctx, '#7a2f3a', 1.2);
      ellipse(ctx, x, y + h * 1.05, 1.6, 0.8);
      ctx.fillStyle = '#ef8a9a';
      ctx.fill();
      return;
    }
    default:
      ctx.moveTo(x - 2.2, y);
      ctx.quadraticCurveTo(x, y + 1.6, x + 2.2, y);
      stroke(ctx, 1.3, ink);
  }
}

function brows(ctx, fx, fy, kind, sp, onDark) {
  if (!kind) return;
  const ink = onDark ? '#fff' : INK;
  ctx.beginPath();
  if (kind === 'angry') {
    ctx.moveTo(fx - sp - 3.2, fy - 6.6);
    ctx.lineTo(fx - sp + 2.4, fy - 4.6);
    ctx.moveTo(fx + sp + 3.2, fy - 6.6);
    ctx.lineTo(fx + sp - 2.4, fy - 4.6);
    stroke(ctx, 2.1, ink);
  } else if (kind === 'worried') {
    ctx.moveTo(fx - sp - 2.6, fy - 5.2);
    ctx.lineTo(fx - sp + 2.2, fy - 6.6);
    ctx.moveTo(fx + sp + 2.6, fy - 5.2);
    ctx.lineTo(fx + sp - 2.2, fy - 6.6);
    stroke(ctx, 1.3, ink);
  } else if (kind === 'proud') {
    ctx.moveTo(fx - sp - 2.6, fy - 6.2);
    ctx.quadraticCurveTo(fx - sp, fy - 7.8, fx - sp + 2.6, fy - 6.2);
    ctx.moveTo(fx + sp - 2.6, fy - 6.2);
    ctx.quadraticCurveTo(fx + sp, fy - 7.8, fx + sp + 2.6, fy - 6.2);
    stroke(ctx, 1.4, ink);
  }
}

export function drawFace(ctx, f) {
  const { x, y, eyes, mouthKind, look, browKind, style, onDark, t, blushOn = true, sp = 8.6 } = f;
  if (blushOn) {
    blush(ctx, x - sp - 3.2, y + 4.4);
    blush(ctx, x + sp + 3.2, y + 4.4);
  }
  eye(ctx, x - sp, y, eyes, style, look, -1, onDark);
  eye(ctx, x + sp, y, eyes, style, look, 1, onDark);
  brows(ctx, x, y, browKind, sp, onDark);
  mouth(ctx, x + look[0] * 0.8, y + 6.2, mouthKind, t, onDark);
}

export function star(ctx, x, y, r, r2, fill, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r2 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  fillStroke(ctx, fill, 1.2);
}

export function heart(ctx, x, y, s, fill = '#ff7a9a') {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  fillStroke(ctx, fill, 1.3);
}

export function note(ctx, x, y, s, fill = INK) {
  ellipse(ctx, x, y, s * 0.55, s * 0.4, -0.4);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.48, y - s * 0.1);
  ctx.lineTo(x + s * 0.48, y - s * 1.6);
  ctx.quadraticCurveTo(x + s * 1.2, y - s * 1.2, x + s * 1.1, y - s * 0.7);
  stroke(ctx, s * 0.22, fill);
}

// ------------------------------------------------------------------ bodies

const BODY = {
  vin(ctx, st, t) {
    const cy = -38;
    const spin = st.spin || 0;
    ellipse(ctx, 0, cy, 24, 24);
    fillStroke(ctx, '#232026', 2.4);
    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate(spin);
    for (const r of [20.5, 17, 13.5]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      stroke(ctx, 0.8, '#3f3842');
    }
    ctx.beginPath();
    ctx.arc(0, 0, 21.5, -2.5, -1.4);
    stroke(ctx, 2, 'rgba(255,255,255,0.28)');
    ctx.beginPath(); // the scratch that makes the needle skip
    ctx.moveTo(10, 9);
    ctx.lineTo(13, 7);
    ctx.lineTo(14, 11);
    ctx.lineTo(17, 9.5);
    stroke(ctx, 1, 'rgba(255,255,255,0.45)');
    ellipse(ctx, 0, 6, 9, 9);
    fillStroke(ctx, '#f3e2c0', 1.4);
    ellipse(ctx, 0, 6, 9, 9);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#e8574a';
    ctx.fillRect(-10, 8, 20, 8);
    ctx.restore();
    ellipse(ctx, 0, 6, 1.1, 1.1);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.restore();
    void t;
  },
  picker(ctx) {
    ctx.beginPath();
    ctx.moveTo(-18, -67);
    ctx.quadraticCurveTo(0, -71, 18, -67);
    ctx.quadraticCurveTo(28, -64, 24, -52);
    ctx.quadraticCurveTo(14, -26, 4, -16);
    ctx.quadraticCurveTo(0, -12.5, -4, -16);
    ctx.quadraticCurveTo(-14, -26, -24, -52);
    ctx.quadraticCurveTo(-28, -64, -18, -67);
    ctx.closePath();
    fillStroke(ctx, '#e5453d', 2.4);
    ctx.beginPath();
    ctx.moveTo(-17, -64);
    ctx.quadraticCurveTo(-5, -67, 6, -66);
    stroke(ctx, 2, 'rgba(255,255,255,0.35)');
    ctx.save(); // the white cross sticker
    ctx.translate(-15, -59);
    ctx.rotate(-0.35);
    rrect(ctx, -4.6, -1.6, 9.2, 3.2, 0.8);
    fillStroke(ctx, '#fff', 1.1);
    rrect(ctx, -1.6, -4.6, 3.2, 9.2, 0.8);
    fillStroke(ctx, '#fff', 1.1);
    rrect(ctx, -1.5, -1.5, 3, 3, 0.5);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  },
  aa(ctx, st, t) {
    rrect(ctx, -15, -67, 30, 53, 9);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#2f5bd3';
    ctx.fillRect(-16, -68, 32, 56);
    ctx.fillStyle = '#f4c531';
    ctx.fillRect(-16, -68, 32, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-11, -66, 3.2, 50);
    ctx.restore();
    rrect(ctx, -15, -67, 30, 53, 9);
    stroke(ctx, 2.4);
    ctx.beginPath();
    ctx.moveTo(-15, -42);
    ctx.lineTo(15, -42);
    stroke(ctx, 1.4);
    const scared = st.scared && Math.sin(t * 16) > 0;
    ctx.beginPath(); // lightning bolt, blinks red when A.A. is scared
    ctx.moveTo(2, -38);
    ctx.lineTo(-5, -27);
    ctx.lineTo(0, -27);
    ctx.lineTo(-3, -18);
    ctx.lineTo(6, -30);
    ctx.lineTo(1, -30);
    ctx.lineTo(4, -38);
    ctx.closePath();
    fillStroke(ctx, scared ? '#ff4b4b' : '#ffe27a', 1.2);
  },
  locke(ctx) {
    rrect(ctx, -11, -45, 22, 31, 6);
    fillStroke(ctx, '#3e6b4a', 2.2);
    ctx.beginPath(); // lapels
    ctx.moveTo(-5, -45);
    ctx.lineTo(0, -36);
    ctx.lineTo(5, -45);
    stroke(ctx, 1.3);
    ellipse(ctx, 0, -31, 1.1, 1.1);
    ctx.fillStyle = '#d7c27a';
    ctx.fill();
    ellipse(ctx, 0, -24, 1.1, 1.1);
    ctx.fill();
    ctx.beginPath(); // key bit peeking out under the jacket
    ctx.moveTo(-3, -15);
    ctx.lineTo(-3, -12);
    ctx.lineTo(9, -12);
    ctx.lineTo(9, -16);
    ctx.lineTo(6, -16);
    ctx.lineTo(6, -14);
    ctx.lineTo(3, -14);
    ctx.lineTo(3, -15);
    ctx.closePath();
    fillStroke(ctx, '#e0b03e', 1.4);
    ellipse(ctx, 0, -58, 15.5, 15.5);
    fillStroke(ctx, '#e0b03e', 2.4);
    ellipse(ctx, 0, -58, 12.5, 12.5);
    stroke(ctx, 1, '#b8862a');
    ctx.beginPath();
    ctx.arc(0, -58, 13.5, -2.6, -1.6);
    stroke(ctx, 1.8, 'rgba(255,255,255,0.45)');
  },
  rex(ctx, st, t) {
    ctx.beginPath(); // royal cape behind the body
    const flap = Math.sin(t * 3) * 1.5;
    ctx.moveTo(-10, -50);
    ctx.quadraticCurveTo(-24, -32, -22 - flap, -15);
    ctx.lineTo(22 + flap, -15);
    ctx.quadraticCurveTo(24, -32, 10, -50);
    ctx.closePath();
    fillStroke(ctx, '#c8343a', 2.2);
    ellipse(ctx, 0, -16, 17, 4.6);
    fillStroke(ctx, '#b07a3a', 2.2);
    ctx.beginPath();
    ctx.moveTo(-8, -47);
    ctx.quadraticCurveTo(-7, -30, -13, -18);
    ctx.lineTo(13, -18);
    ctx.quadraticCurveTo(7, -30, 8, -47);
    ctx.closePath();
    fillStroke(ctx, '#c98f45', 2.2);
    ctx.beginPath();
    ctx.moveTo(-3, -44);
    ctx.quadraticCurveTo(-3.5, -30, -7, -21);
    stroke(ctx, 1.8, 'rgba(255,255,255,0.35)');
    ellipse(ctx, 0, -48, 14, 4.2); // ermine collar
    fillStroke(ctx, '#fff', 1.8);
    for (const dx of [-8, -2, 5, 10]) {
      ellipse(ctx, dx, -48 + (dx % 3) * 0.4, 0.9, 1.2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
    ellipse(ctx, 0, -62, 13.5, 13);
    fillStroke(ctx, '#d39a4f', 2.4);
    ctx.beginPath();
    ctx.arc(0, -62, 10.5, -2.6, -1.7);
    stroke(ctx, 1.8, 'rgba(255,255,255,0.4)');
  },
};

// Built-in hats, drawn after the face.
const HAT = {
  aa(ctx) {
    ctx.beginPath();
    ctx.moveTo(-15.5, -64);
    ctx.quadraticCurveTo(-16, -82, 0, -82);
    ctx.quadraticCurveTo(16, -82, 15.5, -64);
    ctx.closePath();
    fillStroke(ctx, '#2b2a2e', 2.2);
    for (const x of [-9, -3, 3, 9]) {
      ctx.beginPath();
      ctx.moveTo(x, -78);
      ctx.lineTo(x, -70);
      stroke(ctx, 0.9, '#4a484f');
    }
    rrect(ctx, -16.5, -69, 33, 6.5, 3);
    fillStroke(ctx, '#3a383e', 1.8);
  },
  locke(ctx) {
    ctx.beginPath();
    ctx.moveTo(-14, -66);
    ctx.quadraticCurveTo(-14, -82, 0, -82);
    ctx.quadraticCurveTo(14, -82, 14, -66);
    ctx.closePath();
    fillStroke(ctx, '#8a5a35', 2.2);
    ctx.beginPath(); // brim pointing forward
    ctx.moveTo(6, -67);
    ctx.quadraticCurveTo(18, -69, 22, -65);
    ctx.quadraticCurveTo(14, -63.5, 6, -64.5);
    ctx.closePath();
    fillStroke(ctx, '#74482a', 1.8);
    ellipse(ctx, 0, -82, 2, 1.4);
    fillStroke(ctx, '#74482a', 1.2);
  },
  rex(ctx) {
    ctx.beginPath();
    ctx.moveTo(-11, -72);
    ctx.lineTo(-13, -84);
    ctx.lineTo(-6, -79);
    ctx.lineTo(0, -87);
    ctx.lineTo(6, -79);
    ctx.lineTo(13, -84);
    ctx.lineTo(11, -72);
    ctx.closePath();
    fillStroke(ctx, '#f2c14e', 2);
    rrect(ctx, -2, -96, 4, 10, 1);
    fillStroke(ctx, '#f2c14e', 1.5);
    rrect(ctx, -5, -93, 10, 4, 1);
    fillStroke(ctx, '#f2c14e', 1.5);
    ellipse(ctx, 0, -76, 1.8, 1.8);
    ctx.fillStyle = '#e04b5a';
    ctx.fill();
  },
};

// ------------------------------------------------------------------ poses

const HANG = (rig, side) => [rig.sh[side][0] + (side ? 5 : -5), rig.sh[side][1] + 13];

/**
 * Where hands and feet go for a pose. Returns glove/foot positions in friend units.
 * st: { pose, phase (gait), t0 (pose start) }
 */
export function poseRig(id, st, t) {
  const rig = RIG[id];
  const p = st.pose || 'stand';
  const ph = st.phase || 0;
  const pt = t - (st.t0 || 0);
  const out = {
    by: Math.sin(t * 2.2 + (st.seed || 0)) * 0.5,
    rot: 0,
    sq: 1,
    aL: HANG(rig, 0),
    aR: HANG(rig, 1),
    fL: [rig.hip[0][0] - 1, 0],
    fR: [rig.hip[1][0] + 1, 0],
    bendL: 3,
    bendR: -3,
    eyes: null,
    mouth: null,
  };
  const swingArms = (amp) => {
    out.aL = [out.aL[0] - Math.sin(ph) * amp, out.aL[1] - Math.abs(Math.cos(ph)) * 1.5];
    out.aR = [out.aR[0] + Math.sin(ph) * amp, out.aR[1] - Math.abs(Math.cos(ph)) * 1.5];
  };
  switch (p) {
    case 'walk':
    case 'run': {
      const amp = p === 'run' ? 7 : 5;
      out.fL = [rig.hip[0][0] + Math.sin(ph) * amp, -Math.max(0, Math.cos(ph)) * (p === 'run' ? 5 : 3.2)];
      out.fR = [rig.hip[1][0] - Math.sin(ph) * amp, -Math.max(0, -Math.cos(ph)) * (p === 'run' ? 5 : 3.2)];
      out.by = -Math.abs(Math.sin(ph)) * (p === 'run' ? 2.6 : 1.6);
      out.rot = p === 'run' ? 0.12 : 0.03;
      swingArms(p === 'run' ? 7 : 4.5);
      if (p === 'run') {
        out.aL[1] -= 4;
        out.aR[1] -= 4;
      }
      break;
    }
    case 'sit':
    case 'doze':
      out.by = 7;
      out.fL = [rig.hip[0][0] + 8, -1];
      out.fR = [rig.hip[1][0] + 10, -1];
      out.aL = [rig.sh[0][0] + 1, rig.sh[0][1] + 14];
      out.aR = [rig.sh[1][0] - 1, rig.sh[1][1] + 14];
      if (p === 'doze') {
        out.rot = 0.06 + Math.sin(t * 1.2) * 0.04;
        out.eyes = 'closed';
        out.mouth = 'o';
      }
      break;
    case 'sleep':
      out.lie = true;
      out.eyes = 'closed';
      out.mouth = 'w';
      out.by = Math.sin(t * 1.6) * 0.6;
      out.aL = [rig.sh[0][0] + 4, rig.sh[0][1] + 10];
      out.aR = [rig.sh[1][0] - 4, rig.sh[1][1] + 10];
      break;
    case 'wave':
      out.aR = [rig.sh[1][0] + 8 + Math.sin(t * 11) * 3, rig.sh[1][1] - 12];
      out.bendR = 4;
      out.mouth = 'open';
      break;
    case 'cheer':
      out.aL = [rig.sh[0][0] - 7, rig.sh[0][1] - 14 + Math.sin(t * 12) * 2];
      out.aR = [rig.sh[1][0] + 7, rig.sh[1][1] - 14 - Math.sin(t * 12) * 2];
      out.by = -Math.abs(Math.sin(t * 7)) * 3;
      out.eyes = 'happy';
      out.mouth = 'open';
      break;
    case 'dance': {
      const b = Math.sin(t * 6);
      out.rot = b * 0.13;
      out.by = -Math.abs(Math.cos(t * 6)) * 2.5;
      out.aL = [rig.sh[0][0] - 8, rig.sh[0][1] + (b > 0 ? -12 : 6)];
      out.aR = [rig.sh[1][0] + 8, rig.sh[1][1] + (b > 0 ? 6 : -12)];
      out.fL = [rig.hip[0][0] - 1, b > 0.4 ? -3 : 0];
      out.fR = [rig.hip[1][0] + 1, b < -0.4 ? -3 : 0];
      out.eyes = 'happy';
      out.mouth = 'w';
      break;
    }
    case 'jump':
    case 'fall':
      out.aL = [rig.sh[0][0] - 8, rig.sh[0][1] - 10];
      out.aR = [rig.sh[1][0] + 8, rig.sh[1][1] - 10];
      out.fL = [rig.hip[0][0] - 3, -3];
      out.fR = [rig.hip[1][0] + 3, -4];
      if (p === 'fall') out.eyes = 'wide';
      break;
    case 'held': {
      const k = Math.sin(t * 13);
      out.aL = [rig.sh[0][0] - 3, rig.sh[0][1] - 15];
      out.aR = [rig.sh[1][0] + 3, rig.sh[1][1] - 15];
      out.fL = [rig.hip[0][0] - 1 + k * 3, 2 + Math.max(0, k) * -3];
      out.fR = [rig.hip[1][0] + 1 - k * 3, 2 + Math.max(0, -k) * -3];
      out.rot = Math.sin(t * 4) * 0.1;
      out.eyes = 'wide';
      out.mouth = 'o';
      break;
    }
    case 'hang': {
      const k = Math.sin(t * 2.4 + (st.seed || 0));
      out.aL = [-2.5, rig.top - 4];
      out.aR = [2.5, rig.top - 4];
      out.bendL = 5;
      out.bendR = -5;
      out.fL = [rig.hip[0][0] + k * 2, 3];
      out.fR = [rig.hip[1][0] + k * 2, 3.5];
      break;
    }
    case 'eat': {
      const bite = Math.sin(t * 7) > 0;
      out.aL = [rig.face[0] - 5, rig.face[1] + (bite ? 9 : 12)];
      out.aR = [rig.face[0] + 5, rig.face[1] + (bite ? 9 : 12)];
      out.bendL = -4;
      out.bendR = 4;
      out.mouth = 'eat';
      break;
    }
    case 'hold':
      out.aL = [rig.face[0] - 6, rig.face[1] + 18];
      out.aR = [rig.face[0] + 6, rig.face[1] + 18];
      out.bendL = -5;
      out.bendR = 5;
      break;
    case 'holdup':
      out.aR = [rig.sh[1][0] + 3, rig.sh[1][1] - 16];
      out.bendR = 3;
      break;
    case 'point':
      out.aR = [rig.sh[1][0] + 15, rig.sh[1][1] - 2];
      out.bendR = 1;
      break;
    case 'clap': {
      const c = (Math.sin(t * 14) + 1) / 2;
      out.aL = [rig.face[0] - 2 - c * 5, rig.face[1] + 17];
      out.aR = [rig.face[0] + 2 + c * 5, rig.face[1] + 17];
      out.bendL = -4;
      out.bendR = 4;
      out.eyes = 'happy';
      out.mouth = 'open';
      break;
    }
    case 'shiver':
      out.by = Math.sin(t * 50) * 0.6;
      out.aL = [rig.face[0] - 5, rig.face[1] + 11];
      out.aR = [rig.face[0] + 5, rig.face[1] + 11];
      out.bendL = -4;
      out.bendR = 4;
      out.eyes = 'wide';
      out.mouth = 'wavy';
      break;
    case 'bow': {
      const k = clamp(pt / 0.6, 0, 1) * (pt < 1.6 ? 1 : clamp(1 - (pt - 1.6) / 0.5, 0, 1));
      out.rot = 0.55 * k;
      out.aL = [rig.sh[0][0] + 4, rig.sh[0][1] + 13];
      out.aR = [rig.sh[1][0] - 4, rig.sh[1][1] + 13];
      out.eyes = k > 0.5 ? 'closed' : null;
      break;
    }
    case 'sing':
      out.rot = Math.sin(t * 3) * 0.08;
      out.aR = [rig.sh[1][0] + 12, rig.sh[1][1] - 6 + Math.sin(t * 3) * 2];
      out.aL = [rig.face[0] - 4, rig.face[1] + 10];
      out.bendL = -4;
      out.mouth = 'sing';
      out.eyes = 'closed';
      break;
    case 'headbang': {
      const k = Math.sin(t * 16);
      out.rot = k * 0.18;
      out.by = -Math.abs(k) * 2;
      out.aL = [rig.sh[0][0] - 8, rig.sh[0][1] - 12];
      out.aR = [rig.sh[1][0] + 8, rig.sh[1][1] - 12];
      out.eyes = 'closed';
      out.mouth = 'open';
      break;
    }
    case 'stretch': {
      const k = (Math.sin(t * 2) + 1) / 2;
      out.aL = [rig.sh[0][0] + 2, rig.sh[0][1] - 18 - k * 4];
      out.aR = [rig.sh[1][0] - 2, rig.sh[1][1] - 18 - k * 4];
      out.by = -k * 2;
      out.eyes = 'closed';
      out.mouth = 'o';
      break;
    }
    case 'type': {
      // at the desk: hands on the keyboard, raised by st.handL / st.handR (0 = on the keys)
      const ky = st.keyY ?? -30;
      out.aL = [-15 - (st.reachL || 0), ky - (st.handL || 0) * 9];
      out.aR = [15 + (st.reachR || 0), ky - (st.handR || 0) * 9];
      out.bendL = -3;
      out.bendR = 3;
      out.by = (st.squash || 0) * 2;
      out.look = [0, 0.7];
      break;
    }
    case 'look':
      out.look = [0, -1];
      break;
    case 'think':
      out.aR = [rig.face[0] + 4, rig.face[1] + 9];
      out.bendR = 6;
      out.look = [0.6, -0.8];
      break;
    case 'push':
      out.rot = 0.18;
      out.aL = [rig.sh[0][0] + 16, rig.sh[0][1] + 2];
      out.aR = [rig.sh[1][0] + 12, rig.sh[1][1] + 4];
      out.fL = [rig.hip[0][0] - 6 + Math.sin(t * 8) * 3, -Math.max(0, Math.cos(t * 8)) * 2];
      out.fR = [rig.hip[1][0] - 4 - Math.sin(t * 8) * 3, -Math.max(0, -Math.cos(t * 8)) * 2];
      out.mouth = 'wavy';
      break;
    default:
      break;
  }
  return out;
}

// ------------------------------------------------------------------ items & accessories

export function drawItem(ctx, kind, x, y, t, side = 1) {
  ctx.save();
  ctx.translate(x, y);
  switch (kind) {
    case 'scepter':
      rrect(ctx, -1.2, -20, 2.4, 22, 1);
      fillStroke(ctx, '#f2c14e', 1.3);
      ellipse(ctx, 0, -21, 3.2, 3.2);
      fillStroke(ctx, '#e04b5a', 1.3);
      break;
    case 'umbrella': {
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -34);
      stroke(ctx, 1.6);
      ctx.beginPath();
      ctx.moveTo(-26, -30);
      ctx.quadraticCurveTo(0, -60, 26, -30);
      for (let i = 3; i >= -3; i--) ctx.quadraticCurveTo(i * 8.6 + 4.3, -34, i * 8.6 - 4.3 + 0.01, -30);
      ctx.closePath();
      fillStroke(ctx, side > 0 ? '#ffb7c6' : '#9fd3ff', 2);
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.quadraticCurveTo(0, 8, 3.4, 8);
      stroke(ctx, 1.6);
      break;
    }
    case 'cookie':
      ellipse(ctx, 0, -2, 5.5, 5.5);
      fillStroke(ctx, '#e3a85d', 1.4);
      for (const [dx, dy] of [[-2, -3], [2, -1], [-1, 1]]) {
        ellipse(ctx, dx, dy - 2, 0.9, 0.9);
        ctx.fillStyle = '#5b3524';
        ctx.fill();
      }
      break;
    case 'flag':
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -26);
      stroke(ctx, 1.4);
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.quadraticCurveTo(8, -26 + Math.sin(t * 8) * 2, 14, -22);
      ctx.lineTo(0, -17);
      ctx.closePath();
      fillStroke(ctx, '#ff7a6b', 1.3);
      break;
    case 'guitar':
      ctx.rotate(-0.6);
      ellipse(ctx, 0, 4, 6, 7);
      fillStroke(ctx, '#d63c3c', 1.4);
      rrect(ctx, -1.2, -18, 2.4, 16, 1);
      fillStroke(ctx, '#5b3a2a', 1.2);
      ellipse(ctx, 0, 3, 1.6, 1.6);
      ctx.fillStyle = INK;
      ctx.fill();
      break;
    case 'pillow':
      rrect(ctx, -9, -8, 18, 11, 5);
      fillStroke(ctx, '#fff3f6', 1.6);
      ctx.beginPath();
      ctx.moveTo(-4, -3);
      ctx.lineTo(4, -3);
      stroke(ctx, 1, '#f0b6c4');
      break;
    case 'flashlight':
      rrect(ctx, -2, -10, 4, 12, 1.4);
      fillStroke(ctx, '#ffd34d', 1.2);
      ctx.beginPath();
      ctx.moveTo(-2.5, -10);
      ctx.lineTo(-14, -48);
      ctx.lineTo(14, -48);
      ctx.lineTo(2.5, -10);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 240, 170, 0.35)';
      ctx.fill();
      break;
    case 'candy':
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -8);
      stroke(ctx, 1.4, '#fff');
      ellipse(ctx, 0, -11, 4.5, 4.5);
      fillStroke(ctx, '#ff8fb0', 1.3);
      ctx.beginPath();
      ctx.arc(0, -11, 2.2, 0, 4.5);
      stroke(ctx, 1, '#fff');
      break;
    case 'letter':
      rrect(ctx, -7, -9, 14, 10, 1.2);
      fillStroke(ctx, '#fffaf0', 1.3);
      ctx.beginPath();
      ctx.moveTo(-7, -9);
      ctx.lineTo(0, -3.5);
      ctx.lineTo(7, -9);
      stroke(ctx, 1);
      heart(ctx, 0, -4.4, 1.6, '#ff7a9a');
      break;
    case 'mug':
      rrect(ctx, -5, -10, 9, 10, 2);
      fillStroke(ctx, '#fff', 1.3);
      ctx.beginPath();
      ctx.arc(4.5, -5, 2.6, -1.3, 1.3);
      stroke(ctx, 1.3);
      break;
    case 'songpyeon':
      ellipse(ctx, 0, -3, 5.5, 3.6);
      fillStroke(ctx, '#bde3a3', 1.3);
      break;
    case 'flower':
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -9);
      stroke(ctx, 1.3, '#4f8a43');
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        ellipse(ctx, Math.cos(a) * 3, -12 + Math.sin(a) * 3, 2.4, 2.4);
        fillStroke(ctx, '#ffb3c7', 0.9);
      }
      ellipse(ctx, 0, -12, 1.8, 1.8);
      fillStroke(ctx, '#ffd34d', 0.9);
      break;
    case 'sparkler':
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -14);
      stroke(ctx, 1, '#8b8b8b');
      for (let i = 0; i < 6; i++) {
        const a = t * 9 + i;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(Math.cos(a) * 6, -14 + Math.sin(a) * 6);
        stroke(ctx, 1, '#ffd34d');
      }
      break;
    case 'kite':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(30, -30, 46, -70 + Math.sin(t * 2) * 4);
      stroke(ctx, 0.8, '#6b5a5a');
      ctx.save();
      ctx.translate(46, -70 + Math.sin(t * 2) * 4);
      ctx.rotate(Math.sin(t * 2) * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      fillStroke(ctx, '#7fc6ff', 1.3);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      stroke(ctx, 0.8);
      ctx.restore();
      break;
    default:
      break;
  }
  ctx.restore();
}

const HATS = new Set(['nightcap', 'santa', 'witch', 'partyhat', 'ghost']);

function drawAccessory(ctx, id, kind, t) {
  const rig = RIG[id];
  const [fx, fy] = rig.face;
  const top = rig.head;
  ctx.save();
  switch (kind) {
    case 'glasses':
      for (const s of [-1, 1]) {
        rrect(ctx, fx + s * 8.6 - 5, fy - 4.5, 10, 8.5, 3);
        ctx.fillStyle = 'rgba(200,230,255,0.25)';
        ctx.fill();
        stroke(ctx, 1.5, '#3f6fa8');
      }
      ctx.beginPath();
      ctx.moveTo(fx - 3.6, fy - 1);
      ctx.lineTo(fx + 3.6, fy - 1);
      stroke(ctx, 1.4, '#3f6fa8');
      break;
    case 'nightcap':
      ctx.beginPath();
      ctx.moveTo(-14, top + 6);
      ctx.quadraticCurveTo(-6, top - 20, 16, top - 12 + Math.sin(t * 2) * 2);
      ctx.quadraticCurveTo(6, top - 6, 14, top + 6);
      ctx.closePath();
      fillStroke(ctx, '#8fb7ff', 2);
      rrect(ctx, -15, top + 2, 30, 6, 3);
      fillStroke(ctx, '#fff', 1.6);
      ellipse(ctx, 17, top - 12 + Math.sin(t * 2) * 2, 3, 3);
      fillStroke(ctx, '#fff', 1.4);
      break;
    case 'santa':
      ctx.beginPath();
      ctx.moveTo(-14, top + 6);
      ctx.quadraticCurveTo(-4, top - 22, 15, top - 10);
      ctx.quadraticCurveTo(8, top - 2, 14, top + 6);
      ctx.closePath();
      fillStroke(ctx, '#e0393e', 2);
      rrect(ctx, -15.5, top + 1.5, 31, 7, 3.5);
      fillStroke(ctx, '#fff', 1.6);
      ellipse(ctx, 16, top - 10, 3.4, 3.4);
      fillStroke(ctx, '#fff', 1.4);
      break;
    case 'witch':
      ctx.beginPath();
      ctx.moveTo(-10, top + 4);
      ctx.lineTo(3, top - 24);
      ctx.lineTo(10, top + 4);
      ctx.closePath();
      fillStroke(ctx, '#5a3a8a', 2);
      ellipse(ctx, 0, top + 4.5, 19, 4);
      fillStroke(ctx, '#5a3a8a', 2);
      rrect(ctx, -9, top - 1, 18, 4, 1);
      fillStroke(ctx, '#ff9a3c', 1.4);
      break;
    case 'partyhat':
      ctx.beginPath();
      ctx.moveTo(-9, top + 4);
      ctx.lineTo(0, top - 18);
      ctx.lineTo(9, top + 4);
      ctx.closePath();
      fillStroke(ctx, '#ffd34d', 1.8);
      ellipse(ctx, 0, top - 18, 2.6, 2.6);
      fillStroke(ctx, '#ff7a9a', 1.2);
      break;
    case 'antlers':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * 7, top + 3);
        ctx.quadraticCurveTo(s * 9, top - 10, s * 15, top - 16);
        ctx.moveTo(s * 9.5, top - 7);
        ctx.lineTo(s * 15, top - 7);
        stroke(ctx, 2.4, '#8a5a35');
      }
      break;
    case 'scarf':
      rrect(ctx, -RIG[id].hw * 0.7, fy + 11, RIG[id].hw * 1.4, 5, 2.5);
      fillStroke(ctx, '#ff8a6b', 1.5);
      rrect(ctx, RIG[id].hw * 0.3, fy + 13, 5, 10, 2);
      fillStroke(ctx, '#ff8a6b', 1.4);
      break;
    case 'flower':
      drawItem(ctx, 'flower', 9, top + 6, t);
      break;
    default:
      break;
  }
  ctx.restore();
}

function drawGhostSheet(ctx, id, t) {
  const rig = RIG[id];
  const top = rig.top - 2;
  const w = rig.hw + 4;
  ctx.beginPath();
  ctx.moveTo(-w, -12);
  ctx.quadraticCurveTo(-w - 2, top + 8, 0, top);
  ctx.quadraticCurveTo(w + 2, top + 8, w, -12);
  for (let i = 4; i >= 0; i--) {
    const x = -w + (i / 4) * 2 * w;
    ctx.quadraticCurveTo(x + w / 4, -6 + Math.sin(t * 6 + i) * 1.5, x, -12);
  }
  ctx.closePath();
  fillStroke(ctx, 'rgba(255,255,255,0.97)', 2.2);
  const fy = rig.face[1];
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 6, fy, 2.6, 3.6);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ellipse(ctx, 0, fy + 7, 2.4, 2.8);
  ctx.fillStyle = INK;
  ctx.fill();
}

// ------------------------------------------------------------------ friend

/**
 * Draws one friend with feet at (0,0). The caller translates/scales/flips the context.
 * st: { pose, phase, t0, expr:{eyes,mouth}, look:[x,y], item, acc:[], spin, scared, seed, blink }
 */
export function drawFriend(ctx, id, st, t) {
  const rig = RIG[id];
  if (!rig) return;
  const P = poseRig(id, st, t);
  const blinking = ((t + (st.seed || 0) * 3.1) % 4.3) < 0.13;
  const exprEyes = (st.expr && st.expr.eyes) || P.eyes || 'open';
  const eyes = exprEyes === 'open' && blinking ? 'closed' : exprEyes;
  const mouthKind = (st.expr && st.expr.mouth) || P.mouth || rig.mouth;
  const look = st.look || P.look || [0.5, 0];
  const acc = st.acc || [];
  const ghost = acc.includes('ghost');

  ctx.save();
  if (P.lie) {
    ctx.translate(rig.top * -0.45, -rig.hw);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.translate(0, P.by);

  // legs (behind the body)
  if (!ghost) {
    for (const [hip, foot] of [
      [rig.hip[0], P.fL],
      [rig.hip[1], P.fR],
    ]) {
      hose(ctx, hip[0], hip[1] - P.by * 0.3, foot[0], foot[1] - 4 - P.by, 1.2);
    }
  }

  ctx.save();
  ctx.translate(0, -16);
  ctx.rotate(P.rot);
  ctx.translate(0, 16);

  if (ghost) {
    drawGhostSheet(ctx, id, t);
  } else {
    BODY[id](ctx, st, t);
    const onDark = id === 'vin';
    drawFace(ctx, {
      x: rig.face[0],
      y: rig.face[1],
      eyes,
      mouthKind: id === 'vin' && mouthKind === 'smile' ? 'smile' : mouthKind,
      look,
      browKind: (st.expr && st.expr.brows !== undefined ? st.expr.brows : rig.brows) || null,
      style: rig.eye,
      onDark: onDark && rig.eye !== 'pie' ? true : false,
      t,
      sp: id === 'vin' ? 8 : id === 'aa' || id === 'locke' ? 6.6 : id === 'rex' ? 6.8 : 8.6,
    });
    if (!acc.some((a) => HATS.has(a)) && HAT[id]) HAT[id](ctx, st, t);
    for (const a of acc) drawAccessory(ctx, id, a, t);
  }

  // arms in front
  const [sl, sr] = rig.sh;
  hose(ctx, sl[0], sl[1], P.aL[0], P.aL[1], P.bendL);
  hose(ctx, sr[0], sr[1], P.aR[0], P.aR[1], P.bendR);
  const item = st.item || (id === 'rex' && !ghost ? 'scepter' : null);
  if (item && item !== 'scepter') drawItem(ctx, item, P.aR[0], P.aR[1], t);
  if (item === 'scepter') drawItem(ctx, 'scepter', P.aR[0] + 1, P.aR[1] + 2, t);
  glove(ctx, P.aL[0], P.aL[1], 4.4, -1);
  glove(ctx, P.aR[0], P.aR[1], 4.4, 1);
  ctx.restore();

  if (!ghost) {
    sneaker(ctx, P.fL[0] - 2, P.fL[1] - P.by, rig.shoe);
    sneaker(ctx, P.fR[0] - 2, P.fR[1] - P.by, rig.shoe);
  }
  ctx.restore();
  return P;
}

/** Height of a friend in units, for placing bubbles and emotes above the head. */
export function friendTop(id, st) {
  const rig = RIG[id];
  let top = rig.top;
  if (st && st.acc && st.acc.some((a) => HATS.has(a))) top = Math.min(top, rig.head - 20);
  if (st && st.pose === 'sit') top += 7;
  if (st && st.pose === 'sleep') top = -rig.hw * 2;
  return top;
}

// ------------------------------------------------------------------ emotes & bubbles

export function drawEmote(ctx, kind, x, y, t, age = 1) {
  const pop = Math.min(1, age * 5);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  switch (kind) {
    case 'heart':
      heart(ctx, 0, -2 - Math.sin(t * 4) * 1.5, 6);
      break;
    case 'hearts':
      heart(ctx, -7, -2 - Math.sin(t * 4) * 1.5, 4.5);
      heart(ctx, 6, -8 - Math.sin(t * 4 + 1) * 1.5, 5.5);
      break;
    case 'note':
      note(ctx, -4, 2 - Math.sin(t * 5) * 2, 7);
      note(ctx, 7, -6 - Math.cos(t * 5) * 2, 6);
      break;
    case 'sweat':
      ctx.beginPath();
      ctx.moveTo(14, -4);
      ctx.quadraticCurveTo(10, 2, 14, 4);
      ctx.quadraticCurveTo(18, 2, 14, -4);
      fillStroke(ctx, '#9fd8ff', 1.2);
      break;
    case 'anger':
      ctx.translate(12, -6);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(2, 1);
        ctx.quadraticCurveTo(2, 2, 5, 2);
        stroke(ctx, 1.8, '#e0393e');
      }
      break;
    case 'zzz':
      ctx.fillStyle = INK;
      ctx.font = '700 11px Jua, sans-serif';
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.6 + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.font = `${8 + i * 2.5}px Jua, sans-serif`;
        ctx.fillText('Z', 4 + k * 10 + i * 3, -k * 18);
      }
      ctx.globalAlpha = 1;
      break;
    case 'sparkle':
      star(ctx, -8, -4, 4.5 + Math.sin(t * 8) * 1, 1.8, '#ffe066');
      star(ctx, 8, -10, 3.5 + Math.cos(t * 8) * 1, 1.4, '#ffe066');
      break;
    case 'excl':
    case 'q':
    case 'dots': {
      const text = kind === 'excl' ? '!' : kind === 'q' ? '?' : '…';
      ctx.font = '20px Jua, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = kind === 'excl' ? '#e0393e' : INK;
      ctx.fillText(text, 0, 0);
      break;
    }
    case 'dizzy':
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * TAU) / 3;
        star(ctx, Math.cos(a) * 12, Math.sin(a) * 3 + 4, 3.2, 1.3, '#ffe066');
      }
      break;
    case 'light':
      ellipse(ctx, 0, -6, 6, 6.5);
      fillStroke(ctx, '#fff27a', 1.4);
      rrect(ctx, -3, 0, 6, 4, 1);
      fillStroke(ctx, '#c9c2b5', 1.2);
      break;
    default:
      break;
  }
  ctx.restore();
}

/**
 * Speech bubble whose tail points at (x, y). Drawn in screen pixels.
 * @returns the bubble's rect, so callers can keep bubbles inside the window
 */
export function drawBubble(ctx, x, y, text, { size = 14, maxW = 220, alpha = 1, bounds } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px Jua, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  const lines = wrap(ctx, text, maxW);
  const lh = size * 1.3;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.4;
  const h = lines.length * lh + size * 0.9;
  let bx = x - w / 2;
  const by = y - h - 9;
  if (bounds) bx = clamp(bx, bounds.x + 4, bounds.x + bounds.w - w - 4);
  const tx = clamp(x, bx + 12, bx + w - 12);
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, Math.min(14, h / 2));
  ctx.moveTo(tx - 6, by + h - 1);
  ctx.lineTo(tx, by + h + 8);
  ctx.lineTo(tx + 5, by + h - 1);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(bx + 12, by);
  ctx.arcTo(bx + w, by, bx + w, by + h, Math.min(14, h / 2));
  ctx.arcTo(bx + w, by + h, bx, by + h, Math.min(14, h / 2));
  ctx.lineTo(tx + 5, by + h);
  ctx.lineTo(tx, by + h + 8);
  ctx.lineTo(tx - 6, by + h);
  ctx.arcTo(bx, by + h, bx, by, Math.min(14, h / 2));
  ctx.arcTo(bx, by, bx + w, by, Math.min(14, h / 2));
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + size * 0.45 + lh * (i + 0.5)));
  ctx.restore();
  return { x: bx, y: by, w, h: h + 8 };
}

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        const sp = line.lastIndexOf(' ');
        if (sp > 0 && line.length - sp < 8) {
          out.push(line.slice(0, sp));
          line = line.slice(sp + 1) + ch;
        } else {
          out.push(line);
          line = ch;
        }
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}
