// A fake main process for previewing the windows in a normal browser. Never used in the app.
// URL options: ?ep=<episode id>  ?typing=1  ?remind=<type>  ?desk=x,y,w,h  ?friend=<id>  ?tab=<tab>

const q = new URLSearchParams(location.search);

const SETTINGS = {
  typingReact: true,
  showFriends: true,
  showDesk: true,
  deskFriend: q.get('friend') || 'picker',
  deskPos: null,
  wanderers: (q.get('wanderers') || 'vin,aa,locke,rex').split(',').filter(Boolean),
  scale: Number(q.get('scale') || 1.25),
  smooth: true,
  autoEpisodes: true,
  episodeFreq: 'normal',
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
  aiHasKey: false,
  launchAtLogin: false,
  keyboard: { running: true, needsPermission: false, error: null },
};

function fakeToday() {
  const now = new Date();
  const first = new Date(now);
  first.setHours(9, 7, 0, 0);
  const hourlyFocus = Array(24).fill(0);
  const hourlyKeys = Array(24).fill(0);
  [[9, 3500], [10, 3560], [11, 3540], [12, 120], [13, 2400], [14, 900]].forEach(([h, sec]) => {
    hourlyFocus[h] = sec;
    hourlyKeys[h] = Math.round(sec * 1.4);
  });
  return {
    date: '2026-10-26',
    focusSec: 3 * 3600 + 12 * 60,
    total: 16240,
    maxCombo: 64,
    pomodoros: 2,
    first: first.getTime(),
    endOfDayAt: first.getTime() + 8 * 3600 * 1000,
    goalSec: 4 * 3600,
    hourlyFocus,
    hourlyKeys,
    streak: { days: 2, todayOk: true },
    hour: Number(q.get('hour') || 18),
  };
}

export function createMock(role) {
  const speed = Number(q.get('speed') || 1);
  if (speed !== 1) {
    const real = performance.now.bind(performance);
    performance.now = () => real() * speed; // fast-forward episodes in previews
  }
  const subs = {};
  const on = (ch) => (cb) => {
    (subs[ch] = subs[ch] || []).push(cb);
    return () => (subs[ch] = subs[ch].filter((x) => x !== cb));
  };
  const emit = (ch, data) => (subs[ch] || []).forEach((cb) => cb(data));
  const settings = { ...SETTINGS };
  let pomodoro = { mode: 'idle', endsAt: 0, length: 0, left: 0 };
  let combo = 0;
  let total = 16240;
  let lastAt = 0;
  const recent = [];

  const press = (kind) => {
    const t = Date.now();
    combo = t - lastAt < 1500 ? combo + 1 : 1;
    lastAt = t;
    total += 1;
    recent.push(t);
    while (recent.length && recent[0] < t - 15000) recent.shift();
    const milestone = [10, 30, 50, 100, 200, 300, 500].includes(combo);
    emit('typing', { kind, combo, milestone, kpm: recent.length * 4, today: total, at: t });
  };

  const api = {
    bootstrap: async () => ({
      role: role === 'overlay' ? 'world' : role,
      displayId: 1,
      displays: [{ id: 1, primary: true, x: 0, y: 0, w: innerWidth, h: innerHeight, scale: 1 }],
      settings,
      version: '1.0.0',
      platform: 'preview',
      desk: q.get('desk') ? Object.fromEntries(['x', 'y', 'w', 'h'].map((k, i) => [k, Number(q.get('desk').split(',')[i])])) : null,
      today: fakeToday(),
      pomodoro,
      update: null,
      debug: true,
    }),
    onSettings: on('settings'),
    onDisplays: on('displays'),
    onTyping: on('typing'),
    onMeter: on('meter'),
    onRemind: on('remind'),
    onPomodoro: on('pomodoro'),
    onToday: on('today'),
    onEpisode: on('episode'),
    onSnapshot: on('snapshot'),
    onPoke: on('poke'),
    onDesk: on('desk'),
    onUpdate: on('update'),
    onTab: on('tab'),
    setInteractive: () => {},
    sendSnapshot: () => {},
    poke: () => {},
    episodeState: (s) => {
      window.__episode = s;
      emit('episode', s);
    },
    playEpisode: (id) => emit('episode', { action: 'play', id }),
    deskDrag: () => {},
    deskMenu: () => {},
    pomodoro: () => {
      pomodoro =
        pomodoro.mode === 'idle'
          ? { mode: 'focus', endsAt: Date.now() + 25 * 60000, length: 25 * 60000, left: 25 * 60000 }
          : { mode: 'idle', endsAt: 0, length: 0, left: 0 };
      emit('pomodoro', pomodoro);
    },
    setSettings: async (patch) => {
      Object.assign(settings, patch);
      emit('settings', settings);
      return settings;
    },
    openSettings: () => {},
    openSummary: () => {},
    closeWindow: () => {},
    today: async () => fakeToday(),
    history: async (n = 7) =>
      Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(20 + i).padStart(2, '0')}`, focusSec: [5400, 9000, 0, 0, 7200, 10800, 11520][i % 7], total: [9000, 14000, 0, 0, 11000, 15000, 16240][i % 7] })),
    setApiKey: async () => settings,
    testAi: async () => ({ ok: true, before: '물 한 잔 마시고 오자 💧', text: '흥, 물이나 마시고 와. 딱히 걱정돼서 그런 건 아니야.' }),
    checkUpdate: async () => null,
    openExternal: () => {},
    openDataFolder: () => {},
    resetStats: async () => fakeToday(),
    quit: () => {},
    debugKeys: async ({ n = 1, kind = 'key', gap = 60 } = {}) => {
      for (let i = 0; i < n; i++) {
        press(kind);
        await new Promise((r) => setTimeout(r, gap));
      }
    },
    debugRemind: async (type) => emit('remind', { type, text: '점심 먹으러 가자~ 🍚', friend: settings.deskFriend, deskVisible: true }),
  };

  window.__mock = { emit, press, api };
  if (q.get('ep')) setTimeout(() => emit('episode', { action: 'play', id: q.get('ep') }), Number(q.get('epDelay') || 300));
  if (q.get('typing')) {
    const kinds = ['key', 'key', 'key', 'key', 'key', 'space', 'key', 'key', 'erase', 'key', 'enter'];
    let i = 0;
    setInterval(() => press(kinds[i++ % kinds.length]), Number(q.get('typing')) > 1 ? Number(q.get('typing')) : 110);
  }
  if (q.get('remind')) setTimeout(() => api.debugRemind(q.get('remind')), 600);
  return api;
}
