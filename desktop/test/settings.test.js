'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Settings, sanitize, DEFAULTS } = require('../src/main/settings');

test('bad values fall back to safe ones', () => {
  const s = sanitize({ scale: 99, deskFriend: 'nobody', wanderers: ['vin', 'vin', 'ghost'], episodeFreq: 'always', aiModel: 'gpt', extra: 1 });
  assert.equal(s.scale, 1.8);
  assert.equal(s.deskFriend, DEFAULTS.deskFriend);
  assert.deepEqual(s.wanderers, ['vin']);
  assert.equal(s.episodeFreq, 'normal');
  assert.equal(s.aiModel, 'claude-opus-5-5');
  assert.equal('extra' in s, false);
});

test('the desk friend never also wanders', () => {
  const s = sanitize({ deskFriend: 'vin', wanderers: ['vin', 'aa'] });
  assert.deepEqual(s.wanderers, ['aa']);
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
