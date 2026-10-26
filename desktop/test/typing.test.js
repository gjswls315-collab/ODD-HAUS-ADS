'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { KeyDeduper, TypingTracker, isMilestone } = require('../src/main/typing');

test('auto-repeat of a held key is not counted again', () => {
  const d = new KeyDeduper();
  assert.equal(d.keydown(30, 0), true);
  assert.equal(d.keydown(30, 500), false); // OS repeat while held
  assert.equal(d.keydown(30, 530), false);
  d.keyup(30);
  assert.equal(d.keydown(30, 600), true);
});

test('a keydown long after a missed keyup counts as a new press', () => {
  const d = new KeyDeduper();
  d.keydown(30, 0);
  assert.equal(d.keydown(30, 5000), true);
});

test('combo grows while presses are close and resets after a pause', () => {
  const t = new TypingTracker();
  assert.equal(t.press('key', 1000).combo, 1);
  assert.equal(t.press('key', 1200).combo, 2);
  assert.equal(t.press('space', 2600).combo, 3);
  assert.equal(t.press('key', 5000).combo, 1);
  assert.equal(t.comboAt(5100), 1);
  assert.equal(t.comboAt(9000), 0);
});

test('milestones fire at 10, 30, 50, 100 … and every 500 after 1000', () => {
  for (const n of [10, 30, 50, 100, 777, 1000, 1500, 2000]) assert.equal(isMilestone(n), true, n);
  for (const n of [1, 11, 99, 1200]) assert.equal(isMilestone(n), false, n);
  const t = new TypingTracker();
  let ms = 0;
  const hits = [];
  for (let i = 1; i <= 50; i++) if (t.press('key', (ms += 100)).milestone) hits.push(i);
  assert.deepEqual(hits, [10, 30, 50]);
});

test('keys per minute counts the last 15 seconds', () => {
  const t = new TypingTracker();
  for (let i = 0; i < 75; i++) t.press('key', 10000 + i * 200); // 5 keys/s for 15 s
  assert.equal(t.kpm(10000 + 74 * 200), 300);
  assert.equal(t.kpm(60000), 0);
});
