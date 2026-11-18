// Five pocket-size "Mini Vero" mascots hidden around the shop and terrace.
import * as THREE from "three";
import { buildMascot, VARIANTS } from "../world/mascot.js";
import { canvas, tex } from "../textures.js";

export const MINIS = [
  { key: "classic", where: "propping up the books on the wall shelf", x: -3.35, y: 1.66, z: 3.07, yaw: Math.PI / 2 + 0.3 },
  { key: "midnight", where: "on top of the New Arrivals sign", x: 1.42, y: 1.1, z: -2.267, yaw: 0.15 },
  { key: "burgundy", where: "under the green tile table", x: -0.93, y: 0.08, z: 0.74, yaw: 0.35 },
  { key: "forest", where: "on the coffee shelf, between the jars", x: 3.37, y: 2.0, z: 1.34, yaw: -Math.PI / 2 },
  { key: "gold", where: "on the terrace bench, between the cushions", x: -4.3, y: 0.53, z: -7.62, yaw: Math.PI / 2 },
];

export class Collectibles {
  constructor(ctx) {
    this.found = [];
    this.items = [];
    const glintTex = (() => {
      const c = canvas(64), g = c.getContext("2d");
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,250,235,1)"); grd.addColorStop(0.2, "rgba(255,235,190,0.6)"); grd.addColorStop(1, "rgba(255,235,190,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      g.fillStyle = "rgba(255,250,235,0.9)"; g.fillRect(31, 2, 2, 60); g.fillRect(2, 31, 60, 2);
      return tex(c, { wrap: false });
    })();
    for (const m of MINIS) {
      const fig = buildMascot(m.key, { scale: 0.11, base: true });
      fig.position.set(m.x, m.y, m.z); fig.rotation.y = m.yaw;
      fig.userData.dynamic = true;
      ctx.scene.add(fig);
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
      glint.position.set(m.x, m.y + 0.095, m.z); glint.scale.setScalar(0.06); glint.userData.dynamic = true;
      ctx.scene.add(glint);
      const item = { ...m, fig, glint, t: Math.random() * 6 };
      const v = VARIANTS[m.key];
      ctx.interactions.push({
        box: [m.x - 0.07, m.y, m.z - 0.07, m.x + 0.07, m.y + 0.14, m.z + 0.07], name: "Mini Vero", verb: "Pick up", dist: 3.2, collectible: true,
        use: (game, spec) => this.collect(item, game, spec, v),
      });
      this.items.push(item);
    }
  }
  collect(item, game, spec, v) {
    if (this.found.includes(item.key)) return;
    this.found.push(item.key);
    item.taking = 0.0001;
    game.interactions.remove(spec);
    game.audio?.chime(this.found.length === 5);
    game.ui.toast(`<b>${v.name} Mini Vero</b> found <em>${item.where}</em> · ${this.found.length} of 5`, v.swatch);
    game.onFound?.(this.found);
  }
  update(dt, cam) {
    for (const it of this.items) {
      if (it.taking) {
        it.taking += dt;
        const k = Math.min(1, it.taking / 0.5);
        it.fig.position.y = it.y + k * 0.25;
        it.fig.rotation.y += dt * 9;
        it.fig.scale.setScalar(1 - k);
        it.glint.material.opacity = 0;
        if (k >= 1) { it.fig.visible = false; it.taking = 0; it.gone = true; }
        continue;
      }
      if (it.gone) continue;
      // occasional glint so sharp eyes can spot them from across the room
      it.t -= dt;
      const d = cam.position.distanceTo(it.fig.position);
      if (it.t <= 0) it.t = 4 + Math.random() * 5;
      const phase = it.t < 0.5 && d < 7 ? Math.sin((it.t / 0.5) * Math.PI) : 0;
      it.glint.material.opacity = phase * 0.9;
      it.glint.material.rotation = it.t * 2;
      it.glint.scale.setScalar(0.04 + phase * 0.05);
    }
  }
}
