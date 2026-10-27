import { Renderer } from '../gfx/renderer';
import { fade, inkWipe } from '../gfx/ui';
import { Audio } from '../audio/audio';
import { Input } from './input';
import { Save } from './save';

export interface Scene {
  enter?(data?: unknown): void;
  exit?(): void;
  update(dt: number): void;
  render(): void;
  /** Called when the browser tab is hidden (auto-pause). */
  onHide?(): void;
}

type TransitionKind = 'fade' | 'ink' | 'none';

class SceneManager {
  current: Scene | null = null;
  private pending: { scene: Scene; data?: unknown } | null = null;
  private phase: 'idle' | 'out' | 'in' = 'idle';
  private t = 0;
  private kind: TransitionKind = 'fade';
  private dur = 0.3;

  get busy() {
    return this.phase !== 'idle';
  }

  go(scene: Scene, data?: unknown, kind: TransitionKind = 'fade') {
    if (this.phase === 'out') return;
    this.pending = { scene, data };
    this.kind = kind;
    this.dur = kind === 'ink' ? 0.5 : 0.3;
    if (!this.current || kind === 'none') {
      this.swap();
      this.phase = 'idle';
      return;
    }
    this.phase = 'out';
    this.t = 0;
  }

  private swap() {
    this.current?.exit?.();
    const p = this.pending!;
    this.pending = null;
    this.current = p.scene;
    this.current.enter?.(p.data);
  }

  update(dt: number) {
    if (this.phase === 'out') {
      this.t += dt;
      if (this.t >= this.dur) {
        this.swap();
        this.phase = 'in';
        this.t = 0;
      }
      return; // freeze the outgoing scene while it is covered
    }
    if (this.phase === 'in') {
      this.t += dt;
      if (this.t >= this.dur) this.phase = 'idle';
    }
    this.current?.update(dt);
  }

  render() {
    this.current?.render();
    if (this.phase === 'idle') return;
    const p = this.phase === 'out' ? this.t / this.dur : 1 - this.t / this.dur;
    G.r.uiTransform();
    if (this.kind === 'ink') inkWipe(G.r, Math.min(1, p * 1.05));
    else fade(G.r, p);
  }
}

class App {
  r!: Renderer;
  input = new Input();
  save = new Save();
  audio = new Audio();
  scenes = new SceneManager();
  /** Seconds since boot (UI clock, never paused). */
  time = 0;
  init(canvas: HTMLCanvasElement) {
    this.r = new Renderer(canvas);
    this.applySettings();
    this.input.attach(window);
  }
  applySettings() {
    const s = this.save.settings;
    this.input.bindings = { ...s.bindings };
    if (this.r && this.r.integerPref !== s.integerScale) {
      this.r.integerPref = s.integerScale;
      this.r.resize();
    }
    this.audio.setVolumes(s.bgm / 100, s.sfx / 100);
  }
}

export const G = new App();
