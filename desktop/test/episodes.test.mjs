import test from 'node:test';
import assert from 'node:assert/strict';
import { EPISODES, CATEGORIES, isInSeason } from '../src/renderer/overlay/episodes.js';

test('36 episodes with unique ids in known categories', () => {
  assert.equal(EPISODES.length, 36);
  assert.equal(new Set(EPISODES.map((e) => e.id)).size, 36);
  const cats = new Set(CATEGORIES.map(([c]) => c));
  for (const e of EPISODES) {
    assert.ok(cats.has(e.cat), e.id);
    assert.equal(typeof e.play, 'function');
    assert.ok(e.title && e.emoji);
    for (const id of e.requires || []) assert.ok(['vin', 'picker', 'aa', 'locke', 'rex'].includes(id));
  }
});

test('seasonal episodes know their dates', () => {
  const ep = (id) => EPISODES.find((e) => e.id === id);
  assert.equal(isInSeason(ep('halloween'), new Date(2026, 9, 26)), true);
  assert.equal(isInSeason(ep('halloween'), new Date(2026, 10, 2)), false);
  assert.equal(isInSeason(ep('snow'), new Date(2027, 0, 15)), true); // wraps over new year
  assert.equal(isInSeason(ep('snow'), new Date(2026, 6, 15)), false);
  assert.equal(isInSeason(ep('seollal'), new Date(2026, 1, 16)), true);
  assert.equal(isInSeason(ep('chuseok'), new Date(2026, 8, 25)), true);
  assert.equal(isInSeason(ep('chuseok'), new Date(2026, 9, 25)), false);
  assert.equal(isInSeason(ep('chat'), new Date()), true);
});
