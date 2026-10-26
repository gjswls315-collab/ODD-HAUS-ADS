'use strict';

// Small JSON files in the user's data folder. Writes go through a temp file so a crash
// mid-write never leaves a half-written settings or stats file behind.

const fs = require('fs');
const path = require('path');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { readJson, writeJson };
