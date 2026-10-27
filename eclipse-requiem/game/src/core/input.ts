// Keyboard (and basic gamepad) state polled once per fixed step (docs/06 §7: judge by key state, not keydown events).

export type GameAction = 'charge' | 'bomb' | 'focus' | 'fire';
export type Bindings = Record<GameAction, string>;

export const DEFAULT_BINDINGS: Bindings = {
  charge: 'Space',
  bomb: 'KeyX',
  focus: 'ShiftLeft',
  fire: 'KeyZ',
};

const BLOCK_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace',
]);

const PAD = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, back: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };

export class Input {
  private held = new Set<string>();
  private queued: string[] = [];
  private queuedUp: string[] = [];
  private pressedNow = new Set<string>();
  private releasedNow = new Set<string>();
  bindings: Bindings = { ...DEFAULT_BINDINGS };
  /** Last raw key pressed (for key rebinding). */
  lastKey: string | null = null;
  anyKeyThisStep = false;
  mouseMoved = false;
  private padPrev: boolean[] = [];
  private padNow: boolean[] = [];
  private padAxes: number[] = [0, 0];

  /** Pointer position in client CSS px, and whether it was clicked this step. */
  mouseX = -1;
  mouseY = -1;
  private clickQueued = false;
  clicked = false;
  mouseActive = false;

  attach(target: Window) {
    target.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseMoved = true;
      this.mouseActive = true;
    });
    target.addEventListener('pointerdown', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.clickQueued = true;
      this.mouseActive = true;
    });
    target.addEventListener('keydown', (e) => {
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.queued.push(e.code);
    });
    target.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
      this.queuedUp.push(e.code);
    });
    target.addEventListener('blur', () => {
      for (const k of this.held) this.queuedUp.push(k);
      this.held.clear();
    });
  }

  /** Call once at the start of every fixed step. Edges are only visible during the first step after they happen. */
  beginStep() {
    this.pressedNow.clear();
    this.releasedNow.clear();
    for (const k of this.queued) this.pressedNow.add(k);
    for (const k of this.queuedUp) this.releasedNow.add(k);
    this.anyKeyThisStep = this.queued.length > 0;
    this.clicked = this.clickQueued;
    this.clickQueued = false;
    if (this.queued.length) this.mouseActive = false;
    this.lastKey = this.queued.length ? this.queued[this.queued.length - 1] : null;
    this.queued.length = 0;
    this.queuedUp.length = 0;
    this.pollPad();
  }

  private pollPad() {
    this.padPrev = this.padNow;
    this.padNow = [];
    this.padAxes = [0, 0];
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => (this.padNow[i] = this.padNow[i] || b.pressed));
      if (Math.abs(p.axes[0] ?? 0) > 0.35) this.padAxes[0] = p.axes[0];
      if (Math.abs(p.axes[1] ?? 0) > 0.35) this.padAxes[1] = p.axes[1];
    }
    if (this.padNow.some((b, i) => b && !this.padPrev[i])) this.anyKeyThisStep = true;
  }
  private padHeld(i: number) {
    return !!this.padNow[i];
  }
  private padPressed(i: number) {
    return !!this.padNow[i] && !this.padPrev[i];
  }

  isHeld(code: string) {
    return this.held.has(code);
  }
  wasPressed(code: string) {
    return this.pressedNow.has(code);
  }
  wasReleased(code: string) {
    return this.releasedNow.has(code);
  }

  // ---- movement ----
  get moveX() {
    let x = 0;
    if (this.held.has('ArrowLeft') || this.held.has('KeyA') || this.padHeld(PAD.left)) x -= 1;
    if (this.held.has('ArrowRight') || this.held.has('KeyD') || this.padHeld(PAD.right)) x += 1;
    if (x === 0 && this.padAxes[0]) x = Math.sign(this.padAxes[0]);
    return x;
  }
  get moveY() {
    let y = 0;
    if (this.held.has('ArrowUp') || this.held.has('KeyW') || this.padHeld(PAD.up)) y -= 1;
    if (this.held.has('ArrowDown') || this.held.has('KeyS') || this.padHeld(PAD.down)) y += 1;
    if (y === 0 && this.padAxes[1]) y = Math.sign(this.padAxes[1]);
    return y;
  }

  // ---- game actions ----
  private codeHeld(code: string) {
    if (code === 'ShiftLeft' || code === 'ShiftRight') return this.held.has('ShiftLeft') || this.held.has('ShiftRight');
    return this.held.has(code);
  }
  private codePressed(code: string) {
    if (code === 'ShiftLeft' || code === 'ShiftRight') return this.pressedNow.has('ShiftLeft') || this.pressedNow.has('ShiftRight');
    return this.pressedNow.has(code);
  }
  private codeReleased(code: string) {
    if (code === 'ShiftLeft' || code === 'ShiftRight') return this.releasedNow.has('ShiftLeft') || this.releasedNow.has('ShiftRight');
    return this.releasedNow.has(code);
  }
  actionHeld(a: GameAction) {
    const pad = a === 'charge' ? PAD.a : a === 'bomb' ? PAD.b : a === 'focus' ? PAD.rb : PAD.x;
    return this.codeHeld(this.bindings[a]) || this.padHeld(pad) || (a === 'focus' && this.padHeld(PAD.lb));
  }
  actionPressed(a: GameAction) {
    const pad = a === 'charge' ? PAD.a : a === 'bomb' ? PAD.b : a === 'focus' ? PAD.rb : PAD.x;
    return this.codePressed(this.bindings[a]) || this.padPressed(pad);
  }
  actionReleased(a: GameAction) {
    const pad = a === 'charge' ? PAD.a : a === 'bomb' ? PAD.b : a === 'focus' ? PAD.rb : PAD.x;
    return this.codeReleased(this.bindings[a]) || (!this.padNow[pad] && !!this.padPrev[pad]);
  }
  get pausePressed() {
    return this.pressedNow.has('Escape') || this.pressedNow.has('KeyP') || this.padPressed(PAD.start);
  }

  // ---- menu ----
  get up() {
    return this.pressedNow.has('ArrowUp') || this.pressedNow.has('KeyW') || this.padPressed(PAD.up);
  }
  get down() {
    return this.pressedNow.has('ArrowDown') || this.pressedNow.has('KeyS') || this.padPressed(PAD.down);
  }
  get left() {
    return this.pressedNow.has('ArrowLeft') || this.pressedNow.has('KeyA') || this.padPressed(PAD.left);
  }
  get right() {
    return this.pressedNow.has('ArrowRight') || this.pressedNow.has('KeyD') || this.padPressed(PAD.right);
  }
  get confirm() {
    return this.pressedNow.has('Enter') || this.pressedNow.has('NumpadEnter') || this.pressedNow.has('Space') ||
      this.pressedNow.has('KeyZ') || this.padPressed(PAD.a);
  }
  get back() {
    return this.pressedNow.has('Escape') || this.pressedNow.has('Backspace') || this.pressedNow.has('KeyX') || this.padPressed(PAD.b);
  }
  get tab() {
    return this.pressedNow.has('Tab') || this.padPressed(PAD.y);
  }
  get confirmHeld() {
    return this.held.has('Enter') || this.held.has('Space') || this.held.has('KeyZ') || this.padHeld(PAD.a);
  }
  get escHeld() {
    return this.held.has('Escape') || this.padHeld(PAD.back);
  }
}

export function keyLabel(code: string) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'CTRL', ControlRight: 'R-CTRL',
    AltLeft: 'ALT', AltRight: 'R-ALT', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', Tab: 'TAB',
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Comma: ',', Period: '.', Slash: '/',
    Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=',
  };
  return map[code] ?? code.toUpperCase();
}
