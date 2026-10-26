'use strict';

// The only API the windows get: named messages to and from the main process.

const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (cb) => {
  const handler = (_e, data) => cb(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('odd', {
  bootstrap: () => ipcRenderer.invoke('bootstrap'),

  onSettings: listen('settings'),
  onDisplays: listen('displays'),
  onTyping: listen('typing'),
  onMeter: listen('meter'),
  onRemind: listen('remind'),
  onPomodoro: listen('pomodoro'),
  onToday: listen('today'),
  onEpisode: listen('episode'),
  onSnapshot: listen('snapshot'),
  onPoke: listen('poke'),
  onDesk: listen('desk'),
  onUpdate: listen('update'),
  onTab: listen('tab'),

  setInteractive: (on) => ipcRenderer.send('interactive', Boolean(on)),
  sendSnapshot: (snap) => ipcRenderer.send('snapshot', snap),
  poke: (p) => ipcRenderer.send('poke', p),
  episodeState: (s) => ipcRenderer.send('episode-state', s),
  playEpisode: (id) => ipcRenderer.send('play-episode', id),
  deskDrag: (phase, x, y) => ipcRenderer.send('desk-drag', { phase, x, y }),
  deskMenu: () => ipcRenderer.send('desk-menu'),
  pomodoro: (action) => ipcRenderer.send('pomodoro', action),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  openSettings: (tab) => ipcRenderer.send('open-settings', tab),
  openSummary: () => ipcRenderer.send('open-summary'),
  closeWindow: () => ipcRenderer.send('close-window'),
  today: () => ipcRenderer.invoke('today'),
  history: (n) => ipcRenderer.invoke('history', n),
  setApiKey: (key) => ipcRenderer.invoke('ai:key', key),
  testAi: (friend) => ipcRenderer.invoke('ai:test', friend),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openDataFolder: () => ipcRenderer.send('open-data'),
  resetStats: () => ipcRenderer.invoke('stats:reset'),
  quit: () => ipcRenderer.send('quit'),

  debugKeys: (opts) => ipcRenderer.invoke('debug:keys', opts),
  debugRemind: (type) => ipcRenderer.invoke('debug:remind', type),
});
