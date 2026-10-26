'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Settings, sanitize, DEFAULTS } = require('../src/main/settings');

test('bad values fall back to safe ones', () => {
  const s = sanitize({ pack: 'oddhaus', scale: 99, deskFriend: 'nobody', wanderers: ['vin', 'vin', 'ghost'], episodeFreq: 'always', aiModel: 'gpt', extra: 1 });
  assert.equal(s.scale, 1.8);
  assert.equal(s.deskFriend, 'picker');
  assert.deepEqual(s.wanderers, ['vin']);
  assert.equal(sanitize({ pack: 'nope' }).pack, DEFAULTS.pack);
  assert.equal(s.episodeFreq, 'normal');
  assert.equal(s.aiModel, 'claude-opus-5-5');
  assert.equal('extra' in s, false);
});

test('the desk friend never also wanders', () => {
  const s = sanitize({ pack: 'oddhaus', deskFriend: 'vin', wanderers: ['vin', 'aa'] });
  assert.deepEqual(s.wanderers, ['aa']);
});

test('the Chiikawa trio is the default, and switching packs brings in that pack', () => {
  assert.deepEqual([DEFAULTS.pack, DEFAULTS.deskFriend, DEFAULTS.wanderers], ['chiikawa', 'chiikawa', ['hachiware', 'usagi']]);
  const odd = sanitize({ ...DEFAULTS, pack: 'oddhaus' });
  assert.equal(odd.deskFriend, 'picker');
  assert.deepEqual(odd.wanderers, ['vin', 'aa', 'locke', 'rex']);
  const back = sanitize({ ...odd, pack: 'chiikawa' });
  assert.deepEqual([back.deskFriend, back.wanderers], ['chiikawa', ['hachiware', 'usagi']]);
  assert.deepEqual(sanitize({ ...DEFAULTS, wanderers: [] }).wanderers, []); // nobody wandering is allowed
});

test('windows never see the API key, and it is stored encrypted', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'odd-set-')), 'settings.json');
  const secret = { encrypt: (x) => Buffer.from(x).toString('base64'), decrypt: (x) => Buffer.from(x, 'base64').toString() };
  const s = new Settings(file, secret);
  s.set({ aiKey: 'sk-ant-test' });
  const r = s.forRenderer();
  assert.equal('aiKey' in r, false);
  assert.equal(r.aiHasKey, true);
  assert.ok(!fs.readFileSync(file, 'utf8').includes('sk-ant-test'));
  assert.equal(new Settings(file, secret).get('aiKey'), 'sk-ant-test');
});

test('change events list only what changed', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'odd-set-')), 'settings.json');
  const s = new Settings(file);
  let seen = null;
  s.on('change', (keys) => (seen = keys));
  s.set({ showDesk: false, scale: DEFAULTS.scale });
  assert.deepEqual(seen, ['showDesk']);
});
