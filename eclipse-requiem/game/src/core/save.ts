import { Bindings, DEFAULT_BINDINGS } from './input';

// localStorage keys from docs/06 §7. Every access is guarded: private mode may throw, and the game must still run.

export interface Settings {
  bgm: number;
  sfx: number;
  shake: number; // 0 / 50 / 100
  flashReduce: boolean;
  hudOpacity: number; // 60 / 78 / 90
  autoFire: boolean;
  shotVis: number; // 100 / 70 / 40
  chargeMode: 'hold' | 'toggle';
  integerScale: boolean;
  bgDim: number; // 0 / 15 / 30
  cutIn: boolean;
  bindings: Bindings;
}

export interface Scores {
  hi: number;
  best: Record<string, { score: number; rank: string }>;
}

export interface Flags {
  prologueSeen: boolean;
  howtoSeen: boolean;
  lastChar: number;
  tipsDone: Record<string, boolean>;
  seen: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  bgm: 70,
  sfx: 80,
  shake: 100,
  flashReduce: false,
  hudOpacity: 78,
  autoFire: true,
  shotVis: 70,
  chargeMode: 'hold',
  integerScale: true,
  bgDim: 0,
  cutIn: true,
  bindings: { ...DEFAULT_BINDINGS },
};

const KEYS = { settings: 'er.v1.settings', scores: 'er.v1.scores', flags: 'er.v1.flags' };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(fallback), ...parsed };
  } catch {
    return structuredClone(fallback);
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep playing with in-memory values */
  }
}

export class Save {
  settings: Settings = read(KEYS.settings, DEFAULT_SETTINGS);
  scores: Scores = read<Scores>(KEYS.scores, { hi: 0, best: {} });
  flags: Flags = read<Flags>(KEYS.flags, { prologueSeen: false, howtoSeen: false, lastChar: 0, tipsDone: {}, seen: {} });

  constructor() {
    this.settings.bindings = { ...DEFAULT_BINDINGS, ...this.settings.bindings };
  }
  saveSettings() {
    write(KEYS.settings, this.settings);
  }
  saveScores() {
    write(KEYS.scores, this.scores);
  }
  saveFlags() {
    write(KEYS.flags, this.flags);
  }
}
