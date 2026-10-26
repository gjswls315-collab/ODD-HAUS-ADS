// The desk: a friend behind a keyboard who types along with you (bongo style), combos,
// keys per minute, today's count, the pomodoro button and reminder bubbles.

import { drawFriend, friendTop, glove, drawEmote, INK, rrect, fillStroke } from '../shared/draw.js';
import { connect, loadFonts } from '../shared/bridge.js';
import { POKE, pick } from '../shared/lines.js';

const odd = await connect('desk');
await loadFonts();
const boot = await odd.bootstrap();
if (!window.odd && !location.search.includes('transparent')) document.body.classList.add('preview');

let settings = boot.settings;
let pomo = boot.pomodoro;

const W = 300;
const H = 320;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const dpr = devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;

const $ = (id) => document.getElementById(id);
const now = () => performance.now() / 1000;
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');

// friend & keyboard geometry
const S = 1.85; // friend size at the desk
const FEET = 282;
const KB = { x: 34, y: 236, w: 232, h: 62 };
const COMBO_GAP = 1.5;

const st = {
  combo: 0,
  lastPress: -99,
  hand: 0,
  pressL: -9,
  pressR: -9,
  scrubUntil: -9,
  squashAt: -9,
  banner: null,
  pops: [],
  keys: [],
  expr: null,
  emote: null,
  confetti: [],
  jumpAt: -9,
  lastPop: -9,
};

// ------------------------------------------------------------------ keyboard layout

const KEYS = (() => {
  const keys = [];
  const pad = 9;
  const kw = 17.5;
  const kh = 13;
  const gap = 3.6;
  const row = (y, xs) => xs.forEach(([x, w, kind]) => keys.push({ x, y, w, h: kh, kind }));
  const x0 = KB.x + pad;
  const r0 = [];
  for (let i = 0; i < 10; i++) r0.push([x0 + i * (kw + gap), kw, 'key']);
  r0[9] = [x0 + 9 * (kw + gap), kw, 'erase'];
  row(KB.y + 7, r0);
  const r1 = [];
  for (let i = 0; i < 9; i++) r1.push([x0 + 6 + i * (kw + gap), kw, 'key']);
  r1[8] = [x0 + 6 + 8 * (kw + gap), kw + 9, 'enter'];
  row(KB.y + 7 + kh + gap, r1);
  const y2 = KB.y + 7 + 2 * (kh + gap);
  row(y2, [
    [x0, kw, 'key'],
    [x0 + kw + gap, kw, 'key'],
    [x0 + 2 * (kw + gap), 5 * kw + 4 * gap, 'space'],
    [x0 + 7 * (kw + gap), kw, 'key'],
    [x0 + 8 * (kw + gap), kw, 'key'],
  ]);
  return keys;
})();

function lightKey(kind, t) {
  const pool = KEYS.map((k, i) => [k, i]).filter(([k]) => k.kind === kind);
  const [, i] = pool[Math.floor(Math.random() * pool.length)];
  st.keys.push({ i, until: t + 0.14 });
}

// ------------------------------------------------------------------ events

const POPS = { key: ['톡', '탁', '타닥', '톡톡', '탁탁', '토독'], space: ['쿵!', '통!'], enter: ['뿅!', '탁!'], erase: ['지우지우', '슥슥'] };

function onPress(ev) {
  const t = now();
  st.lastPress = t;
  st.combo = ev.combo;
  $('kpm').textContent = fmt(ev.kpm);
  $('today').textContent = fmt(ev.today);
  let side;
  if (ev.kind === 'space') {
    st.pressL = st.pressR = t;
    st.squashAt = t;
    side = Math.random() < 0.5 ? -1 : 1;
  } else if (ev.kind === 'enter') {
    st.pressR = t;
    side = 1;
    st.emote = { kind: 'sparkle', start: t, until: t + 0.8 };
  } else if (ev.kind === 'erase') {
    st.pressR = t;
    st.scrubUntil = t + 0.35;
    side = 1;
    if (!st.emote || st.emote.kind !== 'sweat') st.emote = { kind: 'sweat', start: t, until: t + 1 };
  } else {
    st.hand ^= 1;
    side = st.hand ? 1 : -1;
    if (st.hand) st.pressR = t;
    else st.pressL = t;
  }
  lightKey(ev.kind === 'key' ? 'key' : ev.kind, t);
  if (ev.kind !== 'key' || t - st.lastPop > 0.16) {
    st.lastPop = t;
    st.pops.push({ text: pick(POPS[ev.kind] || POPS.key), x: 150 + side * 62 + (Math.random() - 0.5) * 30, y: 222, start: t });
  }
  if (ev.milestone) {
    st.banner = { text: `${ev.combo} COMBO!`, start: t };
    st.expr = { eyes: 'happy', mouth: 'open', until: t + 1.6 };
    for (let i = 0; i < 40; i++) {
      st.confetti.push({
        x: 150,
        y: 110,
        vx: (Math.random() - 0.5) * 320,
        vy: -120 - Math.random() * 260,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
        c: ['#ff6b6b', '#ffd34d', '#7fc6ff', '#b5f28c', '#ff9ad5'][i % 5],
        start: t,
      });
    }
  }
}

odd.onTyping(onPress);
odd.onMeter((m) => {
  $('kpm').textContent = fmt(m.kpm);
  $('today').textContent = fmt(m.today);
});
$('today').textContent = fmt(boot.today && boot.today.total);

let bubbleTimer = null;
function showBubble(text, { action = false, secs = 9 } = {}) {
  $('bubble-text').textContent = text;
  $('bubble-action').hidden = !action;
  $('bubble').hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => ($('bubble').hidden = true), secs * 1000);
}
$('bubble').addEventListener('click', (e) => {
  if (e.target.id === 'bubble-action') odd.openSummary();
  $('bubble').hidden = true;
});

odd.onRemind((msg) => {
  const t = now();
  showBubble(msg.text, { action: msg.type === 'endOfDay', secs: msg.type === 'endOfDay' ? 20 : 10 });
  st.expr = { eyes: 'happy', mouth: 'open', until: t + 2.5 };
  st.emote = { kind: msg.type === 'stretch' ? 'note' : 'heart', start: t, until: t + 2.5 };
  st.jumpAt = t;
});

function renderPomodoro() {
  const b = $('focus');
  b.classList.toggle('focus', pomo.mode === 'focus');
  b.classList.toggle('break', pomo.mode === 'break');
  if (pomo.mode === 'idle') {
    b.textContent = '🍅 집중 시작';
    return;
  }
  const left = Math.max(0, pomo.endsAt - Date.now());
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  b.textContent = pomo.mode === 'focus' ? `🍅 ${mm}:${ss} 집중 중` : `☕ ${mm}:${ss} 쉬는 중`;
}
odd.onPomodoro((p) => {
  pomo = p;
  renderPomodoro();
});
$('focus').addEventListener('click', () => odd.pomodoro('toggle'));
setInterval(renderPomodoro, 1000);
renderPomodoro();

odd.onSettings((s) => {
  settings = s;
});

// ------------------------------------------------------------------ pointer: click-through, drag, poke

const forwarding = boot.platform === 'win32' || boot.platform === 'darwin';
let interactive = !forwarding;
function setInteractive(on) {
  if (!forwarding || on === interactive) return;
  interactive = on;
  odd.setInteractive(on);
}

function opaqueAt(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  return ctx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data[3] > 20;
}

let drag = null;
addEventListener('pointermove', (e) => {
  if (drag) {
    if (Math.hypot(e.screenX - drag.sx, e.screenY - drag.sy) > 3) drag.moved = true;
    if (drag.moved) odd.deskDrag('move', e.screenX, e.screenY);
    return;
  }
  const overHit = e.target.closest && e.target.closest('.hit');
  setInteractive(Boolean(overHit) || opaqueAt(e.clientX, e.clientY));
});
addEventListener('pointerleave', () => {
  if (!drag) setInteractive(false);
});
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !opaqueAt(e.clientX, e.clientY)) return;
  drag = { sx: e.screenX, sy: e.screenY, moved: false };
  canvas.setPointerCapture(e.pointerId);
  odd.deskDrag('start', e.screenX, e.screenY);
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  odd.deskDrag('end', e.screenX, e.screenY);
  if (!drag.moved) {
    const t = now();
    st.jumpAt = t;
    st.emote = { kind: 'heart', start: t, until: t + 1.5 };
    showBubble(pick(POKE[settings.deskFriend] || ['안녕!']), { secs: 2.5 });
  }
  drag = null;
});
addEventListener('contextmenu', (e) => {
  e.preventDefault();
  odd.deskMenu();
});

// ------------------------------------------------------------------ drawing

function outlinedText(text, x, y, size, fill, { spacing = 0, line = 0.16 } = {}) {
  ctx.save();
  ctx.font = `${size}px Jua, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * line;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawKeyboard(t) {
  rrect(ctx, KB.x, KB.y + 6, KB.w, KB.h, 14);
  ctx.fillStyle = INK;
  ctx.fill();
  rrect(ctx, KB.x, KB.y, KB.w, KB.h, 14);
  fillStroke(ctx, '#fff', 3);
  KEYS.forEach((k, i) => {
    const hot = st.keys.some((h) => h.i === i && h.until > t);
    rrect(ctx, k.x, k.y + (hot ? 1.5 : 0), k.w, k.h, 3.5);
    fillStroke(ctx, hot ? '#f4a3b4' : '#fbf6ee', 1.6);
  });
  st.keys = st.keys.filter((h) => h.until > t);
}

function handLift(pressT, t, typing) {
  const since = t - pressT;
  if (since < 0.09) return 0;
  if (!typing) return 0;
  return Math.min(0.6, 0.15 + (since - 0.09) * 6);
}

function render() {
  const t = now();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const typing = t - st.lastPress < 2.5;
  const comboAlive = t - st.lastPress < COMBO_GAP && st.combo >= 5;

  // the friend
  const id = settings.deskFriend || 'picker';
  const dozing = t - st.lastPress > 300 && !typing;
  const jump = Math.max(0, Math.sin(Math.min(1, (t - st.jumpAt) / 0.45) * Math.PI)) * 10;
  const squash = Math.max(0, 1 - (t - st.squashAt) / 0.15);
  const scrub = t < st.scrubUntil ? Math.sin(t * 60) * 4 : 0;
  const exprOn = st.expr && st.expr.until > t;
  const friendState = {
    pose: 'type',
    keyY: (KB.y + 8 - FEET) / S,
    handL: handLift(st.pressL, t, typing),
    handR: handLift(st.pressR, t, typing),
    reachR: scrub,
    squash,
    seed: 1,
    acc: pomo.mode === 'focus' ? ['glasses'] : [],
    expr: exprOn ? st.expr : dozing ? { eyes: 'closed', mouth: 'o' } : null,
  };
  ctx.save();
  ctx.translate(150, FEET - jump);
  ctx.scale(S, S);
  const P = drawFriend(ctx, id, friendState, t);
  ctx.restore();

  drawKeyboard(t);

  // hands over the keys
  if (P) {
    ctx.save();
    ctx.translate(150, FEET - jump);
    ctx.scale(S, S);
    glove(ctx, P.aL[0], P.aL[1] + P.by, 4.4, -1);
    glove(ctx, P.aR[0], P.aR[1] + P.by, 4.4, 1);
    ctx.restore();
  }

  // combo number + timer bar
  if (comboAlive || (st.combo >= 5 && t - st.lastPress < COMBO_GAP + 0.4)) {
    const fade = comboAlive ? 1 : Math.max(0, 1 - (t - st.lastPress - COMBO_GAP) / 0.4);
    ctx.save();
    ctx.globalAlpha = fade;
    const bounce = Math.max(0, 1 - (t - st.lastPress) * 8) * 0.12;
    ctx.translate(150, 84);
    ctx.scale(1 + bounce, 1 + bounce);
    outlinedText(String(st.combo), 0, 0, 50, '#f6c66b', { line: 0.14 });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = fade;
    outlinedText('COMBO', 150, 108, 15, INK, { spacing: 4, line: 0 });
    const k = Math.max(0, 1 - (t - st.lastPress) / COMBO_GAP);
    rrect(ctx, 95, 116, 110, 8, 4);
    fillStroke(ctx, '#fff', 2);
    if (k > 0) {
      rrect(ctx, 96, 117, 108 * k, 6, 3);
      ctx.fillStyle = '#f08aa0';
      ctx.fill();
    }
    ctx.restore();
  }

  // milestone banner
  if (st.banner) {
    const age = t - st.banner.start;
    if (age > 2.4) st.banner = null;
    else {
      const pop = age < 0.18 ? 0.5 + (age / 0.18) * 0.6 : age < 0.3 ? 1.1 - ((age - 0.18) / 0.12) * 0.1 : 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, (2.4 - age) * 3);
      ctx.translate(150, 40);
      ctx.scale(pop, pop);
      outlinedText(st.banner.text, 0, 0, 34, '#f8d27e', { line: 0.16 });
      ctx.restore();
    }
  }

  // emote above the head
  const emote = dozing ? { kind: 'zzz', start: 0 } : st.emote && st.emote.until > t ? st.emote : null;
  if (emote) {
    ctx.save();
    ctx.translate(150 + 28 * S, FEET - jump + (friendTop(id, friendState) + 4) * S);
    ctx.scale(1.4, 1.4);
    drawEmote(ctx, emote.kind, 0, 0, t, t - emote.start);
    ctx.restore();
  }

  // typing sounds floating up
  st.pops = st.pops.filter((p) => t - p.start < 0.7);
  for (const p of st.pops) {
    const k = (t - p.start) / 0.7;
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    ctx.font = '15px Jua, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(p.text, p.x, p.y - k * 26);
    ctx.fillStyle = '#7a6566';
    ctx.fillText(p.text, p.x, p.y - k * 26);
    ctx.restore();
  }

  // confetti from milestones
  st.confetti = st.confetti.filter((c) => t - c.start < 1.6);
  for (const c of st.confetti) {
    const a = t - c.start;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1.6 - a) * 2);
    ctx.translate(c.x + c.vx * a, c.y + c.vy * a + 380 * a * a);
    ctx.rotate(c.r + c.vr * a);
    ctx.fillStyle = c.c;
    ctx.fillRect(-4, -2.5, 8, 5);
    ctx.restore();
  }
}

let lastFrame = 0;
function loop() {
  const t = now();
  const busy = t - st.lastPress < 3 || st.banner || st.confetti.length || t - st.jumpAt < 1;
  if (busy || t - lastFrame > 1 / 24) {
    lastFrame = t;
    render();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.title = 'ready';
