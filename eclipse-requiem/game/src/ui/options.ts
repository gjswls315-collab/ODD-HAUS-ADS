import { G } from '../core/app';
import { C } from '../core/constants';
import { DEFAULT_BINDINGS, GameAction, keyLabel } from '../core/input';
import { DEFAULT_SETTINGS, Settings } from '../core/save';
import { rgba } from '../gfx/canvas';
import { keyHints, panel, text } from '../gfx/ui';
import { uiMouse } from './menu';

// Options (docs/01 SCR-14). Changes apply immediately and are saved to localStorage.

type Row =
  | { kind: 'head'; label: string }
  | { kind: 'cycle'; label: string; key: keyof Settings; values: (number | boolean | string)[]; fmt?: (v: never) => string; desc: string }
  | { kind: 'bind'; label: string; action: GameAction; desc: string }
  | { kind: 'act'; label: string; run: () => void; desc: string };

const onOff = (v: boolean) => (v ? 'ON' : 'OFF');

export class OptionsPanel {
  rows: Row[];
  idx = 1;
  t = 0;
  binding: GameAction | null = null;
  private scroll = 0;

  constructor(private inGame = false) {
    this.rows = [
      { kind: 'head', label: 'AUDIO' },
      { kind: 'cycle', label: 'BGM', key: 'bgm', values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], desc: '배경 음악 볼륨' },
      { kind: 'cycle', label: 'SFX', key: 'sfx', values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], desc: '효과음 볼륨' },
      { kind: 'head', label: 'VISUAL' },
      { kind: 'cycle', label: 'SCREEN SHAKE', key: 'shake', values: [0, 50, 100], fmt: ((v: number) => v + '%') as (v: never) => string, desc: '화면 흔들림 강도 (UI 흔들림 포함)' },
      { kind: 'cycle', label: 'FLASH REDUCTION', key: 'flashReduce', values: [false, true], fmt: onOff as (v: never) => string, desc: '백색 플래시를 어둡게-금빛 페이드로 바꾸고 스캔 효과를 줄입니다' },
      { kind: 'cycle', label: 'BACKGROUND DIM', key: 'bgDim', values: [0, 15, 30], fmt: ((v: number) => (v ? '-' + v + '%' : '0')) as (v: never) => string, desc: '배경 대비를 낮춰 탄을 더 또렷하게 봅니다' },
      { kind: 'cycle', label: 'HUD OPACITY', key: 'hudOpacity', values: [60, 78, 90], fmt: ((v: number) => v + '%') as (v: never) => string, desc: 'HUD 패널 불투명도 (탄과 겹치면 자동으로 35%)' },
      { kind: 'cycle', label: 'BOMB CUT-IN', key: 'cutIn', values: [true, false], fmt: onOff as (v: never) => string, desc: '폭탄 사용 시 캐릭터 컷인과 슬로 연출' },
      { kind: 'head', label: 'CONTROLS' },
      { kind: 'cycle', label: 'AUTO FIRE', key: 'autoFire', values: [true, false], fmt: onOff as (v: never) => string, desc: 'OFF면 FIRE 키를 누르는 동안만 사격합니다' },
      { kind: 'cycle', label: 'PLAYER SHOT VISIBILITY', key: 'shotVis', values: [100, 70, 40], fmt: ((v: number) => v + '%') as (v: never) => string, desc: '내 탄의 표시 강도 (적탄 가독성 향상)' },
      { kind: 'cycle', label: 'CHARGE MODE', key: 'chargeMode', values: ['hold', 'toggle'], fmt: ((v: string) => v.toUpperCase()) as (v: never) => string, desc: 'TOGGLE: 한 번 눌러 충전 시작, 다시 눌러 발사 (접근성)' },
      { kind: 'bind', label: 'CHARGE', action: 'charge', desc: '키를 다시 지정하려면 ENTER' },
      { kind: 'bind', label: 'BOMB', action: 'bomb', desc: '키를 다시 지정하려면 ENTER' },
      { kind: 'bind', label: 'FOCUS (SLOW)', action: 'focus', desc: '누르는 동안 이동속도 60%, 히트박스 표시' },
      { kind: 'bind', label: 'FIRE (AUTO FIRE OFF)', action: 'fire', desc: '자동 발사를 끈 경우 사격 키' },
      { kind: 'head', label: 'DISPLAY' },
      { kind: 'cycle', label: 'INTEGER SCALING', key: 'integerScale', values: [true, false], fmt: onOff as (v: never) => string, desc: '픽셀을 정수배로만 확대합니다 (창이 작으면 자동으로 맞춤)' },
      { kind: 'act', label: 'FULLSCREEN', run: () => this.fullscreen(), desc: '전체 화면 전환' },
      { kind: 'act', label: 'RESET TO DEFAULTS', run: () => this.reset(), desc: '모든 설정을 기본값으로' },
    ];
  }

  private fullscreen() {
    const d = document as Document & { webkitFullscreenElement?: Element };
    if (d.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }
  private reset() {
    G.save.settings = structuredClone(DEFAULT_SETTINGS);
    G.save.saveSettings();
    G.applySettings();
  }

  private move(d: number) {
    let i = this.idx;
    do i = (i + d + this.rows.length) % this.rows.length;
    while (this.rows[i].kind === 'head');
    this.idx = i;
    G.audio.sfx('uiMove');
  }

  private change(d: number) {
    const row = this.rows[this.idx];
    if (row.kind !== 'cycle') return;
    const s = G.save.settings as unknown as Record<string, unknown>;
    const cur = s[row.key];
    let i = row.values.indexOf(cur as never);
    if (i < 0) i = 0;
    i = Math.max(0, Math.min(row.values.length - 1, i + d));
    if (row.values.length <= 3 && typeof row.values[0] !== 'number') i = (row.values.indexOf(cur as never) + (d > 0 ? 1 : row.values.length - 1)) % row.values.length;
    s[row.key] = row.values[i];
    G.save.saveSettings();
    G.applySettings();
    if (row.key === 'sfx') G.audio.sfx('uiConfirm');
    else G.audio.sfx('uiMove');
  }

  /** Returns true when the panel wants to close. */
  update(dt: number) {
    this.t += dt;
    const inp = G.input;
    if (this.binding) {
      if (inp.wasPressed('Escape')) {
        this.binding = null;
        G.audio.sfx('uiBack');
        return false;
      }
      const k = inp.lastKey;
      if (k && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Escape', 'KeyP', 'Enter'].includes(k)) {
        const b = G.save.settings.bindings;
        const other = (Object.keys(b) as GameAction[]).find((a) => b[a] === k && a !== this.binding);
        if (other) b[other] = b[this.binding];
        b[this.binding] = k;
        G.save.saveSettings();
        G.applySettings();
        G.audio.sfx('uiConfirm');
        this.binding = null;
      } else if (k) G.audio.sfx('uiDeny');
      return false;
    }
    if (inp.back && !inp.wasPressed('KeyX')) {
      G.audio.sfx('uiBack');
      return true;
    }
    if (inp.wasPressed('Escape') || inp.wasPressed('Backspace')) {
      G.audio.sfx('uiBack');
      return true;
    }
    if (inp.up) this.move(-1);
    if (inp.down) this.move(1);
    if (inp.left) this.change(-1);
    if (inp.right) this.change(1);
    if (inp.mouseActive) {
      const m = uiMouse();
      this.rows.forEach((row, i) => {
        const y = this.rowY(i);
        if (row.kind !== 'head' && m.x > 460 && m.x < 1460 && m.y > y - 4 && m.y < y + 40 && this.idx !== i) {
          this.idx = i;
          G.audio.sfx('uiMove');
        }
      });
    }
    const row = this.rows[this.idx];
    if (inp.confirm || inp.clicked) {
      if (row.kind === 'cycle') this.change(1);
      else if (row.kind === 'bind') {
        this.binding = row.action;
        G.audio.sfx('uiConfirm');
      } else if (row.kind === 'act') {
        G.audio.sfx('uiConfirm');
        row.run();
      }
    }
    // keep focus visible
    const fy = this.rowY(this.idx) + this.scroll;
    const target = Math.max(0, fy - 760);
    this.scroll += (target - this.scroll) * Math.min(1, dt * 10);
    return false;
  }

  private rowY(i: number) {
    let y = 170;
    for (let k = 0; k < i; k++) y += this.rows[k].kind === 'head' ? 52 : 40;
    return y - this.scroll;
  }

  render() {
    const r = G.r, ctx = r.ctx;
    ctx.save();
    if (this.inGame) {
      ctx.fillStyle = 'rgba(5,5,8,0.6)';
      ctx.fillRect(0, 0, 1920, 1080);
    }
    panel(r, 420, 60, 1080, 960, { style: 'menu', alpha: 0.92 });
    text(r, 'OPTIONS', 960, 96, { size: 36, font: 'display', weight: 700, align: 'center', spacing: 8, color: C.gold });
    ctx.save();
    ctx.beginPath();
    ctx.rect(430, 150, 1060, 760);
    ctx.clip();
    const s = G.save.settings as unknown as Record<string, unknown>;
    this.rows.forEach((row, i) => {
      const y = this.rowY(i);
      if (y < 130 || y > 920) return;
      if (row.kind === 'head') {
        text(r, row.label, 470, y + 12, { size: 18, font: 'display', weight: 700, spacing: 6, color: C.sub });
        ctx.fillStyle = rgba(C.gold, 0.4);
        ctx.fillRect(470, y + 38, 980, 1);
        return;
      }
      const focus = i === this.idx;
      if (focus) {
        ctx.fillStyle = rgba(C.violetdark, 0.9);
        ctx.fillRect(460, y - 2, 1000, 38);
        ctx.fillStyle = C.gold;
        ctx.fillRect(460, y - 2, 3, 38);
      }
      text(r, row.label, 490, y + 17, { size: 21, font: 'display', weight: 600, baseline: 'middle', spacing: 2, color: focus ? C.ivory : C.sub });
      let val = '';
      if (row.kind === 'cycle') {
        const v = s[row.key];
        val = row.fmt ? row.fmt(v as never) : String(v);
        if (typeof row.values[0] === 'number' && row.values.length > 3) {
          // slider
          const k = Number(v) / 100;
          ctx.fillStyle = C.empty;
          ctx.fillRect(1060, y + 15, 300, 6);
          ctx.fillStyle = focus ? C.gold : C.sub;
          ctx.fillRect(1060, y + 15, 300 * k, 6);
          ctx.fillRect(1060 + 300 * k - 6, y + 6, 12, 24);
        }
        text(r, (focus ? '‹ ' : '') + val + (focus ? ' ›' : ''), 1440, y + 17, { size: 21, weight: 700, baseline: 'middle', align: 'right', color: focus ? C.gold : C.ivory });
      } else if (row.kind === 'bind') {
        const waiting = this.binding === row.action;
        val = waiting ? (Math.floor(this.t * 3) % 2 ? '키를 누르세요…' : '') : keyLabel(G.save.settings.bindings[row.action]);
        text(r, val, 1440, y + 17, { size: 21, weight: 700, baseline: 'middle', align: 'right', color: waiting ? C.warn : focus ? C.gold : C.ivory });
        if (!waiting && G.save.settings.bindings[row.action] !== DEFAULT_BINDINGS[row.action]) text(r, '(변경됨)', 1440 - 140, y + 17, { size: 18, baseline: 'middle', align: 'right', color: C.sub });
      } else {
        text(r, '›', 1440, y + 17, { size: 24, baseline: 'middle', align: 'right', color: focus ? C.gold : C.sub });
      }
    });
    ctx.restore();
    const row = this.rows[this.idx];
    if (row.kind !== 'head') text(r, row.desc, 960, 930, { size: 21, align: 'center', color: C.sub });
    keyHints(r, 470, 972, [['↑↓', 'SELECT'], ['←→', 'CHANGE'], ['ENTER', 'APPLY'], ['ESC', 'BACK']]);
    ctx.restore();
  }
}
