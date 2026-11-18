// HUD and overlays (DOM). The markup lives in index.html.
import { buildColliders, ROOM, TERRACE, GLAZING, F } from "../layout.js";

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      title: $("title"), enter: $("enter"), load: $("load-bar"), loadText: $("load-text"),
      hud: $("hud"), zone: $("zone"), zoneName: $("zone-name"), prompt: $("prompt"), verb: $("prompt-verb"), pname: $("prompt-name"),
      cross: $("cross"), caption: $("caption"), capThumb: $("cap-thumb"), capKicker: $("cap-kicker"), capTitle: $("cap-title"), capMeta: $("cap-meta"),
      toast: $("toast"), tracker: $("tracker"), count: $("count"), slots: $("slots"), hint: $("hint"),
      pause: $("pause"), resume: $("resume"), sound: $("sound"), pauseCount: $("pause-count"),
      inspect: $("inspect-card"), insKind: $("ins-kind"), insTitle: $("ins-title"), insText: $("ins-text"), insList: $("ins-list"),
      map: $("map"), mapCanvas: $("map-canvas"), done: $("done"), touchE: $("touch-e"), touchM: $("touch-m"),
    };
    this.capTimer = 0; this.toastTimer = 0; this.zoneTimer = 0; this.currentZone = "";
    this.colliders = buildColliders();
  }

  progress(k, text) {
    this.el.load.style.transform = `scaleX(${k})`;
    if (text) this.el.loadText.textContent = text;
  }
  ready() {
    this.el.title.classList.add("ready");
    this.progress(1);
    this.el.loadText.textContent = "Ready";
    this.el.enter.disabled = false;
  }
  showTitle(on) { this.el.title.hidden = !on; }
  showHUD(on) { this.el.hud.hidden = !on; }
  showPause(on, found = 0) {
    this.el.pause.hidden = !on;
    this.el.pauseCount.textContent = `${found} of 5`;
  }
  setSound(on) { this.el.sound.textContent = on ? "Sound on" : "Sound off"; this.el.sound.setAttribute("aria-pressed", on ? "true" : "false"); }

  setPrompt(spec) {
    if (!spec) { this.el.prompt.classList.remove("on"); this.el.cross.classList.remove("on"); return; }
    const verb = typeof spec.verb === "function" ? spec.verb() : spec.verb || (spec.inspect ? "Inspect" : "Use");
    this.el.verb.textContent = verb;
    this.el.pname.textContent = spec.name;
    this.el.prompt.classList.add("on");
    this.el.cross.classList.add("on");
  }

  setZone(name) {
    if (name === this.currentZone) return;
    this.currentZone = name;
    this.el.zoneName.textContent = name;
    this.el.zone.classList.remove("flash"); void this.el.zone.offsetWidth; this.el.zone.classList.add("flash");
  }

  /** Record/caption card. meta: {title, artist, year, genre, grade}; cover: atlas index */
  caption(kicker, meta, cover = null) {
    const c = this.el;
    c.capKicker.textContent = kicker || (cover != null ? "In the crate" : "");
    if (meta) {
      c.capTitle.textContent = meta.title;
      c.capMeta.textContent = [meta.artist, meta.year, meta.genre, meta.grade].filter(Boolean).join(" · ");
    } else { c.capTitle.textContent = kicker || ""; c.capMeta.textContent = ""; c.capKicker.textContent = ""; }
    if (cover != null && this.atlas) {
      const g = c.capThumb.getContext("2d");
      g.drawImage(this.atlas, (cover % 8) * 256, Math.floor(cover / 8) * 256, 256, 256, 0, 0, c.capThumb.width, c.capThumb.height);
      c.capThumb.hidden = false;
    } else c.capThumb.hidden = true;
    c.caption.classList.add("on");
    this.capTimer = 6;
  }

  toast(html, swatch) {
    this.el.toast.innerHTML = `<span class="sw" style="background:${swatch}"></span><span>${html}</span>`;
    this.el.toast.classList.add("on");
    this.toastTimer = 4.5;
  }

  setFound(found, variants) {
    this.el.count.textContent = `${found.length}/5`;
    [...this.el.slots.children].forEach((s, i) => {
      const k = variants[i];
      const has = found.includes(k);
      s.classList.toggle("got", has);
      s.style.setProperty("--sw", has ? s.dataset.swatch : "transparent");
    });
  }

  done() {
    this.el.done.hidden = false;
    this.el.done.classList.add("on");
    setTimeout(() => { this.el.done.classList.remove("on"); setTimeout(() => (this.el.done.hidden = true), 800); }, 9000);
  }

  openInspect(spec) {
    const e = this.el;
    e.insKind.textContent = spec.kind || "";
    e.insTitle.textContent = spec.title;
    e.insText.textContent = spec.text || "";
    e.insList.innerHTML = (spec.details || []).map((d) => `<li>${d}</li>`).join("");
    e.inspect.hidden = false;
    requestAnimationFrame(() => e.inspect.classList.add("on"));
    e.hud.classList.add("inspecting");
  }
  closeInspect() {
    this.el.inspect.classList.remove("on");
    this.el.hud.classList.remove("inspecting");
    setTimeout(() => { if (!this.el.inspect.classList.contains("on")) this.el.inspect.hidden = true; }, 300);
  }

  update(dt) {
    if (this.capTimer > 0 && (this.capTimer -= dt) <= 0) this.el.caption.classList.remove("on");
    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.el.toast.classList.remove("on");
  }

  // ---- floor plan ----
  toggleMap(on) { this.el.map.hidden = !on; }
  get mapOpen() { return !this.el.map.hidden; }

  drawMap(px, pz, yaw, found) {
    const cv = this.el.mapCanvas, g = cv.getContext("2d");
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // plan spans x -4.9..4.9 and z -9.7..4.5; terrace at the top
    const minX = -4.9, maxX = 4.9, minZ = -9.7, maxZ = 4.5;
    const s = Math.min(W / (maxX - minX), H / (maxZ - minZ));
    const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxZ - minZ) * s) / 2;
    const X = (x) => ox + (x - minX) * s, Y = (z) => oy + (z - minZ) * s;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#1f2b45";
    const red = css.getPropertyValue("--red").trim() || "#a6382a";
    // floors
    g.fillStyle = "rgba(31,43,69,0.06)";
    g.fillRect(X(ROOM.x0), Y(ROOM.z0), (ROOM.x1 - ROOM.x0) * s, (ROOM.z1 - ROOM.z0) * s);
    g.fillStyle = "rgba(166,120,70,0.13)";
    g.fillRect(X(TERRACE.x0), Y(TERRACE.z0), (TERRACE.x1 - TERRACE.x0) * s, (TERRACE.z1 - TERRACE.z0) * s);
    // rug
    g.fillStyle = "rgba(166,56,42,0.14)";
    g.fillRect(X(F.rug.x0), Y(F.rug.z0), (F.rug.x1 - F.rug.x0) * s, (F.rug.z1 - F.rug.z0) * s);
    for (const b of this.colliders) {
      const x = X(b.x0), y = Y(b.z0), w = (b.x1 - b.x0) * s, h = (b.z1 - b.z0) * s;
      if (b.kind === "wall") { g.fillStyle = ink; g.fillRect(x, y, w, h); }
      else if (b.kind === "glass") { g.fillStyle = "#7fa6b8"; g.fillRect(x, y + h * 0.3, w, h * 0.4); }
      else if (b.kind === "door") { g.fillStyle = "#c39a4c"; g.fillRect(x, y + h * 0.35, w, h * 0.3); }
      else { g.fillStyle = b.kind === "outdoor" ? "rgba(90,110,60,0.35)" : "rgba(31,43,69,0.16)"; g.strokeStyle = "rgba(31,43,69,0.55)"; g.lineWidth = 1; g.fillRect(x, y, w, h); g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    }
    // labels
    g.fillStyle = ink; g.font = `600 ${Math.max(9, s * 0.2)}px "IBM Plex Mono", monospace`; g.textAlign = "center"; g.textBaseline = "middle";
    const label = (t, x, z) => g.fillText(t, X(x), Y(z));
    label("TERRACE", 0.0, -7.6);
    label("RECORDS", -2.5, 1.3);
    label("TURNTABLE", -2.55, -0.65);
    label("PEGBOARD", -2.6, -1.9);
    label("RACK", -1.65, -3.0);
    label("TABLE", -0.95, 0.73);
    label("NEW ARRIVALS", 1.05, -1.25);
    label("SHELF", 2.12, -3.2);
    label("VITRINE", 2.6, -2.35);
    label("COFFEE BAR", 2.0, 0.6);
    label("ENTRANCE", 0.8, 3.75);
    // found minis
    for (const f of found) { g.fillStyle = f.swatch; g.strokeStyle = ink; g.beginPath(); g.arc(X(f.x), Y(f.z), 4, 0, 7); g.fill(); g.stroke(); }
    // player
    g.save(); g.translate(X(px), Y(pz)); g.rotate(-yaw);
    g.fillStyle = "rgba(166,56,42,0.18)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, s * 1.6, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); g.closePath(); g.fill();
    g.fillStyle = red; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill();
    g.restore();
    // scale bar
    g.fillStyle = ink; g.fillRect(W - ox - s * 2 - 6, H - 18, s * 2, 2);
    g.textAlign = "right"; g.font = `500 10px "IBM Plex Mono", monospace`; g.fillText("2 m", W - ox - 6, H - 28);
  }
}
