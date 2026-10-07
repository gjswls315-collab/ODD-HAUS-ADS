#!/usr/bin/env bash
# Downloads the OFL-licensed fonts the animatic renderer uses into animatic/.fonts
# (gitignored). Sources: fontsource packages on npm, NanumGothic from the
# koreanize-matplotlib wheel on PyPI.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HERE/.fonts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$DEST"

# fontsource package -> files to keep (latin-only for Latin faces, all numbered
# subsets for Korean faces since fontsource splits CJK into ~100 slices).
fetch_fontsource() {
  local pkg="$1" pattern="$2" out="$DEST/$1"
  [ -d "$out" ] && return 0
  (cd "$TMP" && npm pack "@fontsource/$pkg" --silent >/dev/null)
  mkdir -p "$out"
  tar -xzf "$TMP/fontsource-$pkg-"*.tgz -C "$TMP"
  find "$TMP/package/files" -name "$pattern" -exec cp {} "$out/" \;
  cp "$TMP/package/LICENSE" "$out/LICENSE" 2>/dev/null || true
  rm -rf "$TMP/package" "$TMP/fontsource-$pkg-"*.tgz
  echo "  $pkg: $(ls "$out" | grep -c woff) files"
}

echo "Fetching fonts into $DEST"
fetch_fontsource cormorant-garamond 'cormorant-garamond-latin-[456]00-normal.woff'
fetch_fontsource patrick-hand-sc    'patrick-hand-sc-latin-400-normal.woff'
fetch_fontsource nanum-myeongjo     'nanum-myeongjo-[0-9]*-[47]00-normal.woff'

if [ ! -f "$DEST/NanumGothic.ttf" ]; then
  (cd "$TMP" && pip download --no-deps --quiet koreanize-matplotlib==0.1.1 -d .)
  python3 -m zipfile -e "$TMP"/koreanize_matplotlib-*.whl "$TMP/wheel"
  cp "$TMP/wheel/koreanize_matplotlib/fonts/NanumGothic.ttf" \
     "$TMP/wheel/koreanize_matplotlib/fonts/NanumGothicBold.ttf" "$DEST/"
  echo "  NanumGothic: 2 files"
fi
echo "Done."
