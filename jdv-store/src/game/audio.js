// Everything you hear is synthesised live with WebAudio: the record on the
// turntable (generative lo-fi jazz), room tone, terrace birds and leaves,
// footsteps and interaction sounds. Positional sounds use HRTF panners.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const PROGRESSION = [
  { bass: 38, v: [53, 57, 60, 64] }, // Dm9
  { bass: 43, v: [53, 57, 59, 64] }, // G13
  { bass: 36, v: [52, 55, 59, 62] }, // Cmaj9
  { bass: 45, v: [55, 61, 65, 67] }, // A7b13
  { bass: 41, v: [57, 60, 64, 67] }, // Fmaj9
  { bass: 40, v: [55, 59, 62, 66] }, // Em9
  { bass: 38, v: [53, 57, 60, 64] }, // Dm9
  { bass: 43, v: [53, 57, 60, 65] }, // G13sus
];
const PENTA = [62, 64, 65, 67, 69, 72, 74, 76, 77, 79, 81];

export class AudioEngine {
  constructor() { this.ctx = null; this.muted = false; this.music = false; this.outside = 0; }

  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // reverb
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(1.8, 2.6);
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.32;
    this.verbIn.connect(this.verb).connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    this.brownBuf = this.makeBrown(4);
    // music chain: voices → bus → lofi lowpass → muffle → out → panner (turntable) → master
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.55;
    this.lofi = ctx.createBiquadFilter(); this.lofi.type = "lowpass"; this.lofi.frequency.value = 5200; this.lofi.Q.value = 0.4;
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = "lowpass"; this.muffle.frequency.value = 18000;
    this.musicOut = ctx.createGain(); this.musicOut.gain.value = 0;
    this.musicPan = this.panner(1.4, 1.0);
    this.musicBus.connect(this.lofi).connect(this.muffle).connect(this.musicOut).connect(this.musicPan).connect(this.master);
    this.musicOut.connect(this.verbIn);
    this.crackleBuf = this.makeCrackle(6);
    // ambience
    this.roomTone = this.loop(this.brownBuf, 0.0, "lowpass", 260);
    this.leaves = this.loop(this.noiseBuf, 0.0, "bandpass", 900, 0.35);
    this.roomTone.gain.gain.value = 0.05;
    this.birdTimer = 2;
    this.lfoT = 0;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  // ---------- building blocks ----------
  makeNoise(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  makeBrown(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  makeCrackle(sec) {
    const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(1, sr * sec, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.012;
    const pops = sec * 22;
    for (let k = 0; k < pops; k++) {
      const at = Math.floor(Math.random() * (d.length - 200)), amp = (Math.random() < 0.1 ? 0.7 : 0.25) * (Math.random() * 0.8 + 0.2);
      for (let j = 0; j < 60; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / 9);
    }
    return b;
  }
  impulse(sec, decay) {
    const sr = this.ctx.sampleRate, b = this.ctx.createBuffer(2, sr * sec, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay) * (i < sr * 0.01 ? i / (sr * 0.01) : 1);
    }
    return b;
  }
  panner(ref = 1, roll = 1) {
    const p = this.ctx.createPanner();
    p.panningModel = "HRTF"; p.distanceModel = "inverse"; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 40;
    return p;
  }
  place(p, v) {
    if (p.positionX) { p.positionX.value = v.x; p.positionY.value = v.y; p.positionZ.value = v.z; } else p.setPosition(v.x, v.y, v.z);
  }
  loop(buf, gain, type, freq, q = 0.7) {
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return { src, filter: f, gain: g };
  }
  /** One-shot output, positional when pos is given. Returns the node to connect into. */
  out(pos, verb = 0.15) {
    const g = this.ctx.createGain();
    if (pos) { const p = this.panner(1, 1.2); this.place(p, pos); g.connect(p).connect(this.master); }
    else g.connect(this.master);
    if (verb) { const s = this.ctx.createGain(); s.gain.value = verb; g.connect(s).connect(this.verbIn); }
    return g;
  }
  noiseHit(dest, t, { type = "bandpass", f = 1500, q = 1, a = 0.002, d = 0.08, gain = 0.3 }) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    src.connect(fl).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + a + d + 0.05);
  }
  tone(dest, t, { f = 440, f2 = null, type = "sine", a = 0.003, d = 0.3, gain = 0.2, detune = 0 }) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d * 0.6);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g).connect(dest); o.start(t); o.stop(t + a + d + 0.05);
  }

  // ---------- per-frame ----------
  update(dt, cam, outside, doorOpen) {
    if (!this.ctx) return;
    const L = this.ctx.listener, p = cam.position;
    const f = cam.getWorldDirection(this._f || (this._f = cam.position.clone()));
    if (L.positionX) {
      L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
      L.forwardX.value = f.x; L.forwardY.value = f.y; L.forwardZ.value = f.z;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
    this.outside = outside;
    const t = this.ctx.currentTime;
    // music muffled through glass when outside with doors closed
    const muffleHz = 18000 - outside * (1 - doorOpen * 0.75) * 16800;
    this.muffle.frequency.setTargetAtTime(muffleHz, t, 0.15);
    this.roomTone.gain.gain.setTargetAtTime(0.05 * (1 - outside * 0.8), t, 0.3);
    this.lfoT += dt;
    const leafLvl = (0.012 + 0.03 * outside) * (0.75 + 0.25 * Math.sin(this.lfoT * 0.7) + 0.15 * Math.sin(this.lfoT * 2.3));
    this.leaves.gain.gain.setTargetAtTime(leafLvl, t, 0.2);
    // birds: more of them outside
    this.birdTimer -= dt * (0.25 + outside);
    if (this.birdTimer <= 0) { this.birdTimer = 3 + Math.random() * 6; this.bird(); }
  }

  bird() {
    const t = this.ctx.currentTime + 0.05;
    const pos = { x: (Math.random() - 0.5) * 14, y: 4 + Math.random() * 2, z: -9 - Math.random() * 5 };
    const o = this.out(pos, 0.1);
    o.gain.value = 0.5;
    const n = 2 + Math.floor(Math.random() * 5), base = 2600 + Math.random() * 1800;
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.09 + Math.random() * 0.06);
      this.tone(o, tt, { f: base * (1 + Math.random() * 0.25), f2: base * (1.3 + Math.random() * 0.5), a: 0.006, d: 0.05 + Math.random() * 0.05, gain: 0.05 });
    }
  }

  // ---------- music ----------
  setMusic(on, pos) {
    if (!this.ctx) return;
    this.place(this.musicPan, pos);
    const t = this.ctx.currentTime;
    if (on && !this.music) {
      this.music = true;
      this.musicOut.gain.cancelScheduledValues(t);
      this.musicOut.gain.setValueAtTime(this.musicOut.gain.value, t);
      this.musicOut.gain.linearRampToValueAtTime(1, t + 0.6);
      // needle drop + crackle
      this.noiseHit(this.musicBus, t + 0.05, { type: "lowpass", f: 900, d: 0.18, gain: 0.5 });
      this.crackle = this.ctx.createBufferSource(); this.crackle.buffer = this.crackleBuf; this.crackle.loop = true;
      const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 700;
      const cg = this.ctx.createGain(); cg.gain.value = 0.7;
      this.crackle.connect(hp).connect(cg).connect(this.musicBus);
      this.crackle.start(t + 0.05);
      this.step16 = 0; this.bar = 0;
      this.nextT = t + 1.4;
      this.sched = setInterval(() => this.schedule(), 25);
    } else if (!on && this.music) {
      this.music = false;
      clearInterval(this.sched);
      this.musicOut.gain.cancelScheduledValues(t);
      this.musicOut.gain.setValueAtTime(this.musicOut.gain.value, t);
      this.musicOut.gain.linearRampToValueAtTime(0, t + 0.5);
      const c = this.crackle; setTimeout(() => { try { c.stop(); } catch { /* already stopped */ } }, 700);
      this.noiseHit(this.master, t, { type: "bandpass", f: 2000, d: 0.05, gain: 0.08 });
    }
  }

  schedule() {
    const ctx = this.ctx, bpm = 74, eighth = 60 / bpm / 2, swing = 0.17;
    while (this.nextT < ctx.currentTime + 0.15) {
      const s = this.step16 % 8, t = this.nextT + (s % 2 ? eighth * swing : 0);
      const ch = PROGRESSION[this.bar % PROGRESSION.length];
      const nextCh = PROGRESSION[(this.bar + 1) % PROGRESSION.length];
      const wow = Math.sin(t * 0.55 * Math.PI * 2) * 6;
      const B = this.musicBus;
      // drums
      if (s === 0 || (s === 5 && Math.random() < 0.8) || (s === 3 && Math.random() < 0.2)) this.kick(B, t);
      if (s === 2 || s === 6) this.snare(B, t);
      this.noiseHit(B, t, { type: "highpass", f: 7500, d: s === 7 && Math.random() < 0.3 ? 0.22 : 0.035, gain: (s % 2 ? 0.05 : 0.085) * (0.7 + Math.random() * 0.3) });
      // bass
      if (s === 0) this.bass(B, t, ch.bass, eighth * 3, wow);
      if (s === 4) this.bass(B, t, ch.bass + (Math.random() < 0.5 ? 7 : 12), eighth * 1.8, wow);
      if (s === 7 && Math.random() < 0.6) this.bass(B, t, nextCh.bass + (Math.random() < 0.5 ? -1 : 1), eighth * 0.9, wow);
      // keys comping
      if (s === 0) for (const n of ch.v) this.rhodes(B, t + Math.random() * 0.015, n, eighth * 3.2, 0.06, wow);
      if (s === 3 && Math.random() < 0.7) for (const n of ch.v) this.rhodes(B, t + Math.random() * 0.012, n + (Math.random() < 0.3 ? 12 : 0), eighth * 2.2, 0.04, wow);
      // sparse melody
      if (this.bar % 2 === 1 && s % 2 === 0 && Math.random() < 0.38) {
        const n = PENTA[Math.floor(Math.random() * PENTA.length)];
        this.rhodes(B, t, n, eighth * (1 + Math.random() * 2), 0.05, wow);
      }
      this.step16++;
      this.nextT += eighth;
      if (this.step16 % 8 === 0) this.bar++;
    }
  }
  kick(dest, t) {
    const o = this.ctx.createOscillator(); o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.42);
  }
  snare(dest, t) {
    this.noiseHit(dest, t, { type: "bandpass", f: 1700, q: 0.7, a: 0.004, d: 0.2, gain: 0.16 });
    this.tone(dest, t, { f: 190, f2: 150, d: 0.09, gain: 0.07 });
  }
  bass(dest, t, m, dur, wow) {
    const f = mtof(m);
    const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.value = f; o.detune.value = wow;
    const o2 = this.ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = f * 2; o2.detune.value = wow;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.18;
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.42, t + 0.012); g.gain.exponentialRampToValueAtTime(0.18, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(dest);
    o.start(t); o2.start(t); o.stop(t + dur + 0.15); o2.stop(t + dur + 0.15);
  }
  rhodes(dest, t, m, dur, vel, wow) {
    const f = mtof(m);
    const car = this.ctx.createOscillator(); car.frequency.value = f; car.detune.value = wow + (Math.random() - 0.5) * 6;
    const mod = this.ctx.createOscillator(); mod.frequency.value = f; mod.detune.value = wow;
    const mg = this.ctx.createGain(); mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.5);
    mod.connect(mg).connect(car.frequency);
    const tine = this.ctx.createOscillator(); tine.frequency.value = f * 4.02;
    const tg = this.ctx.createGain(); tg.gain.setValueAtTime(vel * 0.18, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.006); g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
    car.connect(g); tine.connect(tg).connect(lp); g.connect(lp).connect(dest);
    for (const o of [car, mod, tine]) { o.start(t); o.stop(t + dur + 0.6); }
  }

  // ---------- sfx ----------
  footstep(surface) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.out(null, 0.08);
    if (surface === "deck") {
      this.noiseHit(o, t, { type: "bandpass", f: 520 + Math.random() * 120, q: 1.2, d: 0.09, gain: 0.07 });
      this.tone(o, t, { f: 95 + Math.random() * 15, f2: 70, d: 0.08, gain: 0.06 });
    } else {
      this.noiseHit(o, t, { type: "bandpass", f: 1300 + Math.random() * 500, q: 1.4, d: 0.05, gain: 0.045 });
      this.tone(o, t, { f: 85 + Math.random() * 10, f2: 60, d: 0.05, gain: 0.04 });
    }
  }
  flip(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.out(pos);
    this.noiseHit(o, t, { type: "bandpass", f: 2400, q: 0.8, a: 0.01, d: 0.1, gain: 0.25 });
    this.noiseHit(o, t + 0.07, { type: "lowpass", f: 600, d: 0.05, gain: 0.25 });
  }
  riffle(pos) {
    if (!this.ctx) return;
    for (let i = 0; i < 9; i++) setTimeout(() => this.flip(pos), i * 45);
  }
  click(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.out(pos, 0.05);
    this.tone(o, t, { f: 1800, type: "square", d: 0.012, gain: 0.05 });
    this.noiseHit(o, t, { type: "highpass", f: 3000, d: 0.02, gain: 0.08 });
  }
  chime(final = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02, o = this.out(null, 0.4);
    const notes = final ? [76, 79, 83, 88] : [83, 88];
    notes.forEach((m, i) => {
      const f = mtof(m), tt = t + i * 0.11;
      this.tone(o, tt, { f, d: 1.4, gain: 0.08 });
      this.tone(o, tt, { f: f * 2.76, d: 0.5, gain: 0.02 });
    });
  }
  espresso(pos) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.out(pos, 0.12);
    // grinder
    const saw = this.ctx.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = 118;
    const sg = this.ctx.createGain(); sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.05, t + 0.1); sg.gain.setValueAtTime(0.05, t + 2.0); sg.gain.linearRampToValueAtTime(0, t + 2.3);
    const sf = this.ctx.createBiquadFilter(); sf.type = "bandpass"; sf.frequency.value = 900; sf.Q.value = 0.6;
    saw.connect(sf).connect(sg).connect(o); saw.start(t); saw.stop(t + 2.4);
    for (let i = 0; i < 20; i++) this.noiseHit(o, t + 0.1 + i * 0.1, { type: "bandpass", f: 3200, d: 0.08, gain: 0.05 });
    // pump hum
    const hum = this.ctx.createOscillator(); hum.type = "square"; hum.frequency.value = 52;
    const hf = this.ctx.createBiquadFilter(); hf.type = "lowpass"; hf.frequency.value = 220;
    const hg = this.ctx.createGain(); hg.gain.setValueAtTime(0, t + 2.6); hg.gain.linearRampToValueAtTime(0.06, t + 2.8); hg.gain.setValueAtTime(0.06, t + 6.2); hg.gain.linearRampToValueAtTime(0, t + 6.5);
    hum.connect(hf).connect(hg).connect(o); hum.start(t + 2.6); hum.stop(t + 6.6);
    // steam hiss
    this.noiseHit(o, t + 5.0, { type: "highpass", f: 3500, a: 0.15, d: 1.8, gain: 0.08 });
  }
}
