// Runs one episode at a time. Episodes are async scripts written against the Stage API below:
// walk friends around, say lines, place props, bring guests in, start effects.

import { clock } from './world.js';
import { episodesFor, isInSeason } from './episodes.js';

export const CANCEL = Symbol('episode cancelled');
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const EASE = {
  linear: (k) => k,
  inout: (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  out: (k) => 1 - (1 - k) ** 3,
  in: (k) => k * k * k,
  back: (k) => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2,
};

export class Stage {
  constructor(world, ep, cast) {
    this.w = world;
    this.ep = ep;
    this.cast = cast;
    this.cancelled = false;
    this.waits = [];
    this.tweens = [];
    this.owned = [];
    this.visitors = [];
    const d = world.main;
    this.unit = world.unit;
    this.floor = d.y + d.h;
    this.top = d.y;
    this.left = d.x;
    this.right = d.x + d.w;
    this.width = d.w;
    this.cx = this.pickCenter();
  }

  pickCenter() {
    const span = 300 * this.unit;
    const lo = this.left + Math.min(span, this.width * 0.3);
    const hi = this.right - Math.min(span, this.width * 0.3);
    let cx = rand(lo, Math.max(lo, hi));
    const desk = this.w.desk;
    if (desk && desk.x < this.right && desk.x + desk.w > this.left) {
      const dc = desk.x + desk.w / 2;
      if (Math.abs(cx - dc) < 420 * this.unit) cx = dc > this.left + this.width / 2 ? Math.max(lo, dc - 520 * this.unit) : Math.min(hi, dc + 520 * this.unit);
    }
    return cx;
  }

  /** Shift the centre so offsets [lo, hi] (units) stay on screen. */
  fit(lo, hi) {
    const minCx = this.left + 20 - lo * this.unit;
    const maxCx = this.right - 20 - hi * this.unit;
    this.cx = minCx > maxCx ? (this.left + this.right) / 2 : Math.min(Math.max(this.cx, minCx), maxCx);
    return this.cx;
  }

  /** The screen side away from the desk, for guests that come in from an edge. */
  awaySide() {
    const desk = this.w.desk;
    if (!desk) return 'right';
    return desk.x + desk.w / 2 > this.left + this.width / 2 ? 'left' : 'right';
  }

  // ---------------------------------------------------------- flow

  check() {
    if (this.cancelled) throw CANCEL;
  }

  at(u) {
    return this.cx + u * this.unit;
  }

  wait(ms) {
    this.check();
    return new Promise((resolve, reject) => this.waits.push({ end: clock() + ms / 1000, resolve, reject }));
  }

  /** Run something alongside the script; cancellation inside it is ignored. */
  bg(promise) {
    Promise.resolve(promise).catch((e) => {
      if (e !== CANCEL) console.error(e);
    });
  }

  tween(obj, to, ms, ease = 'inout') {
    this.check();
    const from = {};
    for (const k of Object.keys(to)) from[k] = obj[k];
    return new Promise((resolve, reject) => this.tweens.push({ obj, from, to, start: clock(), dur: ms / 1000, ease: EASE[ease] || EASE.inout, resolve, reject }));
  }

  update(t) {
    for (const tw of this.tweens.slice()) {
      const k = Math.min(1, (t - tw.start) / tw.dur);
      const e = tw.ease(k);
      for (const key of Object.keys(tw.to)) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      if (k >= 1) {
        this.tweens.splice(this.tweens.indexOf(tw), 1);
        tw.resolve();
      }
    }
    for (const wt of this.waits.slice()) {
      if (t >= wt.end) {
        this.waits.splice(this.waits.indexOf(wt), 1);
        wt.resolve();
      }
    }
  }

  cancel() {
    this.cancelled = true;
    for (const x of [...this.waits, ...this.tweens]) x.reject(CANCEL);
    this.waits = [];
    this.tweens = [];
    for (const id of this.everyone) {
      const f = this.f(id);
      if (f && f.task && f.task.resolve) f.task.resolve(false); // unblocks walk/jump/land awaits
      if (f) f.task = null;
    }
  }

  // ---------------------------------------------------------- friends

  f(id) {
    return this.w.friends.get(id);
  }

  has(id) {
    return this.cast.includes(id);
  }

  async walk(id, x, opts) {
    this.check();
    const f = this.f(id);
    if (!f) return false;
    const ok = await this.w.walkTo(f, x, opts);
    this.check();
    return ok;
  }

  /** Walk the cast to unit offsets around the centre, then face the centre (or `face`). */
  async gather(offsets, { face = 'center', ...opts } = {}) {
    const n = this.cast.length;
    if (!Object.keys(opts).length) opts = { run: true, speed: 1.2 }; // don't keep the audience waiting
    await Promise.all(
      this.cast.map((id, i) => this.walk(id, this.at(offsets && offsets[i] !== undefined ? offsets[i] : (i - (n - 1) / 2) * 62), opts)),
    );
    if (face === 'center') for (const id of this.cast) this.face(id, this.cx);
  }

  face(id, target) {
    const f = this.f(id);
    if (!f) return;
    if (target === 1 || target === -1) f.facing = target;
    else if (Math.abs(target - f.x) > 2) f.facing = target > f.x ? 1 : -1;
  }

  pose(id, pose) {
    const f = this.f(id);
    if (f) this.w.setPose(f, pose);
  }

  poseAll(pose) {
    for (const id of this.cast) this.pose(id, pose);
  }

  expr(id, eyes, mouth, brows) {
    const f = this.f(id);
    if (f) f.expr = eyes || mouth || brows !== undefined ? { eyes, mouth, brows } : null;
  }

  look(id, dir) {
    const f = this.f(id);
    if (f) f.look = dir;
  }

  item(id, kind) {
    const f = this.f(id);
    if (f) f.item = kind;
  }

  acc(id, list) {
    const f = this.f(id);
    if (f) f.acc = list || [];
  }

  set(id, patch) {
    const f = this.f(id);
    if (f) Object.assign(f, patch);
  }

  emote(id, kind, secs = 2) {
    const f = this.f(id);
    if (f) this.w.emote(f, kind, secs);
  }

  say(id, text, secs) {
    const f = this.f(id);
    if (f) this.w.say(f, text, secs);
  }

  async talk(id, text, secs) {
    const dur = secs ?? Math.min(6, 1.5 + text.length * 0.09);
    this.say(id, text, dur);
    await this.wait(dur * 1000);
  }

  async jump(id, h = 1) {
    this.check();
    const f = this.f(id);
    if (!f || !f.onGround) return;
    f.vy = -330 * h * Math.sqrt(this.unit);
    f.onGround = false;
    this.w.setPose(f, 'jump');
    await new Promise((resolve) => {
      f.task = { type: 'jump', resolve };
    });
    this.check();
  }

  /** Move a friend through the air (riding, hanging); it stays put where it ends. */
  async glide(id, x, y, ms, ease) {
    const f = this.f(id);
    if (!f) return;
    f.onGround = true;
    await this.tween(f, { x, y }, ms, ease);
  }

  async land(id) {
    const f = this.f(id);
    if (!f) return;
    f.onGround = false;
    f.vy = 0;
    this.w.setPose(f, 'fall');
    await new Promise((resolve) => {
      f.task = { type: 'jump', resolve };
    });
    this.check();
  }

  /** A guest walks in from a screen edge (and is sent home when the episode ends). */
  async visit(id, { side = 'right', x, run = false, speed = 1 } = {}) {
    this.check();
    const start = side === 'left' ? this.left - 50 * this.unit : this.right + 50 * this.unit;
    const f = this.w.addVisitor(id, start);
    f.facing = side === 'left' ? 1 : -1;
    if (!this.visitors.includes(id)) this.visitors.push(id);
    if (x !== undefined) await this.walk(id, x, { run, speed });
    return f;
  }

  async leave(id, side = 'right', opts = {}) {
    const x = side === 'left' ? this.left - 70 * this.unit : this.right + 70 * this.unit;
    await this.walk(id, x, opts);
    this.w.removeVisitor(id, { puff: false });
    this.visitors = this.visitors.filter((v) => v !== id);
  }

  /** Everyone in the scene: the cast plus guests who are still here. */
  get everyone() {
    return [...this.cast, ...this.visitors.filter((v) => !this.cast.includes(v))];
  }

  // ---------------------------------------------------------- scenery

  own(list, obj) {
    list.push(obj);
    this.owned.push([list, obj]);
    return obj;
  }

  prop(type, opts = {}) {
    return this.own(this.w.props, { type, x: this.cx, y: this.floor, s: this.unit, alpha: 1, layer: 'back', ...opts });
  }

  guest(type, opts = {}) {
    return this.own(this.w.guests, { type, x: this.cx, y: this.floor, s: this.unit, alpha: 1, layer: 'front', ...opts });
  }

  tint(kind, opts = {}) {
    return this.own(this.w.tints, { kind, alpha: 0, x: this.cx, ...opts });
  }

  remove(obj) {
    for (const list of [this.w.props, this.w.guests, this.w.tints]) {
      const i = list.indexOf(obj);
      if (i >= 0) list.splice(i, 1);
    }
  }

  async fadeOut(obj, ms = 500) {
    await this.tween(obj, { alpha: 0 }, ms);
    this.remove(obj);
  }

  fx(kind, area, opts) {
    const a = area || { x: this.left, y: this.top, w: this.width, h: this.floor - this.top };
    const h = this.w.fx.start(kind, { floor: this.floor, ...a }, opts);
    this.owned.push([null, h]);
    return h;
  }

  /** Area just around the centre, for notes and hearts. */
  around(u = 0, dy = 70, w = 120) {
    return { x: this.at(u) - (w / 2) * this.unit, y: this.floor - dy * this.unit, w: w * this.unit, h: 10 };
  }

  sayAt(x, y, text, secs) {
    const b = { x, y, text, start: clock(), until: clock() + (secs ?? Math.min(6, 1.5 + text.length * 0.09)) };
    this.w.freeBubbles.push(b);
    return b;
  }

  async talkAt(x, y, text, secs) {
    const b = this.sayAt(x, y, text, secs);
    await this.wait((b.until - b.start) * 1000);
  }

  cleanup() {
    for (const [list, obj] of this.owned) {
      if (list) {
        obj.fading = true;
        this.w.fading.push([list, obj]);
      } else obj.stop();
    }
    this.owned = [];
  }
}

export class Director {
  constructor(world, { onState } = {}) {
    this.world = world;
    this.onState = onState || (() => {});
    this.stage = null;
    this.running = null;
    world.director = null;
  }

  get playing() {
    return this.stage ? this.stage.ep.id : null;
  }

  get episodes() {
    return episodesFor(this.world.settings.pack);
  }

  /** The desk friend can step away from the keyboard to join in. */
  deskFriend() {
    const id = this.world.settings.deskFriend;
    return this.world.settings.showDesk && this.world.desk && id && !this.world.friends.has(id) ? id : null;
  }

  available() {
    const ids = [...this.world.friends.values()].filter((f) => f.mode !== 'held' && !f.visitor).map((f) => f.id);
    const desk = this.deskFriend();
    return desk ? [...ids, desk] : ids;
  }

  /** Which episodes can play right now with the friends on screen. */
  playable(ep, ids = this.available(), { auto = false } = {}) {
    if (ep.id === 'random') return false;
    if ((ep.requires || []).some((id) => !ids.includes(id))) return false;
    if (ids.length < (ep.need || 1)) return false;
    if (auto && ep.season && !isInSeason(ep, new Date())) return false;
    if (auto && (this.world.settings.disabledEpisodes || []).includes(ep.id)) return false;
    return true;
  }

  /** @returns {{ok: boolean, reason?: string}} */
  async play(id, { auto = false } = {}) {
    if (this.stage) {
      this.stage.cancel();
      await this.running;
    }
    const ids = this.available();
    const episodes = this.episodes;
    let ep = episodes.find((e) => e.id === id);
    if (!ep || id === 'random') {
      const pool = episodes.filter((e) => this.playable(e, ids, { auto: true }));
      ep = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!ep) return { ok: false, reason: '지금은 볼 수 있는 이야기가 없어요.' };
    if (!this.playable(ep, ids, { auto })) {
      const missing = (ep.requires || []).filter((x) => !ids.includes(x));
      return { ok: false, reason: missing.length ? 'needs' : 'few', missing, id: ep.id };
    }
    const desk = this.deskFriend();
    const req = ep.requires || [];
    const pref = (ep.prefer || []).filter((x) => ids.includes(x) && !req.includes(x));
    const rest = shuffle(ids.filter((x) => !req.includes(x) && !pref.includes(x) && x !== desk));
    const tail = desk && !req.includes(desk) && !pref.includes(desk) ? [desk] : [];
    const cast = [...req, ...pref, ...rest, ...tail].slice(0, ep.max || 5);

    const world = this.world;
    const stage = new Stage(world, ep, cast);
    this.stage = stage;
    world.director = this;
    let borrowed = null;
    for (const fid of cast) {
      if (fid === desk) {
        // hops out of the desk and walks over
        borrowed = fid;
        world.addVisitor(fid, world.desk.x + world.desk.w / 2, { borrowed: true });
        world.puff(world.desk.x + world.desk.w / 2, stage.floor - 30 * world.unit);
        continue;
      }
      const f = world.friends.get(fid);
      world.stop(f);
      f.mode = 'script';
      f.bubble = null;
      if (f.disp !== world.main) {
        world.puff(f.x, f.y - 30 * world.unit);
        f.disp = world.main;
        f.x = f.x < world.main.x ? world.main.x + 30 : world.main.x + world.main.w - 30;
        f.y = stage.floor;
        f.onGround = true;
        world.puff(f.x, f.y - 30 * world.unit);
      }
    }
    this.onState({ playing: ep.id, title: ep.title, borrowed });
    this.running = (async () => {
      try {
        await ep.play(stage);
      } catch (e) {
        if (e !== CANCEL) console.error(`episode ${ep.id} failed`, e);
      } finally {
        stage.cancel();
        stage.cleanup();
        for (const vid of stage.visitors) world.removeVisitor(vid);
        if (borrowed) world.removeVisitor(borrowed); // back to the desk
        for (const fid of cast) {
          const f = world.friends.get(fid);
          if (!f || f.visitor) continue;
          Object.assign(f, { mode: 'auto', expr: null, look: null, item: null, acc: [], scared: false, z: 0, spin: 0, alpha: 1, task: null });
          if (f.y < stage.floor - 2) {
            f.onGround = false;
            f.vy = 0;
            world.setPose(f, 'fall');
          } else {
            f.y = stage.floor;
            world.setPose(f, 'stand');
          }
          f.until = clock() + rand(1, 3);
        }
        if (this.stage === stage) {
          this.stage = null;
          world.director = null;
          world.scheduleNextEpisode();
          this.onState({ playing: null, borrowed: null });
        }
      }
    })();
    return { ok: true, id: ep.id };
  }

  cancel() {
    if (this.stage) this.stage.cancel();
  }

  update(dt, t) {
    if (this.stage) this.stage.update(t);
  }
}
