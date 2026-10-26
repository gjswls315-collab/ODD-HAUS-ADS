import test from 'node:test';
import assert from 'node:assert/strict';
import { World, clock } from '../src/renderer/overlay/world.js';
import { Director } from '../src/renderer/overlay/director.js';
import { EPISODES } from '../src/renderer/overlay/episodes.js';

const SETTINGS = { scale: 1, wanderers: ['vin', 'aa', 'locke', 'rex'], autoEpisodes: false, showFriends: true, episodeFreq: 'normal', disabledEpisodes: [] };
const TWO = [
  { id: 1, primary: true, x: 0, y: 0, w: 1000, h: 800 },
  { id: 2, primary: false, x: 1000, y: 100, w: 800, h: 600 }, // floor 100px higher
];

function sim(world, secs, until = () => false) {
  let t = clock();
  for (let i = 0; i < secs * 30; i++) {
    t += 1 / 30;
    world.update(1 / 30, t);
    if (until()) return true;
  }
  return false;
}

test('friends walk from one screen onto the next and land on its floor', () => {
  const w = new World({ displays: TWO, worldDisplayId: 1, settings: SETTINGS, desk: null });
  const f = w.friends.get('vin');
  f.mode = 'script';
  f.x = 950;
  w.walkTo(f, 1400);
  sim(w, 30, () => f.task === null && f.onGround);
  assert.equal(f.disp.id, 2);
  assert.equal(Math.round(f.x), 1400);
  assert.equal(f.y, 700);
});

test('walking targets are kept on screen so a walk always finishes', () => {
  const w = new World({ displays: [TWO[0]], worldDisplayId: 1, settings: SETTINGS, desk: null });
  const f = w.friends.get('aa');
  f.mode = 'script';
  w.walkTo(f, -5000);
  assert.ok(sim(w, 60, () => f.task === null)); // the walk finished
  assert.ok(f.x > 0);
});

test('a dropped friend falls to the floor', () => {
  const w = new World({ displays: TWO, worldDisplayId: 1, settings: SETTINGS, desk: null });
  assert.ok(w.grab('rex', 500, 300));
  w.drag('rex', 520, 200);
  w.release('rex');
  const f = w.friends.get('rex');
  sim(w, 5, () => f.onGround);
  assert.equal(f.y, 800);
  assert.equal(f.mode, 'auto');
});

test('snapshots carry what other screens need to draw', () => {
  const w = new World({ displays: TWO, worldDisplayId: 1, settings: SETTINGS, desk: null });
  const snap = w.snapshot(clock());
  assert.equal(snap.friends.length, 4);
  for (const key of ['id', 'x', 'y', 'pose', 'facing', 'bubble', 'emote']) assert.ok(key in snap.friends[0], key);
});

test('every episode plays to the end and gives the friends back', async () => {
  const all = { ...SETTINGS, wanderers: ['vin', 'picker', 'aa', 'locke', 'rex'] };
  for (const ep of EPISODES.filter((e) => e.id !== 'random')) {
    const w = new World({ displays: [{ ...TWO[0], w: 1920, h: 1040 }], worldDisplayId: 1, settings: all, desk: { x: 1600, y: 640, w: 300, h: 400 } });
    const d = new Director(w);
    const res = await d.play(ep.id);
    assert.ok(res.ok, `${ep.id}: ${JSON.stringify(res)}`);
    let t = clock();
    let done = false;
    for (let i = 0; i < 30 * 120 && !done; i++) {
      t += 1 / 30;
      w.update(1 / 30, t);
      if (i % 30 === 0) await new Promise((r) => setImmediate(r));
      done = d.playing === null;
    }
    assert.ok(done, `${ep.id} did not finish`);
    sim(w, 2);
    for (const f of w.friends.values()) assert.equal(f.mode, 'auto', `${ep.id}: ${f.id} still scripted`);
    assert.equal(w.props.length + w.guests.length + w.tints.length, 0, `${ep.id} left scenery behind`);
  }
});

test('cancelling an episode midway cleans up', async () => {
  const w = new World({ displays: [TWO[0]], worldDisplayId: 1, settings: SETTINGS, desk: null });
  const d = new Director(w);
  await d.play('capboat');
  sim(w, 3);
  await d.play('chat'); // replaces the running one
  assert.equal(d.playing, 'chat');
  d.cancel();
  await d.running;
  sim(w, 2);
  assert.equal(d.playing, null);
  assert.equal(w.props.length + w.guests.length, 0);
});
