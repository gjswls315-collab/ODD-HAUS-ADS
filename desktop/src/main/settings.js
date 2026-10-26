'use strict';

const { EventEmitter } = require('events');
const { readJson, writeJson } = require('./jsonstore');

const cast = require('../shared/cast.json');

const PACKS = cast.packs; // chiikawa | oddhaus: who sits at the desk and who wanders by default
const FRIENDS = Object.values(PACKS).flatMap((p) => p.friends);
const AI_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

const DEFAULTS = Object.freeze({
  typingReact: true, // 타자 치면 반응하기: off means the keyboard hook is never started
  showFriends: true,
  showDesk: true,
  pack: 'chiikawa',
  deskFriend: 'chiikawa',
  deskPos: null, // {x, y} in screen coordinates, null = bottom-right of the main screen
  wanderers: ['hachiware', 'usagi'],
  scale: 1.5,
  smooth: false, // 60fps instead of 30fps

  autoEpisodes: true,
  episodeFreq: 'normal', // rare | normal | often
  disabledEpisodes: [],

  mealReminders: true,
  stretchReminder: true,
  stretchMinutes: 50,
  waterReminder: true,
  waterMinutes: 90,
  goalHours: 4,
  endOfDay: true,
  workHours: 8,
  pomodoroMinutes: 25,
  breakMinutes: 5,

  aiEnabled: false,
  aiModel: 'claude-opus-5-5',
  aiKey: '', // stored encrypted when the OS keychain is available, never sent to a window

  launchAtLogin: false,
});

const clampNum = (v, lo, hi, dflt) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

// Coerces every field to a valid value so a hand-edited or old settings file can't break the app.
function sanitize(raw) {
  const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[key] === 'boolean') s[key] = Boolean(s[key]);
  }
  if (!PACKS[s.pack]) s.pack = DEFAULTS.pack;
  const pack = PACKS[s.pack];
  if (!pack.friends.includes(s.deskFriend)) s.deskFriend = pack.desk;
  const asked = Array.isArray(s.wanderers) ? s.wanderers : null;
  const fromPack = asked ? asked.filter((id) => pack.friends.includes(id)) : [];
  // switching packs (nothing asked for belongs to this pack) brings in the pack's own wanderers
  const wanted = asked && (fromPack.length || !asked.length) ? fromPack : pack.wanderers;
  s.wanderers = [...new Set(wanted.filter((id) => id !== s.deskFriend))];
  s.disabledEpisodes = Array.isArray(s.disabledEpisodes) ? s.disabledEpisodes.filter((x) => typeof x === 'string') : [];
  if (!['rare', 'normal', 'often'].includes(s.episodeFreq)) s.episodeFreq = DEFAULTS.episodeFreq;
  if (!AI_MODELS.includes(s.aiModel)) s.aiModel = DEFAULTS.aiModel;
  s.scale = clampNum(s.scale, 0.6, 1.8, DEFAULTS.scale);
  s.stretchMinutes = clampNum(s.stretchMinutes, 15, 180, DEFAULTS.stretchMinutes);
  s.waterMinutes = clampNum(s.waterMinutes, 15, 240, DEFAULTS.waterMinutes);
  s.goalHours = clampNum(s.goalHours, 0.5, 12, DEFAULTS.goalHours);
  s.workHours = clampNum(s.workHours, 1, 14, DEFAULTS.workHours);
  s.pomodoroMinutes = clampNum(s.pomodoroMinutes, 5, 90, DEFAULTS.pomodoroMinutes);
  s.breakMinutes = clampNum(s.breakMinutes, 1, 30, DEFAULTS.breakMinutes);
  if (s.deskPos && !(Number.isFinite(s.deskPos.x) && Number.isFinite(s.deskPos.y))) s.deskPos = null;
  if (typeof s.aiKey !== 'string') s.aiKey = '';
  for (const key of Object.keys(s)) if (!(key in DEFAULTS)) delete s[key];
  return s;
}

class Settings extends EventEmitter {
  /**
   * @param {string} file
   * @param {{encrypt(s: string): string, decrypt(s: string): string}} [secret] keeps the API key unreadable on disk
   */
  constructor(file, secret) {
    super();
    this.file = file;
    this.secret = secret;
    const raw = readJson(file, {});
    if (raw && typeof raw.aiKey === 'string' && raw.aiKey && secret) {
      try {
        raw.aiKey = secret.decrypt(raw.aiKey);
      } catch {
        raw.aiKey = '';
      }
    }
    this.data = sanitize(raw);
  }

  get(key) {
    return this.data[key];
  }

  all() {
    return { ...this.data };
  }

  /** What windows get to see: everything except the API key itself. */
  forRenderer() {
    const { aiKey, ...rest } = this.data;
    return { ...rest, aiHasKey: Boolean(aiKey) };
  }

  set(patch) {
    const before = this.data;
    this.data = sanitize({ ...before, ...patch });
    const changed = Object.keys(this.data).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(this.data[k]));
    if (changed.length) {
      this.save();
      this.emit('change', changed, this.data);
    }
    return changed;
  }

  save() {
    const out = { ...this.data };
    if (out.aiKey && this.secret) out.aiKey = this.secret.encrypt(out.aiKey);
    writeJson(this.file, out);
  }
}

module.exports = { Settings, DEFAULTS, FRIENDS, PACKS, AI_MODELS, sanitize };
