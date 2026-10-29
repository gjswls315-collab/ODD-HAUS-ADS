import { G, Scene } from '../core/app';
import { C } from '../core/constants';
import { clamp } from '../core/math';
import { sheet } from '../gfx/assets';
import { PAL } from '../gfx/palette';
import { SHEET } from '../gfx/sprites';
import { fade, keyHints, panel, text } from '../gfx/ui';
import { drawLogo } from '../ui/logo';
import { MenuList } from '../ui/menu';
import { OptionsPanel } from '../ui/options';
import { MenuBackdrop } from './backdrops';
import { PrologueScene } from './prologue';
import { SelectScene } from './select';

// Title + main menu (docs/01 SCR-02, wireframe WF-1).

const VERSION = 'Ver 0.1.0 · Stage 1 Vertical Slice';

export class TitleScene implements Scene {
  private bg = new MenuBackdrop();
  private mode: 'attract' | 'menu' | 'options' | 'credits' = 'attract';
  private t = 0;
  private menuT = 0;
  private idle = 0;
  private menu: MenuList;
  private options: OptionsPanel | null = null;
  private creditsT = 0;

  constructor(skipAttract = false) {
    this.menu = new MenuList([
      { label: 'START GAME', action: () => this.start() },
      { label: 'CHARACTER SELECT', action: () => G.scenes.go(new SelectScene(), undefined, 'ink') },
      { label: 'STORY', action: () => G.scenes.go(new PrologueScene('title'), undefined, 'ink') },
      { label: 'OPTIONS', action: () => { this.options = new OptionsPanel(); this.mode = 'options'; } },
      { label: 'ARCHIVE', disabled: true, note: '도감 · COMING SOON', action: () => {} },
      { label: 'CREDITS', action: () => { this.mode = 'credits'; this.creditsT = 0; } },
    ], 930, 552, 360, 54, 12);
    if (skipAttract) {
      this.mode = 'menu';
      this.menuT = 1;
    }
  }

  enter() {
    G.audio.music('title');
  }

  private start() {
    if (!G.save.flags.prologueSeen) G.scenes.go(new PrologueScene('select'), undefined, 'ink');
    else G.scenes.go(new SelectScene(), undefined, 'ink');
  }

  update(dt: number) {
    this.t += dt;
    this.bg.update(dt);
    const inp = G.input;
    if (inp.anyKeyThisStep || inp.clicked) this.idle = 0;
    else this.idle += dt;
    switch (this.mode) {
      case 'attract':
        if ((inp.anyKeyThisStep || inp.clicked) && this.t > 0.3) {
          G.audio.unlock();
          G.audio.sfx('uiConfirm');
          this.mode = 'menu';
          this.menuT = 0;
        }
        break;
      case 'menu':
        this.menuT += dt;
        if (this.menuT > 0.3 && !G.scenes.busy) this.menu.update(dt);
        if (this.idle > 30) {
          this.mode = 'attract';
          this.idle = 0;
        }
        break;
      case 'options':
        if (this.options!.update(dt)) {
          this.options = null;
          this.mode = 'menu';
        }
        break;
      case 'credits':
        this.creditsT += dt;
        if ((inp.back || inp.confirm || inp.clicked) && this.creditsT > 0.3) {
          G.audio.sfx('uiBack');
          this.mode = 'menu';
        }
        break;
    }
  }

  render() {
    const r = G.r;
    const g = r.wctx;
    this.bg.draw(g);
    // Seraphine in flight over the cemetery (the in-game sprite, not a separate key art)
    const hero = sheet(SHEET.hero('seraphine'));
    const bob = Math.round(Math.sin(this.t * 1.6) * 2);
    hero.draw(g, 'fly', hero.index('fly', this.t), 132, 214 + bob);
    const logoA = clamp(this.t / 0.8, 0, 1);
    drawLogo(g, 370, 26, this.t, logoA);
    r.presentWorld();

    r.uiTransform();
    if (this.mode === 'attract') {
      if (Math.floor(this.t * 2) % 2 === 0 || this.t < 0.8) text(r, 'PRESS ANY KEY', 1110, 1008, { size: 24, font: 'display', align: 'center', color: PAL.B4, alpha: logoA });
    } else {
      const k = clamp(this.menuT / 0.3, 0, 1);
      this.menu.render(k);
      keyHints(r, 840, 990, [['↑↓', 'SELECT'], ['ENTER', 'CONFIRM']]);
    }
    text(r, VERSION, 48, 1032, { size: 18, color: PAL.N7 });
    if (G.save.scores.hi > 0) text(r, 'HI ' + String(G.save.scores.hi).padStart(9, '0'), 1872, 24, { size: 24, font: 'display', align: 'right', color: PAL.N8 });
    if (this.mode === 'options') this.options!.render();
    if (this.mode === 'credits') this.renderCredits();
  }

  private renderCredits() {
    const r = G.r;
    fade(r, 0.75);
    r.uiTransform();
    panel(r, 460, 120, 1000, 840, { style: 'tome', alpha: 0.95 });
    text(r, 'CREDITS', 960, 160, { size: 36, font: 'display', weight: 700, align: 'center', spacing: 8, color: C.gold });
    const lines: [string, string][] = [
      ['ECLIPSE REQUIEM — 일식의 진혼곡', 'Stage 1 vertical slice'],
      ['GAME & VISUAL DESIGN', 'docs/ 00–07 (시각 기획 · UI · Stage 1 사양서)'],
      ['ART', '스크립트로 제작한 임시 픽셀아트 에셋 (tools/art → assets/, 교체용)'],
      ['MUSIC & SOUND', 'WebAudio 실시간 합성 (오르간 · 합창 · 종)'],
      ['ENGINE', 'HTML5 Canvas 2D · TypeScript · 60 Hz fixed step'],
      ['FONTS', 'Galmuri by Lee Minseo (SIL OFL 1.1) · 5x7 bitmap font'],
      ['INSPIRED BY', '클래식 횡스크롤 아케이드 슈팅의 장르 문법'],
    ];
    lines.forEach(([a, b], i) => {
      text(r, a, 960, 250 + i * 92, { size: 21, font: 'display', weight: 700, align: 'center', spacing: 3, color: C.gold });
      text(r, b, 960, 282 + i * 92, { size: 21, align: 'center', color: C.ivory });
    });
    text(r, 'ENTER / ESC', 960, 910, { size: 18, align: 'center', color: C.sub });
  }
}
