// The score as pure data. One through-composed 15-bar piece at 90 BPM (= exactly 40 s): no loop
// is ever repeated verbatim. The picture reads the same data (speaker cones, VU needles), so
// sound and image cannot drift apart.
import { BAR, BEAT } from '../config.js';
import { rng } from '../core/util.js';

const STEP = BEAT / 4;
const SWING = 0.17;
const r = rng(1990);
export const stepTime = (bar, step) => bar * BAR + step * STEP + (step % 2 ? SWING * STEP : 0);
const human = () => (r() - 0.5) * 0.012;

// ---- harmony: D minor, one chord a bar, never the same bar twice in a row
const CH = {
  Dm9: [50, 53, 57, 60, 64], Bbmaj7: [46, 50, 57, 62, 65], Gm9: [43, 53, 58, 62, 69], A7alt: [45, 55, 61, 65, 72],
  C13: [48, 58, 64, 69], Fmaj9: [53, 57, 60, 64, 67], Bbmaj7s11: [46, 57, 62, 64, 65], Em7b5: [52, 55, 58, 62], A7b9: [45, 55, 61, 64, 70],
  GmC: [48, 53, 58, 62, 69], Dm69: [38, 50, 57, 59, 64, 69],
};
const BARS = [
  { ch: ['Dm9'], root: [38], comp: [0, 10] },
  { ch: ['Bbmaj7'], root: [34], comp: [0, 7] },
  { ch: ['Gm9'], root: [31], comp: [0, 6, 11] },
  { ch: ['A7alt'], root: [33], comp: [0, 8] },
  { ch: ['Dm9'], root: [38], comp: [0, 7, 10] },
  { ch: ['Bbmaj7'], root: [34], comp: [0, 6] },
  { ch: ['Gm9'], root: [31], comp: [0, 7, 11] },
  { ch: ['C13'], root: [36], comp: [0, 6, 10] },
  { ch: ['Fmaj9'], root: [29], comp: [0, 7] },
  { ch: ['Bbmaj7s11'], root: [34], comp: [0, 10] },
  { ch: ['Em7b5', 'A7b9'], root: [40, 33], comp: [0, 8, 11] },
  { ch: ['Dm9'], root: [38], comp: [0] },
  { ch: ['Bbmaj7'], root: [34], comp: [0, 7, 10] },
  { ch: ['GmC'], root: [36], comp: [0, 6] },
  { ch: ['Dm69'], root: [26], comp: [0] },
];

const DRUMS = {
  3: { k: [[12, 0.5]], s: [[14, 0.55], [15, 0.3]], h: [12, 14], open: [] },               // pick-up into the beat
  4: { k: [[0, 1], [10, 0.8]], s: [[4, 0.9], [12, 0.95]], h: 'e', open: [] },
  5: { k: [[0, 1], [7, 0.7], [10, 0.85]], s: [[4, 0.9], [12, 0.95], [15, 0.25]], h: 'e', open: [] },
  6: { k: [[0, 1], [6, 0.7], [10, 0.85]], s: [[4, 0.95], [9, 0.22], [12, 0.95]], h: 'e', open: [14] },
  7: { k: [[0, 1], [7, 0.75], [10, 0.85], [11, 0.6]], s: [[4, 0.95], [12, 0.95], [15, 0.3]], h: 'e', open: [6] },
  8: { k: [[0, 1], [3, 0.6], [10, 0.9]], s: [[4, 0.95], [7, 0.2], [12, 1]], h: 's', open: [14] },
  9: { k: [[0, 1], [7, 0.75], [10, 0.85]], s: [[4, 0.95], [9, 0.25], [12, 0.95], [15, 0.3]], h: 's', open: [] },
  10: { k: [[0, 1], [6, 0.7], [10, 0.85], [13, 0.6]], s: [[4, 0.95], [12, 0.9], [14, 0.6], [15, 0.75]], h: 'e', open: [10] },
  11: { k: [[0, 0.9]], s: [], rim: [[4, 0.6], [12, 0.6], [15, 0.35]], h: 'e', open: [] },    // breakdown
  12: { k: [[0, 1], [7, 0.7], [10, 0.85]], s: [[4, 0.95], [12, 0.95], [15, 0.28]], h: 'e', open: [14] },
  13: { k: [[0, 0.9], [10, 0.7]], s: [[4, 0.8], [12, 0.8]], h: 'e', open: [] },
  14: { k: [[0, 0.8]], s: [], h: [], open: [] },
};

const LEAD = {
  8: [[2, 69, 2], [4, 72, 3], [8, 76, 4], [14, 74, 2]],
  9: [[0, 74, 3], [4, 69, 2], [7, 65, 3], [12, 64, 4]],
  10: [[2, 67, 2], [4, 70, 2], [6, 74, 3], [10, 73, 2], [12, 76, 2], [14, 70, 2]],
  11: [[0, 69, 6], [8, 65, 2], [10, 64, 6]],
  12: [[2, 74, 2], [4, 77, 3], [8, 76, 2], [10, 74, 2], [12, 69, 4]],
  13: [[0, 70, 4], [6, 69, 2], [8, 67, 7]],
  14: [[0, 76, 12]],
};

export const SCORE = { kicks: [], snares: [], rims: [], hats: [], chords: [], bass: [], lead: [] };

BARS.forEach((b, bar) => {
  // keys
  b.comp.forEach((st, i) => {
    const two = b.ch.length > 1;
    const name = two && st >= 8 ? b.ch[1] : b.ch[0];
    const next = b.comp[i + 1] ?? 16;
    const dur = bar === 14 ? BAR * 0.98 : Math.min((next - st) * STEP * 0.95, i === 0 ? BEAT * 1.9 : BEAT * 0.9);
    SCORE.chords.push({ t: stepTime(bar, st) + human(), notes: CH[name], dur, v: (i === 0 ? 0.9 : 0.6) * (bar === 14 ? 1.1 : 1), roll: i === 0 ? 0.018 : 0.006 });
  });
  // drums
  const d = DRUMS[bar];
  if (d) {
    d.k.forEach(([st, v]) => SCORE.kicks.push({ t: stepTime(bar, st) + human() * 0.4, v }));
    d.s.forEach(([st, v]) => SCORE.snares.push({ t: stepTime(bar, st) + human() + 0.008, v }));
    (d.rim || []).forEach(([st, v]) => SCORE.rims.push({ t: stepTime(bar, st) + human(), v }));
    const hs = d.h === 'e' ? [0, 2, 4, 6, 8, 10, 12, 14] : d.h === 's' ? [0, 2, 3, 4, 6, 8, 10, 11, 12, 14] : d.h;
    hs.forEach((st) => SCORE.hats.push({ t: stepTime(bar, st) + human(), v: (st % 4 === 2 ? 0.75 : 0.45) * (0.8 + r() * 0.4), open: d.open.includes(st) }));
    d.open.filter((st) => !hs.includes(st)).forEach((st) => SCORE.hats.push({ t: stepTime(bar, st), v: 0.6, open: true }));
  }
  // bass: bars 6-14
  if (bar >= 6) {
    const root = b.root[0], nextRoot = (BARS[bar + 1] || b).root[0];
    if (bar === 11 || bar === 14) SCORE.bass.push({ t: stepTime(bar, 0), n: root, dur: BAR * 0.92, v: 0.85 });
    else {
      SCORE.bass.push({ t: stepTime(bar, 0) + human() * 0.3, n: root, dur: STEP * 5.5, v: 1 });
      const mid = [7, 10, 6, 7][bar % 4];
      SCORE.bass.push({ t: stepTime(bar, mid) + human() * 0.3, n: b.root[1] ?? (bar % 2 ? root + 7 : root + 12), dur: STEP * 3, v: 0.8 });
      if (b.root[1] === undefined && bar % 3 !== 1) SCORE.bass.push({ t: stepTime(bar, 11) + human() * 0.3, n: root + (bar % 2 ? 10 : 7), dur: STEP * 2, v: 0.6 });
      SCORE.bass.push({ t: stepTime(bar, 14) + human() * 0.3, n: nextRoot + (nextRoot > root ? -2 : 1), dur: STEP * 1.8, v: 0.7 });
    }
  }
  (LEAD[bar] || []).forEach(([st, n, len]) => SCORE.lead.push({ t: stepTime(bar, st) + human(), n, dur: len * STEP, v: 0.8 + r() * 0.2 }));
});

// ---- envelopes the picture uses
const env = (list, t, decay) => { let e = 0; for (const h of list) { const d = t - h.t; if (d >= 0 && d < 1.2) e = Math.max(e, h.v * Math.exp(-d * decay)); } return e; };
export const kickEnv = (t) => env(SCORE.kicks, t, 13);
export const snareEnv = (t) => env(SCORE.snares, t, 16);
export const bassEnv = (t) => { let e = 0; for (const h of SCORE.bass) { const d = t - h.t; if (d >= 0 && d < h.dur) e = Math.max(e, h.v * Math.min(1, d * 40) * (1 - (d / h.dur) * 0.5)); } return e; };
export const chordEnv = (t) => env(SCORE.chords, t, 2.2);
export const levelEnv = (t) => Math.min(1, 0.22 * chordEnv(t) + 0.5 * kickEnv(t) + 0.4 * snareEnv(t) + 0.2 * bassEnv(t));
