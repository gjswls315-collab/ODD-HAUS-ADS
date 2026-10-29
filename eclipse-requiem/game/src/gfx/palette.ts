import { data } from './assets';
import { hex } from './canvas';

// The v2 "Totality" palette (assets/palette.json). Runtime colours (particles, UI text, fills) go through
// these tokens or `snap()` so nothing outside the 68-colour palette reaches the screen.

interface PaletteJson { ramps: { id: string; colors: string[] }[] }

export const PAL: Record<string, string> = {};
const list: [string, [number, number, number]][] = [];
for (const r of data<PaletteJson>('palette')?.ramps ?? []) {
  r.colors.forEach((c, i) => {
    PAL[r.id + i] = c;
    list.push([c, hex(c)]);
  });
}

const snapped = new Map<string, string>();
/** Nearest palette colour for an arbitrary #rrggbb (or a token name). */
export function snap(c: string): string {
  if (PAL[c]) return PAL[c];
  let s = snapped.get(c);
  if (s) return s;
  const [r, g, b] = hex(c);
  let best = c, bd = Infinity;
  for (const [h, [pr, pg, pb]] of list) {
    // weighted RGB distance (cheap perceptual approximation)
    const d = 2 * (pr - r) ** 2 + 4 * (pg - g) ** 2 + 3 * (pb - b) ** 2;
    if (d < bd) { bd = d; best = h; }
  }
  snapped.set(c, best);
  return best;
}
