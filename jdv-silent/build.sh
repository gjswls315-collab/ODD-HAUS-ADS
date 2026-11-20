#!/bin/sh
# One command: cue sheet -> score -> picture -> mux.  Needs Node 20+, ffmpeg, Python 3 with numpy,
# Playwright's Chromium, and ../jdv-store with `npm install` done (the set and three.js come from there).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE"
python3 tools/timeline.py
python3 score/score.py
node tools/render.mjs frames --workers "${WORKERS:-3}"
python3 tools/mux.py
