// Procedural audio: every sound effect and music track is synthesised with WebAudio (no audio files).
// Buses: master -> (bgm, sfx). A generated cathedral reverb is shared by bells, choir and organ.

type Wave = OscillatorType;

const mtof = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Track {
  bpm: number;
  bars: number;
  loop: boolean;
  /** step = 16th note */
  build(seq: Sequencer): void;
}

interface NoteEv {
  step: number;
  inst: Inst;
  notes: number[];
  len: number; // steps
  vol: number;
  layer: number;
}

type Inst = 'organ' | 'bass' | 'lead' | 'choir' | 'bell' | 'kick' | 'snare' | 'hat' | 'tom' | 'pluck';

class Sequencer {
  events: NoteEv[] = [];
  add(step: number, inst: Inst, notes: number | number[], len = 1, vol = 1, layer = 0) {
    this.events.push({ step, inst, notes: Array.isArray(notes) ? notes : [notes], len, vol, layer });
  }
}

// --- note helpers ---
const N: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function n(s: string) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(s)!;
  return 12 * (parseInt(m[2]) + 1) + N[m[1]];
}
/** Parse "E5 - D#5 E5 . ." style melody in 8th notes starting at `start` step. */
function melody(seq: Sequencer, start: number, line: string, inst: Inst, vol = 1, layer = 0, stepLen = 2) {
  const toks = line.trim().split(/\s+/);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === '-' || t === '.') continue;
    let len = 1;
    while (toks[i + len] === '-') len++;
    seq.add(start + i * stepLen, inst, n(t), len * stepLen, vol, layer);
  }
}
const chord = (root: string, kind: 'm' | 'M' = 'm') => {
  const r = n(root);
  return [r, r + (kind === 'm' ? 3 : 4), r + 7];
};

const TRACKS: Record<string, Track> = {
  title: {
    bpm: 66, bars: 8, loop: true,
    build(s) {
      const prog: [string, 'm' | 'M'][] = [['D4', 'm'], ['Bb3', 'M'], ['G3', 'm'], ['A3', 'M'], ['D4', 'm'], ['Bb3', 'M'], ['C4', 'M'], ['A3', 'M']];
      prog.forEach(([r, k], b) => {
        s.add(b * 16, 'organ', chord(r, k), 16, 0.55);
        s.add(b * 16, 'choir', chord(r, k).map((x) => x + 12), 16, 0.35);
        s.add(b * 16, 'bass', n(r) - 12, 16, 0.5);
      });
      s.add(0, 'bell', n('D3'), 32, 0.7);
      s.add(64, 'bell', n('D3'), 32, 0.6);
      melody(s, 0, 'A4 - - - - - - - F4 - - - G4 - - - D4 - - - - - - - C#4 - - - E4 - - -', 'lead', 0.32);
      melody(s, 64, 'A4 - - - D5 - - - C5 - - - Bb4 - A4 - G4 - - - E4 - - - A4 - - - - - - -', 'lead', 0.32);
    },
  },
  stage: {
    bpm: 150, bars: 8, loop: true,
    build(s) {
      const prog: [string, 'm' | 'M'][] = [['E3', 'm'], ['C3', 'M'], ['D3', 'M'], ['B2', 'M'], ['E3', 'm'], ['C3', 'M'], ['A2', 'm'], ['B2', 'M']];
      prog.forEach(([r, k], b) => {
        const base = b * 16;
        const root = n(r) - 12;
        [0, 0, 12, 0, 0, 12, 0, 7].forEach((iv, i) => s.add(base + i * 2, 'bass', root + iv, 2, 0.8));
        for (const st of [0, 6, 12]) s.add(base + st, 'organ', chord(r, k).map((x) => x + 12), 3, 0.42);
        s.add(base, 'kick', 0, 1, 1); s.add(base + 8, 'kick', 0, 1, 0.9); if (b % 2) s.add(base + 10, 'kick', 0, 1, 0.7);
        s.add(base + 4, 'snare', 0, 1, 0.8); s.add(base + 12, 'snare', 0, 1, 0.8);
        for (let h = 0; h < 16; h += 2) s.add(base + h, 'hat', 0, 1, h % 4 ? 0.35 : 0.55);
      });
      melody(s, 0, [
        'E5 - D#5 E5 B4 - G4 -', 'C5 - B4 C5 E5 - G5 -', 'F#5 - E5 D5 A4 - F#4 -', 'D#5 - - E5 F#5 - D#5 -',
        'G5 - F#5 E5 B4 - E5 -', 'E5 - D5 C5 G4 - C5 -', 'A4 - B4 C5 E5 - A5 -', 'F#5 - D#5 - B4 - - -',
      ].join(' '), 'lead', 0.36);
      s.add(0, 'bell', n('E4'), 16, 0.25);
      s.add(64, 'bell', n('E4'), 16, 0.25);
    },
  },
  boss: {
    bpm: 160, bars: 8, loop: true,
    build(s) {
      const prog: [string, 'm' | 'M'][] = [['C3', 'm'], ['Ab2', 'M'], ['F2', 'm'], ['G2', 'M'], ['C3', 'm'], ['Ab2', 'M'], ['Bb2', 'M'], ['G2', 'M']];
      prog.forEach(([r, k], b) => {
        const base = b * 16;
        const root = n(r) - 12;
        for (let i = 0; i < 16; i++) if (i % 4 !== 3) s.add(base + i, 'bass', root + (i % 8 === 6 ? 12 : 0), 1, 0.75);
        s.add(base, 'organ', chord(r, k).map((x) => x + 12), 16, 0.4);
        s.add(base, 'kick', 0, 1, 1); s.add(base + 6, 'kick', 0, 1, 0.8); s.add(base + 8, 'kick', 0, 1, 1); s.add(base + 14, 'kick', 0, 1, 0.7);
        s.add(base + 4, 'snare', 0, 1, 0.85); s.add(base + 12, 'snare', 0, 1, 0.85);
        for (let h = 0; h < 16; h += 2) s.add(base + h, 'hat', 0, 1, 0.4);
        // layer 1: choir
        s.add(base, 'choir', chord(r, k).map((x) => x + 24), 16, 0.5, 1);
        // layer 2: toms + bells + 16th hats
        s.add(base + 12, 'tom', n('G2'), 1, 0.7, 2); s.add(base + 13, 'tom', n('E2'), 1, 0.7, 2); s.add(base + 14, 'tom', n('C2'), 1, 0.8, 2);
        for (let h = 1; h < 16; h += 2) s.add(base + h, 'hat', 0, 1, 0.25, 2);
        if (b % 2 === 0) s.add(base, 'bell', n('C4'), 16, 0.45, 2);
      });
      melody(s, 0, [
        'C5 Eb5 G5 C6 Bb5 G5 Eb5 G5', 'Ab5 - G5 F5 Eb5 - C5 -', 'F5 Ab5 C6 - Bb5 Ab5 G5 F5', 'G5 - B4 - D5 - G5 -',
        'C6 - Bb5 G5 Ab5 G5 F5 Eb5', 'C5 Eb5 Ab5 - G5 F5 Eb5 C5', 'D5 F5 Bb5 - Ab5 G5 F5 D5', 'B4 D5 G5 - F5 - D5 -',
      ].join(' '), 'lead', 0.3);
    },
  },
  victory: {
    bpm: 96, bars: 3, loop: false,
    build(s) {
      s.add(0, 'organ', chord('D4', 'M'), 8, 0.6);
      s.add(8, 'organ', chord('G3', 'M').map((x) => x + 12), 8, 0.6);
      s.add(16, 'organ', chord('A3', 'M').map((x) => x + 12), 8, 0.6);
      s.add(24, 'organ', [...chord('D4', 'M'), n('D5')], 24, 0.65);
      s.add(24, 'choir', chord('D5', 'M'), 24, 0.45);
      [n('D5'), n('F#5'), n('A5'), n('D6')].forEach((x, i) => s.add(24 + i * 2, 'bell', x, 16, 0.35));
      s.add(0, 'bell', n('D4'), 16, 0.5);
    },
  },
};

export class Audio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgm!: GainNode;
  private bgmFilter!: BiquadFilterNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbIn!: GainNode;
  private noise!: AudioBuffer;
  private bgmVol = 0.7;
  private sfxVol = 0.8;
  private last = new Map<string, number>();
  // music state
  private trackName: string | null = null;
  private track: Track | null = null;
  private events: NoteEv[] = [];
  private stepDur = 0.1;
  private totalSteps = 0;
  private nextStep = 0;
  private nextTime = 0;
  private layerGains: GainNode[] = [];
  private layerOn = [true, false, false];
  private musicGain!: GainNode;
  private timer: number | null = null;

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture (first key press). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
      // start whatever track was requested before audio was allowed
      const wanted = this.trackName;
      this.trackName = null;
      if (wanted) this.music(wanted);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private build() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.bgm = ctx.createGain();
    this.bgmFilter = ctx.createBiquadFilter();
    this.bgmFilter.type = 'lowpass';
    this.bgmFilter.frequency.value = 18000;
    this.bgm.connect(this.bgmFilter).connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicGain = ctx.createGain();
    this.musicGain.connect(this.bgm);
    for (let i = 0; i < 3; i++) {
      const g = ctx.createGain();
      g.gain.value = this.layerOn[i] ? 1 : 0;
      g.connect(this.musicGain);
      this.layerGains.push(g);
    }
    // reverb
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverbIn.connect(this.reverb).connect(wet).connect(this.master);
    // noise
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.setVolumes(this.bgmVol, this.sfxVol);
  }

  setVolumes(bgm: number, sfx: number) {
    this.bgmVol = bgm;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    this.bgm.gain.setTargetAtTime(bgm * 0.55, this.ctx.currentTime, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx * 0.8, this.ctx.currentTime, 0.05);
  }

  /** Temporary BGM duck (player hit, boss sequences). */
  duck(amount = 0.5, dur = 0.3) {
    if (!this.ctx) return;
    const g = this.bgm.gain, t = this.ctx.currentTime, v = this.bgmVol * 0.55;
    g.cancelScheduledValues(t);
    g.setValueAtTime(v * amount, t);
    g.linearRampToValueAtTime(v, t + dur);
  }

  /** Low-pass the music (black fog section). */
  musicFilter(freq: number, time = 1.5) {
    if (!this.ctx) return;
    this.bgmFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, time / 3);
  }

  // ================= SFX =================
  private gate(name: string, minGap: number) {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    const prev = this.last.get(name) ?? -1;
    if (now - prev < minGap) return false;
    this.last.set(name, now);
    return true;
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private osc(type: Wave, f: number, t: number, dur: number, peak: number, f2?: number, dest?: AudioNode, a = 0.004) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = ctx.createGain();
    this.env(g, t, a, peak, dur);
    o.connect(g).connect(dest ?? this.sfxBus);
    o.start(t);
    o.stop(t + a + dur + 0.05);
    return g;
  }

  private noiseBurst(t: number, dur: number, peak: number, type: BiquadFilterType, f: number, f2?: number, q = 1, dest?: AudioNode, a = 0.003) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f2 !== undefined) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    fl.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, a, peak, dur);
    s.connect(fl).connect(g).connect(dest ?? this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + a + dur + 0.05);
  }

  /** Church bell: inharmonic partials with individual decays, sent to reverb. */
  bell(base: number, vol = 0.5, decay = 3, t?: number, dest?: AudioNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const when = t ?? ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = vol;
    out.connect(dest ?? this.sfxBus);
    out.connect(this.reverbIn);
    const partials: [number, number, number][] = [[0.5, 0.5, 1.2], [1, 0.8, 0.8], [1.19, 0.45, 0.6], [1.5, 0.35, 0.5], [2, 0.5, 0.45], [2.52, 0.25, 0.3], [3.01, 0.2, 0.25], [4.2, 0.12, 0.15]];
    for (const [ratio, amp, dk] of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * ratio * (1 + (Math.random() - 0.5) * 0.004);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(amp * 0.3, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + decay * dk + 0.05);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + decay * dk + 0.1);
    }
    this.noiseBurst(when, 0.04, vol * 0.25, 'bandpass', base * 6, undefined, 2, out);
  }

  /** Silences sound effects (used while simulating the character-select preview). */
  muted = false;

  sfx(name: string, p = 1) {
    if (!this.ready || this.muted) return;
    const t = this.ctx!.currentTime + 0.005;
    switch (name) {
      case 'shot':
        if (this.gate(name, 0.09)) this.noiseBurst(t, 0.03, 0.035, 'highpass', 4000);
        break;
      case 'hit':
        if (this.gate(name, 0.05)) this.osc('square', 820, t, 0.04, 0.035, 520);
        break;
      case 'shield':
        if (this.gate(name, 0.08)) { this.osc('triangle', 1900, t, 0.08, 0.05, 1600); this.osc('sine', 2850, t, 0.06, 0.03); }
        break;
      case 'explodeS':
        if (this.gate(name, 0.03)) { this.noiseBurst(t, 0.22, 0.25, 'lowpass', 1800, 300); this.osc('sine', 140, t, 0.18, 0.25, 45); }
        break;
      case 'explodeM':
        this.noiseBurst(t, 0.55, 0.4, 'lowpass', 2400, 200); this.osc('sine', 110, t, 0.4, 0.45, 30);
        this.noiseBurst(t + 0.08, 0.3, 0.15, 'bandpass', 3000, 800, 1.5);
        break;
      case 'explodeL':
        for (let i = 0; i < 3; i++) { this.noiseBurst(t + i * 0.12, 1.2, 0.5, 'lowpass', 2600, 120); this.osc('sine', 90, t + i * 0.12, 0.9, 0.5, 25); }
        break;
      case 'charge1':
        this.osc('sine', 988, t, 0.18, 0.12); this.osc('sine', 1480, t, 0.12, 0.05);
        break;
      case 'charge2':
        [1319, 1661, 1976].forEach((f, i) => this.osc('triangle', f, t + i * 0.045, 0.22, 0.08));
        break;
      case 'release':
        this.noiseBurst(t, 0.32, 0.22, 'bandpass', 500, 3500, 1.2); this.osc('sawtooth', 220, t, 0.25, 0.08, 880);
        break;
      case 'bomb':
        this.noiseBurst(t, 1.4, 0.45, 'lowpass', 600, 4000, 0.7, undefined, 0.2);
        this.choir([62, 66, 69, 74], 1.6, 0.25, t);
        this.bell(220, 0.55, 3, t);
        break;
      case 'playerHit':
        this.osc('square', 2000, t, 0.012, 0.2); this.osc('sine', 95, t, 0.28, 0.55, 38); this.noiseBurst(t, 0.15, 0.2, 'lowpass', 900);
        this.duck(0.5, 0.3);
        break;
      case 'death':
        this.osc('sawtooth', 440, t, 0.9, 0.12, 55); this.noiseBurst(t, 0.8, 0.35, 'lowpass', 1500, 100); this.bell(147, 0.4, 3, t + 0.1);
        break;
      case 'item':
        if (this.gate(name, 0.04)) { this.osc('sine', 1319, t, 0.08, 0.07); this.osc('sine', 1760, t + 0.04, 0.1, 0.06); }
        break;
      case 'soul':
        if (this.gate(name, 0.05)) this.osc('sine', 1760 + Math.random() * 400, t, 0.05, 0.025);
        break;
      case 'powerup':
        [659, 880, 1109, 1319].forEach((f, i) => this.osc('triangle', f, t + i * 0.06, 0.18, 0.09));
        break;
      case 'oneup':
        [784, 988, 1175, 1568].forEach((f, i) => this.osc('square', f, t + i * 0.07, 0.15, 0.05));
        break;
      case 'graze':
        if (this.gate(name, 0.035)) this.osc('square', 3200, t, 0.015, 0.025);
        break;
      case 'tele':
        if (this.gate(name, 0.15)) this.noiseBurst(t, 0.9, 0.06, 'bandpass', 2600, 4800, 6);
        break;
      case 'lightning':
        this.noiseBurst(t, 0.12, 0.35, 'highpass', 2500); this.noiseBurst(t + 0.02, 0.9, 0.3, 'lowpass', 500, 60);
        break;
      case 'cancel':
        this.noiseBurst(t, 0.6, 0.12, 'highpass', 6000, 1500);
        for (let i = 0; i < 5; i++) this.osc('sine', 2000 + Math.random() * 1500, t + i * 0.06, 0.12, 0.03);
        break;
      case 'ding':
        this.bell(1046, 0.22, 1.2);
        break;
      case 'toll':
        this.bell(98, 0.75 * p, 4.5);
        break;
      case 'tollSmall':
        if (this.gate(name, 0.2)) this.bell(523, 0.25, 1.5);
        break;
      case 'crack':
        this.noiseBurst(t, 0.25, 0.4, 'bandpass', 1800, 600, 3); this.osc('square', 180, t, 0.2, 0.1, 60);
        break;
      case 'scream':
        if (this.gate(name, 0.5)) {
          const g = this.osc('sawtooth', 620, t, 0.6, 0.05, 380, undefined, 0.08);
          void g;
          this.noiseBurst(t, 0.6, 0.05, 'bandpass', 1400, 900, 8, undefined, 0.08);
        }
        break;
      case 'heartbeat':
        this.osc('sine', 60, t, 0.12, 0.5, 40); this.osc('sine', 55, t + 0.22, 0.14, 0.4, 38);
        break;
      case 'uiMove':
        this.osc('square', 1800, t, 0.025, 0.035); this.osc('triangle', 2700, t, 0.02, 0.02);
        break;
      case 'uiConfirm':
        this.bell(880, 0.18, 0.9);
        break;
      case 'uiBack':
        this.noiseBurst(t, 0.12, 0.18, 'lowpass', 500, 200);
        break;
      case 'uiDeny':
        this.osc('square', 140, t, 0.09, 0.12, 110); this.noiseBurst(t, 0.06, 0.08, 'bandpass', 900);
        break;
      case 'whoosh':
        this.noiseBurst(t, 0.25, 0.1, 'bandpass', 700, 2400, 1.5);
        break;
      case 'stamp':
        this.osc('sine', 80, t, 0.35, 0.6, 40); this.noiseBurst(t, 0.15, 0.3, 'lowpass', 1200); this.bell(660, 0.25, 1.4, t + 0.02);
        break;
      case 'tick':
        this.bell(147, 0.35, 1.6);
        break;
      case 'sting':
        this.choir([57, 60, 64], 0.9, 0.22, t);
        this.osc('sawtooth', 110, t, 0.8, 0.08);
        break;
      default:
        break;
    }
  }

  private choir(notes: number[], dur: number, vol: number, t: number, dest?: AudioNode) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vol, t + Math.min(0.25, dur * 0.3));
    out.gain.setValueAtTime(vol, t + dur * 0.7);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    bp.connect(out);
    out.connect(dest ?? this.sfxBus);
    out.connect(this.reverbIn);
    for (const m of notes) {
      for (const det of [-7, 0, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = 0.12;
        o.connect(g).connect(bp);
        o.start(t);
        o.stop(t + dur + 0.5);
      }
    }
  }

  // ================= MUSIC =================
  music(name: string | null) {
    if (name === this.trackName) return;
    this.trackName = name;
    if (!this.ctx) return;
    const ctx = this.ctx;
    // fade out whatever is playing
    const old = this.musicGain;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => old.disconnect(), 1200);
    this.musicGain = ctx.createGain();
    this.musicGain.connect(this.bgm);
    this.layerGains = [0, 1, 2].map((i) => {
      const g = ctx.createGain();
      g.gain.value = this.layerOn[i] ? 1 : 0;
      g.connect(this.musicGain);
      return g;
    });
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!name) return;
    const tr = TRACKS[name];
    if (!tr) return;
    const seq = new Sequencer();
    tr.build(seq);
    this.track = tr;
    this.events = seq.events.sort((a, b) => a.step - b.step);
    this.stepDur = 60 / tr.bpm / 4;
    this.totalSteps = tr.bars * 16;
    this.nextStep = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  /** Enable/disable boss music stems (docs/05 §13). */
  setLayers(on: boolean[]) {
    this.layerOn = [...on];
    if (!this.ctx) return;
    this.layerGains.forEach((g, i) => g.gain.setTargetAtTime(on[i] ? 1 : 0, this.ctx!.currentTime, 0.3));
  }

  stopMusic(fade = 1.5) {
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.trackName = null;
  }

  private schedule() {
    const ctx = this.ctx!;
    if (!this.track) return;
    const ahead = ctx.currentTime + 0.15;
    while (this.nextTime < ahead) {
      if (this.nextStep >= this.totalSteps) {
        if (!this.track.loop) {
          if (this.timer !== null) clearInterval(this.timer);
          this.timer = null;
          return;
        }
        this.nextStep = 0;
      }
      for (const ev of this.events) {
        if (ev.step === this.nextStep) this.play(ev, this.nextTime);
        else if (ev.step > this.nextStep) break;
      }
      this.nextStep++;
      this.nextTime += this.stepDur;
    }
  }

  private play(ev: NoteEv, t: number) {
    const ctx = this.ctx!;
    const dest = this.layerGains[ev.layer] ?? this.musicGain;
    const dur = ev.len * this.stepDur;
    const v = ev.vol;
    switch (ev.inst) {
      case 'organ': {
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.linearRampToValueAtTime(0.09 * v, t + 0.02);
        out.gain.setValueAtTime(0.09 * v, t + Math.max(0.03, dur - 0.05));
        out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2200;
        lp.connect(out);
        out.connect(dest);
        out.connect(this.reverbIn);
        for (const m of ev.notes) {
          for (const [mul, type, amp] of [[1, 'square', 0.5], [2, 'sine', 0.35], [0.5, 'sine', 0.4]] as [number, Wave, number][]) {
            const o = ctx.createOscillator();
            o.type = type;
            o.frequency.value = mtof(m) * mul;
            const g = ctx.createGain();
            g.gain.value = amp;
            o.connect(g).connect(lp);
            o.start(t);
            o.stop(t + dur + 0.2);
          }
        }
        break;
      }
      case 'bass': {
        const out = ctx.createGain();
        this.env(out, t, 0.005, 0.22 * v, Math.max(0.08, dur * 0.9));
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(900, t);
        lp.frequency.exponentialRampToValueAtTime(220, t + dur);
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(ev.notes[0]);
        o.connect(lp).connect(out).connect(dest);
        o.start(t);
        o.stop(t + dur + 0.1);
        break;
      }
      case 'lead': {
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, t);
        out.gain.linearRampToValueAtTime(0.07 * v, t + 0.02);
        out.gain.setValueAtTime(0.07 * v, t + dur * 0.8);
        out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = mtof(ev.notes[0]);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const lg = ctx.createGain();
        lg.gain.value = 6;
        lfo.connect(lg).connect(o.detune);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3000;
        o.connect(lp).connect(out);
        out.connect(dest);
        out.connect(this.reverbIn);
        o.start(t); lfo.start(t);
        o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
        break;
      }
      case 'choir':
        this.choir(ev.notes, dur, 0.1 * v, t, dest);
        break;
      case 'bell':
        this.bell(mtof(ev.notes[0]), 0.35 * v, Math.min(4, dur), t, dest);
        break;
      case 'kick': {
        const g = this.osc('sine', 150, t, 0.22, 0.6 * v, 42, dest);
        void g;
        break;
      }
      case 'snare':
        this.noiseBurst(t, 0.16, 0.22 * v, 'bandpass', 2200, 1200, 0.8, dest);
        this.osc('triangle', 210, t, 0.08, 0.12 * v, 160, dest);
        break;
      case 'hat':
        this.noiseBurst(t, 0.035, 0.08 * v, 'highpass', 7500, undefined, 1, dest);
        break;
      case 'tom':
        this.osc('sine', mtof(ev.notes[0]), t, 0.25, 0.45 * v, mtof(ev.notes[0]) * 0.6, dest);
        break;
      case 'pluck':
        this.osc('triangle', mtof(ev.notes[0]), t, 0.2, 0.1 * v, undefined, dest);
        break;
    }
  }
}
