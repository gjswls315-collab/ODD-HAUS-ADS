'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Stats, dayKey, prevDayKey } = require('../src/main/stats');

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'odd-stats-')), 'stats.json');
const at = (d, h, m = 0, s = 0) => new Date(2026, 9, d, h, m, s).getTime();

test('focused time is the sum of short gaps between presses', () => {
  const st = new Stats(tmp());
  st.recordKey(at(26, 9, 0, 0), 1);
  st.recordKey(at(26, 9, 0, 30), 2); // +30 s
  st.recordKey(at(26, 9, 2, 0), 3); // +90 s
  st.recordKey(at(26, 9, 10, 0), 1); // 8 min pause: not focus
  assert.equal(st.focusSeconds(at(26, 12)), 120);
  const s = st.summary(at(26, 12), { goalHours: 4, workHours: 8 });
  assert.equal(s.total, 4);
  assert.equal(s.maxCombo, 3);
  assert.equal(s.hourlyKeys[9], 4);
  assert.equal(s.first, at(26, 9));
  assert.equal(s.endOfDayAt, at(26, 17));
});

test('streak counts consecutive days with 30+ focused minutes', () => {
  const st = new Stats(tmp());
  const focusDay = (d) => {
    for (let i = 0; i <= 40; i++) st.recordKey(at(d, 10, i), 1); // 40 minutes
  };
  focusDay(24);
  focusDay(25);
  assert.deepEqual(st.streak(at(26, 9)), { days: 2, todayOk: false });
  focusDay(26);
  assert.deepEqual(st.streak(at(26, 12)), { days: 3, todayOk: true });
});

test('records survive a restart and fired reminders are remembered', () => {
  const file = tmp();
  const a = new Stats(file);
  a.recordKey(at(26, 9), 5);
  a.fire(at(26, 9), 'lunch');
  a.addPomodoro(at(26, 9));
  a.save();
  const b = new Stats(file);
  assert.equal(b.summary(at(26, 10)).total, 1);
  assert.equal(b.summary(at(26, 10)).pomodoros, 1);
  assert.equal(b.wasFired(at(26, 10), 'lunch'), true);
  assert.equal(b.wasFired(at(27, 10), 'lunch'), false);
});

test('only hourly numbers are stored', () => {
  const file = tmp();
  const st = new Stats(file);
  st.recordKey(at(26, 9), 1);
  st.save();
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(Object.keys(saved.days['2026-10-26']).sort(), ['fired', 'first', 'focus', 'keys', 'lastKey', 'maxCombo', 'pomodoros', 'total']);
});

test('day keys use local dates', () => {
  assert.equal(dayKey(at(26, 23, 59)), '2026-10-26');
  assert.equal(prevDayKey('2026-03-01'), '2026-02-28');
  const st = new Stats(tmp());
  assert.equal(st.history(at(26, 12), 7).length, 7);
});
