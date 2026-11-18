// Architecture: floor, walls with openings, ceiling, beams, track lighting,
// mural + stripes, steel glazing with terrace doors, front window and entrance.
import * as THREE from "three";
import { ROOM, GLAZING, FRONT_WINDOW, ENTRANCE, BEAMS, TRACKS, F, TERRACE } from "../layout.js";
import { M } from "../materials.js";
import { bx, cbox, cyl, at } from "../geo.js";
import { BRAND_META } from "../assets/brandArt.js";

const W = ROOM.wall;

export function buildShell(scene) {
  const g = new THREE.Group(); g.name = "shell";
  scene.add(g);

  // ---- floor + ceiling ----
  g.add(bx(ROOM.x0, -0.1, ROOM.z0 - W, ROOM.x1, 0, ROOM.z1, M.floor, { tile: [2.4, 2.4], cast: false }));
  g.add(bx(ROOM.x0 - W, ROOM.h, ROOM.z0 - W, ROOM.x1 + W, ROOM.h + 0.25, ROOM.z1 + W, M.ceiling, { tile: [2.4, 2.4], grain: "x" }));
  for (const x of BEAMS) g.add(bx(x - 0.15, ROOM.h - 0.34, ROOM.z0, x + 0.15, ROOM.h, ROOM.z1, M.concrete, { tile: [2.4, 2.4], grain: "z" }));

  // ---- walls ----
  const wall = (x0, y0, z0, x1, y1, z1, mat = M.plaster) => g.add(bx(x0, y0, z0, x1, y1, z1, mat, { tile: [2.6, 2.6] }));
  wall(ROOM.x0 - W, 0, ROOM.z0 - W, ROOM.x0, ROOM.h, ROOM.z1 + W); // left (mural)
  wall(ROOM.x1, 0, ROOM.z0 - W, ROOM.x1 + W, ROOM.h, ROOM.z1 + W); // right
  // front wall around window + entrance
  const fz0 = ROOM.z1, fz1 = ROOM.z1 + W;
  wall(ROOM.x0 - W, 0, fz0, FRONT_WINDOW.x0, ROOM.h, fz1);
  wall(FRONT_WINDOW.x0, 0, fz0, FRONT_WINDOW.x1, FRONT_WINDOW.sill, fz1);
  wall(FRONT_WINDOW.x0, FRONT_WINDOW.top, fz0, FRONT_WINDOW.x1, ROOM.h, fz1);
  wall(FRONT_WINDOW.x1, 0, fz0, ENTRANCE.x0, ROOM.h, fz1);
  wall(ENTRANCE.x0, ENTRANCE.top, fz0, ENTRANCE.x1, ROOM.h, fz1);
  wall(ENTRANCE.x1, 0, fz0, ROOM.x1 + W, ROOM.h, fz1);
  // back wall: interior skin + exterior skin (terrace facade)
  const bz = ROOM.z0;
  for (const [mat, z0, z1] of [[M.plaster, bz - 0.02, bz], [M.plasterExt, bz - W, bz - 0.02]]) {
    const ext = mat === M.plasterExt;
    const xl = ext ? TERRACE.x0 : ROOM.x0, xr = ext ? TERRACE.x1 : ROOM.x1, top = ext ? 4.15 : ROOM.h;
    wall(xl, 0, z0, GLAZING.x0, top, z1, mat);
    wall(GLAZING.x1, 0, z0, xr, top, z1, mat);
    wall(GLAZING.x0, GLAZING.top, z0, GLAZING.x1, top, z1, mat);
  }
  // exterior parapet coping + plinth on the terrace facade
  g.add(bx(TERRACE.x0, 4.15, bz - W - 0.06, TERRACE.x1, 4.25, bz, M.concrete, { tile: [2.4, 2.4] }));
  g.add(bx(TERRACE.x0, 0, bz - W - 0.03, GLAZING.x0, 0.22, bz - W, M.concrete, { tile: [2.4, 2.4] }));
  g.add(bx(GLAZING.x1, 0, bz - W - 0.03, TERRACE.x1, 0.22, bz - W, M.concrete, { tile: [2.4, 2.4] }));

  // concrete column in the back-right corner
  g.add(bx(F.column.x0, 0, F.column.z0, F.column.x1, ROOM.h, F.column.z1, M.concrete, { tile: [2.4, 2.4], grain: "y" }));

  // skirting (walnut) along interior walls
  const sk = (x0, z0, x1, z1) => g.add(bx(x0, 0, z0, x1, 0.07, z1, M.walnutDark, { tile: [1.2, 0.6], grain: Math.abs(x1 - x0) > Math.abs(z1 - z0) ? "x" : "z", cast: false }));
  sk(ROOM.x0, F.cabinet.z1, ROOM.x0 + 0.012, ROOM.z1);
  sk(ROOM.x0, ROOM.z0, ROOM.x0 + 0.012, F.sideboard.z0);
  sk(ROOM.x1 - 0.012, F.column.z1, ROOM.x1, F.vitrine.z0);
  sk(ROOM.x1 - 0.012, F.vitrine.z1, ROOM.x1, F.bench.z0);
  sk(GLAZING.x1, ROOM.z0, F.steelShelf.x0, ROOM.z0 + 0.012);
  sk(ROOM.x0, ROOM.z0, GLAZING.x0, ROOM.z0 + 0.012);
  sk(FRONT_WINDOW.x1, ROOM.z1 - 0.012, ENTRANCE.x0, ROOM.z1);

  // ---- mural + racing stripes on the left wall ----
  const mw = F.mural.w, mh = mw * BRAND_META.mural[1] / BRAND_META.mural[0];
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), M.mural);
  at(mural, ROOM.x0 + 0.004, F.mural.y0 + mh / 2, F.mural.zc, Math.PI / 2);
  mural.renderOrder = 2;
  g.add(mural);
  const stripe = (za, ya, zb, yb, h, mat) => {
    const geo = new THREE.BufferGeometry();
    const x = ROOM.x0 + 0.003;
    const v = [x, ya - h / 2, za, x, yb - h / 2, zb, x, yb + h / 2, zb, x, ya + h / 2, za];
    geo.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 2, 1, 0, 3, 2]);
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.renderOrder = 1;
    g.add(m);
  };
  // they start behind the sideboard, pass under the badge and sweep up toward the entrance
  stripe(-1.45, 1.05, ROOM.z1, 1.86, 0.15, M.stripeRed);
  stripe(-1.45, 0.86, ROOM.z1, 1.67, 0.1, M.stripeNavy);

  // ---- track lighting rails (hung below the slab) ----
  for (const t of TRACKS) {
    g.add(bx(t.x - 0.018, 2.86, t.z0, t.x + 0.018, 2.9, t.z1, M.blackMetal, { cast: false }));
    for (const z of [t.z0 + 0.2, (t.z0 + t.z1) / 2, t.z1 - 0.2]) g.add(at(cyl(0.004, 0.004, ROOM.h - 2.9, M.blackMetal, 6), t.x, (ROOM.h + 2.9) / 2, z));
  }

  // ---- steel glazing + terrace doors ----
  const doors = buildGlazing(g);

  // ---- front window (reeded glass) + window ledge ----
  buildFrontWindow(g);
  buildEntrance(g);

  return { group: g, doors };
}

function frameBar(g, x0, y0, x1, y1, z0, z1) {
  g.add(bx(x0, y0, z0, x1, y1, z1, M.blackMetal, { uv: false }));
}

function buildGlazing(g) {
  const zc = ROOM.z0 - W / 2, z0 = zc - 0.035, z1 = zc + 0.035;
  const G = GLAZING, t = 0.05;
  // perimeter + mullions
  frameBar(g, G.x0, 0, G.x0 + t, G.top, z0, z1);
  frameBar(g, G.x1 - t, 0, G.x1, G.top, z0, z1);
  frameBar(g, G.x0, G.top - t, G.x1, G.top, z0, z1);
  frameBar(g, G.doorX0 - t / 2, 0, G.doorX0 + t / 2, G.top, z0, z1);
  frameBar(g, G.doorX1 - t / 2, 0, G.doorX1 + t / 2, G.top, z0, z1);
  frameBar(g, G.x0, G.doorTop - t / 2, G.x1, G.doorTop + t / 2, z0, z1);
  // fixed panes: sill + mid rail, transom divisions
  for (const [a, b] of [[G.x0, G.doorX0], [G.doorX1, G.x1]]) {
    frameBar(g, a, 0, b, 0.1, z0, z1);
    frameBar(g, a, 0.88, b, 0.92, z0, z1);
    const pane = (y0, y1) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), M.glass); p.position.set((a + b) / 2, (y0 + y1) / 2, zc); g.add(p); };
    pane(0.1, 0.88); pane(0.92, G.doorTop);
  }
  const span = G.x1 - G.x0;
  for (let i = 1; i < 4; i++) frameBar(g, G.x0 + (span * i) / 4 - 0.015, G.doorTop, G.x0 + (span * i) / 4 + 0.015, G.top, z0, z1);
  const tp = new THREE.Mesh(new THREE.PlaneGeometry(span, G.top - G.doorTop), M.glass);
  tp.position.set((G.x0 + G.x1) / 2, (G.doorTop + G.top) / 2, zc); g.add(tp);
  // threshold
  g.add(bx(G.doorX0, 0, ROOM.z0 - W, G.doorX1, 0.012, ROOM.z0, M.darkMetal, { uv: false, cast: false }));

  // door leaves (hinged at the outer jambs, swing out onto the terrace)
  const leafW = (G.doorX1 - G.doorX0) / 2 - 0.01, leafH = G.doorTop - 0.01;
  const mkLeaf = (side) => {
    const pivot = new THREE.Group();
    pivot.userData.dynamic = true;
    pivot.position.set(side < 0 ? G.doorX0 + t / 2 : G.doorX1 - t / 2, 0, zc);
    const leaf = new THREE.Group();
    leaf.position.x = side < 0 ? 0 : -leafW; // leaf spans +x from the left hinge, -x from the right
    pivot.add(leaf);
    const fz0 = -0.025, fz1 = 0.025;
    const fb = (a, b, c, d) => leaf.add(bx(a, b, fz0, c, d, fz1, M.blackMetal, { uv: false }));
    fb(0, 0.01, 0.05, leafH); fb(leafW - 0.05, 0.01, leafW, leafH); fb(0, leafH - 0.05, leafW, leafH); fb(0, 0.01, leafW, 0.14); fb(0, 0.88, leafW, 0.92);
    for (const [y0, y1] of [[0.14, 0.88], [0.92, leafH - 0.05]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(leafW - 0.1, y1 - y0), M.glass);
      p.position.set(leafW / 2, (y0 + y1) / 2, 0); leaf.add(p);
    }
    // brass pull bars on both faces near the meeting stiles
    const hx = side < 0 ? leafW - 0.11 : 0.11;
    for (const s of [-1, 1]) {
      leaf.add(at(cyl(0.012, 0.012, 0.42, M.brass, 12), hx, 1.05, s * 0.07));
      for (const y of [0.86, 1.24]) leaf.add(at(cyl(0.008, 0.008, 0.05, M.brass, 8), hx, y, s * 0.045, 0, Math.PI / 2));
    }
    g.add(pivot);
    return pivot;
  };
  const left = mkLeaf(-1), right = mkLeaf(1);
  const state = { open: 0, target: 0 };
  return {
    state,
    left, right,
    update(dt, px, pz) {
      const near = px > G.x0 - 0.6 && px < G.x1 - 0.2 && pz > ROOM.z0 - 1.9 && pz < ROOM.z0 + 1.5;
      state.target = near ? 1 : 0;
      const prev = state.open;
      const k = 1 - Math.exp(-dt * (state.target > state.open ? 3.2 : 2.2));
      state.open += (state.target - state.open) * k;
      if (Math.abs(state.target - state.open) < 0.001) state.open = state.target;
      const e = state.open * state.open * (3 - 2 * state.open);
      left.rotation.y = e * 1.42;
      right.rotation.y = -e * 1.42;
      return Math.abs(prev - state.open) > 1e-4; // moved → shadows need refresh
    },
  };
}

function buildFrontWindow(g) {
  const Fw = FRONT_WINDOW, zc = ROOM.z1 + W / 2, z0 = zc - 0.03, z1 = zc + 0.03, t = 0.05;
  frameBar(g, Fw.x0, Fw.sill, Fw.x0 + t, Fw.top, z0, z1);
  frameBar(g, Fw.x1 - t, Fw.sill, Fw.x1, Fw.top, z0, z1);
  frameBar(g, Fw.x0, Fw.sill, Fw.x1, Fw.sill + t, z0, z1);
  frameBar(g, Fw.x0, Fw.top - t, Fw.x1, Fw.top, z0, z1);
  const mid = (Fw.x0 + Fw.x1) / 2;
  frameBar(g, mid - 0.02, Fw.sill, mid + 0.02, Fw.top, z0, z1);
  frameBar(g, Fw.x0, 2.1, Fw.x1, 2.14, z0, z1);
  const w = Fw.x1 - Fw.x0;
  const reed = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.1 - Fw.sill), M.reeded);
  reed.position.set(mid, (Fw.sill + 2.1) / 2, zc + 0.01); reed.rotation.y = Math.PI; g.add(reed);
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(w, Fw.top - 2.14), M.reeded);
  transom.position.set(mid, (2.14 + Fw.top) / 2, zc + 0.01); transom.rotation.y = Math.PI; g.add(transom);
  // street-facing vinyl lettering, seen reversed from inside
  const vin = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, w * 0.43), M.windowVinyl);
  vin.position.set(mid, 1.46, zc - 0.012); vin.rotation.y = Math.PI; vin.renderOrder = 3; g.add(vin);
  // walnut display ledge inside the window
  const L = F.windowLedge;
  g.add(bx(L.x0, 0, L.z0 + 0.04, L.x1, L.h - 0.04, L.z1, M.walnutDark, { tile: [1.2, 0.6] }));
  g.add(bx(L.x0, L.h - 0.04, L.z0, L.x1, L.h, L.z1, M.walnut, { tile: [1.2, 0.6], round: 0.008 }));
}

function buildEntrance(g) {
  const E = ENTRANCE, zc = ROOM.z1 + W / 2;
  const w = E.x1 - E.x0;
  // casing
  g.add(bx(E.x0 - 0.06, 0, ROOM.z1 - 0.02, E.x0, E.top + 0.06, ROOM.z1 + 0.01, M.walnut, { grain: "y", tile: [1.2, 0.6] }));
  g.add(bx(E.x1, 0, ROOM.z1 - 0.02, E.x1 + 0.06, E.top + 0.06, ROOM.z1 + 0.01, M.walnut, { grain: "y", tile: [1.2, 0.6] }));
  g.add(bx(E.x0 - 0.06, E.top, ROOM.z1 - 0.02, E.x1 + 0.06, E.top + 0.06, ROOM.z1 + 0.01, M.walnut, { tile: [1.2, 0.6] }));
  // door: walnut frame + reeded glass
  const d = new THREE.Group();
  const dz0 = zc - 0.025, dz1 = zc + 0.025;
  const p = (a, b, c, e, grain = "y") => d.add(bx(a, b, dz0, c, e, dz1, M.walnut, { grain, tile: [1.2, 0.6] }));
  p(E.x0, 0, E.x0 + 0.1, E.top); p(E.x1 - 0.1, 0, E.x1, E.top); p(E.x0, E.top - 0.1, E.x1, E.top, "x"); p(E.x0, 0, E.x1, 0.32, "x"); p(E.x0, 1.0, E.x1, 1.06, "x");
  for (const [y0, y1] of [[0.32, 1.0], [1.06, E.top - 0.1]]) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, y1 - y0), M.reeded);
    gl.position.set((E.x0 + E.x1) / 2, (y0 + y1) / 2, zc); gl.rotation.y = Math.PI; d.add(gl);
  }
  // brass push plate + handle
  d.add(at(cyl(0.014, 0.014, 0.5, M.brass, 12), E.x0 + 0.16, 1.05, ROOM.z1 - 0.06));
  for (const y of [0.85, 1.25]) d.add(at(cyl(0.009, 0.009, 0.05, M.brass, 8), E.x0 + 0.16, y, ROOM.z1 - 0.035, 0, Math.PI / 2));
  g.add(d);
  // OPEN sign on a cord
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), M.openSign);
  sign.position.set((E.x0 + E.x1) / 2 + 0.08, 1.62, ROOM.z1 - 0.045); sign.rotation.y = Math.PI; g.add(sign);
  const cordGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.15, 1.705, 0), new THREE.Vector3(0, 1.82, 0), new THREE.Vector3(0.15, 1.705, 0)]);
  const line = new THREE.Line(cordGeo, new THREE.LineBasicMaterial({ color: 0x2a2a2a }));
  line.position.set(sign.position.x, 0, ROOM.z1 - 0.046); g.add(line);
  // coir door mat
  g.add(bx(E.x0 + 0.05, 0, ROOM.z1 - 0.62, E.x1 - 0.05, 0.015, ROOM.z1 - 0.05, M.kraft, { cast: false }));
}
