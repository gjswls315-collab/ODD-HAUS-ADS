'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Stats } = require('../src/main/stats');
const { Scheduler, Pomodoro } = require('../src/main/scheduler');
const { DEFAULTS } = require('../src/main/settings');

const at = (h, m = 0, s = 0, d = 26) => new Date(2026, 9, d, h, m, s).getTime();
const MIN = 60000;

function setup(over = {}) {
  const stats = new Stats(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'odd-sch-')), 's.json'));
  const conf = { ...DEFAULTS, ...over };
  const env = { idle: 0 };
  const sch = new Scheduler({ stats, settings: { all: () => conf }, idleSeconds: () => env.idle, now: at(8) });
  const got = [];
  sch.on('remind', (r) => got.push(r.type));
  return { stats, sch, env, got };
}

// type steadily (a key every 30 s) from `from` to `to`, ticking every 20 s like the app
function work(ctx, from, to) {
  for (let t = from; t <= to; t += 10000) {
    if ((t - from) % 30000 === 0) {
      ctx.stats.recordKey(t, 1);
      ctx.sch.noteKey(t);
    }
    if ((t - from) % 20000 === 0) ctx.sch.tick(t);
  }
}

test('lunch is reminded once, only while you are still at the keyboard', () => {
  const ctx = setup({ stretchReminder: false, waterReminder: false });
  ctx.env.idle = 3600;
  ctx.sch.tick(at(12));
  assert.deepEqual(ctx.got, []); // away from the desk: nothing
  ctx.env.idle = 0;
  ctx.sch.tick(at(12, 5));
  ctx.sch.tick(at(12, 30));
  assert.deepEqual(ctx.got, ['lunch']);
});

test('dinner window is 18:00–20:00', () => {
  const ctx = setup({ stretchReminder: false, waterReminder: false });
  ctx.stats.fire(at(17), 'lunch');
  ctx.sch.tick(at(17, 59));
  ctx.sch.tick(at(18, 1));
  ctx.sch.tick(at(20, 30, 0));
  assert.deepEqual(ctx.got, ['dinner']);
});

test('stretch after 50 minutes of continuous work, water after 90 focused minutes', () => {
  const ctx = setup({ mealReminders: false, endOfDay: false, goalHours: 12 });
  work(ctx, at(9), at(10, 35));
  assert.deepEqual(ctx.got, ['stretch', 'praise', 'water']);
});

test('praise every focused hour, then the goal', () => {
  const ctx = setup({ mealReminders: false, stretchReminder: false, waterReminder: false, endOfDay: false, goalHours: 2 });
  work(ctx, at(8), at(10, 10));
  assert.deepEqual(ctx.got, ['praise', 'goal']);
});

test('end of day comes workHours after the first activity', () => {
  const ctx = setup({ mealReminders: false, stretchReminder: false, waterReminder: false, goalHours: 12, workHours: 8 });
  ctx.stats.markActive(at(9, 7));
  ctx.stats.fire(at(9, 7), 'praise1');
  ctx.sch.tick(at(17, 6));
  assert.deepEqual(ctx.got, []);
  ctx.sch.tick(at(17, 8));
  assert.deepEqual(ctx.got, ['endOfDay']);
});

test('reminders are spaced out', () => {
  const ctx = setup({ stretchReminder: false, waterReminder: false, goalHours: 12 });
  ctx.stats.markActive(at(4));
  ctx.sch.tick(at(12)); // lunch
  ctx.sch.tick(at(12, 0, 20)); // end of day is due too, but waits
  assert.deepEqual(ctx.got, ['lunch']);
  ctx.sch.tick(at(12, 2));
  assert.deepEqual(ctx.got, ['lunch', 'endOfDay']);
});

test('pomodoro: focus, then break, then idle', () => {
  const stats = new Stats(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'odd-pomo-')), 's.json'));
  const p = new Pomodoro({ settings: { all: () => DEFAULTS }, stats });
  const done = [];
  p.on('done', (d) => done.push(d.type));
  p.toggle(at(9));
  assert.equal(p.state(at(9)).mode, 'focus');
  p.tick(at(9, 24));
  p.tick(at(9, 25));
  assert.equal(p.state(at(9, 25)).mode, 'break');
  p.tick(at(9, 30));
  assert.equal(p.state(at(9, 30)).mode, 'idle');
  assert.deepEqual(done, ['pomodoroDone', 'breakDone']);
  assert.equal(stats.summary(at(9, 30)).pomodoros, 1);
  p.toggle(at(10));
  p.toggle(at(10, 1));
  assert.equal(p.state(at(10, 1)).mode, 'idle'); // stopping early doesn't count
  assert.equal(stats.summary(at(10, 1)).pomodoros, 1);
});
