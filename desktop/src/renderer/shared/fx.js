// Particle effects for episodes: rain, snow, petals, confetti, notes, hearts, stars, fireworks.
// Effects live in global screen coordinates inside an area {x, y, w, h}.

import { ellipse, fillStroke, heart, note, star, stroke } from './draw.js';

const rand = (a, b) => a + Math.random() * (b - a);

const KINDS = {
  rain: { rate: 90, spawn: (a) => ({ x: rand(a.x, a.x + a.w), y: a.y - 20, vx: -30, vy: rand(420, 560), life: 3 }) },
  snow: { rate: 22, spawn: (a) => ({ x: rand(a.x, a.x + a.w), y: a.y - 10, vx: rand(-10, 10), vy: rand(25, 55), r: rand(2, 4.5), life: 30, ph: rand(0, 6) }) },
  petals: { rate: 10, spawn: (a) => ({ x: rand(a.x, a.x + a.w), y: a.y - 10, vx: rand(10, 40), vy: rand(30, 60), rot: rand(0, 6), vr: rand(-2, 2), life: 30, ph: rand(0, 6) }) },
  leaves: { rate: 6, spawn: (a) => ({ x: rand(a.x, a.x + a.w), y: a.y - 10, vx: rand(-20, 30), vy: rand(30, 50), rot: rand(0, 6), vr: rand(-2, 2), life: 30, ph: rand(0, 6), c: ['#f2a03d', '#e2643c', '#e8c547'][Math.floor(rand(0, 3))] }) },
  confetti: { burst: 70, spawn: (a) => ({ x: a.cx + rand(-20, 20), y: a.cy, vx: rand(-260, 260), vy: rand(-520, -220), g: 600, rot: rand(0, 6), vr: rand(-8, 8), life: 3.2, c: ['#ff6b6b', '#ffd34d', '#7fc6ff', '#b5f28c', '#ff9ad5'][Math.floor(rand(0, 5))] }) },
  notes: { rate: 3, spawn: (a) => ({ x: a.cx + rand(-60, 60), y: a.cy, vx: rand(-15, 15), vy: rand(-45, -30), life: 3, ph: rand(0, 6), c: ['#3d2c2e', '#e0483f', '#2f5bd3'][Math.floor(rand(0, 3))] }) },
  hearts: { rate: 3, spawn: (a) => ({ x: a.cx + rand(-60, 60), y: a.cy, vx: rand(-10, 10), vy: rand(-40, -25), life: 3, ph: rand(0, 6) }) },
  stars: { static: 40, spawn: (a) => ({ x: rand(a.x, a.x + a.w), y: rand(a.y, a.y + a.h * 0.75), r: rand(1.2, 3), ph: rand(0, 6), life: 1e9 }) },
  shooting: { rate: 0.5, spawn: (a) => ({ x: rand(a.x + a.w * 0.3, a.x + a.w), y: rand(a.y, a.y + a.h * 0.3), vx: -520, vy: 260, life: 1.1 }) },
  fireworks: { rate: 0.9, spawn: (a) => ({ x: rand(a.x + 40, a.x + a.w - 40), y: rand(a.y + 20, a.y + a.h * 0.5), life: 1.6, c: ['#ff6b6b', '#ffd34d', '#7fc6ff', '#ff9ad5'][Math.floor(rand(0, 4))] }) },
  grain: { static: 1, spawn: () => ({ life: 1e9 }) },
};

export class Fx {
  constructor() {
    this.systems = [];
  }

  /** @returns a handle with stop() */
  start(kind, area, { duration = Infinity } = {}) {
    const def = KINDS[kind];
    if (!def) return { stop() {} };
    const sys = { kind, def, area: { cx: area.x + area.w / 2, cy: area.y + area.h / 2, ...area }, parts: [], acc: 0, until: duration, age: 0, stopped: false };
    if (def.burst) for (let i = 0; i < def.burst; i++) sys.parts.push(def.spawn(sys.area));
    if (def.static) for (let i = 0; i < def.static; i++) sys.parts.push(def.spawn(sys.area));
    this.systems.push(sys);
    return {
      stop: () => {
        sys.stopped = true;
        if (def.static) sys.parts.length = 0;
      },
      move: (patch) => Object.assign(sys.area, patch),
    };
  }

  clear() {
    this.systems = [];
  }

  get active() {
    return this.systems.length > 0;
  }

  update(dt) {
    for (const s of this.systems) {
      s.age += dt;
      if (s.age > s.until) s.stopped = true;
      if (!s.stopped && s.def.rate) {
        s.acc += s.def.rate * dt * (s.area.w / 1000 + (s.kind === 'notes' || s.kind === 'hearts' ? 1 : 0.3));
        while (s.acc >= 1) {
          s.acc -= 1;
          s.parts.push(s.def.spawn(s.area));
        }
      }
      for (const p of s.parts) {
        p.life -= dt;
        if (p.g) p.vy += p.g * dt;
        if (p.vx !== undefined) {
          p.x += p.vx * dt + (p.ph !== undefined && s.kind !== 'stars' ? Math.sin(s.age * 2 + p.ph) * 0.4 : 0);
          p.y += p.vy * dt;
        }
        if (p.vr) p.rot += p.vr * dt;
      }
      const floor = s.area.floor ?? s.area.y + s.area.h;
      s.parts = s.parts.filter((p) => p.life > 0 && (p.y === undefined || p.y < floor + 4 || p.g));
    }
    this.systems = this.systems.filter((s) => !s.stopped || s.parts.length);
  }

  draw(ctx, t, view) {
    for (const s of this.systems) {
      for (const p of s.parts) drawPart(ctx, s, p, t, view);
    }
  }
}

function drawPart(ctx, s, p, t, view) {
  const x = p.x - view.x;
  const y = p.y - view.y;
  ctx.save();
  switch (s.kind) {
    case 'rain':
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 14);
      stroke(ctx, 1.6, 'rgba(110,160,220,0.75)');
      break;
    case 'snow':
      ellipse(ctx, x + Math.sin(t * 1.5 + p.ph) * 6, y, p.r, p.r);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,140,170,0.6)';
      ctx.stroke();
      break;
    case 'petals':
    case 'leaves':
      ctx.translate(x + Math.sin(t * 1.3 + p.ph) * 10, y);
      ctx.rotate(p.rot);
      ellipse(ctx, 0, 0, 5, 3);
      fillStroke(ctx, s.kind === 'petals' ? '#ffc4d6' : p.c, 1);
      break;
    case 'confetti':
      ctx.translate(x, y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(-4, -2.5, 8, 5);
      break;
    case 'notes':
      ctx.globalAlpha = Math.min(1, p.life);
      note(ctx, x + Math.sin(t * 3 + p.ph) * 6, y, 8, p.c);
      break;
    case 'hearts':
      ctx.globalAlpha = Math.min(1, p.life);
      heart(ctx, x + Math.sin(t * 3 + p.ph) * 6, y, 6);
      break;
    case 'stars':
      star(ctx, x, y, p.r * (1.6 + Math.sin(t * 3 + p.ph) * 0.6), p.r * 0.7, '#fff6b0');
      break;
    case 'shooting': {
      const g = ctx.createLinearGradient(x, y, x + 90, y - 45);
      g.addColorStop(0, 'rgba(255,255,220,0.95)');
      g.addColorStop(1, 'rgba(255,255,220,0)');
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 90, y - 45);
      stroke(ctx, 3, g);
      star(ctx, x, y, 5, 2, '#fffbd0');
      break;
    }
    case 'fireworks': {
      const k = 1 - p.life / 1.6;
      ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * k * 20, y + Math.sin(a) * k * 20 + k * k * 20);
        ctx.lineTo(x + Math.cos(a) * k * 60, y + Math.sin(a) * k * 60 + k * k * 30);
        stroke(ctx, 2.4, p.c);
      }
      break;
    }
    default:
      break;
  }
  ctx.restore();
}
