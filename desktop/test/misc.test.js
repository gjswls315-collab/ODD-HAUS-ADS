'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isNewer, checkForUpdate } = require('../src/main/updater');
const { clean } = require('../src/main/ai');
const { pickLine, LINES } = require('../src/main/lines');

test('version comparison', () => {
  assert.equal(isNewer('1.2.0', '1.1.9'), true);
  assert.equal(isNewer('1.1.9', '1.2.0'), false);
  assert.equal(isNewer('1.0.0', '1.0.0'), false);
});

test('update check picks the newest desktop release', async () => {
  const releases = [
    { tag_name: 'desktop-v1.1.0', html_url: 'u1', body: '' },
    { tag_name: 'desktop-v1.3.0', html_url: 'u3', body: '', prerelease: true },
    { tag_name: 'desktop-v1.2.0', html_url: 'u2', body: 'notes' },
    { tag_name: 'film-v9.0.0', html_url: 'x' },
  ];
  const fetchImpl = async () => ({ ok: true, json: async () => releases });
  assert.deepEqual(await checkForUpdate('1.0.0', 'api', fetchImpl), { version: '1.2.0', url: 'u2', notes: 'notes' });
  assert.equal(await checkForUpdate('1.2.0', 'api', fetchImpl), null);
  assert.equal(await checkForUpdate('1.0.0', 'api', async () => ({ ok: false })), null);
});

test('AI output is cleaned to one short line', () => {
  assert.equal(clean('"흥, 물이나 마셔."\n설명: …', 'x'), '흥, 물이나 마셔.');
  assert.equal(clean('', 'original'), 'original');
  assert.ok(clean('가'.repeat(100), 'x').length <= 59);
});

test('every reminder type has lines', () => {
  for (const type of Object.keys(LINES)) assert.ok(pickLine(type, 3).length > 0);
  assert.equal(pickLine('praise', 3, () => 0), '3시간 집중 성공~! 역시 최고야~!');
});
