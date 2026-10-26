// One transparent, click-through window per screen. The main screen's window runs the world;
// the others draw snapshots of it so friends can walk across monitors.

import { drawFriend, drawEmote, drawBubble, friendTop, ellipse, INK } from '../shared/draw.js';
import { drawProp, drawGuest } from '../shared/props.js';
import { connect, loadFonts } from '../shared/bridge.js';
import { World, clock } from './world.js';
import { Director } from './director.js';

const odd = await connect('overlay');
await loadFonts();
const boot = await odd.bootstrap();
if (!window.odd && !location.search.includes('transparent')) document.body.classList.add('preview');

const role = boot.role; // 'world' | 'mirror'
let settings = boot.settings;
let displays = boot.displays;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const view = { x: 0, y: 0, w: 0, h: 0, scale: 1, dpr: 1 };

function placeView() {
  const me = displays.find((d) => d.id === boot.displayId) || displays.find((d) => d.primary) || displays[0];
  view.x = me.x;
  view.y = me.y;
  view.w = innerWidth;
  view.h = innerHeight;
  view.dpr = devicePixelRatio || 1;
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
}
placeView();
addEventListener('resize', placeView);

let world = null;
let director = null;
let mirror = null; // latest snapshot from the world window

if (role === 'world') {
  world = new World({ displays, worldDisplayId: boot.displayId, settings, desk: boot.desk });
  director = new Director(world, { onState: (s) => odd.episodeState(s) });
  world.onAutoEpisode = () => director.play('random', { auto: true });
  odd.onEpisode(async (msg) => {
    if (msg && msg.action === 'play') {
      const res = await director.play(msg.id);
      if (!res.ok) odd.episodeState({ playing: director.playing, error: res });
    }
  });
  odd.onTyping((ev) => world.onTyping(ev));
  odd.onRemind((m) => world.onRemind(m));
  odd.onDesk((b) => world.setDesk(b));
  odd.onPoke((p) => p && world.poke(p.id));
  window.__world = world;
  window.__director = director;
} else {
  odd.onSnapshot((snap) => {
    mirror = snap;
  });
}

odd.onSettings((s) => {
  settings = s;
  if (world) world.setSettings(s);
});
odd.onDisplays((list) => {
  displays = list;
  placeView();
  if (world) world.setDisplays(list);
});

// ------------------------------------------------------------------ pointer

let hover = null;
let interactive = false;
let press = null; // { id, x, y, dragging }

const toGlobal = (e) => [view.x + e.clientX, view.y + e.clientY];

function friendAt(gx, gy) {
  if (world) return world.friendAt(gx, gy);
  if (!mirror) return null;
  for (const f of mirror.friends) {
    const hw = 26 * mirror.unit;
    const top = f.y + friendTop(f.id, f) * mirror.unit;
    if (gx >= f.x - hw && gx <= f.x + hw && gy >= top && gy <= f.y + 4) return f.id;
  }
  return null;
}

function setInteractive(on) {
  if (on === interactive) return;
  interactive = on;
  odd.setInteractive(on);
}

addEventListener('pointermove', (e) => {
  const [gx, gy] = toGlobal(e);
  if (press) {
    if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5 && world) {
      press.dragging = world.grab(press.id, gx, gy);
    }
    if (press.dragging) world.drag(press.id, gx, gy, 1 / 60);
    return;
  }
  hover = friendAt(gx, gy);
  document.body.style.cursor = hover ? 'grab' : 'default';
  setInteractive(Boolean(hover));
});

addEventListener('pointerdown', (e) => {
  if (!hover || e.button !== 0) return;
  press = { id: hover, x: e.clientX, y: e.clientY, dragging: false };
  canvas.setPointerCapture(e.pointerId);
  document.body.style.cursor = 'grabbing';
});

addEventListener('pointerup', (e) => {
  if (!press) return;
  if (press.dragging) world.release(press.id);
  else if (world) world.poke(press.id);
  else odd.poke({ id: press.id });
  press = null;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    // already released
  }
  const [gx, gy] = toGlobal(e);
  hover = friendAt(gx, gy);
  setInteractive(Boolean(hover));
});

addEventListener('pointerleave', () => {
  if (!press) {
    hover = null;
    setInteractive(false);
  }
});

// ------------------------------------------------------------------ drawing

function drawTintBack(tn, t) {
  if (tn.alpha <= 0) return;
  const floor = view.h;
  if (tn.kind === 'night' || tn.kind === 'dawn') {
    // a soft dome of night (or sunrise) over the stage only, not the whole screen
    const cx = tn.x - view.x;
    const rx = 760;
    const ry = 560;
    const c = tn.kind === 'night' ? '24,28,72' : '255,160,120';
    const a = (tn.kind === 'night' ? 0.62 : 0.45) * tn.alpha;
    ctx.save();
    ctx.translate(cx, floor);
    ctx.scale(rx / ry, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    g.addColorStop(0, `rgba(${c},${a})`);
    g.addColorStop(0.55, `rgba(${c},${a * 0.75})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-ry, -ry, ry * 2, ry);
    ctx.restore();
  } else if (tn.kind === 'cartoon') {
    const r = cartoonRect(tn);
    ctx.save();
    ctx.globalAlpha = tn.alpha;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 18);
    ctx.fillStyle = 'rgba(244, 236, 218, 0.94)';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    for (let x = r.x + 18; x < r.x + r.w - 12; x += 26) ctx.fillRect(x, r.y + 6, 12, 8);
    ctx.restore();
  }
  void t;
}

function cartoonRect(tn) {
  const w = tn.w || 520;
  const h = tn.h || 300;
  return { x: tn.x - view.x - w / 2, y: view.h - h + 8, w, h }; // bottom edge just below the floor
}

function drawTintFront(tn, t) {
  if (tn.kind !== 'cartoon' || tn.alpha <= 0) return;
  const r = cartoonRect(tn);
  ctx.save();
  ctx.globalAlpha = tn.alpha;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, 18);
  ctx.clip();
  ctx.fillStyle = 'rgba(40,30,20,0.18)';
  const seed = Math.floor(t * 24);
  for (let i = 0; i < 90; i++) {
    const k = Math.sin(seed * 12.9 + i * 78.2) * 43758.5;
    const fx = k - Math.floor(k);
    const k2 = Math.sin(seed * 4.1 + i * 31.7) * 23421.6;
    const fy = k2 - Math.floor(k2);
    ctx.fillRect(r.x + fx * r.w, r.y + fy * r.h, 2, 2);
  }
  if (seed % 5 === 0) {
    ctx.fillRect(r.x + ((seed * 37) % r.w), r.y, 1.5, r.h);
  }
  const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, r.h * 0.35, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(30,20,10,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if ((tn.iris ?? 1) < 1) {
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.max(0.1, tn.iris * Math.hypot(r.w, r.h) * 0.5), 0, Math.PI * 2, true);
    ctx.fillStyle = '#16100c';
    ctx.fill('evenodd');
  }
  ctx.restore();
}

function drawOne(f, unit, t) {
  ctx.save();
  ctx.globalAlpha = f.alpha ?? 1;
  ctx.translate(f.x - view.x, f.y - view.y);
  ctx.scale(unit * (f.facing || 1), unit);
  drawFriend(ctx, f.id, f, t);
  ctx.restore();
}

function drawOverhead(f, unit, t) {
  if ((f.alpha ?? 1) < 0.5) return;
  const sx = f.x - view.x;
  const top = f.y - view.y + friendTop(f.id, f) * unit;
  if (f.emote) {
    ctx.save();
    ctx.translate(sx + 12 * unit * (f.facing || 1), top - 10 * unit);
    ctx.scale(unit, unit);
    drawEmote(ctx, f.emote.kind, 0, 0, t, t - f.emote.start);
    ctx.restore();
  }
  if (f.bubble) {
    const age = t - f.bubble.start;
    drawBubble(ctx, sx, top - (f.emote ? 22 : 6) * unit, f.bubble.text, {
      size: 14 * Math.min(1.25, Math.max(0.95, unit)),
      alpha: Math.min(1, age * 6, (f.bubble.until - t) * 4),
      bounds: { x: 0, w: view.w },
    });
  }
}

function drawPuffs(puffs, unit, t) {
  for (const p of puffs) {
    const k = (t - p.start) / 0.5;
    if (k < 0 || k > 1) continue;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ellipse(ctx, p.x - view.x + Math.cos(a) * 22 * unit * k, p.y - view.y + Math.sin(a) * 14 * unit * k, 9 * unit * (1 - k * 0.5), 8 * unit * (1 - k * 0.5));
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(61,44,46,0.5)';
      ctx.stroke();
    }
    ctx.restore();
  }
}

function render(t) {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.w, view.h);
  const src = world ? world : mirror;
  if (!src) return;
  const unit = world ? world.unit : mirror.unit;
  const friends = world ? [...world.friends.values()] : mirror.friends;
  const onScreen = (f) => f.x > view.x - 200 && f.x < view.x + view.w + 200 && f.y > view.y - 200 && f.y < view.y + view.h + 300;
  const mine = friends.filter(onScreen).sort((a, b) => (a.z || 0) - (b.z || 0));
  const tints = world ? world.tints : [];
  const props = world ? world.props : [];
  const guests = world ? world.guests : [];
  const pview = { ...view, scale: 1 };

  const cartoon = tints.some((tn) => tn.kind === 'cartoon' && tn.alpha > 0.4);
  canvas.style.filter = cartoon ? 'grayscale(1) contrast(1.08)' : '';

  for (const tn of tints) drawTintBack(tn, t);
  for (const p of props) if (p.layer !== 'front') drawProp(ctx, p, t, pview);
  for (const g of guests) if (g.layer === 'back') drawGuest(ctx, g, t, pview);
  for (const f of mine) if ((f.z || 0) < 0) drawOne(f, unit, t);
  for (const p of props) if (p.layer === 'front') drawProp(ctx, p, t, pview);
  for (const f of mine) if ((f.z || 0) >= 0) drawOne(f, unit, t);
  for (const g of guests) if (g.layer !== 'back') drawGuest(ctx, g, t, pview);
  if (world) world.fx.draw(ctx, t, pview);
  drawPuffs((world ? world.puffs : mirror.puffs) || [], unit, t);
  for (const f of mine) drawOverhead(f, unit, t);
  for (const b of (world ? world.freeBubbles : mirror.bubbles) || []) {
    drawBubble(ctx, b.x - view.x, b.y - view.y, b.text, {
      size: 15 * Math.min(1.25, Math.max(0.95, unit)),
      alpha: Math.min(1, (t - b.start) * 6, (b.until - t) * 4),
      bounds: { x: 0, w: view.w },
    });
  }
  for (const tn of tints) drawTintFront(tn, t);
}

// ------------------------------------------------------------------ loop

let last = clock();
let lastDraw = 0;
let lastSnap = 0;

function frame() {
  const t = clock();
  const dt = t - last;
  last = t;
  if (world) world.update(dt, t);
  const busy = settings.smooth || press || (world && (world.director || world.fx.active));
  if (busy || t - lastDraw >= 1 / 31) {
    lastDraw = t;
    render(t);
  }
  if (world && displays.length > 1 && t - lastSnap >= 1 / 30) {
    lastSnap = t;
    odd.sendSnapshot(world.snapshot(t));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.title = 'ready';
