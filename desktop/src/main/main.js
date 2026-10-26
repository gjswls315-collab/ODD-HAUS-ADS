'use strict';

const path = require('path');
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  net,
  powerMonitor,
  safeStorage,
  screen,
  shell,
  systemPreferences,
} = require('electron');
const { Settings } = require('./settings');
const { Stats } = require('./stats');
const { TypingTracker } = require('./typing');
const { Keyboard } = require('./keyboard');
const { Scheduler, Pomodoro } = require('./scheduler');
const { pickLine } = require('./lines');
const ai = require('./ai');
const { checkForUpdate } = require('./updater');
const pkg = require('../../package.json');
const cast = require('../shared/cast.json');

const RENDERER = path.join(__dirname, '..', 'renderer');
const ASSETS = path.join(__dirname, '..', '..', 'assets');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');
const DEBUG = process.env.ODD_DEBUG === '1'; // lets tools/preview.mjs simulate typing and reminders
const IS_MAC = process.platform === 'darwin';
const CAN_FORWARD_MOUSE = process.platform === 'win32' || IS_MAC; // click-through with hover detection

const DESK_W = 300;
const DESK_H = 400;

if (process.env.ODD_USER_DATA) app.setPath('userData', process.env.ODD_USER_DATA);

let settings;
let stats;
let tracker;
let keyboard;
let scheduler;
let pomodoro;
let tray = null;
let deskWin = null;
let settingsWin = null;
let summaryWin = null;
let worldDisplayId = null;
let update = null;
let keyboardState = { running: false, needsPermission: false, error: null };
let permissionTimer = null;
const overlays = new Map(); // display id -> BrowserWindow
const roles = new Map(); // webContents id -> { role, displayId }

// ---------------------------------------------------------------- helpers

const alive = (win) => win && !win.isDestroyed();

function send(win, channel, data) {
  if (alive(win)) win.webContents.send(channel, data);
}

function world() {
  return overlays.get(worldDisplayId);
}

function broadcast(channel, data) {
  for (const win of BrowserWindow.getAllWindows()) send(win, channel, data);
}

function displayList() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    primary: d.id === primary.id,
    x: d.workArea.x,
    y: d.workArea.y,
    w: d.workArea.width,
    h: d.workArea.height,
    scale: d.scaleFactor,
  }));
}

function today(t = Date.now()) {
  return stats.summary(t, settings.all());
}

function rendererState() {
  return { ...settings.forRenderer(), keyboard: keyboardState };
}

function deskBounds() {
  if (!alive(deskWin) || !deskWin.isVisible()) return null;
  const b = deskWin.getBounds();
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

// ---------------------------------------------------------------- windows

function baseWindow(extra) {
  return new BrowserWindow({
    transparent: true,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
    ...extra,
  });
}

function makeClickThrough(win, { always = false } = {}) {
  if (CAN_FORWARD_MOUSE) win.setIgnoreMouseEvents(true, { forward: true });
  else if (always) win.setIgnoreMouseEvents(true); // no hover detection here: never block the desktop
}

function createOverlay(display, role) {
  const wa = display.workArea;
  const win = baseWindow({ x: wa.x, y: wa.y, width: wa.width, height: wa.height, movable: false, title: 'ODD HAUS friends' });
  win.setAlwaysOnTop(true, 'floating');
  if (IS_MAC) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  makeClickThrough(win, { always: true });
  const wcId = win.webContents.id;
  roles.set(wcId, { role, displayId: display.id });
  win.on('closed', () => roles.delete(wcId));
  win.loadFile(path.join(RENDERER, 'overlay', 'index.html'));
  win.once('ready-to-show', () => {
    win.setBounds(wa); // again, now that the window lives on its display (mixed DPI setups)
    if (settings.get('showFriends')) win.showInactive();
    if (alive(deskWin)) deskWin.moveTop();
  });
  return win;
}

function rebuildOverlays() {
  for (const win of overlays.values()) if (alive(win)) win.destroy();
  overlays.clear();
  const primary = screen.getPrimaryDisplay();
  worldDisplayId = primary.id;
  for (const d of screen.getAllDisplays()) overlays.set(d.id, createOverlay(d, d.id === primary.id ? 'world' : 'mirror'));
}

let displayTimer = null;
function onDisplaysChanged() {
  clearTimeout(displayTimer);
  displayTimer = setTimeout(() => {
    const ids = screen.getAllDisplays().map((d) => d.id);
    const same =
      ids.length === overlays.size && ids.every((id) => overlays.has(id)) && screen.getPrimaryDisplay().id === worldDisplayId;
    if (!same) {
      rebuildOverlays();
    } else {
      for (const d of screen.getAllDisplays()) {
        const win = overlays.get(d.id);
        if (alive(win)) win.setBounds(d.workArea);
      }
      broadcast('displays', displayList());
    }
    if (alive(deskWin)) deskWin.setBounds({ ...clampDeskPos(deskWin.getBounds()), width: DESK_W, height: DESK_H });
    send(world(), 'desk', deskBounds());
  }, 400);
}

function clampDeskPos(pos) {
  const wa = screen.getDisplayNearestPoint({ x: pos.x + DESK_W / 2, y: pos.y + DESK_H / 2 }).workArea;
  return {
    x: Math.round(Math.min(Math.max(pos.x, wa.x), wa.x + wa.width - DESK_W)),
    y: Math.round(Math.min(Math.max(pos.y, wa.y), wa.y + wa.height - DESK_H)),
  };
}

function defaultDeskPos() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - DESK_W - 16, y: wa.y + wa.height - DESK_H };
}

function createDesk() {
  const pos = clampDeskPos(settings.get('deskPos') || defaultDeskPos());
  deskWin = baseWindow({ ...pos, width: DESK_W, height: DESK_H, title: 'ODD HAUS desk' });
  deskWin.setAlwaysOnTop(true, 'pop-up-menu');
  if (IS_MAC) deskWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  makeClickThrough(deskWin);
  roles.set(deskWin.webContents.id, { role: 'desk' });
  deskWin.loadFile(path.join(RENDERER, 'desk', 'index.html'));
  deskWin.once('ready-to-show', () => {
    if (settings.get('showDesk')) deskWin.showInactive();
    send(world(), 'desk', deskBounds());
  });
}

function openSettings(tab = 'today') {
  if (alive(settingsWin)) {
    send(settingsWin, 'tab', tab);
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 820,
    height: 720,
    minWidth: 640,
    minHeight: 520,
    title: `${appTitle()} 설정`,
    backgroundColor: '#fffaf3',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(ASSETS, 'icon.png'),
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, spellcheck: false },
  });
  roles.set(settingsWin.webContents.id, { role: 'settings' });
  settingsWin.loadFile(path.join(RENDERER, 'settings', 'index.html'), { query: { tab } });
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

/** The day summary card ("오늘도 수고했어~"), shown without stealing focus. */
function openSummary() {
  if (alive(summaryWin)) {
    summaryWin.showInactive();
    return;
  }
  const wa = screen.getPrimaryDisplay().workArea;
  const w = 600;
  const h = 560;
  summaryWin = baseWindow({
    x: Math.round(wa.x + (wa.width - w) / 2),
    y: Math.round(wa.y + (wa.height - h) / 2),
    width: w,
    height: h,
    focusable: true,
    title: `${appTitle()} 오늘 요약`,
  });
  summaryWin.setAlwaysOnTop(true, 'pop-up-menu');
  roles.set(summaryWin.webContents.id, { role: 'summary' });
  summaryWin.loadFile(path.join(RENDERER, 'settings', 'index.html'), { query: { view: 'summary' } });
  summaryWin.once('ready-to-show', () => summaryWin.showInactive());
  summaryWin.on('closed', () => {
    summaryWin = null;
  });
}

function applyVisibility() {
  const showFriends = settings.get('showFriends');
  for (const win of overlays.values()) {
    if (!alive(win)) continue;
    if (showFriends) win.showInactive();
    else win.hide();
  }
  if (alive(deskWin)) {
    if (settings.get('showDesk')) deskWin.showInactive();
    else deskWin.hide();
  }
  send(world(), 'desk', deskBounds());
}

// ---------------------------------------------------------------- keyboard

function setKeyboardState(patch) {
  keyboardState = { ...keyboardState, ...patch };
  broadcast('settings', rendererState());
}

function applyKeyboard() {
  clearInterval(permissionTimer);
  permissionTimer = null;
  if (!settings.get('typingReact')) {
    keyboard.stop();
    return setKeyboardState({ running: false, needsPermission: false });
  }
  if (IS_MAC && !systemPreferences.isTrustedAccessibilityClient(false)) {
    systemPreferences.isTrustedAccessibilityClient(true); // shows the macOS permission prompt
    setKeyboardState({ running: false, needsPermission: true });
    permissionTimer = setInterval(() => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) applyKeyboard();
    }, 5000);
    return;
  }
  const running = keyboard.start();
  setKeyboardState({ running, needsPermission: false });
}

function onPress(kind, t = Date.now()) {
  const ev = tracker.press(kind, t);
  stats.recordKey(t, ev.combo);
  scheduler.noteKey(t);
  const payload = { ...ev, today: stats.day(t).total };
  send(deskWin, 'typing', payload);
  send(world(), 'typing', payload);
}

// ---------------------------------------------------------------- reminders

async function deliver(rem) {
  const friend = settings.get('deskFriend');
  let text = pickLine(rem.type, rem.n);
  if (settings.get('aiEnabled') && settings.get('aiKey')) {
    text = await ai.restyleSafe({ apiKey: settings.get('aiKey'), model: settings.get('aiModel'), friend, text });
  }
  const msg = { type: rem.type, n: rem.n, friend, text, deskVisible: Boolean(deskBounds()) };
  send(deskWin, 'remind', msg);
  send(world(), 'remind', msg);
  if (rem.type === 'endOfDay') setTimeout(openSummary, 2500);
}

// ---------------------------------------------------------------- tray & menus

function trayIcon() {
  if (IS_MAC) {
    const img = nativeImage.createFromPath(path.join(ASSETS, 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  return nativeImage.createFromPath(path.join(ASSETS, 'tray.png'));
}

const appTitle = () => (cast.packs[settings.get('pack')] || cast.packs.chiikawa).title;

function menuTemplate() {
  const pomo = pomodoro.state();
  const items = [
    { label: `${appTitle()} ${pkg.version}`, enabled: false },
    { type: 'separator' },
    { label: '오늘 요약', click: () => openSummary() },
    { label: pomo.mode === 'idle' ? '🍅 집중 시작' : '🍅 집중 그만하기', click: () => pomodoro.toggle(Date.now()) },
    { label: '에피소드 하나 보기', click: () => send(world(), 'episode', { action: 'play', id: 'random' }) },
    { type: 'separator' },
    { label: '친구들 보이기', type: 'checkbox', checked: settings.get('showFriends'), click: (i) => settings.set({ showFriends: i.checked }) },
    { label: '책상 보이기', type: 'checkbox', checked: settings.get('showDesk'), click: (i) => settings.set({ showDesk: i.checked }) },
    { label: '타자 치면 반응하기', type: 'checkbox', checked: settings.get('typingReact'), click: (i) => settings.set({ typingReact: i.checked }) },
    { type: 'separator' },
    { label: '설정…', click: () => openSettings('friends') },
  ];
  if (update) items.push({ label: `새 버전 ${update.version} 받기`, click: () => shell.openExternal(update.url) });
  items.push({ type: 'separator' }, { label: '종료', role: 'quit' });
  return items;
}

function refreshTray() {
  if (!tray) return;
  tray.setToolTip(appTitle());
  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate()));
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(appTitle());
  tray.on('click', () => (IS_MAC ? tray.popUpContextMenu() : openSettings('today')));
  refreshTray();
}

// ---------------------------------------------------------------- updates

async function runUpdateCheck() {
  try {
    update = await checkForUpdate(pkg.version, pkg.oddhaus.releasesApi, net.fetch);
  } catch {
    update = null;
  }
  refreshTray();
  send(settingsWin, 'update', update);
  return update;
}

// ---------------------------------------------------------------- IPC

const ALLOWED_LINKS = [/^https:\/\/github\.com\//, /^https:\/\/console\.anthropic\.com\//, /^https:\/\/platform\.claude\.com\//];

function roleOf(e) {
  return roles.get(e.sender.id) || { role: 'unknown' };
}

function registerIpc() {
  ipcMain.handle('bootstrap', (e) => {
    const r = roleOf(e);
    if (r.role === 'world') setTimeout(() => send(world(), 'desk', deskBounds()), 1500); // in case the desk opened first
    return {
      role: r.role,
      displayId: r.displayId ?? null,
      displays: displayList(),
      settings: rendererState(),
      version: pkg.version,
      platform: process.platform,
      desk: deskBounds(),
      today: today(),
      pomodoro: pomodoro.state(),
      update,
      debug: DEBUG,
    };
  });

  ipcMain.on('interactive', (e, on) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!alive(win) || !CAN_FORWARD_MOUSE) return;
    if (on) win.setIgnoreMouseEvents(false);
    else win.setIgnoreMouseEvents(true, { forward: true });
  });

  ipcMain.on('snapshot', (e, snap) => {
    if (roleOf(e).role !== 'world') return;
    for (const [id, win] of overlays) if (id !== worldDisplayId) send(win, 'snapshot', snap);
  });

  ipcMain.on('poke', (e, p) => send(world(), 'poke', p));

  ipcMain.on('episode-state', (e, s) => {
    send(settingsWin, 'episode', s);
    send(deskWin, 'episode', s);
  });

  ipcMain.on('play-episode', (e, id) => {
    if (typeof id === 'string') send(world(), 'episode', { action: 'play', id });
  });

  let drag = null;
  ipcMain.on('desk-drag', (e, { phase, x, y }) => {
    if (!alive(deskWin)) return;
    if (phase === 'start') {
      const b = deskWin.getBounds();
      drag = { wx: b.x, wy: b.y, mx: x, my: y };
    } else if (phase === 'move' && drag) {
      deskWin.setBounds({ x: Math.round(drag.wx + x - drag.mx), y: Math.round(drag.wy + y - drag.my), width: DESK_W, height: DESK_H });
    } else if (phase === 'end' && drag) {
      drag = null;
      const pos = clampDeskPos(deskWin.getBounds());
      deskWin.setBounds({ ...pos, width: DESK_W, height: DESK_H });
      settings.set({ deskPos: pos });
      send(world(), 'desk', deskBounds());
    }
  });

  ipcMain.on('desk-menu', () => {
    Menu.buildFromTemplate(menuTemplate()).popup({ window: alive(deskWin) ? deskWin : undefined });
  });

  ipcMain.on('pomodoro', (e, action) => {
    if (action === 'toggle') pomodoro.toggle(Date.now());
  });

  ipcMain.handle('settings:set', (e, patch) => {
    if (patch && typeof patch === 'object') {
      const rest = { ...patch };
      delete rest.aiKey; // the key only comes in through ai:key
      settings.set(rest);
    }
    return rendererState();
  });

  ipcMain.on('open-settings', (e, tab) => openSettings(typeof tab === 'string' ? tab : 'today'));
  ipcMain.on('open-summary', () => openSummary());
  ipcMain.on('close-window', (e) => {
    if (roleOf(e).role === 'summary' && alive(summaryWin)) summaryWin.close();
  });

  ipcMain.handle('today', () => today());
  ipcMain.handle('history', (e, n) => stats.history(Date.now(), Math.min(31, Math.max(1, Number(n) || 7))));

  ipcMain.handle('ai:key', (e, key) => {
    settings.set({ aiKey: typeof key === 'string' ? key.trim() : '' });
    return rendererState();
  });

  ipcMain.handle('ai:test', async (e, friend) => {
    const apiKey = settings.get('aiKey');
    if (!apiKey) return { ok: false, error: 'API 키를 먼저 넣어 주세요.' };
    const text = pickLine('water');
    try {
      const out = await ai.restyle({ apiKey, model: settings.get('aiModel'), friend: friend || settings.get('deskFriend'), text });
      return { ok: true, before: text, text: out };
    } catch (err) {
      return { ok: false, error: err && err.status === 401 ? 'API 키가 맞지 않아요.' : `연결하지 못했어요 (${(err && err.status) || err.message})` };
    }
  });

  ipcMain.handle('update:check', () => runUpdateCheck());

  ipcMain.on('open-external', (e, url) => {
    if (typeof url === 'string' && ALLOWED_LINKS.some((re) => re.test(url))) shell.openExternal(url);
  });
  ipcMain.on('open-data', () => shell.openPath(app.getPath('userData')));
  ipcMain.handle('stats:reset', () => {
    stats.reset();
    return today();
  });
  ipcMain.on('quit', () => app.quit());

  if (DEBUG) {
    ipcMain.handle('debug:keys', async (e, { n = 1, kind = 'key', gap = 60 } = {}) => {
      for (let i = 0; i < n; i++) {
        onPress(kind);
        if (gap) await new Promise((r) => setTimeout(r, gap));
      }
      return tracker.combo;
    });
    ipcMain.handle('debug:remind', (e, type) => deliver({ type, n: 2 }));
  }
}

// ---------------------------------------------------------------- lifecycle

function secretCodec() {
  if (!safeStorage.isEncryptionAvailable()) return undefined;
  return {
    encrypt: (s) => safeStorage.encryptString(s).toString('base64'),
    decrypt: (s) => safeStorage.decryptString(Buffer.from(s, 'base64')),
  };
}

function start() {
  const data = app.getPath('userData');
  settings = new Settings(path.join(data, 'settings.json'), secretCodec());
  stats = new Stats(path.join(data, 'stats.json'));
  tracker = new TypingTracker();
  keyboard = new Keyboard();
  scheduler = new Scheduler({ stats, settings, idleSeconds: () => powerMonitor.getSystemIdleTime() });
  pomodoro = new Pomodoro({ settings, stats });

  if (IS_MAC && app.dock) app.dock.hide();
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.get('launchAtLogin') });

  registerIpc();
  rebuildOverlays();
  createDesk();
  createTray();

  keyboard.on('press', (kind) => onPress(kind));
  keyboard.on('error', (err) => setKeyboardState({ running: false, error: String((err && err.message) || err) }));
  applyKeyboard();

  scheduler.on('remind', deliver);
  pomodoro.on('done', deliver);
  pomodoro.on('change', (state) => {
    broadcast('pomodoro', state);
    refreshTray();
  });

  settings.on('change', (keys) => {
    broadcast('settings', rendererState());
    if (keys.includes('typingReact')) applyKeyboard();
    if (keys.includes('showFriends') || keys.includes('showDesk')) applyVisibility();
    if (keys.includes('launchAtLogin') && app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.get('launchAtLogin') });
    if (keys.some((k) => ['goalHours', 'workHours'].includes(k))) broadcast('today', today());
    refreshTray();
  });

  screen.on('display-added', onDisplaysChanged);
  screen.on('display-removed', onDisplaysChanged);
  screen.on('display-metrics-changed', onDisplaysChanged);

  setInterval(() => scheduler.tick(Date.now()), 20 * 1000);
  setInterval(() => {
    const t = Date.now();
    pomodoro.tick(t);
    send(deskWin, 'meter', { kpm: tracker.kpm(t), combo: tracker.comboAt(t), today: stats.day(t).total });
  }, 1000);
  setInterval(() => {
    const summary = today();
    send(settingsWin, 'today', summary);
    send(summaryWin, 'today', summary);
  }, 5000);
  setInterval(() => stats.save(), 30 * 1000);

  setTimeout(runUpdateCheck, 15 * 1000);
  setInterval(runUpdateCheck, 6 * 3600 * 1000);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openSettings('friends'));
  app.on('window-all-closed', () => {
    // stay alive in the tray
  });
  app.on('before-quit', () => {
    if (keyboard) keyboard.stop();
    if (stats) stats.save();
  });
  app.whenReady().then(start);
}
