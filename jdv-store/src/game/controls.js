// First-person input: pointer lock (with a drag-to-look fallback when the page
// can't lock the mouse), WASD/arrows, Shift, E, M, and simple touch controls.

export class Controls {
  constructor(dom) {
    this.dom = dom;
    this.yaw = 0; this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.dragMode = false;
    this.active = false; // accepting look/move input
    this.sens = 0.0022;
    this.look = null; // optional override (inspect mode) receives (dx, dy)
    this.handlers = {};
    this.touch = { move: null, look: null, mx: 0, mz: 0 };
    this.dragging = false;

    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === this.dom;
      if (this.locked) {
        clearTimeout(this._lockTimer);
        if (this.dragMode) { this.dragMode = false; this.emit("lockmode"); } // lock arrived late: prefer it
        this.active = true; this.emit("resume");
      }
      else if (!this.dragMode) { this.active = false; this.keys.clear(); this.emit("pause"); }
    });
    document.addEventListener("pointerlockerror", () => this.enableDrag());
    document.addEventListener("mousemove", (e) => {
      if (!this.active) return;
      if (this.locked) this.turn(e.movementX, e.movementY);
      else if (this.dragMode && this.dragging) this.turn(e.movementX, e.movementY);
    });
    dom.addEventListener("mousedown", (e) => { if (this.dragMode && this.active) { this.dragging = true; e.preventDefault(); } });
    window.addEventListener("mouseup", () => { this.dragging = false; });
    window.addEventListener("keydown", (e) => this.onKey(e, true));
    window.addEventListener("keyup", (e) => this.onKey(e, false));
    window.addEventListener("blur", () => this.keys.clear());
    this.setupTouch();
  }
  on(name, fn) { this.handlers[name] = fn; }
  emit(name, ...a) { this.handlers[name]?.(...a); }

  turn(dx, dy) {
    if (Math.abs(dx) > 300 || Math.abs(dy) > 300) return; // browser glitch on lock
    if (this.look) { this.look(dx, dy); return; }
    this.yaw -= dx * this.sens;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * this.sens));
  }

  /** Try to capture the mouse. Falls back to drag-to-look if the frame refuses. */
  start() {
    if (this.dragMode || this.isTouch) { this.active = true; this.emit("resume"); return; }
    let p;
    try { p = this.dom.requestPointerLock({ unadjustedMovement: true }); }
    catch { try { p = this.dom.requestPointerLock(); } catch { this.enableDrag(); return; } }
    if (p && p.catch) p.catch(() => {
      try {
        const p2 = this.dom.requestPointerLock();
        if (p2 && p2.catch) p2.catch(() => this.enableDrag());
      } catch { this.enableDrag(); }
    });
    // some embedded frames neither lock nor error: fall back after a moment
    clearTimeout(this._lockTimer);
    this._lockTimer = setTimeout(() => { if (!document.pointerLockElement && !this.active) this.enableDrag(); }, 1600);
  }
  enableDrag() {
    if (this.dragMode || document.pointerLockElement === this.dom) return; // a late rejection after a successful lock
    this.dragMode = true; this.active = true;
    this.emit("dragmode");
    this.emit("resume");
  }
  pause() {
    if (this.locked) document.exitPointerLock();
    else { this.active = false; this.keys.clear(); this.emit("pause"); }
  }

  onKey(e, down) {
    const k = e.code;
    if (down && (k === "Tab")) e.preventDefault();
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(k)) {
      if (down && this.active) this.keys.add(k); else this.keys.delete(k);
      if (this.active && k.startsWith("Arrow")) e.preventDefault();
      return;
    }
    if (!down || e.repeat) return;
    if (k === "KeyE") this.emit("interact");
    else if (k === "KeyM") this.emit("map");
    else if (k === "Escape" && this.dragMode && this.active) this.pause();
  }

  /** Movement intent in camera space: {x: strafe, z: forward, fast} */
  intent() {
    const K = this.keys;
    let f = (K.has("KeyW") || K.has("ArrowUp") ? 1 : 0) - (K.has("KeyS") || K.has("ArrowDown") ? 1 : 0);
    let s = (K.has("KeyD") || K.has("ArrowRight") ? 1 : 0) - (K.has("KeyA") || K.has("ArrowLeft") ? 1 : 0);
    if (this.touch.move) { f += -this.touch.mz; s += this.touch.mx; }
    return { x: Math.max(-1, Math.min(1, s)), z: Math.max(-1, Math.min(1, f)), fast: K.has("ShiftLeft") || K.has("ShiftRight") };
  }

  setupTouch() {
    this.isTouch = matchMedia("(pointer: coarse)").matches && !matchMedia("(pointer: fine)").matches;
    const el = this.dom;
    el.addEventListener("touchstart", (e) => {
      if (!this.active) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && !this.touch.move) this.touch.move = { id: t.identifier, x: t.clientX, y: t.clientY };
        else if (!this.touch.look) this.touch.look = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
      e.preventDefault();
    }, { passive: false });
    el.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        const m = this.touch.move, l = this.touch.look;
        if (m && t.identifier === m.id) {
          this.touch.mx = Math.max(-1, Math.min(1, (t.clientX - m.x) / 60));
          this.touch.mz = Math.max(-1, Math.min(1, (t.clientY - m.y) / 60));
        } else if (l && t.identifier === l.id) {
          this.turn((t.clientX - l.x) * 1.6, (t.clientY - l.y) * 1.6);
          l.x = t.clientX; l.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (this.touch.move && t.identifier === this.touch.move.id) { this.touch.move = null; this.touch.mx = this.touch.mz = 0; }
        if (this.touch.look && t.identifier === this.touch.look.id) this.touch.look = null;
      }
    };
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
  }
}
