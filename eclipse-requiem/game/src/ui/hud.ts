import { G } from '../core/app';
import { C } from '../core/constants';
import { clamp, ease, TAU } from '../core/math';
import { rgba } from '../gfx/canvas';
import { pixelText } from '../gfx/pixelfont';
import { ART } from '../gfx/sprites';
import { cross, keyHint, panel, sigil, text } from '../gfx/ui';
import { CHARGE_L1, CHARGE_L2 } from '../game/player';
import type { UiEvent, World } from '../game/world';

// In-game HUD (docs/04 §2-§3). All coordinates are 1080p UI design pixels.

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
    const rects = this.bossMode && this.modeT > 0.5 ? { a: [0, 314, 136, 360], c: [524, 312, 640, 360] } : { a: [0, 0, 136, 46], c: [524, 0, 640, 48] };
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
  }

  // ---------------- render ----------------
  render() {
    const r = G.r;
    const w = this.w;
    r.uiTransform();
    const ctx = r.ctx;
    ctx.save();
    // low HP vignette (1 Hz pulse)
    if (w.player.hp === 1 && !w.player.dead && G.save.settings.flashReduce === false) {
      const a = 0.1 + 0.06 * Math.sin(this.t * TAU);
      const grd = ctx.createRadialGradient(960, 540, 420, 960, 540, 1100);
      grd.addColorStop(0, 'rgba(179,38,59,0)');
      grd.addColorStop(1, `rgba(179,38,59,${a})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 1920, 1080);
    }
    this.drawPopups();
    const base = G.save.settings.hudOpacity / 100;
    // mode transition: fade out (first half), move, fade in (second half)
    const k = this.modeT;
    const vis = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2;
    const inBoss = this.bossMode ? k >= 0.5 : k < 0.5;
    const slide = k >= 0.5 ? (1 - vis) * 24 : 0;
    const ay = inBoss ? 966 + slide : 24;
    const cy = inBoss ? 960 + slide : 24;
    this.drawStatus(24, ay, base * this.panelAlphaA * vis);
    this.drawScore(1596, cy, base * this.panelAlphaC * vis);
    if (!inBoss) {
      if (w.midboss && w.midboss.alive) this.drawMidbossBar(vis);
      else this.drawStageLabel(vis);
    }
    this.drawCharge();
    if (this.bossBarT >= 0 && w.boss) this.drawBossBlock();
    this.drawCaptions();
    this.drawWarning();
    this.drawCut();
    // flash
    if (w.fx.flashA > 0) {
      ctx.globalAlpha = Math.min(1, w.fx.flashA);
      ctx.fillStyle = w.fx.flashColor;
      ctx.fillRect(-10, -10, 1940, 1100);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawPopups() {
    const r = G.r;
    for (const p of this.w.fx.popups) {
      const a = Math.min(1, p.life / 0.25);
      pixelText(r, p.text, p.x * 3, p.y * 3 - 10, 3, { align: 'center', color: p.color, alpha: a });
    }
  }

  private drawStatus(x: number, y: number, alpha: number) {
    if (alpha <= 0.01) return;
    const r = G.r, ctx = r.ctx, w = this.w, p = w.player;
    ctx.save();
    ctx.globalAlpha = alpha;
    const sx = this.hpShake > 0 ? Math.sin(this.t * 80) * 4 * (this.hpShake / 0.25) : 0;
    ctx.translate(sx, 0);
    const danger = p.hp === 1 && !p.dead;
    panel(r, x, y, 360, 90, { alpha: 0.78, accent: danger && Math.sin(this.t * TAU) > 0 ? C.blood : C.gold });
    // portrait (scaled crop of the key art)
    ctx.fillStyle = rgba(w.ch.color, 0.25);
    ctx.fillRect(x + 12, y + 15, 60, 60);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 12, y + 15, 60, 60);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    const big = ART.heroBig[w.ch.id];
    // face region of the 4x key art
    const flash = p.hitFlash > 0 || (p.invuln > 0 && Math.floor(this.t * 20) % 2 === 0 && !p.dead);
    if (p.dead) ctx.filter = 'grayscale(1)';
    ctx.drawImage(big, 75, 22, 56, 56, x + 4, y + 9, 80, 80);
    ctx.filter = 'none';
    if (flash) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x + 12, y + 15, 60, 60);
    }
    ctx.restore();
    ctx.strokeStyle = danger ? C.blood : w.ch.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 10.5, y + 13.5, 63, 63);
    // HP segments
    pixelText(r, 'HP', x + 96, y + 21, 3, { color: C.sub });
    const n = p.maxHp, segW = n === 4 ? 48 : 66;
    const col = p.hp >= 3 ? C.hpOk : p.hp === 2 ? C.hpCaution : C.hpDanger;
    for (let i = 0; i < n; i++) {
      const sx2 = x + 132 + i * (segW + 3);
      ctx.fillStyle = C.empty;
      ctx.fillRect(sx2, y + 21, segW, 15);
      if (i < p.hp) {
        const blink = danger && Math.floor(this.t * 4) % 2 === 0;
        ctx.fillStyle = blink ? '#FF8A6A' : col;
        ctx.fillRect(sx2, y + 21, segW, 15);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(sx2, y + 21, segW, 2);
      }
    }
    // lives + bombs
    ctx.fillStyle = w.ch.color;
    sigil(ctx, w.ch.sigil, x + 108, y + 66, 10, w.ch.color);
    pixelText(r, 'x' + String(Math.max(0, p.lives)).padStart(2, '0'), x + 124, y + 57, 3, { color: C.ivory });
    const pingBomb = w.pings.bomb !== undefined && w.t - w.pings.bomb < 0.4;
    ctx.save();
    ctx.translate(x + 210, y + 66);
    if (pingBomb) ctx.translate(Math.sin(this.t * 70) * 3, 0);
    ctx.fillStyle = p.bombs > 0 ? C.blood : '#4A4650';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(8, -3); ctx.lineTo(5, 10); ctx.lineTo(-5, 10); ctx.lineTo(-8, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.bombs > 0 ? '#FF8A6A' : '#6A6670';
    ctx.fillRect(-1, -6, 2, 10);
    ctx.restore();
    if (p.bombLocked && !p.dead && w.boss) {
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 210, y + 66, 13, 0, TAU);
      ctx.moveTo(x + 201, y + 75);
      ctx.lineTo(x + 219, y + 57);
      ctx.stroke();
    }
    pixelText(r, 'x' + String(p.bombs).padStart(2, '0'), x + 226, y + 57, 3, { color: p.bombs > 0 ? C.ivory : C.sub });
    ctx.restore();
  }

  private drawScore(x: number, y: number, alpha: number) {
    if (alpha <= 0.01) return;
    const r = G.r, ctx = r.ctx, w = this.w, p = w.player;
    ctx.save();
    ctx.globalAlpha = alpha;
    panel(r, x, y, 300, 96, { alpha: 0.78 });
    // row 1: score (label left, 9 fixed-width digits right)
    pixelText(r, 'SCORE', x + 12, y + 12, 3, { color: C.sub });
    const rolling = this.shownScore < w.score;
    pixelText(r, String(Math.min(999999999, Math.round(this.shownScore))).padStart(9, '0'), x + 288, y + 12, 3, { align: 'right', color: rolling ? C.goldLight : C.ivory });
    // row 2: power level + P progress pips
    pixelText(r, 'POWER LV.' + (p.level >= 3 ? 'MAX' : p.level), x + 12, y + 42, 3, { color: C.ivory });
    for (let i = 0; i < 4; i++) {
      const lit = p.level >= 3 ? true : i < p.pp % 4;
      ctx.fillStyle = lit ? C.gold : C.empty;
      ctx.fillRect(x + 216 + i * 18, y + 46, 12, 12);
    }
    // row 3: chain + chain timer line (multiplier replaces the line from Chain 10)
    const chainCol = w.chain >= 10 ? C.gold : C.ivory;
    pixelText(r, 'CHAIN x' + w.chain, x + 12, y + 70, 3, { color: w.chain ? chainCol : C.sub });
    if (w.chain >= 10) pixelText(r, 'x' + w.chainMul.toFixed(1), x + 288, y + 70, 3, { align: 'right', color: C.gold });
    else {
      ctx.fillStyle = C.empty;
      ctx.fillRect(x + 198, y + 78, 90, 3);
      ctx.fillStyle = C.cyan;
      ctx.fillRect(x + 198, y + 78, 90 * clamp(w.chainT / 2, 0, 1), 3);
    }
    ctx.restore();
  }

  private drawStageLabel(vis: number) {
    const r = G.r, ctx = r.ctx;
    ctx.save();
    ctx.globalAlpha = 0.7 * vis;
    const sec = this.w.director?.section;
    void sec;
    text(r, 'STAGE 1  ·  ASHEN OUTSKIRTS', 960, 36, { size: 21, font: 'display', weight: 600, align: 'center', spacing: 3, color: C.ivory });
    ctx.fillStyle = C.gold;
    ctx.fillRect(660, 46, 48, 1);
    ctx.fillRect(1212, 46, 48, 1);
    ctx.restore();
  }

  private drawMidbossBar(vis: number) {
    const r = G.r, ctx = r.ctx, mb = this.w.midboss!;
    ctx.save();
    ctx.globalAlpha = vis;
    text(r, 'GRAVEKEEPER GRAVEN', 960, 26, { size: 18, font: 'display', weight: 700, align: 'center', spacing: 2, color: C.ivory });
    ctx.fillStyle = 'rgba(17,18,23,0.8)';
    ctx.fillRect(700, 50, 520, 12);
    ctx.fillStyle = C.gold;
    ctx.fillRect(702, 52, 516 * clamp(mb.hp / mb.maxHp, 0, 1), 8);
    const left = Math.max(0, mb.timeLimit - mb.fightT);
    pixelText(r, String(Math.ceil(left)).padStart(2, '0'), 1236, 48, 2.4, { color: left < 10 ? C.warn : C.sub });
    ctx.restore();
  }

  private drawCharge() {
    const r = G.r, ctx = r.ctx, p = this.w.player;
    const x = 810, y = 1014;
    const active = p.charging || p.chargeCool > 0;
    const usable = !p.dead && this.w.bombT <= 0;
    ctx.save();
    ctx.globalAlpha = !usable ? 0.3 : active ? 1 : 0.55;
    panel(r, x, y, 300, 42, { alpha: 0.7 });
    sigil(ctx, this.w.ch.sigil, x + 22, y + 21, 10, this.w.ch.color, this.t);
    const bx = x + 48, by = y + 12, bw = 240, bh = 18;
    ctx.fillStyle = C.empty;
    ctx.fillRect(bx, by, bw, bh);
    if (p.chargeCool > 0) {
      ctx.fillStyle = '#4A4650';
      ctx.fillRect(bx, by, bw * (1 - p.chargeCool / 0.8), bh);
    } else if (p.charging) {
      const f = clamp(p.chargeT / CHARGE_L2, 0, 1);
      const lvl = f < 0.3 ? 0.6 : f < 0.7 ? 0.8 : 1;
      ctx.fillStyle = rgba(this.w.ch.color, lvl);
      ctx.fillRect(bx, by, bw * f, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(bx, by, bw * f, 3);
      if (p.chargeT >= CHARGE_L2 && Math.floor(this.t * 8) % 2 === 0) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 2 + Math.sin(this.t * 60) * 2, by - 2, bw + 4, bh + 4);
      }
    }
    // Lv1 notch at 50%
    const notchLit = p.charging && p.chargeT >= CHARGE_L1;
    ctx.fillStyle = notchLit ? '#FFFFFF' : C.gold;
    ctx.fillRect(bx + bw / 2 - 1, by - 3, 2, bh + 6);
    ctx.restore();
  }

  private drawBossBlock() {
    const r = G.r, ctx = r.ctx, b = this.w.boss!;
    const t = this.bossBarT;
    if (!b.visible) return;
    const slide = clamp(t / 0.3, 0, 1);
    ctx.save();
    ctx.translate(0, -60 * (1 - ease.outCubic(slide)));
    ctx.globalAlpha = slide;
    text(r, 'BOSS : BELLKEEPER ABADDON', 80, 24, { size: 24, font: 'display', weight: 700, spacing: 2, color: C.ivory });
    text(r, '·  Guardian of the Silenced Toll', 520, 29, { size: 18, font: 'display', color: C.sub });
    const phaseStr = `PHASE ${Math.min(3, b.phaseIndex + 1)} / 3`;
    text(r, phaseStr, 1840, 27, { size: 21, font: 'display', weight: 700, align: 'right', spacing: 2, color: C.ivory });
    // frame
    const fx = 80, fy = 51, fw = 1760, fh = 27;
    ctx.fillStyle = 'rgba(11,11,15,0.85)';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.lineWidth = 3;
    ctx.strokeStyle = b.wrath ? C.blood : C.frame;
    ctx.strokeRect(fx + 1.5, fy + 1.5, fw - 3, fh - 3);
    ctx.fillStyle = b.wrath ? C.blood : C.gold;
    cross(ctx, fx - 14, fy + 13, 12);
    cross(ctx, fx + fw + 14, fy + 13, 12);
    // bar
    const bx = 86, by = 54, bw = 1748, bh = 21;
    const fill = this.w.boss!.hud.barFill < 1 ? this.w.boss!.hud.barFill : b.hpFrac;
    const col = b.phaseIndex === 0 ? '#7B5CC7' : b.phaseIndex === 1 ? '#97305A' : '#B3263B';
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, bw * fill, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx, by, bw * fill, 3);
    // invulnerable hatch
    if (b.state === 'transition' || b.state === 'intro') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, bw * fill, bh);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 3;
      for (let i = -30; i < bw; i += 18) {
        ctx.beginPath();
        ctx.moveTo(bx + i, by + bh);
        ctx.lineTo(bx + i + 20, by);
        ctx.stroke();
      }
      ctx.restore();
    }
    // phase markers (runes) at 65% and 30%
    for (const [i, m] of [[0, 0.65], [1, 0.3]] as [number, number][]) {
      const mx = bx + bw * m;
      const broken = b.phaseIndex > i;
      ctx.fillStyle = broken ? 'rgba(185,179,170,0.3)' : C.gold;
      ctx.fillRect(mx - 1, by - 4, 3, bh + 8);
      if (!broken) {
        ctx.save();
        ctx.translate(mx + 0.5, by - 8);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }
    if (b.wrath) {
      const a = 0.6 + 0.4 * Math.sin(this.t * 8);
      ctx.globalAlpha = a;
      text(r, 'WRATH', 1840, 86, { size: 18, font: 'display', weight: 700, align: 'right', color: C.warn, glow: C.blood, glowBlur: 10 });
      ctx.globalAlpha = 1;
    }
    if (this.timeover) text(r, 'TIME OVER — 보너스 없음', 1840, 86, { size: 18, align: 'right', color: C.sub });
    ctx.restore();
  }

  private fadeIO(v: Timed<unknown>, inT = 0.2, outT = 0.2) {
    return Math.min(1, v.t / inT, (v.dur - v.t) / outT);
  }

  private drawCaptions() {
    const r = G.r, ctx = r.ctx;
    if (this.titleCard) {
      const a = this.fadeIO(this.titleCard, 0.4, 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(5,5,8,0.5)';
      ctx.fillRect(0, 400, 1920, 230);
      ctx.fillStyle = C.gold;
      ctx.fillRect(560, 404, 800, 1);
      ctx.fillRect(560, 625, 800, 1);
      text(r, 'STAGE 1', 960, 430, { size: 24, font: 'display', weight: 700, align: 'center', spacing: 10, color: C.gold });
      text(r, 'ASHEN OUTSKIRTS', 960, 470, { size: 72, font: 'display', weight: 700, align: 'center', spacing: 6, color: C.ivory, glow: 'rgba(216,179,94,0.5)', glowBlur: 16 });
      text(r, '재의 변두리', 960, 566, { size: 30, font: 'serif', weight: 600, align: 'center', spacing: 8, color: C.sub });
      ctx.restore();
    }
    if (this.caption) {
      const a = this.fadeIO(this.caption, 0.3, 0.3);
      ctx.save();
      ctx.globalAlpha = a;
      text(r, `—  ${this.caption.data.en}  —`, 960, 840, { size: 24, font: 'display', weight: 600, align: 'center', spacing: 4, color: C.ivory, glow: 'rgba(0,0,0,0.9)', glowBlur: 8 });
      text(r, this.caption.data.kr, 960, 876, { size: 18, font: 'serif', align: 'center', spacing: 4, color: C.sub, glow: 'rgba(0,0,0,0.9)', glowBlur: 8 });
      ctx.restore();
    }
    if (this.line) {
      const a = this.fadeIO(this.line, 0.5, 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      text(r, this.line.data.kr, 960, 760, { size: 30, font: 'serif', weight: 600, align: 'center', color: C.ivory, glow: 'rgba(0,0,0,1)', glowBlur: 12 });
      ctx.restore();
    }
    if (this.tip) {
      const a = this.fadeIO(this.tip);
      ctx.save();
      ctx.globalAlpha = a;
      panel(r, 660, 948, 600, 48, { alpha: 0.85, accent: C.gold });
      const kw = keyHint(r, 690, 957, this.tip.data.key, '');
      void kw;
      text(r, this.tip.data.text, 790, 972, { size: 24, baseline: 'middle', color: C.ivory });
      ctx.restore();
    }
    if (this.phaseCap) {
      const a = this.fadeIO(this.phaseCap);
      ctx.save();
      ctx.globalAlpha = a;
      const n = this.w.boss ? this.w.boss.phaseIndex + (this.w.boss.state === 'transition' ? 2 : 1) : 1;
      text(r, `PHASE ${Math.min(3, n)}  ·  ${this.phaseCap.data.en}`, 960, 112, { size: 30, font: 'display', weight: 700, align: 'center', spacing: 3, color: C.gold, glow: 'rgba(0,0,0,0.9)', glowBlur: 10 });
      text(r, this.phaseCap.data.kr, 960, 150, { size: 21, font: 'serif', align: 'center', color: C.ivory, glow: 'rgba(0,0,0,0.9)', glowBlur: 10 });
      ctx.restore();
    }
    if (this.wrathCap) {
      const a = this.fadeIO(this.wrathCap);
      ctx.save();
      ctx.globalAlpha = a;
      text(r, 'THE TOLL GROWS WRATHFUL', 960, 200, { size: 30, font: 'display', weight: 700, align: 'center', spacing: 4, color: C.warn, glow: C.blood, glowBlur: 14 });
      text(r, '종이 분노한다', 960, 240, { size: 21, font: 'serif', align: 'center', color: C.ivory });
      ctx.restore();
    }
  }

  private drawWarning() {
    const wv = this.warning;
    if (!wv) return;
    const r = G.r, ctx = r.ctx;
    const t = wv.t, boss = wv.data.boss;
    const end = wv.dur;
    const reduce = G.save.settings.flashReduce;
    ctx.save();
    // dim the field to 70% (player stays visible)
    const dimA = Math.min(0.55, t / 0.2) * Math.min(1, (end + 0.3 - t) / 0.3);
    ctx.fillStyle = `rgba(5,5,8,${dimA})`;
    ctx.fillRect(0, 0, 1920, 1080);
    // red scan sweep (boss only)
    if (boss && t < 0.3) {
      const y = (t / 0.3) * 1080;
      ctx.fillStyle = `rgba(179,38,59,${reduce ? 0.1 : 0.2})`;
      ctx.fillRect(0, 0, 1920, y);
    }
    const accent = boss ? C.blood : C.gold;
    // band open / close
    const open = boss ? clamp((t - 0.3) / 0.25, 0, 1) : clamp(t / 0.2, 0, 1);
    const close = clamp((end - t) / 0.3, 0, 1);
    const bh = (boss ? 216 : 150) * ease.outCubic(open) * close;
    const cy = 540;
    if (bh > 1) {
      ctx.fillStyle = boss ? 'rgba(26,10,14,0.85)' : 'rgba(30,22,10,0.85)';
      ctx.fillRect(0, cy - bh / 2, 1920, bh);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let y = cy - bh / 2; y < cy + bh / 2; y += 4) ctx.fillRect(0, y, 1920, 1);
      ctx.fillStyle = accent;
      ctx.fillRect(0, cy - bh / 2, 1920, 2);
      ctx.fillRect(0, cy + bh / 2 - 2, 1920, 2);
      // bell waveform lines (pulse at each toll)
      const tolls = boss ? [0.5, 1.5, 2.5] : [0.2];
      let amp = 4;
      for (const tt of tolls) if (t > tt) amp = Math.max(amp, 30 * Math.exp(-(t - tt) * 3));
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        for (let x = 0; x <= 520; x += 6) {
          const px = side < 0 ? x : 1920 - x;
          const py = cy + Math.sin(x * 0.06 - t * 10) * amp * (1 - x / 600);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // gothic crosses at both ends
      ctx.fillStyle = accent;
      cross(ctx, 230, cy, 40 * Math.min(1, bh / 120));
      cross(ctx, 1690, cy, 40 * Math.min(1, bh / 120));
      // boss silhouette passing behind
      if (boss && t > 0.6 && t < 2.7) {
        const k = (t - 0.6) / 2.1;
        ctx.globalAlpha = 0.35;
        ctx.imageSmoothingEnabled = false;
        const sil = ART.boss.body;
        ctx.filter = 'brightness(0)';
        ctx.drawImage(sil, 1500 - k * 1400, cy - 300, 600, 660);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }
      // WARNING letters, 40 ms apart
      const word = boss ? 'WARNING' : 'CAUTION';
      const letters = word.split('');
      const size = boss ? 120 : 84;
      ctx.font = `700 ${size}px ${'"Cinzel", serif'}`;
      const spacing = boss ? 36 : 24;
      const widths = letters.map((l) => ctx.measureText(l).width);
      const total = widths.reduce((a, b) => a + b, 0) + spacing * (letters.length - 1);
      let lx = 960 - total / 2;
      const ly = cy - (boss ? 36 : 26);
      const start = boss ? 0.55 : 0.1;
      letters.forEach((l, i) => {
        const lt = t - start - i * 0.04;
        if (lt > 0) {
          const a = Math.min(1, lt / 0.12) * close;
          const jit = boss && !reduce && lt < 0.3 ? (Math.random() - 0.5) * 4 : 0;
          ctx.globalAlpha = a;
          if (boss && !reduce) {
            ctx.fillStyle = 'rgba(255,60,80,0.5)';
            ctx.fillText(l, lx + 2 + jit, ly + size * 0.35);
          }
          text(r, l, lx + jit, ly - size * 0.45, { size, font: 'display', weight: 700, color: '#F3E6C4', glow: boss ? '#FF3A50' : '#FFD47A', glowBlur: 22 });
        }
        lx += widths[i] + spacing;
      });
      ctx.globalAlpha = close;
      // boss name typing
      const nameT = t - (boss ? 0.9 : 0.4);
      if (nameT > 0) {
        const n = Math.floor(clamp(nameT / 0.6, 0, 1) * wv.data.name.length);
        const yy = cy + bh / 2 + 18;
        text(r, wv.data.name.slice(0, n), 960, yy, { size: boss ? 48 : 36, font: 'display', weight: 700, align: 'center', spacing: 4, color: C.ivory, glow: 'rgba(0,0,0,1)', glowBlur: 10 });
        const epA = clamp((t - (boss ? 1.2 : 0.6)) / 0.3, 0, 1) * close;
        ctx.globalAlpha = epA;
        text(r, wv.data.kr, 960, yy + (boss ? 62 : 48), { size: boss ? 30 : 24, font: 'serif', weight: 600, align: 'center', color: C.warn, glow: 'rgba(0,0,0,1)', glowBlur: 8 });
        text(r, wv.data.epithet, 960, yy + (boss ? 104 : 82), { size: 21, font: 'display', align: 'center', color: C.sub });
      }
    }
    ctx.restore();
  }

  private drawCut() {
    const c = this.cut;
    if (!c) return;
    const r = G.r, ctx = r.ctx;
    const t = c.t;
    const inK = ease.outCubic(clamp(t / 0.15, 0, 1));
    const outK = clamp((t - 0.5) / 0.15, 0, 1);
    const x = -1920 * (1 - inK) + 1920 * outK;
    const ch = this.w.ch;
    ctx.save();
    ctx.translate(x, 0);
    ctx.transform(1, -0.12, 0, 1, 0, 120);
    ctx.fillStyle = rgba(C.charcoal, 0.92);
    ctx.fillRect(0, 330, 1920, 180);
    ctx.fillStyle = ch.color;
    ctx.fillRect(0, 330, 1920, 4);
    ctx.fillRect(0, 506, 1920, 4);
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 334, 1920, 172);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.beginPath();
    ctx.rect(200, 334, 520, 172);
    ctx.clip();
    ctx.drawImage(ART.heroBig[ch.id], 50, 10, 112, 70, 180, 220, 560, 350);
    ctx.restore();
    text(r, ch.bombEn, 820, 372, { size: 48, font: 'display', weight: 700, spacing: 6, color: C.ivory, glow: ch.color, glowBlur: 16 });
    text(r, ch.bomb, 824, 440, { size: 30, font: 'serif', weight: 600, spacing: 6, color: ch.color });
    ctx.restore();
  }
}
