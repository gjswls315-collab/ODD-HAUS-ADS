// The record wall: cubby cabinet with crates, the turntable sideboard, mushroom
// lamp, JDV vinyl display, floating wall shelf and browsing stool.
import * as THREE from "three";
import { F, ROOM } from "../layout.js";
import { M, T } from "../materials.js";
import { bx, cbox, cyl, at, lathe, rod } from "../geo.js";
import { galvBox, pot } from "./props.js";
import { rng } from "../textures.js";

const X0 = ROOM.x0;

export function buildRecordWall(ctx) {
  const g = new THREE.Group(); g.name = "record-wall";
  ctx.scene.add(g);
  cabinet(g, ctx);
  crates(g, ctx);
  sideboard(g, ctx);
  turntable(g, ctx);
  mushroomLamp(g, ctx, { x: -3.24, y: F.sideboard.h, z: -0.86 }, "sideboard");
  vinylStand(g, ctx);
  wallShelf(g, ctx);
  stool(g, F.stool.x, F.stool.z, F.stool.h);
  // books on the sideboard
  ctx.books.row(-3.32, F.sideboard.h, -1.1, Math.PI / 2, 0.17, { hMin: 0.2, hMax: 0.25 });
  return g;
}

function cabinet(g, ctx) {
  const C = F.cabinet, h = C.h, fx = C.x1;
  const w = (a, b, c, d, e, f, grain = "z") => g.add(bx(a, b, c, d, e, f, M.walnut, { tile: [1.2, 0.6], grain }));
  w(C.x0, 0.06, C.z0, C.x0 + 0.02, h, C.z1);                     // back
  w(C.x0, 0.06, C.z0, fx, h - 0.03, C.z0 + 0.025, "y");          // ends
  w(C.x0, 0.06, C.z1 - 0.025, fx, h - 0.03, C.z1, "y");
  g.add(bx(C.x0, h - 0.03, C.z0 - 0.005, fx + 0.012, h, C.z1 + 0.005, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.008 }));
  w(C.x0, 0.06, C.z0, fx, 0.09, C.z1);                            // bottom
  g.add(bx(C.x0 + 0.02, 0, C.z0 + 0.04, fx - 0.05, 0.06, C.z1 - 0.04, M.walnutDark, { tile: [1.2, 0.6], grain: "z" })); // plinth
  w(C.x0, 0.385, C.z0, fx, 0.405, C.z1);                          // mid shelf
  const bays = 5, inner = (C.z1 - C.z0 - 0.05) / bays;
  for (let k = 1; k < bays; k++) {
    const z = C.z0 + 0.025 + k * inner;
    w(C.x0, 0.09, z - 0.01, fx, h - 0.03, z + 0.01, "y");
  }
  const r = rng(9);
  for (let k = 0; k < bays; k++) {
    const za = C.z0 + 0.025 + k * inner + 0.01, zb = za + inner - 0.02, zc = (za + zb) / 2;
    // lower row: walnut doors with brass knobs
    g.add(bx(fx - 0.018, 0.1, za + 0.004, fx, 0.375, zb - 0.004, M.walnutDark, { tile: [1.2, 0.6], grain: "y", round: 0.004 }));
    g.add(at(cyl(0.012, 0.01, 0.02, M.brass, 12), fx + 0.008, 0.33, k % 2 ? za + 0.04 : zb - 0.04, 0, 0, Math.PI / 2));
    // upper row: galvanised boxes / LP spines
    if (k % 2 === 0) {
      const b = galvBox(inner - 0.07, 0.25, 0.42);
      b.position.set(fx - 0.24, 0.405, zc); b.rotation.y = Math.PI / 2; g.add(b);
    } else {
      let z = za + 0.01;
      while (z < zb - 0.012) {
        const t = 0.004 + r() * 0.004;
        ctx.lps.add(fx - 0.03 - 0.1575, 0.405, z + t / 2, -Math.PI / 2, 0, Math.floor(r() * 62));
        z += t + 0.0015;
      }
    }
  }
}

function crates(g, ctx) {
  const C = F.cabinet, y = C.h, x0 = C.x0 + 0.03, x1 = C.x1 - 0.03;
  const N = 26;
  const r = rng(31);
  ctx.crates = [];
  F.crates.forEach((cr, ci) => {
    const z0 = cr.z - 0.19, z1 = cr.z + 0.19, t = 0.016;
    const w = (a, b, c, d, e, f, grain) => g.add(bx(a, b, c, d, e, f, M.walnut, { tile: [1.2, 0.6], grain, round: 0.003 }));
    w(x0, y, z0, x1, y + t, z1, "x");                // floor
    w(x0, y, z0, x1, y + 0.22, z0 + t, "x");         // sides (sloping look via lower front)
    w(x0, y, z1 - t, x1, y + 0.22, z1, "x");
    w(x0, y, z0, x0 + t, y + 0.23, z1, "z");         // back
    w(x1 - t, y, z0, x1, y + 0.11, z1, "z");         // low front
    // records, front-most last
    const items = [];
    const xa = x0 + t + 0.03, xb = x1 - t - 0.02;
    for (let k = 0; k < N; k++) {
      const x = xa + ((xb - xa) * k) / (N - 1);
      const cover = (ci * 17 + k * 5 + Math.floor(r() * 3)) % 63;
      items.push(ctx.lps.add(x, y + t, cr.z, 0, 0.16 - k * 0.002, cover, { crate: ci }));
    }
    const crate = { items, flipped: 0, z: cr.z };
    ctx.crates.push(crate);
    ctx.interactions.push({
      box: [x0, y, z0, x1 + 0.05, y + 0.36, z1], name: `Record crate ${ci + 1}`, verb: "Flip through", dist: 2.3,
      use: (game) => flipCrate(crate, game, items[N - 1].pos),
    });
  });
}

export function flipCrate(crate, game, pos) {
  const it = crate.items, N = it.length;
  if (crate.flipped >= N - 1) {
    it.forEach((rec, k) => { rec.target = 0.16 - k * 0.002; rec.speed = 6 + k * 0.6; });
    crate.flipped = 0;
    game.audio?.riffle(pos);
    game.ui.caption("Back to the front of the crate", T.catalogue[it[N - 1].cover], it[N - 1].cover);
    return;
  }
  const rec = it[N - 1 - crate.flipped];
  rec.target = -0.62 + crate.flipped * 0.032; rec.speed = 16;
  crate.flipped++;
  const next = it[N - 1 - crate.flipped];
  game.audio?.flip(pos);
  game.ui.caption(null, T.catalogue[next.cover], next.cover);
}

function sideboard(g, ctx) {
  const S = F.sideboard, h = S.h, fx = S.x1;
  g.add(bx(S.x0, h - 0.035, S.z0 - 0.01, fx + 0.015, h, S.z1 + 0.01, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.01 }));
  g.add(bx(S.x0, 0.14, S.z0, fx - 0.02, h - 0.035, S.z1, M.walnutDark, { tile: [1.2, 0.6], grain: "z" }));
  // fluted sliding doors
  const n = Math.floor((S.z1 - S.z0 - 0.04) / 0.026);
  for (let i = 0; i < n; i++) {
    const z = S.z0 + 0.02 + i * 0.026 + 0.013;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, h - 0.21, 10, 1, false, 0, Math.PI), M.walnut);
    fl.position.set(fx - 0.012, (0.15 + h - 0.045) / 2, z); fl.rotation.y = 0; fl.castShadow = fl.receiveShadow = true;
    g.add(fl);
  }
  g.add(bx(fx - 0.02, 0.14, (S.z0 + S.z1) / 2 - 0.004, fx + 0.004, h - 0.04, (S.z0 + S.z1) / 2 + 0.004, M.walnutDark, { uv: false }));
  // legs
  for (const z of [S.z0 + 0.06, S.z1 - 0.06]) for (const x of [S.x0 + 0.06, fx - 0.06]) g.add(at(cyl(0.022, 0.016, 0.14, M.walnutDark, 12), x, 0.07, z));
}

function turntable(g, ctx) {
  const y = F.sideboard.h;
  const P = { x0: -3.45, x1: -3.09, z0: -0.63, z1: -0.17 };
  const tt = new THREE.Group(); tt.name = "turntable";
  g.add(tt);
  // plinth
  tt.add(bx(P.x0, y, P.z0, P.x1, y + 0.085, P.z1, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.008 }));
  tt.add(bx(P.x0 + 0.01, y + 0.085, P.z0 + 0.01, P.x1 - 0.01, y + 0.09, P.z1 - 0.01, M.darkMetal, { uv: false }));
  for (const [x, z] of [[P.x0 + 0.04, P.z0 + 0.04], [P.x1 - 0.04, P.z0 + 0.04], [P.x0 + 0.04, P.z1 - 0.04], [P.x1 - 0.04, P.z1 - 0.04]])
    tt.add(at(cyl(0.022, 0.026, 0.012, M.rubber, 14), x, y - 0.004, z));
  const top = y + 0.09;
  const cx = -3.275, cz = -0.36;
  // spinning parts
  const spin = new THREE.Group(); spin.position.set(cx, top, cz); spin.userData.dynamic = true; g.add(spin);
  spin.add(at(cyl(0.152, 0.152, 0.024, M.chrome, 64), 0, 0.012, 0));
  spin.add(at(cyl(0.147, 0.147, 0.003, M.rubber, 48), 0, 0.0255, 0));
  const disc = cyl(0.149, 0.149, 0.003, M.vinylGrooves, 64); disc.position.y = 0.0285; spin.add(disc);
  const lbl = cyl(0.046, 0.046, 0.0034, M.recordLabel, 40); lbl.position.y = 0.029; spin.add(lbl);
  spin.add(at(cyl(0.0035, 0.0035, 0.02, M.chrome, 8), 0, 0.035, 0));
  // tonearm
  const px = -3.39, pz = -0.585;
  tt.add(at(cyl(0.03, 0.034, 0.03, M.darkMetal, 20), px, top + 0.015, pz));
  const armPivot = new THREE.Group(); armPivot.position.set(px, top + 0.055, pz); armPivot.userData.dynamic = true; g.add(armPivot);
  const arm = new THREE.Group(); armPivot.add(arm);
  arm.add(at(cyl(0.012, 0.012, 0.03, M.chrome, 12), 0, -0.012, 0));
  const tube = cyl(0.0042, 0.0042, 0.23, M.chrome, 10); tube.rotation.z = Math.PI / 2; tube.position.x = 0.115; arm.add(tube);
  const cw = cyl(0.016, 0.016, 0.04, M.darkMetal, 16); cw.rotation.z = Math.PI / 2; cw.position.x = -0.045; arm.add(cw);
  arm.add(cbox(0.04, 0.008, 0.02, M.blackMetal, 0.24, -0.005, 0, { uv: false }));
  arm.add(cbox(0.012, 0.012, 0.01, M.brass, 0.25, -0.014, 0, { uv: false }));
  tt.add(at(cyl(0.006, 0.006, 0.05, M.darkMetal, 8), -3.15, top + 0.025, pz)); // arm rest
  // knobs + speed buttons
  tt.add(at(cyl(0.014, 0.014, 0.012, M.chrome, 16), P.x1 - 0.035, top + 0.006, P.z1 - 0.04));
  for (const dz of [0, 0.03]) tt.add(cbox(0.016, 0.006, 0.022, M.chrome, P.x1 - 0.03, top + 0.003, P.z1 - 0.1 - dz, { uv: false }));
  // acrylic dust cover, hinged at the back and propped open
  const hinge = new THREE.Group(); hinge.position.set(P.x0 + 0.005, top + 0.005, 0); hinge.rotation.z = 1.2; g.add(hinge);
  const cover = new THREE.Mesh(new THREE.BoxGeometry(P.x1 - P.x0, 0.07, P.z1 - P.z0), M.acrylic);
  cover.position.set((P.x1 - P.x0) / 2, 0.035, (P.z0 + P.z1) / 2); cover.renderOrder = 5; hinge.add(cover);

  const REST = 0.0, START = -0.5, END = -0.86;
  const state = { playing: false, arm: REST, lift: 1, speed: 0, progress: 0 };
  ctx.turntable = { state, pos: new THREE.Vector3(cx, top, cz) };
  ctx.anim.push((dt) => {
    const targetSpeed = state.playing ? 3.49 : 0; // 33⅓ rpm
    state.speed += (targetSpeed - state.speed) * (1 - Math.exp(-dt * 2.2));
    spin.rotation.y -= state.speed * dt;
    if (state.playing) state.progress = Math.min(1, state.progress + dt / 600);
    const armTarget = state.playing ? START + (END - START) * state.progress : REST;
    state.arm += (armTarget - state.arm) * (1 - Math.exp(-dt * 2.5));
    const settled = Math.abs(armTarget - state.arm) < 0.02;
    const liftTarget = state.playing && settled ? 0 : 1;
    state.lift += (liftTarget - state.lift) * (1 - Math.exp(-dt * 4));
    armPivot.rotation.y = state.arm;
    arm.position.y = -0.016 * (1 - state.lift) + 0.004;
  });
  ctx.interactions.push({
    box: [P.x0, y, P.z0, P.x1 + 0.03, y + 0.2, P.z1], name: "Turntable", dist: 2.4,
    verb: () => (state.playing ? "Lift the needle" : "Play the record"),
    use: (game) => {
      state.playing = !state.playing;
      if (state.playing && state.progress >= 1) state.progress = 0;
      game.audio?.setMusic(state.playing, ctx.turntable.pos);
      game.ui.caption(state.playing ? "Now playing" : "Needle up", state.playing ? { title: "Golden Hour Walk", artist: "JDV House Sessions", year: "Side A", genre: "lo-fi jazz, warm and slow", grade: "" } : null);
    },
  });
}

export function mushroomLamp(g, ctx, { x, y, z }, id, { scale = 1, amber = false } = {}) {
  const lamp = new THREE.Group(); lamp.position.set(x, y, z); lamp.scale.setScalar(scale);
  lamp.add(at(cyl(0.065, 0.07, 0.018, M.brass, 32), 0, 0.009, 0));
  lamp.add(at(cyl(0.011, 0.011, 0.3, M.brass, 12), 0, 0.165, 0));
  const shadeMat = (amber ? M.lampAmber : M.lampGlass).clone();
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.155, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), shadeMat);
  shade.scale.set(1, 0.72, 1); shade.position.y = 0.3; shade.castShadow = false; lamp.add(shade);
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.153, 40), shadeMat); under.rotation.x = Math.PI / 2; under.position.y = 0.3; lamp.add(under);
  lamp.userData.dynamic = true;
  g.add(lamp);
  const light = new THREE.PointLight(amber ? 0xffa850 : 0xffcf95, amber ? 1.2 : 1.7, 3.5, 2);
  light.position.set(x, y + 0.26 * scale, z);
  ctx.scene.add(light);
  const state = { on: true, k: 1, base: light.intensity, emis: shadeMat.emissiveIntensity };
  ctx.anim.push((dt) => {
    state.k += ((state.on ? 1 : 0) - state.k) * (1 - Math.exp(-dt * 12));
    light.intensity = state.base * state.k;
    shadeMat.emissiveIntensity = state.emis * (0.05 + 0.95 * state.k);
  });
  ctx.interactions.push({
    box: [x - 0.17 * scale, y, z - 0.17 * scale, x + 0.17 * scale, y + 0.42 * scale, z + 0.17 * scale], name: "Mushroom lamp", dist: 2.3,
    verb: () => (state.on ? "Switch off" : "Switch on"),
    use: (game) => { state.on = !state.on; game.audio?.click(light.position); },
  });
  return lamp;
}

function vinylStand(g, ctx) {
  const x = -3.22, y = F.cabinet.h, z = 2.38, yaw = -0.45;
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = yaw; g.add(grp);
  grp.add(cbox(0.12, 0.03, 0.2, M.walnut, 0, 0.015, 0, { tile: [0.6, 0.6], grain: "z", round: 0.006 }));
  grp.add(cbox(0.02, 0.06, 0.18, M.walnut, -0.03, 0.05, 0, { tile: [0.6, 0.6], grain: "z" }));
  const disc = vinylDisc();
  disc.position.set(0.0, 0.155, 0); disc.rotation.z = 0.12; grp.add(disc);
  // the sleeve leans behind it
  const house = T.catalogue.findIndex((c) => c.genre === "Selector mix");
  ctx.lps.add(x - 0.13 * Math.cos(yaw), y, z + 0.13 * Math.sin(yaw), yaw, 0.18, house);
  ctx.interactions.push({
    box: [x - 0.2, y, z - 0.2, x + 0.12, y + 0.34, z + 0.2], name: "JDV House Sessions LP", verb: "Inspect", dist: 2.3,
    inspect: {
      title: "JDV House Sessions Vol.1", kind: "12\" LP · House label",
      text: "Our own selector mix pressed on heavyweight black vinyl, with the orange JDV label. Spun in the shop most afternoons.",
      details: ["180 g vinyl", "33⅓ rpm", "Printed inner sleeve"],
      make: () => { const d = vinylDisc(); d.rotation.set(0, 0, 0); return d; },
    },
  });
}

export function vinylDisc() {
  // vertical disc facing +x
  const d = new THREE.Group();
  const v = cyl(0.15, 0.15, 0.003, M.vinylGrooves, 64); d.add(v);
  const l = cyl(0.046, 0.046, 0.0036, M.recordLabel, 40); d.add(l);
  d.children.forEach((c) => { c.rotation.z = Math.PI / 2; });
  return d;
}

function wallShelf(g, ctx) {
  const S = F.wallShelf;
  for (const y of S.ys) {
    g.add(bx(S.x0, y - 0.035, S.z0, S.x1, y, S.z1, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.006 }));
  }
  // lower shelf: a full row of books + a small framed print
  ctx.books.row(-3.34, S.ys[0], S.z1 - 0.04, Math.PI / 2, 0.62, { hMin: 0.19, hMax: 0.25 });
  // top shelf: books + pothos (pothos placed by plants module)
  ctx.books.row(-3.34, S.ys[1], S.z0 + 0.42, Math.PI / 2, 0.36, { hMin: 0.2, hMax: 0.26 });
  ctx.shelfPotSpot = new THREE.Vector3(-3.37, S.ys[1], S.z1 - 0.2);
}

export function stool(g, x, z, h, { tall = false } = {}) {
  const s = new THREE.Group(); s.position.set(x, 0, z); g.add(s);
  s.add(lathe([[0, h - 0.045], [0.17, h - 0.045], [0.19, h - 0.03], [0.192, h - 0.012], [0.18, h], [0, h]], M.walnut, 40));
  s.add(at(cyl(0.12, 0.12, 0.02, M.blackMetal, 24), 0, h - 0.055, 0));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const top = new THREE.Vector3(Math.cos(a) * 0.1, h - 0.06, Math.sin(a) * 0.1);
    const bot = new THREE.Vector3(Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19);
    s.add(rod(top, bot, 0.011, M.chrome, 10));
    s.add(at(cyl(0.014, 0.014, 0.012, M.rubber, 10), bot.x, 0.006, bot.z));
  }
  const ringY = tall ? 0.3 : 0.22;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1 + (0.09 * (h - 0.06 - ringY)) / (h - 0.06) + 0.005, 0.007, 8, 40), M.chrome);
  ring.rotation.x = Math.PI / 2; ring.position.y = ringY; ring.castShadow = true; s.add(ring);
  return s;
}
