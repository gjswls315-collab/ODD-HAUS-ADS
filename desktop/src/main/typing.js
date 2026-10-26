'use strict';

// Pure typing logic: which presses count, combos and keys-per-minute. No key identity ever
// leaves this file: callers only get a kind ('key' | 'enter' | 'space' | 'erase').

const COMBO_GAP_MS = 1500; // a pause longer than this ends the combo
const KPM_WINDOW_MS = 15000; // keys per minute is measured over the last 15 seconds
const REPEAT_MS = 1100; // a keydown this soon after the same key's last keydown, with no keyup, is OS auto-repeat
const MILESTONES = [10, 30, 50, 100, 200, 300, 500, 777, 1000];

function isMilestone(combo) {
  return MILESTONES.includes(combo) || (combo > 1000 && combo % 500 === 0);
}

/**
 * Turns raw keydown/keyup codes into counted presses. Codes are only held in memory while a key
 * is down, to tell a real press from auto-repeat; they are never stored or sent anywhere.
 */
class KeyDeduper {
  constructor() {
    this.down = new Map(); // keycode -> time of its last keydown event
  }

  /** @returns {boolean} true when this keydown is a new press (not auto-repeat) */
  keydown(code, t) {
    const last = this.down.get(code);
    this.down.set(code, t);
    return last === undefined || t - last > REPEAT_MS;
  }

  keyup(code) {
    this.down.delete(code);
  }

  reset() {
    this.down.clear();
  }
}

class TypingTracker {
  constructor({ comboGap = COMBO_GAP_MS } = {}) {
    this.comboGap = comboGap;
    this.combo = 0;
    this.lastAt = 0;
    this.recent = []; // press times inside the kpm window
  }

  press(kind, t) {
    this.combo = t - this.lastAt <= this.comboGap ? this.combo + 1 : 1;
    this.lastAt = t;
    this.recent.push(t);
    this.trim(t);
    return { kind, combo: this.combo, milestone: isMilestone(this.combo), kpm: this.kpm(t), at: t };
  }

  trim(t) {
    const cut = t - KPM_WINDOW_MS;
    let i = 0;
    while (i < this.recent.length && this.recent[i] <= cut) i++;
    if (i) this.recent.splice(0, i);
  }

  kpm(t) {
    this.trim(t);
    return Math.round((this.recent.length * 60000) / KPM_WINDOW_MS);
  }

  comboAt(t) {
    return t - this.lastAt <= this.comboGap ? this.combo : 0;
  }
}

module.exports = { KeyDeduper, TypingTracker, isMilestone, COMBO_GAP_MS, MILESTONES };
