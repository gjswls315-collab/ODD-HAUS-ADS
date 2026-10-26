'use strict';

// Reminders (meals, stretching, water, focus praise, goal, end of day) and the pomodoro timer.
// Everything is driven by tick(now) so it can be tested with a fake clock.

const { EventEmitter } = require('events');
const { dayKey } = require('./stats');

const MIN = 60 * 1000;
const ACTIVE_MS = 2 * MIN; // "working right now" = input within the last 2 minutes
const BREAK_MS = 5 * MIN; // 5 quiet minutes end a continuous session
const SPACING_MS = 90 * 1000; // never two reminders closer than this
const LUNCH = [11 + 50 / 60, 14]; // 점심: from 11:50 until 14:00, while you're still at the keyboard
const DINNER = [18, 20];

class Scheduler extends EventEmitter {
  /**
   * @param {object} o
   * @param {import('./stats').Stats} o.stats
   * @param {{all(): object}} o.settings
   * @param {() => number} o.idleSeconds seconds since the last keyboard or mouse input anywhere
   */
  constructor({ stats, settings, idleSeconds, now = Date.now() }) {
    super();
    this.stats = stats;
    this.settings = settings;
    this.idleSeconds = idleSeconds;
    this.lastKeyAt = 0;
    this.sessionStart = null;
    this.lastStretchAt = 0;
    this.lastEmitAt = 0;
    this.day = dayKey(now);
    this.waterMark = stats.focusSeconds(now); // don't nag about water right after a restart
  }

  noteKey(t) {
    this.lastKeyAt = t;
  }

  emitOnce(t, type, n) {
    this.lastEmitAt = t;
    this.emit('remind', { type, n, at: t });
  }

  tick(t) {
    const s = this.settings.all();
    const idleMs = Math.max(0, this.idleSeconds() * 1000);
    const lastActive = Math.max(this.lastKeyAt, t - idleMs);
    const active = t - lastActive < ACTIVE_MS;
    if (idleMs < 30 * 1000) this.stats.markActive(t);

    if (dayKey(t) !== this.day) {
      this.day = dayKey(t);
      this.waterMark = 0;
      this.sessionStart = null;
      this.lastStretchAt = 0;
    }

    if (t - lastActive >= BREAK_MS) this.sessionStart = null;
    else if (this.sessionStart === null && active) this.sessionStart = lastActive;

    if (!active || t - this.lastEmitAt < SPACING_MS) return;

    const date = new Date(t);
    const hm = date.getHours() + date.getMinutes() / 60;
    const fired = (what) => this.stats.wasFired(t, what);
    const fire = (what, type = what, n) => {
      this.stats.fire(t, what);
      this.emitOnce(t, type, n);
    };

    if (s.mealReminders) {
      if (hm >= LUNCH[0] && hm < LUNCH[1] && !fired('lunch')) return fire('lunch');
      if (hm >= DINNER[0] && hm < DINNER[1] && !fired('dinner')) return fire('dinner');
    }

    const focus = this.stats.focusSeconds(t);
    const goalSec = s.goalHours * 3600;
    if (focus >= goalSec && !fired('goal')) {
      for (let h = 1; h <= Math.floor(focus / 3600); h++) this.stats.fire(t, `praise${h}`);
      return fire('goal', 'goal', s.goalHours);
    }
    const hours = Math.floor(focus / 3600);
    if (hours >= 1 && !fired(`praise${hours}`)) {
      for (let h = 1; h < hours; h++) this.stats.fire(t, `praise${h}`);
      return fire(`praise${hours}`, 'praise', hours);
    }

    const summary = this.stats.summary(t, s);
    if (s.endOfDay && summary.endOfDayAt !== null && t >= summary.endOfDayAt && !fired('endOfDay')) {
      return fire('endOfDay');
    }

    if (s.stretchReminder && this.sessionStart !== null) {
      const since = Math.max(this.sessionStart, this.lastStretchAt);
      if (t - since >= s.stretchMinutes * MIN) {
        this.lastStretchAt = t;
        return this.emitOnce(t, 'stretch', Math.round((t - this.sessionStart) / MIN));
      }
    }

    if (s.waterReminder && focus - this.waterMark >= s.waterMinutes * 60) {
      this.waterMark = focus;
      return this.emitOnce(t, 'water');
    }
  }
}

class Pomodoro extends EventEmitter {
  constructor({ settings, stats }) {
    super();
    this.settings = settings;
    this.stats = stats;
    this.mode = 'idle'; // idle | focus | break
    this.endsAt = 0;
    this.length = 0;
  }

  state(t = Date.now()) {
    return {
      mode: this.mode,
      endsAt: this.endsAt,
      length: this.length,
      left: this.mode === 'idle' ? 0 : Math.max(0, this.endsAt - t),
    };
  }

  start(mode, t) {
    const minutes = mode === 'focus' ? this.settings.all().pomodoroMinutes : this.settings.all().breakMinutes;
    this.mode = mode;
    this.length = minutes * MIN;
    this.endsAt = t + this.length;
    this.emit('change', this.state(t));
  }

  /** The desk button: start focusing, or stop whatever is running. */
  toggle(t) {
    if (this.mode === 'idle') return this.start('focus', t);
    this.mode = 'idle';
    this.endsAt = 0;
    this.emit('change', this.state(t));
  }

  tick(t) {
    if (this.mode === 'idle' || t < this.endsAt) return;
    if (this.mode === 'focus') {
      this.stats.addPomodoro(t);
      this.start('break', t);
      this.emit('done', { type: 'pomodoroDone', n: this.settings.all().breakMinutes, at: t });
    } else {
      this.mode = 'idle';
      this.endsAt = 0;
      this.emit('change', this.state(t));
      this.emit('done', { type: 'breakDone', at: t });
    }
  }
}

module.exports = { Scheduler, Pomodoro };
