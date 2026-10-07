#!/usr/bin/env bash
# One-shot rebuild of the ODD HAUS animatic from spec/timeline.json.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 -c "import numpy, PIL, fontTools" 2>/dev/null || pip install numpy Pillow fonttools
"$HERE/fetch_fonts.sh"
python3 "$HERE/audio.py"
python3 "$HERE/render.py" "$@"
