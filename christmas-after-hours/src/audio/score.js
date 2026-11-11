// Web Audio score + sound design. Everything is synthesised: no samples, no files.
// buildScore() works on a live AudioContext or an OfflineAudioContext (for WAV/MP4 export) and can
// start from any film time, so pause / scrub / restart never restarts the music from bar one.
import { DURATION } from '../config.js';
import { rng, fbm1, lerp } from '../core/util.js';
import { SCORE } from './pattern.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Where the listener is: [time, value] breakpoints. Outside the shop the record is heard through
// brick and glass; inside it opens up; the door shuts at 33.67.
const MIX = {
  wallHz: [[0, 300], [5, 360], [8.6, 560], [9.94, 820], [10.0, 15000], [33.6, 15000], [33.74, 430], [37.2, 380], [37.36, 2400], [40, 900]],
  music: [[0, 0.8], [5, 1.0], [9.94, 1.25], [10.0, 0.92], [33.6, 0.92], [33.74, 0.85], [37.25, 0.6], [37.36, 0.8], [39.0, 0.55], [39.9, 0.0]],
  wind: [[0, 0], [0.7, 0.8], [5, 0.7], [9.94, 0.5], [10.0, 0.05], [33.6, 0.05], [33.76, 0.66], [37.0, 0.74], [38.6, 0.32], [39.9, 0]],
  city: [[0, 0], [0.8, 0.55], [9.94, 0.42], [10.0, 0.035], [33.6, 0.035], [33.76, 0.5], [37.3, 0.5], [39.0, 0.16], [39.9, 0]],
  crackle: [[0, 0.5], [9.94, 0.6], [10.0, 0.42], [33.6, 0.42], [33.74, 0.6], [37.36, 0.5], [39.9, 0.25]],
  room: [[0, 0], [9.94, 0], [10.0, 1], [33.6, 1], [33.74, 0], [40, 0]],
};
export const mixAt = (name, t) => {
  const p = MIX[name];
  if (t <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (t < p[i + 1][0]) return lerp(p[i][1], p[i + 1][1], (t - p[i][0]) / (p[i + 1][0] - p[i][0]));
  return p[p.length - 1][1];
};

function noiseBuffer(ctx, seconds, kind, seed) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const r = rng(seed + ch * 101), d = buf.getChannelData(ch);
    let b = 0, p0 = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const w = r() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'brown') { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }
      else { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; d[i] = (p0 + p1 + p2 + w * 0.1848) * 0.2; }
    }
    // make the loop seamless
    const f = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k); }
  }
  return buf;
}

function crackleBuffer(ctx, seconds, seed) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  const r = rng(seed);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let lp = 0;
  for (let i = 0; i < n; i++) { lp = lp * 0.86 + (r() * 2 - 1) * 0.14; L[i] = lp * 0.045; R[i] = lp * 0.04; } // surface hiss
  const pops = Math.floor(seconds * 16);
  for (let k = 0; k < pops; k++) {
    const i0 = Math.floor(r() * (n - 400)), big = r() < 0.12, amp = big ? r.range(0.5, 0.9) : r.range(0.08, 0.3), len = big ? 90 : r.int(8, 30), pan = r();
    for (let i = 0; i < len; i++) { const v = amp * Math.exp(-i / (len * 0.25)) * (i % 2 ? -1 : 1) * (0.6 + r() * 0.4); L[i0 + i] += v * (1 - pan * 0.6); R[i0 + i] += v * (0.4 + pan * 0.6); }
  }
  return buf;
}

function impulse(ctx, seconds, decay, seed) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const r = rng(seed + ch * 7), d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return buf;
}

function satCurve(amount) {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount); }
  return c;
}

export function buildScore(ctx, out, offset = 0, lead = 0.08) {
  const t0 = ctx.currentTime + lead - offset;      // film time t plays at ctx time t0 + t
  const at = (t) => Math.max(0, t0 + t);
  const live = [];
  const R = rng(4242);

  const G = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const F = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const auto = (param, name, scale = 1) => {
    param.cancelScheduledValues(0);
    param.setValueAtTime(mixAt(name, Math.max(0, offset)) * scale, ctx.currentTime);
    for (const [t, v] of MIX[name]) if (t > offset) param.linearRampToValueAtTime(v * scale, at(t));
  };

  // ---- buses
  const session = G(1); session.connect(out);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.22;
  // gentle glue compression, then a soft clipper as a safety ceiling: nothing can hit 0 dBFS
  const ceiling = ctx.createWaveShaper(); ceiling.curve = satCurve(1.15); ceiling.oversample = '2x';
  const trim = G(0.86);
  const master = G(0.5); master.connect(comp); comp.connect(ceiling); ceiling.connect(trim); trim.connect(session);
  const wall = F('lowpass', 15000, 0.5); const wall2 = F('lowpass', 15000, 0.5);
  const musicGain = G(0.9);
  wall.connect(wall2); wall2.connect(musicGain); musicGain.connect(master);
  auto(wall.frequency, 'wallHz'); auto(wall2.frequency, 'wallHz', 1.4); auto(musicGain.gain, 'music');
  // tape-ish music bus: gentle saturation, rolled-off top, a short room
  const music = G(1);
  const sat = ctx.createWaveShaper(); sat.curve = satCurve(1.6); sat.oversample = '2x';
  const top = F('lowpass', 7800, 0.4), warm = F('lowshelf', 180, 0.7); warm.gain.value = 2.5;
  music.connect(sat); sat.connect(top); top.connect(warm); warm.connect(wall);
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.1, 2.6, 5);
  const verbSend = G(1), verbRet = G(0.22); verbSend.connect(verb); verb.connect(verbRet); verbRet.connect(wall);
  const drums = G(0.95); const drumSat = ctx.createWaveShaper(); drumSat.curve = satCurve(2.4);
  const drumLP = F('lowpass', 6200, 0.5); drums.connect(drumSat); drumSat.connect(drumLP); drumLP.connect(music);
  // the whole record wows very slightly, like a belt drive with a tired motor
  const wow = ctx.createOscillator(); wow.frequency.value = 0.55; const wowAmt = G(3.2); wow.connect(wowAmt); wow.start(); live.push(wow);

  const white = noiseBuffer(ctx, 2, 'white', 11), pink = noiseBuffer(ctx, 5, 'pink', 12), brown = noiseBuffer(ctx, 6, 'brown', 13);
  const bed = (buf, dest) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(ctx.currentTime, (Math.max(0, offset) * 0.731) % buf.duration); live.push(s); return s; };
  const burst = (t, dur, dest, buf = white) => { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(dest); s.start(at(t), R() * (buf.duration - dur - 0.01), dur + 0.02); live.push(s); return s; };
  const ok = (t, dur = 0.5) => t + dur > offset && t < DURATION;
  const envAD = (param, t, peak, a, d, shape = 'exp') => {
    const T = Math.max(at(t), ctx.currentTime);
    param.setValueAtTime(0.0001, T); param.linearRampToValueAtTime(peak, T + a);
    if (shape === 'exp') param.exponentialRampToValueAtTime(0.0001, T + a + d); else param.linearRampToValueAtTime(0, T + a + d);
  };

  // ---- instruments
  const kick = ({ t, v }) => {
    const o = ctx.createOscillator(), g = G(0); o.type = 'sine';
    const T = at(t); o.frequency.setValueAtTime(128, T); o.frequency.exponentialRampToValueAtTime(46, T + 0.1);
    envAD(g.gain, t, 0.8 * v, 0.003, 0.3); o.connect(g); g.connect(drums); o.start(T); o.stop(T + 0.4); live.push(o);
    const c = G(0), hp = F('lowpass', 2200); envAD(c.gain, t, 0.22 * v, 0.001, 0.02); burst(t, 0.03, hp); hp.connect(c); c.connect(drums);
  };
  const snare = ({ t, v }) => {
    const bp = F('bandpass', 1900, 0.6), hp = F('highpass', 500), g = G(0); envAD(g.gain, t, 0.6 * v, 0.002, 0.13 + 0.07 * v);
    burst(t, 0.26, bp, pink); bp.connect(hp); hp.connect(g); g.connect(drums); g.connect(verbSend);
    const o = ctx.createOscillator(), og = G(0); o.type = 'triangle'; const T = at(t); o.frequency.setValueAtTime(205, T); o.frequency.exponentialRampToValueAtTime(150, T + 0.08);
    envAD(og.gain, t, 0.32 * v, 0.002, 0.09); o.connect(og); og.connect(drums); o.start(T); o.stop(T + 0.15); live.push(o);
  };
  const rim = ({ t, v }) => {
    const o = ctx.createOscillator(), g = G(0); o.type = 'square'; o.frequency.value = 1700; const bp = F('bandpass', 1700, 6);
    envAD(g.gain, t, 0.3 * v, 0.001, 0.03); o.connect(bp); bp.connect(g); g.connect(drums); g.connect(verbSend); o.start(at(t)); o.stop(at(t) + 0.06); live.push(o);
  };
  const hat = ({ t, v, open }) => {
    const hp = F('highpass', 6800), bp = F('bandpass', 9000, 1.2), g = G(0); envAD(g.gain, t, 0.2 * v, 0.002, open ? 0.24 : 0.045);
    burst(t, open ? 0.3 : 0.07, hp); hp.connect(bp); bp.connect(g); g.connect(drums);
  };
  // electric piano: sine body, a bell-like tine partial, soft tremolo
  const keysBus = G(0.5), trem = G(1), keysLP = F('lowpass', 2400, 0.6);
  const tl = ctx.createOscillator(); tl.frequency.value = 4.6; const tla = G(0.16); tl.connect(tla); tla.connect(trem.gain); tl.start(); live.push(tl);
  keysBus.connect(keysLP); keysLP.connect(trem); trem.connect(music); trem.connect(verbSend);
  const key = (t, n, dur, v) => {
    const f = mtof(n), T = at(t), end = T + dur;
    const g = G(0); g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(0.2 * v, T + 0.006); g.gain.exponentialRampToValueAtTime(0.07 * v, T + Math.min(0.5, dur)); g.gain.setValueAtTime(0.07 * v, end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.35);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f; wowAmt.connect(o1.detune);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 1.003; const g2 = G(0.3);
    const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = f * 4; const g3 = G(0); g3.gain.setValueAtTime(0.22 * v, T); g3.gain.exponentialRampToValueAtTime(0.0001, T + 0.18);
    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g); g.connect(keysBus);
    for (const o of [o1, o2, o3]) { o.start(T); o.stop(end + 0.4); live.push(o); }
  };
  const bass = ({ t, n, dur, v }) => {
    const f = mtof(n), T = at(t), end = T + dur;
    const g = G(0); g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(0.3 * v, T + 0.012); g.gain.exponentialRampToValueAtTime(0.19 * v, T + 0.2); g.gain.setValueAtTime(0.19 * v, end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.09);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.04, T); o.frequency.exponentialRampToValueAtTime(f, T + 0.04);
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f; const lp = F('lowpass', 380, 1.2), g2 = G(0.28);
    o.connect(g); o2.connect(lp); lp.connect(g2); g2.connect(g); g.connect(music);
    for (const x of [o, o2]) { x.start(T); x.stop(end + 0.12); live.push(x); }
  };
  // vibraphone-ish lead with a slow motor
  const vibBus = G(0.42); const vt = ctx.createOscillator(); vt.frequency.value = 5.2; const vta = G(0.22); vt.connect(vta); vta.connect(vibBus.gain); vt.start(); live.push(vt);
  vibBus.connect(music); vibBus.connect(verbSend);
  const vib = ({ t, n, dur, v }) => {
    const f = mtof(n), T = at(t), len = Math.max(0.5, dur * 1.6);
    const g = G(0); g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(0.3 * v, T + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, T + len);
    const o1 = ctx.createOscillator(); o1.frequency.value = f; wowAmt.connect(o1.detune);
    const o2 = ctx.createOscillator(); o2.frequency.value = f * 4.0; const g2 = G(0); g2.gain.setValueAtTime(0.3 * v, T); g2.gain.exponentialRampToValueAtTime(0.0001, T + 0.12);
    const o3 = ctx.createOscillator(); o3.frequency.value = f * 10.0; const g3 = G(0); g3.gain.setValueAtTime(0.08 * v, T); g3.gain.exponentialRampToValueAtTime(0.0001, T + 0.04);
    o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g); g.connect(vibBus);
    for (const o of [o1, o2, o3]) { o.start(T); o.stop(T + len + 0.05); live.push(o); }
  };

  // ---- the record
  SCORE.kicks.forEach((e) => ok(e.t) && e.t >= offset - 0.01 && kick(e));
  SCORE.snares.forEach((e) => ok(e.t) && e.t >= offset - 0.01 && snare(e));
  SCORE.rims.forEach((e) => ok(e.t) && e.t >= offset - 0.01 && rim(e));
  SCORE.hats.forEach((e) => ok(e.t) && e.t >= offset - 0.01 && hat(e));
  SCORE.chords.forEach((c) => { if (c.t >= offset - 0.01) c.notes.forEach((n, i) => key(c.t + i * c.roll, n, c.dur, c.v * (i === 0 ? 0.9 : 0.7))); });
  SCORE.bass.forEach((e) => e.t >= offset - 0.01 && bass(e));
  SCORE.lead.forEach((e) => e.t >= offset - 0.01 && vib(e));
  // vinyl surface: crackle and the low rumble of the platter, part of the record so it sits behind the wall too
  const crk = G(0.5); auto(crk.gain, 'crackle'); const crkHP = F('highpass', 900); crkHP.connect(crk); crk.connect(wall);
  { const s = ctx.createBufferSource(); s.buffer = crackleBuffer(ctx, 7, 99); s.loop = true; s.connect(crkHP); s.start(ctx.currentTime, (Math.max(0, offset) * 0.61) % 7); live.push(s); }
  const rumble = G(0.05), rumLP = F('lowpass', 70); bed(brown, rumLP); rumLP.connect(rumble); rumble.connect(wall);

  // ---- the night outside
  const wind = G(0); auto(wind.gain, 'wind'); wind.connect(master);
  const wbp = F('bandpass', 520, 0.9), wbp2 = F('bandpass', 1500, 5), w2g = G(0.16);
  bed(pink, wbp); wbp.connect(wind); bed(pink, wbp2); wbp2.connect(w2g); w2g.connect(wind);
  { // gusts: the filters and level wander on a slow noise curve
    const N = 96, span = DURATION - Math.max(0, offset), f1 = new Float32Array(N), f2 = new Float32Array(N), gg = new Float32Array(N);
    for (let i = 0; i < N; i++) { const t = Math.max(0, offset) + (span * i) / (N - 1); const g = fbm1(t * 0.42, 3); f1[i] = 480 + g * 240; f2[i] = 1500 + fbm1(t * 0.3, 8) * 500; gg[i] = 0.75 + g * 0.5; }
    const gust = G(1); wbp.disconnect(); wbp.connect(gust); gust.connect(wind);
    const T = ctx.currentTime + 0.01;
    if (span > 0.2) { wbp.frequency.setValueCurveAtTime(f1, T, span); wbp2.frequency.setValueCurveAtTime(f2, T, span); gust.gain.setValueCurveAtTime(gg, T, span); }
  }
  const city = G(0); auto(city.gain, 'city'); city.connect(master);
  const clp = F('lowpass', 150, 0.5); bed(brown, clp); clp.connect(city);
  const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 58; const humLP = F('lowpass', 170), humG = G(0.035); hum.connect(humLP); humLP.connect(humG); humG.connect(city); hum.start(); live.push(hum);
  // a car passing a street away
  const car = (t, dur, pan) => {
    if (!ok(t, dur)) return;
    const bp = F('bandpass', 260, 0.7), g = G(0), p = ctx.createStereoPanner();
    const T = Math.max(at(t), ctx.currentTime + 0.01), k = Math.max(0, (offset - t) / dur), rem = dur * (1 - k);
    g.gain.setValueAtTime(0.0001, T); g.gain.linearRampToValueAtTime(0.5, T + rem * 0.5); g.gain.linearRampToValueAtTime(0.0001, T + rem);
    p.pan.setValueAtTime(pan, T); p.pan.linearRampToValueAtTime(-pan, T + rem);
    bp.frequency.setValueAtTime(330, T); bp.frequency.linearRampToValueAtTime(190, T + rem);
    const s = ctx.createBufferSource(); s.buffer = brown; s.loop = true; s.connect(bp); bp.connect(g); g.connect(p); p.connect(city); s.start(T); s.stop(T + rem + 0.1); live.push(s);
  };
  car(1.0, 4.2, -0.8); car(34.6, 4.6, 0.7);

  // ---- foley inside the shop
  const roomGain = G(0); auto(roomGain.gain, 'room'); roomGain.connect(master); roomGain.connect(verbSend);
  const amp = ctx.createOscillator(); amp.type = 'sine'; amp.frequency.value = 100; const ampG = G(0.006); amp.connect(ampG); ampG.connect(roomGain); amp.start(); live.push(amp);
  const rustle = (t, dur, hz, level, seed) => {
    if (t < offset - 0.01) return;
    const bp = F('bandpass', hz, 0.8), hp = F('highpass', 1200), g = G(0), rr = rng(seed), T = at(t);
    g.gain.setValueAtTime(0.0001, T);
    const n = Math.max(4, Math.floor(dur / 0.045));
    for (let i = 1; i <= n; i++) g.gain.linearRampToValueAtTime(level * rr() * Math.sin((i / n) * Math.PI), T + (dur * i) / n);
    g.gain.linearRampToValueAtTime(0.0001, T + dur + 0.03);
    burst(t, dur + 0.05, bp, pink); bp.connect(hp); hp.connect(g); g.connect(roomGain);
  };
  // needle already riding the groove: a soft thump as we cut in beside it
  if (10.0 >= offset - 0.01) {
    const o = ctx.createOscillator(), g = G(0); o.frequency.setValueAtTime(90, at(10.0)); o.frequency.exponentialRampToValueAtTime(48, at(10.12)); envAD(g.gain, 10.0, 0.35, 0.004, 0.2); o.connect(g); g.connect(roomGain); o.start(at(10.0)); o.stop(at(10.4)); live.push(o);
    const c = G(0), bp = F('bandpass', 3200, 1.5); envAD(c.gain, 10.02, 0.3, 0.001, 0.03); burst(10.02, 0.05, bp); bp.connect(c); c.connect(roomGain);
  }
  rustle(16.05, 0.5, 3200, 0.1, 1); rustle(17.7, 0.34, 4200, 0.08, 2); rustle(18.75, 0.3, 3600, 0.07, 3);  // cloth
  rustle(19.45, 0.42, 5200, 0.12, 4); rustle(20.7, 0.3, 5800, 0.09, 5); rustle(29.1, 0.36, 5400, 0.09, 6);   // paper
  // the door: swing, shut, latch (heard from the pavement)
  if (33.67 >= offset - 0.01) {
    const doorBus = G(1); doorBus.connect(master); doorBus.connect(verbSend);
    const o = ctx.createOscillator(), g = G(0); o.frequency.setValueAtTime(110, at(33.67)); o.frequency.exponentialRampToValueAtTime(52, at(33.8)); envAD(g.gain, 33.67, 0.75, 0.004, 0.3); o.connect(g); g.connect(doorBus); o.start(at(33.67)); o.stop(at(34.1)); live.push(o);
    const n = G(0), lp = F('lowpass', 900); envAD(n.gain, 33.67, 0.5, 0.002, 0.12); burst(33.67, 0.16, lp, pink); lp.connect(n); n.connect(doorBus);
    const rat = G(0), rbp = F('bandpass', 2600, 3); envAD(rat.gain, 33.7, 0.12, 0.002, 0.18); burst(33.7, 0.22, rbp); rbp.connect(rat); rat.connect(doorBus); // glass rattling in the frame
    const l = G(0), lb = F('bandpass', 2100, 4); envAD(l.gain, 33.86, 0.3, 0.001, 0.035); burst(33.86, 0.05, lb); lb.connect(l); l.connect(doorBus);
  }
  // light switches, one bank at a time
  for (const t of [35.6, 36.25, 36.8]) if (t >= offset - 0.01) { const g = G(0), bp = F('bandpass', 1800, 3); envAD(g.gain, t, 0.07, 0.001, 0.03); burst(t, 0.04, bp); bp.connect(g); g.connect(master); }

  return {
    stop() {
      for (const s of live) { try { s.stop(); } catch { /* already stopped */ } }
      try { session.disconnect(); } catch { /* gone */ }
    },
  };
}

// Render the whole soundtrack offline -> 16-bit stereo WAV (used for MP4 export).
export async function renderWav(sampleRate = 48000) {
  const off = new OfflineAudioContext(2, Math.ceil(sampleRate * DURATION), sampleRate);
  buildScore(off, off.destination, 0, 0);
  const buf = await off.startRendering();
  const n = buf.length, L = buf.getChannelData(0), Rr = buf.getChannelData(1);
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, sampleRate, true); out.setUint32(28, sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rr[i])) * 32767, true);
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
