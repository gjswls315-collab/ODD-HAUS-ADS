import { G } from '../core/app';
import { C } from '../core/constants';
import { button, ButtonState, panel, text } from '../gfx/ui';

// Reusable vertical menu + confirm dialog (docs/04 UI-01, UI-05). Keyboard focus and mouse hover always agree.

export function uiMouse() {
  const r = G.r;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return { x: (G.input.mouseX * dpr - r.vx) / r.s, y: (G.input.mouseY * dpr - r.vy) / r.s };
}

export interface MenuItem {
  label: string;
  disabled?: boolean;
  note?: string;
  action: () => void;
}

export class MenuList {
  idx = 0;
  focusT = 0;
  pressT = 0;
  private pending: (() => void) | null = null;
  constructor(public items: MenuItem[], public x: number, public y: number, public w = 360, public h = 54, public gap = 12, public size = 24) {
    while (this.items[this.idx]?.disabled) this.idx++;
  }

  private move(d: number) {
    const n = this.items.length;
    let i = this.idx;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!this.items[i].disabled) break;
    }
    if (i !== this.idx) {
      this.idx = i;
      this.focusT = 0;
      G.audio.sfx('uiMove');
    }
  }

  /** Returns true when an item was activated this step. */
  update(dt: number) {
    this.focusT += dt;
    if (this.pending) {
      this.pressT -= dt;
      if (this.pressT <= 0) {
        const p = this.pending;
        this.pending = null;
        p();
      }
      return false;
    }
    const inp = G.input;
    if (inp.up) this.move(-1);
    if (inp.down) this.move(1);
    if (inp.mouseActive) {
      const m = uiMouse();
      this.items.forEach((it, i) => {
        const iy = this.y + i * (this.h + this.gap);
        if (m.x >= this.x && m.x <= this.x + this.w && m.y >= iy && m.y <= iy + this.h && i !== this.idx && !it.disabled) {
          this.idx = i;
          this.focusT = 0;
          G.audio.sfx('uiMove');
        }
      });
    }
    let activate = inp.confirm;
    if (inp.clicked) {
      const m = uiMouse();
      const iy = this.y + this.idx * (this.h + this.gap);
      activate = activate || (m.x >= this.x && m.x <= this.x + this.w && m.y >= iy && m.y <= iy + this.h);
      for (let i = 0; i < this.items.length; i++) {
        const y = this.y + i * (this.h + this.gap);
        if (m.x >= this.x && m.x <= this.x + this.w && m.y >= y && m.y <= y + this.h && this.items[i].disabled) G.audio.sfx('uiDeny');
      }
    }
    if (activate) {
      const it = this.items[this.idx];
      if (it.disabled) {
        G.audio.sfx('uiDeny');
        return false;
      }
      G.audio.sfx('uiConfirm');
      this.pending = it.action;
      this.pressT = 0.12;
      return true;
    }
    return false;
  }

  render(alpha = 1) {
    const r = G.r;
    r.ctx.save();
    r.ctx.globalAlpha *= alpha;
    this.items.forEach((it, i) => {
      const y = this.y + i * (this.h + this.gap);
      let st: ButtonState = it.disabled ? 'disabled' : i === this.idx ? 'focus' : 'idle';
      if (i === this.idx && this.pending) st = 'pressed';
      button(r, this.x, y, this.w, this.h, it.label, st, this.focusT, { size: this.size });
      if (it.note && i === this.idx) text(r, it.note, this.x + this.w / 2, y + this.h + 2, { size: 18, align: 'center', color: C.sub });
    });
    r.ctx.restore();
  }
}

/** Confirm dialog; destructive actions default to "cancel" (docs/04 UI-05). */
export class Dialog {
  sel = 1;
  t = 0;
  constructor(public question: string, public yes: string, public no: string, public onYes: () => void, public onNo: () => void) {}
  update(dt: number) {
    this.t += dt;
    const inp = G.input;
    if (inp.left || inp.right || inp.up || inp.down) {
      this.sel = 1 - this.sel;
      G.audio.sfx('uiMove');
    }
    if (inp.mouseActive) {
      const m = uiMouse();
      for (const i of [0, 1]) {
        const bx = 720 + i * 300;
        if (m.x >= bx && m.x <= bx + 180 && m.y >= 600 && m.y <= 648 && this.sel !== i) {
          this.sel = i;
          G.audio.sfx('uiMove');
        }
      }
    }
    if (inp.back) {
      G.audio.sfx('uiBack');
      this.onNo();
      return;
    }
    let go = inp.confirm;
    if (inp.clicked) {
      const m = uiMouse();
      const bx = 720 + this.sel * 300;
      go = go || (m.x >= bx && m.x <= bx + 180 && m.y >= 600 && m.y <= 648);
    }
    if (go) {
      G.audio.sfx(this.sel === 0 ? 'uiConfirm' : 'uiBack');
      if (this.sel === 0) this.onYes();
      else this.onNo();
    }
  }
  render() {
    const r = G.r, ctx = r.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,8,0.4)';
    ctx.fillRect(0, 0, 1920, 1080);
    const s = 0.95 + 0.05 * Math.min(1, this.t / 0.12);
    ctx.translate(960, 540);
    ctx.scale(s, s);
    ctx.translate(-960, -540);
    panel(r, 660, 390, 600, 300, { style: 'tome', alpha: 0.95 });
    text(r, this.question, 960, 480, { size: 24, align: 'center', color: C.ivory, maxWidth: 520 });
    button(r, 720, 600, 180, 48, this.yes, this.sel === 0 ? 'focus' : 'idle', this.t, { size: 21 });
    button(r, 1020, 600, 180, 48, this.no, this.sel === 1 ? 'focus' : 'idle', this.t, { size: 21 });
    ctx.restore();
  }
}
