'use strict';

// Today's focus record, kept per day as 24 hourly numbers on this PC only:
// key presses per hour, focused seconds per hour, first activity, best combo, pomodoros.

const { readJson, writeJson } = require('./jsonstore');

const FOCUS_GAP_S = 120; // pauses up to 2 minutes between presses still count as focused time
const STREAK_MIN_S = 30 * 60;
const KEEP_DAYS = 120;

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const prevDayKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
};

function emptyDay() {
  return {
    keys: Array(24).fill(0),
    focus: Array(24).fill(0),
    total: 0,
    first: null, // first activity (ms)
    lastKey: null,
    maxCombo: 0,
    pomodoros: 0,
    fired: {}, // reminders already shown today
  };
}

class Stats {
  constructor(file) {
    this.file = file;
    const raw = readJson(file, null);
    this.days = {};
    if (raw && raw.days && typeof raw.days === 'object') {
      for (const [key, d] of Object.entries(raw.days)) if (d && typeof d === 'object') this.days[key] = { ...emptyDay(), ...d };
    }
    this.dirty = false;
  }

  day(t) {
    const key = dayKey(t);
    if (!this.days[key]) {
      this.days[key] = emptyDay();
      this.prune();
    }
    return this.days[key];
  }

  prune() {
    const keys = Object.keys(this.days).sort();
    while (keys.length > KEEP_DAYS) delete this.days[keys.shift()];
  }

  markActive(t) {
    const d = this.day(t);
    if (d.first === null) {
      d.first = t;
      this.dirty = true;
    }
  }

  recordKey(t, combo) {
    const d = this.day(t);
    const hour = new Date(t).getHours();
    d.keys[hour] += 1;
    d.total += 1;
    if (d.first === null) d.first = t;
    if (d.lastKey !== null) {
      const gap = (t - d.lastKey) / 1000;
      if (gap > 0 && gap <= FOCUS_GAP_S) d.focus[hour] += gap;
    }
    d.lastKey = t;
    if (combo > d.maxCombo) d.maxCombo = combo;
    this.dirty = true;
  }

  addPomodoro(t) {
    this.day(t).pomodoros += 1;
    this.dirty = true;
  }

  wasFired(t, what) {
    return Boolean(this.day(t).fired[what]);
  }

  fire(t, what) {
    this.day(t).fired[what] = true;
    this.dirty = true;
  }

  focusSeconds(t) {
    const d = this.days[dayKey(t)];
    return d ? d.focus.reduce((a, b) => a + b, 0) : 0;
  }

  /** Consecutive days with 30+ focused minutes. Today counts once it qualifies. */
  streak(t) {
    const today = dayKey(t);
    const ok = (key) => {
      const d = this.days[key];
      return Boolean(d) && d.focus.reduce((a, b) => a + b, 0) >= STREAK_MIN_S;
    };
    const todayOk = ok(today);
    let key = todayOk ? today : prevDayKey(today);
    let n = 0;
    while (ok(key)) {
      n += 1;
      key = prevDayKey(key);
    }
    return { days: n, todayOk };
  }

  summary(t, { goalHours = 4, workHours = 8 } = {}) {
    const d = this.days[dayKey(t)] || emptyDay();
    const focus = d.focus.reduce((a, b) => a + b, 0);
    return {
      date: dayKey(t),
      focusSec: Math.round(focus),
      total: d.total,
      maxCombo: d.maxCombo,
      pomodoros: d.pomodoros,
      first: d.first,
      endOfDayAt: d.first === null ? null : d.first + workHours * 3600 * 1000,
      goalSec: goalHours * 3600,
      hourlyFocus: d.focus.map((s) => Math.round(s)),
      hourlyKeys: d.keys.slice(),
      streak: this.streak(t),
      hour: new Date(t).getHours(),
    };
  }

  history(t, n = 7) {
    const out = [];
    let key = dayKey(t);
    for (let i = 0; i < n; i++) {
      const d = this.days[key];
      out.unshift({
        date: key,
        focusSec: d ? Math.round(d.focus.reduce((a, b) => a + b, 0)) : 0,
        total: d ? d.total : 0,
      });
      key = prevDayKey(key);
    }
    return out;
  }

  reset() {
    this.days = {};
    this.dirty = true;
    this.save();
  }

  save() {
    if (!this.dirty) return;
    writeJson(this.file, { version: 1, days: this.days });
    this.dirty = false;
  }
}

module.exports = { Stats, dayKey, prevDayKey, FOCUS_GAP_S };
