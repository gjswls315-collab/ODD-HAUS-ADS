import { G } from '../core/app';
import { DEG, Rng } from '../core/math';
import { Section } from '../gfx/art/backdrop';
import { Abaddon } from './boss';
import { Enemy, EnemyOpts, Group } from './enemies';
import { Debris, Lightning } from './hazards';
import { ItemKind } from './items';
import { Graven } from './midboss';
import type { World } from './world';

// Stage 1 timeline (docs/05 §9-2). TL stops while the midboss is alive; times are TL seconds.

interface Ev {
  t: number;
  id: string;
  run: () => void;
  done?: boolean;
}

export class Director {
  tl = 0;
  private events: Ev[] = [];
  private speedTarget = 48;
  private speedRate = 10;
  section: Section = 'A';
  bossStarted = false;
  private rng = new Rng(1027);

  constructor(private w: World, startAt = 0) {
    this.build();
    if (startAt > 0) this.skipTo(startAt);
  }

  private group(id: string, drop?: ItemKind, dropS?: number): Group {
    return { id, total: 0, killed: 0, escaped: 0, drop, dropS, bonus: true, lastX: 0, lastY: 0 };
  }
  private add(kind: Enemy['kind'], o: EnemyOpts) {
    const e = new Enemy(this.w, kind, o);
    this.w.enemies.push(e);
    return e;
  }

  // ---- formation helpers (docs/05 §5-3) ----
  private snake(n: number, y: number, fires: boolean, group?: Group, phase = 0, delay = 0) {
    for (let i = 0; i < n; i++) this.add('bat', { x: 672, y, move: 'snake', fires, group, phase, delay: delay + i * 0.3 });
  }
  private v5(y: number, group: Group) {
    const pts = [[0, 0], [24, -20], [24, 20], [48, -40], [48, 40]];
    pts.forEach(([dx, dy], i) => this.add('bat', { x: 672 + dx, y: y + dy, move: 'snake', amp: 6, period: 2, fires: i === 0, group }));
  }
  private col(ys: number[], x = 672, group?: Group) {
    for (const y of ys) this.add('candle', { x, y, group });
  }
  private dive4() {
    for (let i = 0; i < 4; i++) this.add('bat', { x: 560 + i * 18, y: -24, move: 'dive', fires: true, delay: i * 0.4 });
  }
  private skeleton(stopX: number, y: number, variant?: string, delay = 0) {
    this.add('skeleton', { x: 672, y, stopX, stopY: y, variant, dropS: 3, delay });
  }
  private cleric(top: boolean, o: Partial<EnemyOpts> = {}) {
    this.add('cleric', { x: 600, y: top ? -40 : 400, stopX: 500, stopY: top ? 110 : 250, fromTop: top, ...o });
  }
  private lightning(x: number) {
    this.w.hazards.push(new Lightning(this.w, x, 1.0, 0.25, 24, true));
  }
  private tip(id: string, text: string, key: string) {
    if (G.save.flags.tipsDone[id]) return;
    this.w.ui.push({ type: 'tip', id, text, key });
  }
  private speed(target: number, overSeconds: number) {
    this.speedTarget = target;
    this.speedRate = Math.abs(target - this.w.scrollSpeed) / Math.max(0.1, overSeconds);
  }
  private setSection(s: Section) {
    this.section = s;
    if (this.w.bg) this.w.bg.section = s;
  }

  private build() {
    const w = this.w;
    const E = (t: number, id: string, run: () => void) => this.events.push({ t, id, run });
    // ----- A: Ashen Cemetery -----
    E(0.0, 'start', () => {
      G.audio.music('stage');
      G.audio.musicFilter(18000, 0.2);
    });
    E(0.5, 'title', () => w.ui.push({ type: 'title' }));
    E(3.0, 'W01', () => this.snake(5, 120, false));
    E(3.6, 'capA', () => w.ui.push({ type: 'caption', en: 'ASHEN CEMETERY', kr: '잿빛 묘역' }));
    E(7.0, 'W02', () => this.snake(5, 240, false, undefined, Math.PI));
    E(11.5, 'W03', () => this.v5(180, this.group('W03', 'P')));
    E(18.0, 'W04', () => this.col([120, 180, 240]));
    E(24.0, 'W05', () => this.dive4());
    E(29.0, 'W06', () => {
      this.col([90, 150, 210]);
      this.snake(4, 300, true);
    });
    E(36.0, 'W07', () => {
      this.snake(4, 110, true, this.group('W07a', undefined, 5));
      this.snake(4, 250, true, this.group('W07b', undefined, 5), 1);
    });
    E(42.0, 'W08', () => {
      const gr = this.group('W08', 'P');
      [[80, 40], [130, 15], [180, 0], [230, 15], [280, 40]].forEach(([y, dx]) => this.add('candle', { x: 672 + dx, y, group: gr }));
    });
    // ----- B: Broken Causeway -----
    E(50.0, 'B', () => {
      this.setSection('B');
      this.speed(54, 2);
      w.ui.push({ type: 'caption', en: 'BROKEN CAUSEWAY', kr: '무너진 석교' });
    });
    E(52.0, 'W09', () => {
      this.skeleton(520, 180);
      this.snake(4, 80, false, undefined, 0, 1.0);
      this.tip('charge', 'SPACE를 길게 눌렀다 떼면 차지샷', 'SPACE');
    });
    E(59.0, 'W10', () => {
      this.skeleton(520, 110);
      this.skeleton(540, 250, undefined, 0.8);
    });
    E(66.0, 'W11a', () => this.lightning(380));
    E(68.5, 'W11b', () => this.lightning(300));
    E(70.0, 'W12', () => this.cleric(true, { drop: 'P' }));
    E(77.0, 'W13', () => {
      this.cleric(false, { dropS: 3 });
      this.col([100, 160, 220]);
    });
    E(85.0, 'W14', () => {
      this.add('sentinel', { x: 700, y: 200, stopX: 500, drop: 'B' });
      this.tip('shield', '방패는 차지샷으로 관통한다', 'SPACE');
    });
    E(88.0, 'W14b', () => this.snake(4, 80, true));
    E(98.0, 'W15', () => {
      this.skeleton(520, 90);
      this.skeleton(520, 270);
      this.v5(180, this.group('W15', undefined, 5));
    });
    E(100.0, 'W15L1', () => this.lightning(420));
    E(102.0, 'W15L2', () => this.lightning(260));
    E(107.0, 'W16', () => {
      this.cleric(true, { drop: 'P' });
      this.cleric(false, { dropS: 3 });
    });
    // ----- C: Veil of Black Fog -----
    E(115.0, 'C', () => {
      this.setSection('C');
      this.speed(36, 2);
      w.fog.on = true;
      w.fog.radius = 150;
      w.bg?.setFog(0.75);
      G.audio.musicFilter(700, 2);
      w.ui.push({ type: 'caption', en: 'VEIL OF BLACK FOG', kr: '검은 장막' });
    });
    E(118.0, 'W17', () => {
      const gr = this.group('W17', undefined, 3);
      this.col([100, 180, 260], 672, gr);
      this.col([140, 220, 300], 712, gr);
    });
    E(125.0, 'W18', () => {
      w.fog.radius = 120;
      this.skeleton(520, 120, 'radial');
      this.skeleton(520, 240, 'radial');
      this.snake(5, 180, true);
    });
    E(132.0, 'W19', () => {
      w.ui.push({ type: 'warning', boss: false, name: 'GRAVEKEEPER GRAVEN', kr: '묘지기 그레이븐', epithet: 'Warden of the Coffin Road' });
      G.audio.sfx('sting');
    });
    E(134.0, 'W20', () => {
      w.midboss = new Graven(w);
    });
    E(136.0, 'W21', () => {
      this.cleric(true, {
        onKill: (e) => {
          if (w.player.hp < w.player.maxHp) w.items.spawn('H', e.x, e.y);
          else w.items.scatter('S', 5, e.x, e.y);
        },
      });
      this.col([140, 200, 260]);
      this.snake(4, 300, true);
    });
    // ----- Rest -----
    E(145.0, 'R', () => {
      this.setSection('R');
      w.fog.on = false;
      w.bg?.setFog(0.2);
      G.audio.musicFilter(18000, 1);
      G.audio.stopMusic(3);
      if (w.bg) w.bg.belfryX = 700;
      w.ui.push({ type: 'line', kr: '종은 멈췄고, 죽은 자는 잠들지 못했다.' });
    });
    const debris = (x: number) => {
      const d = new Debris(w, x);
      w.hazards.push(d);
      w.extraTargets.push(d);
    };
    E(147.0, 'L2a', () => debris(300));
    E(147.6, 'L2b', () => debris(420));
    E(148.2, 'L2c', () => debris(540));
    E(153.0, 'W22', () => {
      for (let i = 0; i < 10; i++) this.add('bat', { x: 672, y: this.rng.range(40, 320), move: 'flee', speed: this.rng.range(180, 220), phase: i, delay: i * 0.15 });
    });
    E(160.0, 'L3', () => {
      this.speed(8, 5);
      this.setSection('D');
      w.ui.push({ type: 'caption', en: 'SILENCED BELFRY', kr: '침묵의 종루' });
    });
    E(165.0, 'BOSS', () => {
      this.bossStarted = true;
      this.speed(0, 8);
      w.boss = new Abaddon(w);
    });
    this.events.sort((a, b) => a.t - b.t);
  }

  /** Debug/test: jump the timeline (skips spawns before t, applies section state). */
  skipTo(t: number) {
    for (const e of this.events) {
      if (e.t >= t) break;
      if (['start', 'B', 'C', 'R', 'L3', 'BOSS'].includes(e.id) || e.id === 'W18') {
        if (e.id === 'W18') {
          this.w.fog.radius = 120;
        } else e.run();
      }
      e.done = true;
    }
    this.w.enemies.length = 0;
    this.w.ui.length = 0;
    this.tl = t;
    this.w.scrollSpeed = this.speedTarget;
  }

  update(dt: number) {
    const w = this.w;
    if (!w.midboss) this.tl += dt;
    for (const e of this.events) {
      if (e.done) continue;
      if (e.t > this.tl) break;
      e.done = true;
      e.run();
    }
    const s = w.scrollSpeed;
    if (s !== this.speedTarget) {
      const step = this.speedRate * dt;
      w.scrollSpeed = Math.abs(this.speedTarget - s) <= step ? this.speedTarget : s + Math.sign(this.speedTarget - s) * step;
    }
    void DEG;
  }
}
