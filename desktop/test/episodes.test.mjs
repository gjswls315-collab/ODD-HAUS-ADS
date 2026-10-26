import test from 'node:test';
import assert from 'node:assert/strict';
import { episodesFor, categoriesFor, isInSeason } from '../src/renderer/overlay/episodes.js';
import { RIG } from '../src/renderer/shared/draw.js';
import '../src/renderer/shared/chiikawa.js';

for (const pack of ['chiikawa', 'oddhaus']) {
  test(`${pack}: 36 episodes plus "아무거나", unique ids, known categories`, () => {
    const eps = episodesFor(pack);
    assert.equal(eps.filter((e) => e.id !== 'random').length, pack === 'chiikawa' ? 36 : 35);
    assert.equal(new Set(eps.map((e) => e.id)).size, eps.length);
    const cats = new Set(categoriesFor(pack).map(([c]) => c));
    for (const e of eps) {
      assert.ok(cats.has(e.cat), e.id);
      assert.equal(typeof e.play, 'function');
      assert.ok(e.title && e.emoji);
      for (const id of e.requires || []) assert.ok(RIG[id], `${e.id} needs unknown ${id}`);
    }
  });
}

test('seasonal episodes know their dates', () => {
  const ep = (id) => episodesFor('chiikawa').find((e) => e.id === id);
  assert.equal(isInSeason(ep('halloween'), new Date(2026, 9, 26)), true);
  assert.equal(isInSeason(ep('halloween'), new Date(2026, 10, 2)), false);
  assert.equal(isInSeason(ep('snow'), new Date(2027, 0, 15)), true); // wraps over new year
  assert.equal(isInSeason(ep('snow'), new Date(2026, 6, 15)), false);
  assert.equal(isInSeason(ep('seollal'), new Date(2026, 1, 16)), true);
  assert.equal(isInSeason(ep('chuseok'), new Date(2026, 8, 25)), true);
  assert.equal(isInSeason(ep('chuseok'), new Date(2026, 9, 25)), false);
  assert.equal(isInSeason(ep('chat'), new Date()), true);
});
