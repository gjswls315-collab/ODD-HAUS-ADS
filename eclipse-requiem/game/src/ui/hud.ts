import { G } from '../core/app';
import { H, W } from '../core/constants';
import { clamp, ease, TAU } from '../core/math';
import { sheet } from '../gfx/assets';
import { Ctx } from '../gfx/canvas';
import { ditherFill, shade } from '../gfx/dither';
import { PAL } from '../gfx/palette';
import { PFont, ptext, textWidth } from '../gfx/pixeltext';
import { SHEET } from '../gfx/sprites';
import type { UiEvent, World } from '../game/world';

// In-game HUD, drawn on the screen canvas in the 640x360 game-pixel grid (renderer.logical()).
// Layout (top only, so the playfield stays clear):
//   left : character icon, HP pips, bombs, power pips        right: score, chain
//   boss : one row under it — name, phase, a 3-px HP bar with phase notches
// Captions, warnings and the bomb cut-in are pixel text and dithered bands; nothing here is a vector shape.

interface Timed<T> { data: T; t: number; dur: number }

export class Hud {
  t = 0;
  bossMode = false;
  private modeT = 1; // 0..1 transition progress
  private caption: Timed<{ en: string; kr: string }> | null = null;
  private titleCard: Timed<null> | null = null;
  private tip: Timed<{ id: string; text: string; key: string; startCharges: number }> | null = null;
  private warning: Timed<{ boss: boolean; name: string; kr: string; epithet: string }> | null = null;
  private phaseCap: Timed<{ en: string; kr: string }> | null = null;
  private line: Timed<{ kr: string }> | null = null;
  private cut: Timed<{ hero: string }> | null = null;
  private wrathCap: Timed<null> | null = null;
  private timeover: Timed<null> | null = null;
  private bossBarT = -1;
  private trail = 1;
  private shownScore = 0;
  private panelAlphaA = 1;
  private panelAlphaC = 1;
  private hpShake = 0;
  private lastHp = -1;
  private lastLives = -1;

  constructor(private w: World) {
    this.shownScore = w.score;
  }

  private consume(e: UiEvent) {
    const w = this.w;
    switch (e.type) {
      case 'caption': this.caption = { data: e, t: 0, dur: 2.5 }; break;
      case 'title': this.titleCard = { data: null, t: 0, dur: 2.5 }; break;
      case 'tip':
        this.tip = { data: { ...e, startCharges: w.stats.charges }, t: 0, dur: 3.2 };
        G.save.flags.tipsDone[e.id] = true;
        G.save.saveFlags();
        break;
      case 'warning': this.warning = { data: e, t: 0, dur: e.boss ? 3.0 : 1.5 }; break;
      case 'phase': this.phaseCap = { data: e, t: 0, dur: 1.6 }; break;
      case 'line': this.line = { data: e, t: 0, dur: 3.0 }; break;
      case 'bombCut': this.cut = { data: { hero: e.hero }, t: 0, dur: 0.65 }; break;
      case 'bossHud':
        if (e.on !== this.bossMode) {
          this.bossMode = e.on;
          this.modeT = 0;
        }
        if (!e.on) this.bossBarT = -1;
        break;
      case 'bossBar': this.bossBarT = 0; break;
      case 'wrath': this.wrathCap = { data: null, t: 0, dur: 1.4 }; break;
      case 'timeover': this.timeover = { data: null, t: 0, dur: 1.6 }; break;
    }
  }

  update(dt: number) {
    const w = this.w;
    this.t += dt;
    while (w.ui.length) this.consume(w.ui.shift()!);
    for (const k of ['caption', 'titleCard', 'tip', 'warning', 'phaseCap', 'line', 'cut', 'wrathCap', 'timeover'] as const) {
      const v = this[k] as Timed<unknown> | null;
      if (v) {
        v.t += dt;
        if (v.t >= v.dur) (this as unknown as Record<string, unknown>)[k] = null;
      }
    }
    if (this.tip && w.stats.charges > this.tip.data.startCharges && this.tip.dur - this.tip.t > 0.3) this.tip.dur = this.tip.t + 0.3;
    if (this.modeT < 1) this.modeT = Math.min(1, this.modeT + dt / 0.4);
    if (this.bossBarT >= 0) this.bossBarT += dt;
    // score roll (0.25 s)
    const diff = w.score - this.shownScore;
    this.shownScore = diff > 0 ? Math.min(w.score, this.shownScore + Math.max(1, Math.ceil(diff * Math.min(1, dt / 0.25 * 3)))) : w.score;
    // overlap fade (player hitbox or enemy bullets near panels)
    const rects = { a: [0, 0, 120, 30], c: [540, 0, 640, 24] };
    const near = (r: number[]) => {
      const p = w.player;
      if (p.x > r[0] && p.x < r[2] && p.y > r[1] && p.y < r[3]) return true;
      for (const b of w.bullets.list) if (b.alive && b.x > r[0] && b.x < r[2] && b.y > r[1] && b.y < r[3]) return true;
      return false;
    };
    const base = G.save.settings.hudOpacity / 100;
    this.panelAlphaA += ((near(rects.a) ? 0.35 : 1) - this.panelAlphaA) * Math.min(1, dt / 0.15);
    this.panelAlphaC += ((near(rects.c) ? 0.35 : 1) - this.panelAlphaC) * Math.min(1, dt / 0.15);
    void base;
    if (w.player.hp !== this.lastHp) {
      if (this.lastHp >= 0 && w.player.hp < this.lastHp) this.hpShake = 0.25;
      this.lastHp = w.player.hp;
    }
    if (w.player.lives !== this.lastLives) this.lastLives = w.player.lives;
    this.hpShake = Math.max(0, this.hpShake - dt);
    const b = w.boss;
    if (b) {
      const f = b.hud.barFill < 1 ? b.hud.barFill : b.hpFrac;
      this.trail = f > this.trail ? f : Math.max(f, this.trail - dt * 0.25);
    }
  }

  // ---------------- render ----------------
  render() {
    const r = G.r, w = this.w, g = r.ctx;
    g.save();
    r.logical();
    // low HP: a dithered crimson border pulsing at 1 Hz
    if (w.player.hp === 1 && !w.player.dead && !G.save.settings.flashReduce) {
      const lv = Math.round(3 + 2 * Math.sin(this.t * TAU));
      for (const [x, y, ww, hh] of [[0, 0, W, 6], [0, H - 6, W, 6], [0, 6, 6, H - 12], [W - 6, 6, 6, H - 12]]) ditherFill(g, x, y, ww, hh, lv, PAL.R1);
    }
    const base = G.save.settings.hudOpacity / 100;
    this.drawStatus(g, base * this.panelAlphaA);
    this.drawScore(g, base * this.panelAlphaC);
    if (this.bossBarT >= 0 && w.boss) this.drawBossBar(g);
    else if (w.midboss && w.midboss.alive) this.drawMidbossBar(g);
    else if (!this.bossMode) this.drawStageLabel(g);
    this.drawCaptions(g);
    this.drawWarning(g);
    this.drawCut(g);
    if (w.fx.flashA > 0) shade(g, 0, 0, W, H, Math.min(1, w.fx.flashA) * 0.8, w.fx.flashColor);
    g.restore();
  }

  private txt(g: Ctx, s: string, x: number, y: number, color: string, o: { font?: PFont; align?: 'left' | 'center' | 'right'; scale?: number; outline?: string | null; valign?: 'top' | 'middle' | 'bottom' } = {}) {
    return ptext(g, s, x, y, { font: o.font ?? 'S', color, align: o.align, scale: o.scale, valign: o.valign, outline: o.outline === null ? undefined : o.outline ?? PAL.N0 });
  }

  private drawStatus(g: Ctx, alpha: number) {
    if (alpha <= 0.01) return;
    const w = this.w, p = w.player, hud = sheet(SHEET.hud);
    g.save();
    g.globalAlpha = alpha;
    const sx = this.hpShake > 0 ? Math.round(Math.sin(this.t * 80) * 2 * (this.hpShake / 0.25)) : 0;
    const flash = p.hitFlash > 0 || (p.invuln > 0 && Math.floor(this.t * 20) % 2 === 0 && !p.dead);
    hud.draw(g, 'icon_' + w.ch.id, 0, 12, 12, { flash, dither: p.dead ? 8 : undefined });
    this.txt(g, 'x' + Math.max(0, p.lives), 12, 22, PAL.N9, { align: 'center' });
    // HP pips
    const danger = p.hp === 1 && !p.dead;
    for (let i = 0; i < p.maxHp; i++) {
      const f = i < p.hp ? (danger && Math.floor(this.t * 4) % 2 === 0 ? 2 : 0) : 1;
      hud.draw(g, 'hp', f, 30 + i * 10 + sx, 8);
    }
    // bombs (struck through while the boss locks them)
    const ping = w.pings.bomb !== undefined && w.t - w.pings.bomb < 0.4 ? Math.round(Math.sin(this.t * 70)) : 0;
    for (let i = 0; i < 3; i++) hud.draw(g, 'bomb', i < p.bombs ? 0 : 1, 30 + i * 10 + ping, 20);
    if (p.bombLocked && !p.dead && w.boss) {
      g.fillStyle = PAL.R3;
      g.fillRect(25, 20, 30, 1);
    }
    // power: 4 pips per level in the character's colour, then LV
    const pipFrame = w.ch.id === 'seraphine' ? 1 : w.ch.id === 'noctis' ? 2 : 3;
    for (let i = 0; i < 4; i++) hud.draw(g, 'pip', p.level >= 3 || i < p.pp % 4 ? pipFrame : 0, 64 + i * 6, 20);
    this.txt(g, p.level >= 3 ? 'MAX' : 'LV' + p.level, 89, 17, p.level >= 3 ? PAL.G3 : PAL.N9);
    g.restore();
  }

  private drawScore(g: Ctx, alpha: number) {
    if (alpha <= 0.01) return;
    const w = this.w;
    g.save();
    g.globalAlpha = alpha;
    const rolling = this.shownScore < w.score;
    this.txt(g, String(Math.min(999999999, Math.round(this.shownScore))).padStart(9, '0'), W - 6, 5, rolling ? PAL.G3 : PAL.B4, { align: 'right' });
    if (w.chain > 0) {
      const s = 'CHAIN ' + w.chain + (w.chain >= 10 ? ' ×' + w.chainMul.toFixed(1) : '');
      this.txt(g, s, W - 6, 14, w.chain >= 10 ? PAL.G3 : PAL.N9, { align: 'right' });
      // chain timer: 1-px rule under the label
      const cw = Math.round(40 * clamp(w.chainT / 2, 0, 1));
      g.fillStyle = PAL.A2;
      g.fillRect(W - 6 - cw, 22, cw, 1);
    }
    g.restore();
  }

  private drawStageLabel(g: Ctx) {
    g.save();
    g.globalAlpha = 0.75;
    this.txt(g, 'STAGE 1 · ASHEN OUTSKIRTS', W / 2, 5, PAL.N7, { align: 'center' });
    g.restore();
  }

  /** Thin bar: 1-px outline, 3-px fill, trail of recent damage. */
  private bar(g: Ctx, x: number, y: number, w: number, frac: number, trail: number, color: string, edge: string) {
    g.fillStyle = PAL.N0;
    g.fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle = PAL.N2;
    g.fillRect(x, y, w, 3);
    g.fillStyle = PAL.B2;
    g.fillRect(x, y, Math.round(w * trail), 3);
    g.fillStyle = color;
    g.fillRect(x, y, Math.round(w * frac), 3);
    g.fillStyle = edge;
    g.fillRect(x, y, Math.round(w * frac), 1);
  }

  private drawMidbossBar(g: Ctx) {
    const mb = this.w.midboss!;
    const left = Math.max(0, mb.timeLimit - mb.fightT);
    this.txt(g, 'GRAVEKEEPER GRAVEN', W / 2, 5, PAL.B4, { align: 'center' });
    this.bar(g, 220, 15, 200, clamp(mb.hp / mb.maxHp, 0, 1), clamp(mb.hp / mb.maxHp, 0, 1), PAL.Z4, PAL.Z5);
    this.txt(g, String(Math.ceil(left)).padStart(2, '0'), 428, 13, left < 10 ? PAL.R4 : PAL.N8);
  }

  private drawBossBar(g: Ctx) {
    const b = this.w.boss!;
    if (!b.visible) return;
    const t = this.bossBarT;
    const k = ease.outCubic(clamp(t / 0.3, 0, 1));
    const y = Math.round(28 - 8 * (1 - k));
    g.save();
    g.globalAlpha = k;
    this.txt(g, 'BELLKEEPER ABADDON', 8, y, PAL.B4);
    this.txt(g, '침묵의 종지기', 118, y - 2, PAL.N8, { font: 'G9' });
    this.txt(g, 'PHASE ' + Math.min(3, b.phaseIndex + 1) + '/3', W - 8, y, PAL.N9, { align: 'right' });
    const bx = 8, by = y + 10, bw = W - 16;
    const fill = b.hud.barFill < 1 ? b.hud.barFill : b.hpFrac;
    const col = b.phaseIndex === 0 ? PAL.R2 : b.phaseIndex === 1 ? PAL.R3 : PAL.R4;
    this.bar(g, bx, by, bw, fill, b.hud.barFill < 1 ? fill : this.trail, col, PAL.R5);
    if (b.wrath) {
      const on = Math.floor(this.t * 6) % 2 === 0;
      g.fillStyle = on ? PAL.R4 : PAL.R1;
      g.fillRect(bx - 1, by - 1, bw + 2, 1);
      g.fillRect(bx - 1, by + 3, bw + 2, 1);
      this.txt(g, 'WRATH', W - 8, by + 6, PAL.R4, { align: 'right' });
    }
    // invulnerable: dither the fill
    if (b.state === 'transition' || b.state === 'intro') ditherFill(g, bx, by, Math.round(bw * fill), 3, 8, PAL.N0);
    // phase notches at 65% and 30%
    for (const [i, m] of [[0, 0.65], [1, 0.3]] as [number, number][]) {
      const mx = Math.round(bx + bw * m);
      g.fillStyle = b.phaseIndex > i ? PAL.N4 : PAL.B4;
      g.fillRect(mx, by - 2, 1, 7);
    }
    if (this.timeover) this.txt(g, 'TIME OVER — 보너스 없음', W - 8, by + 6, PAL.N8, { font: 'G9', align: 'right' });
    g.restore();
  }

  private fadeIO(v: Timed<unknown>, inT = 0.2, outT = 0.2) {
    return Math.min(1, v.t / inT, (v.dur - v.t) / outT);
  }
  private drawCaptions(g: Ctx) {
    if (this.titleCard) {
      const a = this.fadeIO(this.titleCard, 0.4, 0.5);
      g.save();
      shade(g, 0, 134, W, 76, 0.6 * a);
      g.globalAlpha = clamp(a * 1.5, 0, 1);
      g.fillStyle = PAL.R2;
      const rw = Math.round(260 * a);
      g.fillRect(W / 2 - rw / 2, 136, rw, 1);
      g.fillRect(W / 2 - rw / 2, 207, rw, 1);
      this.txt(g, 'STAGE 1', W / 2, 144, PAL.G3, { align: 'center' });
      this.txt(g, 'ASHEN OUTSKIRTS', W / 2, 158, PAL.B5, { align: 'center', scale: 2 });
      this.txt(g, '재의 변두리', W / 2, 180, PAL.N8, { font: 'G11', align: 'center' });
      g.restore();
    }
    if (this.caption) {
      g.save();
      g.globalAlpha = this.fadeIO(this.caption, 0.3, 0.3);
      this.txt(g, this.caption.data.en, W / 2, 284, PAL.B4, { align: 'center' });
      this.txt(g, this.caption.data.kr, W / 2, 294, PAL.N8, { font: 'G9', align: 'center' });
      g.restore();
    }
    if (this.line) {
      g.save();
      g.globalAlpha = this.fadeIO(this.line, 0.5, 0.5);
      this.txt(g, this.line.data.kr, W / 2, 248, PAL.B5, { font: 'G11', align: 'center' });
      g.restore();
    }
    if (this.tip) {
      g.save();
      g.globalAlpha = this.fadeIO(this.tip);
      const key = this.tip.data.key, msg = this.tip.data.text;
      const kw = Math.max(9, textWidth(key, 'S') + 4), mw = textWidth(msg, 'G9');
      const tw = kw + 6 + mw + 12, x = Math.round(W / 2 - tw / 2), y = 322;
      g.fillStyle = PAL.N1;
      g.fillRect(x, y, tw, 15);
      g.fillStyle = PAL.N4;
      g.fillRect(x, y, tw, 1);
      g.fillRect(x, y + 14, tw, 1);
      g.fillStyle = PAL.N3;
      g.fillRect(x + 6, y + 3, kw, 9);
      this.txt(g, key, x + 6 + kw / 2, y + 4, PAL.B5, { align: 'center', outline: null });
      this.txt(g, msg, x + 6 + kw + 6, y + 2, PAL.B4, { font: 'G9', outline: null });
      g.restore();
    }
    if (this.phaseCap) {
      g.save();
      g.globalAlpha = this.fadeIO(this.phaseCap);
      const n = this.w.boss ? this.w.boss.phaseIndex + (this.w.boss.state === 'transition' ? 2 : 1) : 1;
      this.txt(g, 'PHASE ' + Math.min(3, n) + ' · ' + this.phaseCap.data.en, W / 2, 54, PAL.G3, { align: 'center' });
      this.txt(g, this.phaseCap.data.kr, W / 2, 64, PAL.B4, { font: 'G9', align: 'center' });
      g.restore();
    }
    if (this.wrathCap) {
      g.save();
      g.globalAlpha = this.fadeIO(this.wrathCap);
      this.txt(g, 'THE TOLL GROWS WRATHFUL', W / 2, 80, PAL.R4, { align: 'center' });
      this.txt(g, '종이 분노한다', W / 2, 90, PAL.B4, { font: 'G9', align: 'center' });
      g.restore();
    }
  }

  private drawWarning(g: Ctx) {
    const wv = this.warning;
    if (!wv) return;
    const t = wv.t, boss = wv.data.boss, end = wv.dur;
    const reduce = G.save.settings.flashReduce;
    const close = clamp((end - t) / 0.3, 0, 1);
    // dim the field (dither, the player stays visible through it)
    shade(g, 0, 0, W, H, Math.min(1, t / 0.2) * close * 0.45);
    // red scan sweep (boss only)
    if (boss && t < 0.3) shade(g, 0, 0, W, Math.round((t / 0.3) * H), reduce ? 0.1 : 0.2, PAL.R1);
    const open = boss ? clamp((t - 0.3) / 0.25, 0, 1) : clamp(t / 0.2, 0, 1);
    const bh = Math.round((boss ? 64 : 44) * ease.outCubic(open) * close);
    const cy = 172;
    if (bh < 2) return;
    const accent = boss ? PAL.R3 : PAL.G2;
    g.fillStyle = boss ? PAL.R0 : PAL.N1;
    g.fillRect(0, cy - bh / 2, W, bh);
    g.fillStyle = accent;
    g.fillRect(0, cy - bh / 2, W, 1);
    g.fillRect(0, cy + bh / 2 - 1, W, 1);
    // hazard markers sliding along the rules
    const fx = sheet(SHEET.fx), wf = Math.floor(t * 8) % 2;
    for (let x = (t * 60) % 40 - 40; x < W; x += 40) {
      fx.draw(g, 'warn', wf, x, cy - bh / 2 - 7);
      fx.draw(g, 'warn', wf, W - x, cy + bh / 2 + 7);
    }
    // letters 40 ms apart, 4x scaled 5x7 glyphs
    const word = boss ? 'WARNING' : 'CAUTION', sc = boss ? 4 : 3;
    const step = 6 * sc + (boss ? 6 : 4);
    let lx = Math.round(W / 2 - (word.length * step - (boss ? 6 : 4)) / 2);
    const ly = cy - Math.round((7 * sc) / 2) - (bh > 40 ? 6 : 0);
    const start = boss ? 0.55 : 0.1;
    for (let i = 0; i < word.length; i++) {
      const lt = t - start - i * 0.04;
      if (lt > 0) {
        const jit = boss && !reduce && lt < 0.3 ? Math.round((Math.random() - 0.5) * 2) : 0;
        if (boss && !reduce) this.txt(g, word[i], lx + sc + jit, ly + sc, PAL.R2, { scale: sc, outline: null });
        this.txt(g, word[i], lx + jit, ly, PAL.B5, { scale: sc });
      }
      lx += step;
    }
    // name typing below
    const nameT = t - (boss ? 0.9 : 0.4);
    if (nameT > 0) {
      const n = Math.floor(clamp(nameT / 0.6, 0, 1) * wv.data.name.length);
      const yy = cy + bh / 2 + 8;
      g.save();
      g.globalAlpha = close;
      this.txt(g, wv.data.name.slice(0, n), W / 2, yy, PAL.B5, { align: 'center', scale: boss ? 2 : 1 });
      g.globalAlpha = clamp((t - (boss ? 1.2 : 0.6)) / 0.3, 0, 1) * close;
      this.txt(g, wv.data.kr, W / 2, yy + (boss ? 18 : 10), PAL.R4, { font: 'G11', align: 'center' });
      this.txt(g, wv.data.epithet, W / 2, yy + (boss ? 34 : 24), PAL.N8, { align: 'center' });
      g.restore();
    }
  }

  private drawCut(g: Ctx) {
    const c = this.cut;
    if (!c) return;
    const t = c.t, ch = this.w.ch;
    const inK = ease.outCubic(clamp(t / 0.15, 0, 1));
    const outK = clamp((t - 0.5) / 0.15, 0, 1);
    const x = Math.round(-W * (1 - inK) + W * outK);
    const y = 132, h = 64;
    g.save();
    g.translate(x, 0);
    g.fillStyle = PAL.N1;
    g.fillRect(0, y, W, h);
    g.fillStyle = ch.color;
    g.fillRect(0, y, W, 1);
    g.fillRect(0, y + h - 1, W, 1);
    // portrait crop (face and shoulders) from ui/portraits
    g.beginPath();
    g.rect(60, y + 1, 120, h - 2);
    g.clip();
    sheet(SHEET.portraits).draw(g, ch.id, 0, 120, y + 150);
    g.restore();
    g.save();
    g.translate(x, 0);
    this.txt(g, ch.bombEn, 200, y + 16, PAL.B5, { scale: 2 });
    this.txt(g, ch.bomb, 200, y + 38, ch.color, { font: 'G11' });
    g.restore();
  }
}
