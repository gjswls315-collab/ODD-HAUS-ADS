// The desktop world: friends walking along the bottom of every screen, their moods, pokes,
// drags, little chats, and reacting to typing and reminders. Runs in the main screen's
// overlay window; other screens only draw snapshots of it.

import { RIG, friendTop } from '../shared/draw.js';
import { Fx } from '../shared/fx.js';
import { POKE, DROPPED, GREET, CHEER, pick } from '../shared/lines.js';

const GRAVITY = 1500;
const WALK = 46; // px/s at size 1
const rand = (a, b) => a + Math.random() * (b - a);

export const clock = () => (performance.timeOrigin + performance.now()) / 1000 - 1.7e9;

const EPISODE_GAP = { rare: [25, 40], normal: [12, 22], often: [5, 10] }; // minutes

export class World {
  constructor({ displays, worldDisplayId, settings, desk }) {
    this.friends = new Map();
    this.props = [];
    this.guests = [];
    this.tints = [];
    this.puffs = [];
    this.timers = [];
    this.freeBubbles = []; // bubbles not attached to a friend (guests, signs)
    this.fading = []; // [list, obj] pairs fading out after an episode
    this.fx = new Fx();
    this.director = null;
    this.lastKeyAt = -1e9;
    this.lastCheerAt = -1e9;
    this.desk = desk || null;
    this.setDisplays(displays, worldDisplayId);
    this.settings = settings;
    this.unit = settings.scale || 1;
    this.nextEpisodeAt = clock() + rand(3, 6) * 60;
    this.syncFriends(settings.wanderers || [], true);
  }

  // ------------------------------------------------------------ setup

  setDisplays(displays, worldDisplayId = this.worldDisplayId) {
    this.displays = displays;
    this.worldDisplayId = worldDisplayId;
    this.main = displays.find((d) => d.id === worldDisplayId) || displays[0];
    for (const f of this.friends.values()) {
      if (!this.displays.includes(f.disp)) f.disp = this.displayAt(f.x) || this.main;
      f.x = Math.min(Math.max(f.x, f.disp.x + 20), f.disp.x + f.disp.w - 20);
      f.y = this.floor(f.disp);
    }
  }

  setSettings(s) {
    this.settings = s;
    this.unit = s.scale || 1;
    this.syncFriends(s.wanderers || [], false);
  }

  setDesk(b) {
    this.desk = b;
  }

  syncFriends(ids, initial) {
    for (const id of [...this.friends.keys()]) {
      if (!ids.includes(id)) this.removeFriend(id);
    }
    ids.forEach((id, i) => {
      if (!this.friends.has(id)) this.addFriend(id, initial ? i : -1);
    });
  }

  addFriend(id, slot) {
    const disp = slot >= 0 && this.displays.length > 1 && slot % 3 === 2 ? this.displays.find((d) => d !== this.main) || this.main : this.main;
    const x = slot >= 0 ? disp.x + disp.w * (0.12 + ((slot * 0.19) % 0.6)) : disp.x + rand(0.15, 0.6) * disp.w;
    const f = {
      id,
      x,
      y: this.floor(disp),
      vx: 0,
      vy: 0,
      disp,
      facing: Math.random() < 0.5 ? 1 : -1,
      onGround: true,
      pose: 'stand',
      t0: clock(),
      phase: 0,
      seed: Math.random() * 10,
      expr: null,
      look: null,
      item: null,
      acc: [],
      spin: 0,
      scared: false,
      alpha: 1,
      z: 0,
      mode: 'auto',
      task: null,
      until: clock() + rand(1, 4),
      chatAfter: clock() + rand(20, 60),
      emote: null,
      bubble: null,
    };
    this.friends.set(id, f);
    this.puff(f.x, f.y - 30 * this.unit);
    return f;
  }

  removeFriend(id) {
    const f = this.friends.get(id);
    if (!f) return;
    this.puff(f.x, f.y - 30 * this.unit);
    this.friends.delete(id);
    if (this.director) this.director.cancel();
  }

  // ------------------------------------------------------------ geometry

  floor(d) {
    return d.y + d.h;
  }

  displayAt(x, near) {
    const hits = this.displays.filter((d) => x >= d.x && x < d.x + d.w);
    if (hits.length <= 1 || !near) return hits[0];
    return hits.sort((a, b) => Math.abs(this.floor(a) - near) - Math.abs(this.floor(b) - near))[0];
  }

  half(f) {
    return RIG[f.id].hw * this.unit + 4;
  }

  /** The screens a friend can walk to from where it is (side by side, overlapping vertically). */
  neighbors(d) {
    return this.displays.filter(
      (o) => o !== d && (Math.abs(o.x - (d.x + d.w)) < 2 || Math.abs(o.x + o.w - d.x) < 2) && o.y < d.y + d.h && o.y + o.h > d.y,
    );
  }

  // ------------------------------------------------------------ friend state helpers

  setPose(f, pose, t = clock()) {
    if (f.pose !== pose) {
      f.pose = pose;
      f.t0 = t;
    }
  }

  say(f, text, secs, t = clock()) {
    f.bubble = { text, start: t, until: t + (secs ?? Math.min(7, 1.6 + text.length * 0.09)) };
  }

  emote(f, kind, secs = 2, t = clock()) {
    f.emote = { kind, start: t, until: t + secs };
  }

  later(secs, fn) {
    this.timers.push({ at: clock() + secs, fn });
  }

  puff(x, y) {
    this.puffs.push({ x, y, start: clock() });
  }

  walkTo(f, x, { speed = 1, run = false, roll = false } = {}) {
    const d = this.displayAt(x, f.y) || f.disp;
    const m = this.half(f);
    x = Math.min(Math.max(x, d.x + m), d.x + d.w - m); // always somewhere it can actually reach
    return new Promise((resolve) => {
      if (f.task && f.task.resolve) f.task.resolve(false);
      f.task = { type: 'walk', x, speed, run, roll, resolve };
    });
  }

  stop(f) {
    if (f.task && f.task.resolve) f.task.resolve(false);
    f.task = null;
    if (f.onGround) this.setPose(f, 'stand');
  }

  // ------------------------------------------------------------ input

  friendAt(px, py) {
    const list = [...this.friends.values()].sort((a, b) => b.z - a.z);
    for (const f of list) {
      const hw = RIG[f.id].hw * this.unit + 6;
      const top = f.y + friendTop(f.id, f) * this.unit - 4;
      if (px >= f.x - hw && px <= f.x + hw && py >= top && py <= f.y + 4) return f.id;
    }
    return null;
  }

  poke(id) {
    const f = this.friends.get(id);
    if (!f || f.mode === 'held') return;
    const t = clock();
    this.emote(f, 'heart', 1.6, t);
    if (f.mode === 'script') return;
    this.stop(f);
    if (f.onGround) {
      f.vy = -330 * Math.sqrt(this.unit);
      f.onGround = false;
      this.setPose(f, 'jump', t);
    }
    this.say(f, pick(POKE[f.id]), undefined, t);
    f.until = t + rand(2.5, 4);
  }

  grab(id, px, py) {
    const f = this.friends.get(id);
    if (!f || f.mode === 'script') return false;
    this.stop(f);
    f.mode = 'held';
    f.grabDy = Math.min(0, py - f.y);
    f.grabFromY = f.y;
    f.prevX = px;
    this.setPose(f, 'held');
    f.bubble = null;
    return true;
  }

  drag(id, px, py, dt = 1 / 30) {
    const f = this.friends.get(id);
    if (!f || f.mode !== 'held') return;
    f.vx = (px - f.prevX) / Math.max(dt, 1 / 120);
    f.prevX = px;
    f.x = px;
    f.y = py - f.grabDy;
    const d = this.displayAt(f.x, f.y);
    if (d) f.disp = d;
  }

  release(id) {
    const f = this.friends.get(id);
    if (!f || f.mode !== 'held') return;
    f.mode = 'auto';
    f.onGround = false;
    f.vy = 0;
    f.vx = Math.max(-500, Math.min(500, f.vx || 0)) * 0.6;
    f.dropFrom = f.y;
    this.setPose(f, 'fall');
  }

  // ------------------------------------------------------------ events from the app

  onTyping(ev) {
    const t = clock();
    this.lastKeyAt = t;
    if (!ev.milestone || ev.combo < 30 || t - this.lastCheerAt < 20) return;
    const free = [...this.friends.values()].filter((f) => f.mode === 'auto' && f.onGround);
    if (!free.length) return;
    this.lastCheerAt = t;
    const f = pick(free);
    this.stop(f);
    this.setPose(f, 'cheer', t);
    this.emote(f, 'sparkle', 2, t);
    if (ev.combo >= 100) this.say(f, pick(CHEER).replace('{n}', ev.combo), 2.6, t);
    f.until = t + 2.2;
  }

  onRemind(msg) {
    const t = clock();
    const free = [...this.friends.values()].filter((f) => f.mode === 'auto');
    if (!free.length) return;
    const f = free.sort((a, b) => (a.disp === this.main ? 0 : 1) - (b.disp === this.main ? 0 : 1))[0];
    this.stop(f);
    const act = {
      lunch: ['hold', 'cookie', '밥 먹자~'],
      dinner: ['hold', 'cookie', '저녁 먹자~'],
      water: ['hold', 'mug', '꿀꺽꿀꺽~'],
      stretch: ['stretch', null, '쭈욱~'],
      praise: ['cheer', null, '최고야~!'],
      goal: ['cheer', null, '목표 달성!'],
      endOfDay: ['wave', null, '수고했어~'],
      pomodoroDone: ['cheer', null, '🍅 완성!'],
      breakDone: ['wave', null, '다시 힘내자!'],
    }[msg.type] || ['wave', null, '!'];
    const go = async () => {
      if (msg.deskVisible && this.desk && f.disp === this.displayAt(this.desk.x + this.desk.w / 2)) {
        const side = this.desk.x - 34 * this.unit > f.disp.x + 40 ? this.desk.x - 34 * this.unit : this.desk.x + this.desk.w + 34 * this.unit;
        f.mode = 'script';
        await this.walkTo(f, side, { run: true, speed: 1.6 });
        f.facing = side < this.desk.x ? 1 : -1;
        f.mode = 'auto';
      }
      this.setPose(f, act[0]);
      f.item = act[1];
      if (msg.type === 'goal') this.fx.start('confetti', { x: f.x - 50, y: f.y - 120, w: 100, h: 100 });
      this.say(f, msg.deskVisible ? act[2] : msg.text, msg.deskVisible ? 3 : 7);
      f.until = clock() + (msg.deskVisible ? 4 : 7.5);
      this.later(msg.deskVisible ? 4 : 7.5, () => {
        f.item = null;
      });
    };
    go();
  }

  // ------------------------------------------------------------ autonomous behaviour

  think(f, t) {
    f.look = null;
    f.item = null;
    f.expr = null;
    const restingLong = t - this.lastKeyAt > 240;
    const r = Math.random();
    const onDeskScreen = this.desk && f.disp === this.displayAt(this.desk.x + this.desk.w / 2);
    if (restingLong && r < 0.18) {
      this.setPose(f, 'doze', t);
      this.emote(f, 'zzz', 30, t);
      f.until = t + rand(15, 30);
    } else if (r < 0.5) {
      const nb = this.neighbors(f.disp);
      let d = f.disp;
      if (nb.length && Math.random() < 0.3) d = pick(nb);
      const m = this.half(f) + 10;
      const x = rand(d.x + m, d.x + d.w - m);
      const roll = f.id === 'vin' && Math.random() < 0.35;
      this.walkTo(f, x, { speed: roll ? 2.2 : f.id === 'rex' ? 0.8 : rand(0.85, 1.15), roll, run: roll });
      f.until = Infinity;
    } else if (r < 0.62) {
      this.setPose(f, 'stand', t);
      f.look = [rand(-1, 1), rand(-0.6, 0.2)];
      f.until = t + rand(2, 5);
    } else if (r < 0.74) {
      this.setPose(f, 'sit', t);
      f.until = t + rand(6, 14);
    } else if (r < 0.82 && onDeskScreen && !f.visitedDesk) {
      const left = this.desk.x - 30 * this.unit;
      const x = left > f.disp.x + this.half(f) ? left : this.desk.x + this.desk.w + 30 * this.unit;
      f.visitedDesk = true;
      this.walkTo(f, x).then((ok) => {
        if (!ok || f.mode !== 'auto') return;
        f.facing = x < this.desk.x ? 1 : -1;
        this.setPose(f, 'sit');
        f.until = clock() + rand(12, 25);
      });
      f.until = Infinity;
      this.later(120, () => {
        f.visitedDesk = false;
      });
    } else if (r < 0.9) {
      const pose = pick(['wave', 'dance', 'stretch', 'look', 'think']);
      this.setPose(f, pose, t);
      if (pose === 'dance') this.emote(f, 'note', 2.5, t);
      f.until = t + rand(1.8, 3.2);
    } else {
      f.vy = -280 * Math.sqrt(this.unit);
      f.onGround = false;
      this.setPose(f, 'jump', t);
      f.until = t + 1.2;
    }
  }

  maybeChat(t, dt) {
    const free = [...this.friends.values()].filter((f) => f.mode === 'auto' && f.onGround && t > f.chatAfter && !f.bubble);
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i];
        const b = free[j];
        if (a.disp !== b.disp || Math.abs(a.x - b.x) > 64 * this.unit || Math.random() > dt * 0.4) continue;
        const [la, lb] = pick(GREET);
        for (const f of [a, b]) {
          this.stop(f);
          f.chatAfter = t + rand(60, 120);
          f.until = t + 4.5;
        }
        a.facing = b.x > a.x ? 1 : -1;
        b.facing = -a.facing;
        this.setPose(a, 'wave', t);
        this.say(a, la, 2, t);
        this.later(1.8, () => {
          if (b.mode !== 'auto') return;
          this.setPose(b, 'stand');
          this.say(b, lb, 2);
        });
        return;
      }
    }
  }

  // ------------------------------------------------------------ simulation

  update(dt, t) {
    dt = Math.min(dt, 0.1);
    const due = this.timers.filter((x) => x.at <= t);
    this.timers = this.timers.filter((x) => x.at > t);
    for (const x of due) x.fn();
    for (const f of this.friends.values()) this.step(f, dt, t);
    this.maybeChat(t, dt);
    this.fx.update(dt);
    this.puffs = this.puffs.filter((p) => t - p.start < 0.5);
    this.freeBubbles = this.freeBubbles.filter((b) => t < b.until);
    for (const [list, obj] of this.fading) obj.alpha = Math.max(0, (obj.alpha ?? 1) - dt * 2.5);
    this.fading = this.fading.filter(([list, obj]) => {
      if (obj.alpha > 0) return true;
      const i = list.indexOf(obj);
      if (i >= 0) list.splice(i, 1);
      return false;
    });
    if (this.director) this.director.update(dt, t);
    else this.maybeEpisode(t);
  }

  step(f, dt, t) {
    if (f.bubble && t > f.bubble.until) f.bubble = null;
    if (f.emote && t > f.emote.until) f.emote = null;
    if (f.mode === 'held') return;
    const u = this.unit;

    if (!f.onGround) {
      f.vy += GRAVITY * Math.sqrt(u) * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const d = this.displayAt(f.x, f.y) || f.disp;
      f.disp = d;
      const m = this.half(f);
      f.x = Math.min(Math.max(f.x, d.x + m), d.x + d.w - m);
      if (f.vy > 0 && f.y >= this.floor(d)) {
        f.y = this.floor(d);
        f.vy = 0;
        f.vx = 0;
        f.onGround = true;
        const fell = f.dropFrom !== undefined ? this.floor(d) - f.dropFrom : 0;
        f.dropFrom = undefined;
        if (fell > 220 && f.mode === 'auto') {
          this.setPose(f, 'sit', t);
          f.expr = { eyes: 'dizzy', mouth: 'wavy' };
          this.emote(f, 'dizzy', 2, t);
          this.say(f, DROPPED[f.id], 2.4, t);
          f.until = t + 2.6;
        } else if (f.pose === 'jump' || f.pose === 'fall') {
          this.setPose(f, 'stand', t);
        }
        if (f.task && f.task.type === 'jump') {
          f.task.resolve(true);
          f.task = null;
        }
      }
      return;
    }

    const task = f.task;
    if (task && task.type === 'walk') {
      const dx = task.x - f.x;
      const speed = WALK * u * task.speed * (task.run ? 1.7 : 1);
      const stepLen = speed * dt;
      if (Math.abs(dx) <= stepLen) {
        f.x = task.x;
        f.task = null;
        f.spin = 0;
        this.setPose(f, 'stand', t);
        if (f.mode === 'auto') f.until = t + rand(0.8, 2.5);
        task.resolve(true);
      } else {
        const dir = Math.sign(dx);
        f.facing = dir;
        f.x += dir * stepLen;
        f.phase += (stepLen / (20 * u)) * Math.PI;
        if (task.roll) f.spin += (dir * stepLen) / (24 * u);
        this.setPose(f, task.run ? 'run' : 'walk', t);
        this.crossEdges(f);
      }
    } else if (f.mode === 'auto' && t >= f.until) {
      this.think(f, t);
    }
  }

  /** Walking off one screen onto the next one, hopping or dropping to its floor. */
  crossEdges(f) {
    const d = f.disp;
    if (f.x >= d.x && f.x < d.x + d.w) return;
    const next = this.neighbors(d).find((o) => f.x >= o.x && f.x < o.x + o.w);
    if (!next) {
      f.x = Math.min(Math.max(f.x, d.x + this.half(f)), d.x + d.w - this.half(f));
      return;
    }
    f.disp = next;
    const fl = this.floor(next);
    if (fl > f.y + 2) {
      f.onGround = false;
      f.vy = 0;
      this.setPose(f, 'fall');
    } else if (fl < f.y - 2) {
      f.y = fl;
      f.onGround = false;
      f.vy = -200;
    }
  }

  maybeEpisode(t) {
    const s = this.settings;
    if (!s.autoEpisodes || !s.showFriends || t < this.nextEpisodeAt) return;
    if (t - this.lastKeyAt < 40) return; // only while you're taking a break from typing
    if ([...this.friends.values()].some((f) => f.mode === 'held')) return;
    this.scheduleNextEpisode(t);
    if (this.onAutoEpisode) this.onAutoEpisode();
  }

  scheduleNextEpisode(t = clock()) {
    const [a, b] = EPISODE_GAP[this.settings.episodeFreq] || EPISODE_GAP.normal;
    this.nextEpisodeAt = t + rand(a, b) * 60;
  }

  // ------------------------------------------------------------ for other screens

  snapshot(t) {
    return {
      t,
      unit: this.unit,
      friends: [...this.friends.values()].map((f) => ({
        id: f.id,
        x: f.x,
        y: f.y,
        facing: f.facing,
        pose: f.pose,
        phase: f.phase,
        t0: f.t0,
        seed: f.seed,
        expr: f.expr,
        look: f.look,
        item: f.item,
        acc: f.acc,
        spin: f.spin,
        scared: f.scared,
        alpha: f.alpha,
        z: f.z,
        bubble: f.bubble,
        emote: f.emote,
      })),
      puffs: this.puffs,
      bubbles: this.freeBubbles,
    };
  }
}
