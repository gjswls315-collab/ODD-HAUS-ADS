import { G, Scene } from '../core/app';
import { C, W } from '../core/constants';
import { clamp } from '../core/math';
import { image, sheet } from '../gfx/assets';
import { PAL } from '../gfx/palette';
import { ptext } from '../gfx/pixeltext';
import { HeroId, SHEET } from '../gfx/sprites';
import { button, fade, panel, text } from '../gfx/ui';
import { Director } from '../game/director';
import { StageBg } from '../game/stagebg';
import { World } from '../game/world';
import { Hud } from '../ui/hud';
import { Dialog, MenuList, uiMouse } from '../ui/menu';
import { OptionsPanel } from '../ui/options';
import { ClearScene } from './clear';
import { TitleScene } from './title';

// Stage scene: world + HUD + pause / game over overlays (docs/01 SCR-06..SCR-10).

type Mode = 'play' | 'pause' | 'controls' | 'options' | 'gameover';

export class GameScene implements Scene {
  w!: World;
  hud!: Hud;
  mode: Mode = 'play';
  private pauseMenu!: MenuList;
  private dialog: Dialog | null = null;
  private options: OptionsPanel | null = null;
  private resumeT = 0;
  private goT = 0;
  private count = 10;
  private countT = 0;
  private goSel = 0;
  private clearT = -1;
  private debug = new URLSearchParams(location.search).has('debug');

  constructor(public hero: HeroId, public startAt = 0) {}

  enter() {
    const w = new World(this.hero);
    w.bg = new StageBg();
    w.director = new Director(w, this.startAt);
    this.w = w;
    this.hud = new Hud(w);
    this.pauseMenu = new MenuList([
      { label: 'RESUME', action: () => this.resume() },
      { label: 'RETRY', action: () => (this.dialog = new Dialog('처음부터 다시 시작할까요?', 'RETRY', 'CANCEL', () => G.scenes.go(new GameScene(this.hero), undefined, 'ink'), () => (this.dialog = null))) },
      { label: 'CONTROLS', action: () => (this.mode = 'controls') },
      { label: 'OPTIONS', action: () => { this.options = new OptionsPanel(true); this.mode = 'options'; } },
      { label: 'QUIT TO TITLE', action: () => (this.dialog = new Dialog('타이틀로 돌아갈까요? (진행 상황은 저장되지 않습니다)', 'QUIT', 'CANCEL', () => G.scenes.go(new TitleScene(), undefined, 'ink'), () => (this.dialog = null))) },
    ], 780, 420, 360, 54, 12);
  }

  onHide() {
    if (this.mode === 'play') this.pause();
  }

  private pause() {
    this.mode = 'pause';
    this.pauseMenu.idx = 0;
    G.audio.duck(0.4, 0.2);
  }
  private resume() {
    this.mode = 'play';
    this.resumeT = 0.5;
  }

  update(dt: number) {
    const inp = G.input;
    const w = this.w;
    if (w.bg) w.bg.userDim = G.save.settings.bgDim / 100;
    if (this.dialog) {
      this.dialog.update(dt);
      return;
    }
    switch (this.mode) {
      case 'pause':
        if (inp.pausePressed) {
          G.audio.sfx('uiBack');
          this.resume();
          return;
        }
        this.pauseMenu.update(dt);
        return;
      case 'controls':
        if (inp.back || inp.confirm || inp.pausePressed || inp.clicked) {
          G.audio.sfx('uiBack');
          this.mode = 'pause';
        }
        return;
      case 'options':
        if (this.options!.update(dt)) {
          this.options = null;
          this.mode = 'pause';
          w.fx.shakeScale = G.save.settings.shake / 100;
          w.fx.flashReduce = G.save.settings.flashReduce;
        }
        return;
      case 'gameover':
        this.updateGameOver(dt);
        return;
    }
    // play
    if (this.resumeT > 0) {
      this.resumeT -= dt;
      return; // enemies stay frozen while the screen fades back in
    }
    if (inp.pausePressed) {
      this.pause();
      return;
    }
    if (this.debug) this.debugKeys();
    w.update(dt);
    this.hud.update(dt);
    if (w.gameOver) {
      this.mode = 'gameover';
      this.goT = 0;
      this.count = 10;
      this.countT = 0;
      this.goSel = 0;
      G.audio.stopMusic(0.5);
    }
    if (w.cleared && this.clearT < 0) this.clearT = 0;
    if (this.clearT >= 0) {
      this.clearT += dt;
      if (this.clearT > 0.6 && !G.scenes.busy) G.scenes.go(new ClearScene(this.hero, w), undefined, 'fade');
    }
  }

  private debugKeys() {
    const inp = G.input, w = this.w;
    if (inp.wasPressed('F4')) w.player.invuln = w.player.invuln > 50 ? 0 : 999;
    if (inp.wasPressed('F2') && w.director) {
      const marks = [50, 115, 145, 164];
      const next = marks.find((m) => m > w.director!.tl + 1) ?? 164;
      w.enemies.length = 0;
      w.bullets.clear();
      w.director.skipTo(next);
    }
    if (inp.wasPressed('F3') && w.boss && w.boss.state === 'fight') w.boss.takeDamage(w.boss.hp - [5850, 2700, 0][w.boss.phase] + 1);
  }

  private updateGameOver(dt: number) {
    const inp = G.input;
    this.goT += dt;
    if (this.goT < 2.5) return;
    this.countT += dt;
    if (this.countT >= 1) {
      this.countT -= 1;
      this.count--;
      if (this.count >= 0) G.audio.sfx('tick');
      if (this.count < 0) {
        G.audio.sfx('crack');
        this.finish();
        return;
      }
    }
    if (inp.left || inp.right) {
      this.goSel = 1 - this.goSel;
      G.audio.sfx('uiMove');
    }
    if (inp.mouseActive) {
      const m = uiMouse();
      for (const i of [0, 1]) {
        const bx = 720 + i * 300;
        if (m.x >= bx && m.x <= bx + 180 && m.y >= 610 && m.y <= 658 && this.goSel !== i) this.goSel = i;
      }
    }
    if (inp.confirm || inp.clicked) {
      if (this.goSel === 0) this.continueRun();
      else this.finish();
    }
  }

  private continueRun() {
    const w = this.w;
    G.audio.sfx('uiConfirm');
    w.stats.continues++;
    w.score = 0;
    w.gameOver = false;
    w.gameOverPending = -1;
    w.player.continueRun();
    this.mode = 'play';
    this.resumeT = 0.4;
    G.audio.music(w.boss && w.boss.alive ? 'boss' : w.director && w.director.tl < 145 ? 'stage' : null);
  }

  private finish() {
    G.scenes.go(new ClearScene(this.hero, this.w, true), undefined, 'fade');
  }

  render() {
    const r = G.r;
    this.w.render(r);
    this.hud.render();
    r.uiTransform();
    const ctx = r.ctx;
    void ctx;
    if (this.mode === 'play' && this.resumeT > 0) fade(r, clamp(this.resumeT / 0.5, 0, 1) * 0.6);
    if (this.mode === 'pause' || this.mode === 'controls' || this.mode === 'options') this.renderPause();
    if (this.mode === 'controls') this.renderControls();
    if (this.mode === 'options') this.options!.render();
    if (this.mode === 'gameover') this.renderGameOver();
    if (this.dialog) this.dialog.render();
  }

  private renderPause() {
    const r = G.r;
    fade(r, 0.6);
    panel(r, 720, 270, 480, 540, { style: 'tome', alpha: 0.95 });
    text(r, 'PAUSED', 960, 300, { size: 36, font: 'display', weight: 700, align: 'center', spacing: 10, color: C.gold });
    const tl = this.w.director ? this.w.director.tl : 0;
    const mm = Math.floor(this.w.stats.stageTime / 60), ss = Math.floor(this.w.stats.stageTime % 60);
    text(r, `STAGE 1 · ASHEN OUTSKIRTS · ${mm}:${String(ss).padStart(2, '0')}`, 960, 352, { size: 18, align: 'center', color: C.sub });
    void tl;
    this.pauseMenu.render();
    text(r, 'HI ' + String(Math.max(G.save.scores.hi, this.w.score)).padStart(9, '0'), 960, 760, { size: 24, font: 'display', align: 'center', color: C.sub });
  }

  private renderControls() {
    const r = G.r;
    fade(r, 0.7);
    panel(r, 500, 220, 920, 640, { style: 'tome', alpha: 0.97 });
    text(r, 'CONTROLS', 960, 250, { size: 36, font: 'display', weight: 700, align: 'center', spacing: 8, color: C.gold });
    controlsTable(r, 560, 330);
    text(r, 'ENTER / ESC 로 돌아가기', 960, 810, { size: 18, align: 'center', color: C.sub });
  }

  /** Game over (docs/01 SCR-10): the field sinks into a dither, the eclipse and the fallen heroine appear, 10 s continue. */
  private renderGameOver() {
    const r = G.r, ctx = r.ctx, t = this.goT;
    fade(r, clamp((t - 0.4) / 1.2, 0, 1) * 0.85);
    if (t < 1.7) return;
    ctx.save();
    r.logical();
    const g = ctx;
    const ka = clamp((t - 1.7) / 0.6, 0, 1);
    // the red eclipse at 2x, swaying by whole pixels
    const moon = image('stage1/moon');
    g.globalAlpha = ka;
    g.drawImage(moon, Math.round(W / 2 - moon.width / 2 + Math.sin(t * 1.05) * 1), 12);
    // the fallen heroine (portrait, half-lit), left of the prompt
    const port = sheet(SHEET.portraits);
    port.draw(g, this.hero, 0, 96, 350, { dither: Math.round(ka * 12) });
    port.draw(g, this.hero, 0, 96, 350, { shadow: true, alpha: 0.5 * ka });
    // ash rising
    const fx = sheet(SHEET.fx);
    for (let i = 0; i < 30; i++) fx.draw(g, 'ash', i % 3, (i * 71) % W, 360 - ((t * 14 + i * 33) % 370));
    g.globalAlpha = clamp((t - 2.0) / 0.8, 0, 1);
    ptext(g, 'REQUIEM INTERRUPTED', W / 2, 106, { font: 'S', scale: 3, color: PAL.R3, align: 'center', outline: PAL.N0 });
    g.globalAlpha = 1;
    if (t >= 2.5) {
      ptext(g, 'CONTINUE?', W / 2 - 12, 150, { font: 'S', scale: 2, color: PAL.B4, align: 'right', outline: PAL.N0 });
      const n = String(Math.max(0, this.count)).padStart(2, '0');
      ptext(g, n, W / 2 + 6, 142, { font: 'S', scale: this.countT < 0.12 ? 5 : 4, color: this.count <= 3 ? PAL.R4 : PAL.B5, outline: PAL.N0 });
      ptext(g, '컨티뉴하면 점수가 0으로 초기화됩니다', W / 2, 238, { font: 'G9', color: PAL.N8, align: 'center', outline: PAL.N0 });
      const sc = String(this.w.score).padStart(9, '0');
      ptext(g, 'SCORE ' + sc + '   STAGE 1   ' + this.w.ch.name, W / 2, 336, { font: 'S', color: PAL.N8, align: 'center', outline: PAL.N0 });
    }
    ctx.restore();
    if (t >= 2.5) {
      r.uiTransform();
      button(r, 720, 612, 180, 48, 'YES', this.goSel === 0 ? 'focus' : 'idle', this.goT, { size: 21 });
      button(r, 1020, 612, 180, 48, 'NO', this.goSel === 1 ? 'focus' : 'idle', this.goT, { size: 21 });
    }
  }
}

export function controlsTable(r = G.r, x = 640, y = 330) {
  const b = G.save.settings.bindings;
  const label = (c: string) => (c.startsWith('Key') ? c.slice(3) : c === 'ShiftLeft' ? 'SHIFT' : c === 'Space' ? 'SPACE' : c);
  const rows: [string, string, string][] = [
    ['방향키 / WASD', '이동 (8방향)', 'MOVE'],
    ['자동', '기본 공격 (항상 발사)', 'AUTO FIRE'],
    [label(b.charge) + ' 길게', '차지: 0.6초 1단 / 1.2초 2단, 떼면 발사', 'CHARGE'],
    [label(b.bomb), '폭탄: 적탄 소거 + 광역 피해 + 무적', 'BOMB'],
    [label(b.focus), '집중 이동 (60%) + 히트박스 표시', 'FOCUS'],
    ['ESC / P', '일시정지', 'PAUSE'],
  ];
  rows.forEach(([k, d, en], i) => {
    const yy = y + i * 72;
    panel(r, x, yy, 220, 52, { alpha: 0.9 });
    text(r, k, x + 110, yy + 27, { size: 21, weight: 700, align: 'center', baseline: 'middle', color: C.ivory });
    text(r, en, x + 250, yy - 3, { size: 18, font: 'display', weight: 700, spacing: 3, color: C.gold });
    text(r, d, x + 250, yy + 24, { size: 21, color: C.ivory });
  });
}
