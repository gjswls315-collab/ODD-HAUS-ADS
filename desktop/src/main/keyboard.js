'use strict';

// The global keyboard hook. Only the *kind* of each press leaves this file
// ('key' | 'enter' | 'space' | 'erase'); which key was pressed is never stored or sent.

const { EventEmitter } = require('events');
const { KeyDeduper } = require('./typing');

let hook = null; // loaded lazily so the app still runs if the native module is missing

function loadHook() {
  if (!hook) hook = require('uiohook-napi');
  return hook;
}

class Keyboard extends EventEmitter {
  constructor() {
    super();
    this.running = false;
    this.dedupe = new KeyDeduper();
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
  }

  classify(code) {
    const K = loadHook().UiohookKey;
    if (code === K.Enter || code === K.NumpadEnter) return 'enter';
    if (code === K.Space) return 'space';
    if (code === K.Backspace || code === K.Delete) return 'erase';
    const modifiers = [K.Shift, K.ShiftRight, K.Ctrl, K.CtrlRight, K.Alt, K.AltRight, K.Meta, K.MetaRight, K.CapsLock];
    if (modifiers.includes(code)) return null; // 한/영, 한자 and plain modifiers aren't typing
    return 'key';
  }

  onDown(e) {
    const kind = this.classify(e.keycode);
    if (!kind) return;
    if (this.dedupe.keydown(e.keycode, Date.now())) this.emit('press', kind);
  }

  onUp(e) {
    this.dedupe.keyup(e.keycode);
  }

  /** @returns {boolean} whether the hook is running */
  start() {
    if (this.running) return true;
    try {
      const { uIOhook } = loadHook();
      uIOhook.on('keydown', this.onDown);
      uIOhook.on('keyup', this.onUp);
      uIOhook.start();
      this.running = true;
    } catch (err) {
      this.emit('error', err);
      this.running = false;
    }
    return this.running;
  }

  stop() {
    if (!this.running) return;
    const { uIOhook } = loadHook();
    uIOhook.removeListener('keydown', this.onDown);
    uIOhook.removeListener('keyup', this.onUp);
    try {
      uIOhook.stop();
    } catch {
      // already stopped
    }
    this.dedupe.reset();
    this.running = false;
  }
}

module.exports = { Keyboard };
