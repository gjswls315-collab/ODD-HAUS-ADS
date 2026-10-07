// ODD HAUS interior — modelled geometry only (no background images).
// Units: metres. Floor y=0. Living room x∈[-4,4], z∈[-4,3], ceiling 3.2.
// Hallway through the front wall (x≈1.6..2.7) leads to the front door at z=6.6.
import * as THREE from "three";
import { group, mesh, roundedBox, lathe, ellipsoid, tube, extrude, capsule } from "../core/geo.js";
import { M, mat } from "../core/mats.js";
import { woodPlanks, woodGrain, wallpaper, persianRug, plaid, fabric, albumArt, nightSky, agedBrass, tapeLabel } from "../core/textures.js";
import { rng, TAU } from "../core/util.js";

const ROOM = { x0: -4, x1: 4, z0: -4, z1: 3, h: 3.2 };

function box(w, h, d, material, x = 0, y = 0, z = 0, opts) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, opts);
  m.position.set(x, y, z);
  return m;
}
function rbox(w, h, d, r, material, x = 0, y = 0, z = 0, seg = 3) {
  const m = roundedBox(w, h, d, r, material, seg);
  m.position.set(x, y, z);
  return m;
}
function woodMat(base, seed, rough = 0.5, rep = [1, 1]) {
  const t = woodGrain(base, seed).clone();
  t.repeat.set(...rep); t.needsUpdate = true;
  return mat({ color: "#ffffff", map: t, roughness: rough });
}

// -------------------------------------------------------------------- shell
function buildShell(H) {
  const g = group("Shell");
  const planks = woodPlanks(3);
  planks.map.repeat.set(4, 3.5); planks.roughnessMap.repeat.set(4, 3.5);
  const floorMat = mat({ color: "#ffffff", map: planks.map, roughnessMap: planks.roughnessMap, roughness: 1, envMapIntensity: 0.6 });
  const floor = mesh(new THREE.PlaneGeometry(8, 7), floorMat, { cast: false });
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -0.5);
  floor.name = "Floor";
  g.add(floor);
  // hallway floor
  const hp = woodPlanks(4);
  hp.map.repeat.set(0.7, 2); hp.roughnessMap.repeat.set(0.7, 2);
  const hFloor = mesh(new THREE.PlaneGeometry(1.4, 3.8), mat({ color: "#ffffff", map: hp.map, roughnessMap: hp.roughnessMap, roughness: 1 }), { cast: false });
  hFloor.rotation.x = -Math.PI / 2;
  hFloor.position.set(2.15, 0, 4.85);
  g.add(hFloor);

  const wallTex = wallpaper("#1b2a2b", 13);
  wallTex.repeat.set(6, 3);
  const wall = mat({ color: "#ffffff", map: wallTex, roughness: 0.9 });
  const panel = woodMat("#2e1d13", 31, 0.55, [3, 1]);
  const trim = mat({ color: "#24170f", roughness: 0.45 });
  const ceil = mat({ color: "#16130f", roughness: 0.95 });
  const T = 0.12;
  const W = (w, h, d, x, y, z) => g.add(box(w, h, d, wall, x, y, z));
  // back wall with window opening x∈[1.0,2.6], y∈[0.9,2.6]
  W(5.0, ROOM.h, T, -1.5, ROOM.h / 2, ROOM.z0 - T / 2);
  W(1.4, ROOM.h, T, 3.3, ROOM.h / 2, ROOM.z0 - T / 2);
  W(1.6, 0.9, T, 1.8, 0.45, ROOM.z0 - T / 2);
  W(1.6, ROOM.h - 2.6, T, 1.8, 2.6 + (ROOM.h - 2.6) / 2, ROOM.z0 - T / 2);
  // left wall, right wall
  W(T, ROOM.h, 7, ROOM.x0 - T / 2, ROOM.h / 2, -0.5);
  W(T, ROOM.h, 7, ROOM.x1 + T / 2, ROOM.h / 2, -0.5);
  // front wall with hallway opening x∈[1.6,2.7], h 2.3
  W(5.6, ROOM.h, T, -1.2, ROOM.h / 2, ROOM.z1 + T / 2);
  W(1.3, ROOM.h, T, 3.35, ROOM.h / 2, ROOM.z1 + T / 2);
  W(1.1, ROOM.h - 2.3, T, 2.15, 2.3 + (ROOM.h - 2.3) / 2, ROOM.z1 + T / 2);
  // ceiling + beams
  const c = mesh(new THREE.PlaneGeometry(8, 7), ceil, { cast: false });
  c.rotation.x = Math.PI / 2;
  c.position.set(0, ROOM.h, -0.5);
  g.add(c);
  for (let i = 0; i < 5; i++) g.add(box(0.18, 0.2, 7, trim, -3.2 + i * 1.6, ROOM.h - 0.1, -0.5));
  // wainscot panels + baseboards + chair rail on back/left/front walls
  const wains = (len, x, z, ry) => {
    const p = box(len, 1.0, 0.03, panel, x, 0.5, z);
    p.rotation.y = ry; g.add(p);
    const base = box(len, 0.14, 0.05, trim, x, 0.07, z);
    base.rotation.y = ry; g.add(base);
    const rail = box(len, 0.05, 0.06, trim, x, 1.02, z);
    rail.rotation.y = ry; g.add(rail);
    const n = Math.floor(len / 0.7);
    for (let i = 0; i < n; i++) {
      const off = -len / 2 + (i + 0.5) * (len / n);
      const fr = new THREE.Group();
      for (const [w, h, dx, dy] of [[len / n - 0.16, 0.025, 0, 0.3], [len / n - 0.16, 0.025, 0, -0.3], [0.025, 0.62, -(len / n - 0.16) / 2, 0], [0.025, 0.62, (len / n - 0.16) / 2, 0]]) {
        fr.add(box(w, h, 0.02, trim, off + dx, 0.55 + dy, 0.02));
      }
      fr.position.set(x, 0, z); fr.rotation.y = ry;
      g.add(fr);
    }
  };
  wains(5.0, -1.5, ROOM.z0 + 0.015, 0);
  wains(1.4, 3.3, ROOM.z0 + 0.015, 0);
  wains(7, ROOM.x0 + 0.015, -0.5, Math.PI / 2);
  wains(5.6, -1.2, ROOM.z1 - 0.015, Math.PI);
  // crown molding
  for (const [w, d, x, z] of [[8, 0.08, 0, ROOM.z0 + 0.04], [8, 0.08, 0, ROOM.z1 - 0.04], [0.08, 7, ROOM.x0 + 0.04, -0.5], [0.08, 7, ROOM.x1 - 0.04, -0.5]]) {
    g.add(box(w, 0.12, d, trim, x, ROOM.h - 0.06, z));
  }
  return g;
}

// -------------------------------------------------------------------- window, curtains, sky
function buildWindow() {
  const g = group("Window");
  const frame = mat({ color: "#2a1c12", roughness: 0.5 });
  const x0 = 1.0, x1 = 2.6, y0 = 0.9, y1 = 2.6, z = ROOM.z0 - 0.06;
  g.add(box(x1 - x0 + 0.16, 0.08, 0.2, frame, (x0 + x1) / 2, y0 - 0.02, z + 0.05)); // sill
  g.add(box(x1 - x0 + 0.12, 0.08, 0.14, frame, (x0 + x1) / 2, y1 + 0.03, z));
  for (const x of [x0 - 0.03, x1 + 0.03]) g.add(box(0.07, y1 - y0 + 0.1, 0.14, frame, x, (y0 + y1) / 2, z));
  // mullions
  g.add(box(0.035, y1 - y0, 0.06, frame, (x0 + x1) / 2, (y0 + y1) / 2, z));
  for (let i = 1; i < 3; i++) g.add(box(x1 - x0, 0.035, 0.06, frame, (x0 + x1) / 2, y0 + (i * (y1 - y0)) / 3, z));
  // glass (faint reflections)
  const glass = mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat({ physical: true, color: "#0c1220", roughness: 0.05, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.18 }), { cast: false });
  glass.position.set((x0 + x1) / 2, (y0 + y1) / 2, z - 0.02);
  glass.castShadow = false;
  g.add(glass);
  // night sky + garden silhouette outside
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: nightSky(), color: new THREE.Color(0.55, 0.62, 0.8) }));
  sky.position.set(1.8, 1.8, ROOM.z0 - 3.5);
  g.add(sky);
  // heavy velvet curtains with folds
  const velvet = mat({ physical: true, color: "#5e3a12", roughness: 0.7, sheen: 1, sheenColor: "#d8a24a", sheenRoughness: 0.45, side: THREE.DoubleSide });
  for (const [cx, w] of [[x0 - 0.32, 0.62], [x1 + 0.32, 0.62]]) {
    const geo = new THREE.PlaneGeometry(w, 2.75, 40, 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const gather = 1 - (y + 1.375) / 2.75 * 0.25;
      p.setX(i, x * gather);
      p.setZ(i, Math.sin((x / w) * Math.PI * 9) * 0.045 + Math.sin((x / w) * Math.PI * 3.3) * 0.02);
    }
    geo.computeVertexNormals();
    const cur = mesh(geo, velvet);
    cur.position.set(cx, 1.6, ROOM.z0 + 0.12);
    g.add(cur);
    const tie = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 20), mat({ color: "#b8893e", roughness: 0.4, metalness: 0.6 }));
    tie.position.set(cx, 1.05, ROOM.z0 + 0.14);
    tie.scale.set(1.6, 0.6, 1);
    g.add(tie);
  }
  const rod = mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.0, 12), M.metal("#8a6a3a", 0.35));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(1.8, 2.98, ROOM.z0 + 0.14);
  g.add(rod);
  return g;
}

// -------------------------------------------------------------------- books
function buildBooks(slots, seed) {
  // slots: [{x, y, z, w (along shelf), d, dir: 'x'|'z', maxH}]
  const r = rng(seed);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const cols = ["#5b1f1c", "#1f3a4f", "#2f4a2a", "#7a5a2a", "#3b2a4a", "#8a7a5a", "#1a1a1a", "#6a2a2a", "#2a4a4a", "#9a6a3a", "#4a3a2a", "#b49a6a", "#2b2b3b", "#7b3b1b"];
  const mats = [];
  const items = [];
  for (const s of slots) {
    let u = 0;
    while (u < s.w - 0.03) {
      const t = 0.018 + r() * 0.045;
      const h = Math.min(s.maxH, 0.17 + r() * 0.13);
      const lean = r() < 0.06 && u > 0.1 ? 0.22 : 0;
      if (r() < 0.05) { u += 0.04 + r() * 0.08; continue; }
      items.push({ s, u: u + t / 2, t, h, d: s.d * (0.75 + r() * 0.22), lean, col: cols[(r() * cols.length) | 0] });
      u += t + 0.002;
    }
  }
  const inst = new THREE.InstancedMesh(geo, mat({ color: "#ffffff", roughness: 0.75 }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((it, i) => {
    const s = it.s;
    const pos = s.dir === "x" ? new THREE.Vector3(s.x - s.w / 2 + it.u, s.y, s.z) : new THREE.Vector3(s.x, s.y, s.z - s.w / 2 + it.u);
    e.set(s.dir === "x" ? 0 : it.lean, 0, s.dir === "x" ? it.lean : 0);
    q.setFromEuler(e);
    const sc = s.dir === "x" ? new THREE.Vector3(it.t, it.h, it.d) : new THREE.Vector3(it.d, it.h, it.t);
    m.compose(pos, q, sc);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, new THREE.Color(it.col).offsetHSL(0, 0, (r() - 0.5) * 0.08));
  });
  inst.castShadow = true; inst.receiveShadow = true;
  inst.name = "Books";
  return inst;
}

function buildBookshelf(x, z, w, h, d, ry, seed) {
  const g = group("Bookshelf");
  const wood = woodMat("#3a2617", seed, 0.55, [1, 2]);
  const t = 0.03;
  g.add(box(t, h, d, wood, -w / 2 + t / 2, h / 2, 0), box(t, h, d, wood, w / 2 - t / 2, h / 2, 0));
  g.add(box(w, t, d, wood, 0, h - t / 2, 0), box(w, 0.08, d, wood, 0, 0.04, 0));
  g.add(box(w, h, 0.015, wood, 0, h / 2, -d / 2 + 0.008));
  const shelves = 6;
  const slots = [];
  for (let i = 0; i < shelves; i++) {
    const y = 0.08 + i * ((h - 0.1) / shelves);
    if (i > 0) g.add(box(w - 2 * t, 0.025, d - 0.02, wood, 0, y, 0.005));
    slots.push({ x: 0, y: y + 0.0125, z: 0.0, w: w - 2 * t - 0.02, d: d - 0.06, dir: "x", maxH: (h - 0.1) / shelves - 0.04 });
  }
  g.userData.shelfY = slots.map((s) => s.y);
  g.add(buildBooks(slots.filter((_, i) => i !== 3 || seed % 2), seed));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

// -------------------------------------------------------------------- records
function buildRecordCubes(x, z, cols, rows, ry, seed) {
  const g = group("LPShelf");
  const cell = 0.36, t = 0.025, d = 0.38;
  const W = cols * cell + t, H = rows * cell + t;
  const white = woodMat("#4a3020", seed, 0.5, [2, 1]);
  for (let i = 0; i <= cols; i++) g.add(box(t, H, d, white, -W / 2 + t / 2 + i * cell, H / 2 + 0.05, 0));
  for (let j = 0; j <= rows; j++) g.add(box(W, t, d, white, 0, 0.05 + t / 2 + j * cell, 0));
  g.add(box(W, H, 0.01, white, 0, H / 2 + 0.05, -d / 2));
  // legs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, 0.05, 0.04, white, sx * (W / 2 - 0.05), 0.025, sz * (d / 2 - 0.05)));
  // records as instanced sleeves
  const r = rng(seed);
  const items = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (r() < 0.12) continue;
      const cx = -W / 2 + t + i * cell, cy = 0.05 + t + j * cell;
      let u = 0.01;
      const n = 18 + ((r() * 20) | 0);
      for (let k = 0; k < n && u < cell - t - 0.012; k++) {
        const th = 0.0045 + r() * 0.004;
        items.push({ x: cx + u + th / 2, y: cy, z: 0.0, th, tilt: k === n - 1 ? -0.12 : (r() - 0.5) * 0.03, seed: ((r() * 40) | 0) });
        u += th + 0.0006;
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const tex = albumArt(7);
  const sleeves = new THREE.InstancedMesh(geo, mat({ color: "#ffffff", roughness: 0.7 }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const pal = ["#c0392b", "#e8d6b0", "#1f2a44", "#f2aa4c", "#2f5d62", "#d9d9d9", "#3d2c4e", "#a23e48", "#6a994e", "#101820", "#f1c27d", "#7a5a3c"];
  items.forEach((it, i) => {
    q.setFromEuler(new THREE.Euler(0, 0, it.tilt));
    m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.th, 0.312, 0.312));
    sleeves.setMatrixAt(i, m);
    sleeves.setColorAt(i, new THREE.Color(pal[it.seed % pal.length]).offsetHSL(0, -0.1, -0.08));
  });
  sleeves.castShadow = true; sleeves.receiveShadow = true;
  g.add(sleeves);
  g.userData.topY = H + 0.05;
  g.userData.width = W;
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

function buildTurntable() {
  const g = group("Turntable");
  const plinth = rbox(0.45, 0.09, 0.35, 0.012, woodMat("#5a3a22", 41, 0.35), 0, 0.045, 0);
  const plate = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 64), M.metal("#9a9a9a", 0.3));
  plate.position.set(-0.05, 0.096, 0);
  const rec = mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.003, 64), mat({ color: "#0b0b0b", roughness: 0.25, clearcoat: 0.6 }));
  rec.position.set(-0.05, 0.104, 0);
  const label = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.0035, 32), mat({ color: "#c0392b", roughness: 0.6 }));
  label.position.set(-0.05, 0.105, 0);
  const arm = tube([[0.16, 0.12, -0.12], [0.16, 0.13, 0.0], [0.07, 0.12, 0.08]], 0.005, M.metal("#c8c8c8", 0.25), 16, 6);
  const base = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.03, 20), M.metal("#3a3a3a", 0.4));
  base.position.set(0.16, 0.105, -0.12);
  const dust = mesh(new THREE.BoxGeometry(0.45, 0.003, 0.35), mat({ physical: true, color: "#ffffff", transparent: true, opacity: 0.08, roughness: 0.05 }), { cast: false });
  dust.position.set(0, 0.25, -0.17);
  dust.rotation.x = -1.1;
  g.add(plinth, plate, rec, label, arm, base);
  g.userData.platter = rec;
  return g;
}

function buildSpeaker(h = 1.0) {
  const g = group("Speaker");
  const wood = woodMat("#3d2617", 51, 0.45, [1, 2]);
  g.add(rbox(0.32, h, 0.3, 0.01, wood, 0, h / 2, 0));
  const face = mat({ color: "#111", roughness: 0.8 });
  g.add(box(0.29, h - 0.04, 0.005, face, 0, h / 2, 0.151));
  const cone = mat({ color: "#2a2a2a", roughness: 0.75 });
  for (const [y, r] of [[h * 0.26, 0.11], [h * 0.62, 0.075], [h * 0.84, 0.03]]) {
    const ring = mesh(new THREE.TorusGeometry(r, 0.008, 8, 32), mat({ color: "#1a1a1a", roughness: 0.5 }));
    ring.position.set(0, y, 0.155);
    const c = lathe([[0.0001, -0.01], [r * 0.25, -0.012], [r * 0.95, 0.008], [r, 0.01]], cone, 32);
    c.rotation.x = Math.PI / 2;
    c.position.set(0, y, 0.15);
    const cap = ellipsoid(r * 0.22, r * 0.22, r * 0.1, mat({ color: "#3a3a3a", roughness: 0.4 }), 16);
    cap.position.set(0, y, 0.153);
    g.add(ring, c, cap);
  }
  return g;
}

// -------------------------------------------------------------------- seating
function buildSofa() {
  const g = group("Sofa");
  const velvet = mat({ physical: true, color: "#ffffff", map: fabric("#3c4a33", 17, 5), roughness: 0.85, sheen: 1, sheenColor: "#a4b48a", sheenRoughness: 0.5 });
  const legM = woodMat("#2a1a10", 61, 0.4);
  const W = 2.3, D = 0.95;
  g.add(rbox(W, 0.28, D, 0.06, velvet, 0, 0.28, 0, 4));
  for (let i = 0; i < 3; i++) {
    const cush = rbox(W / 3 - 0.02, 0.17, D - 0.3, 0.07, velvet, -W / 3 + i * (W / 3), 0.5, 0.08, 4);
    cush.rotation.z = (i - 1) * 0.01;
    g.add(cush);
    const back = rbox(W / 3 - 0.03, 0.46, 0.2, 0.08, velvet, -W / 3 + i * (W / 3), 0.75, -D / 2 + 0.14, 4);
    back.rotation.x = -0.1;
    g.add(back);
  }
  g.add(rbox(W, 0.42, 0.16, 0.06, velvet, 0, 0.62, -D / 2 + 0.06, 4));
  for (const s of [-1, 1]) g.add(rbox(0.2, 0.52, D, 0.08, velvet, s * (W / 2 - 0.08), 0.5, 0, 4));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.14, 12), legM);
    l.position.set(sx * (W / 2 - 0.1), 0.07, sz * (D / 2 - 0.1));
    g.add(l);
  }
  // draped plaid throw + cushions
  const throwTex = plaid("#6b1a1d", "#1e0a0b", "#d0b07a", 5, 1.2).clone();
  throwTex.repeat.set(2, 2); throwTex.needsUpdate = true;
  const throwGeo = new THREE.PlaneGeometry(0.7, 1.1, 20, 30);
  const tp = throwGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i);
    const v = (y + 0.55) / 1.1;
    let px = x, py, pz;
    if (v > 0.55) { py = 0.82; pz = -0.3 + (v - 0.55) * 0.9; }
    else { py = 0.82 - (0.55 - v) * 1.25; pz = -0.3 - 0.02 * Math.sin(v * 20); }
    px += Math.sin(y * 9) * 0.02;
    tp.setXYZ(i, px, py, pz + Math.sin(x * 14) * 0.015);
  }
  throwGeo.computeVertexNormals();
  const thr = mesh(throwGeo, mat({ color: "#ffffff", map: throwTex, roughness: 0.9, side: THREE.DoubleSide, sheen: 0.6, sheenColor: "#ffb0a0" }));
  thr.position.set(W / 2 - 0.15, -0.2, 0.25);
  thr.rotation.y = Math.PI / 2;
  g.add(thr);
  const pillowM = mat({ color: "#ffffff", map: fabric("#b5813a", 23, 3), roughness: 0.85, sheen: 0.8, sheenColor: "#ffd9a0" });
  const p1 = rbox(0.42, 0.4, 0.14, 0.09, pillowM, -W / 2 + 0.35, 0.78, -0.18, 4);
  p1.rotation.set(-0.25, 0.25, 0.12);
  const p2 = rbox(0.38, 0.36, 0.13, 0.09, mat({ color: "#ffffff", map: plaid("#2a3a5a", "#0a0f1a", "#c0b080", 8, 0.8), roughness: 0.85 }), W / 2 - 0.42, 0.76, -0.18, 4);
  p2.rotation.set(-0.25, -0.3, -0.1);
  g.add(p1, p2);
  return g;
}

function buildArmchair() {
  const g = group("Armchair");
  const leather = mat({ color: "#5a2e1a", roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.5 });
  g.add(rbox(0.85, 0.3, 0.85, 0.07, leather, 0, 0.3, 0, 4));
  g.add(rbox(0.65, 0.16, 0.6, 0.07, leather, 0, 0.52, 0.08, 4));
  const back = rbox(0.8, 0.62, 0.2, 0.09, leather, 0, 0.82, -0.33, 4);
  back.rotation.x = -0.14;
  g.add(back);
  for (const s of [-1, 1]) g.add(rbox(0.17, 0.4, 0.85, 0.08, leather, s * 0.34, 0.55, 0, 4));
  const legM = woodMat("#24160c", 71, 0.4);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const l = mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.15, 10), legM);
    l.position.set(sx * 0.33, 0.075, sz * 0.33);
    g.add(l);
  }
  return g;
}

function buildCoffeeTable() {
  const g = group("CoffeeTable");
  const wood = woodMat("#4a2e1b", 81, 0.38, [1.2, 1]);
  g.add(rbox(1.2, 0.05, 0.62, 0.015, wood, 0, 0.42, 0));
  g.add(box(1.08, 0.025, 0.5, wood, 0, 0.12, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(rbox(0.05, 0.42, 0.05, 0.008, wood, sx * 0.54, 0.21, sz * 0.26));
  // magazines + record stack on the shelf, mug + book + plant on top
  const r = rng(9);
  for (let i = 0; i < 5; i++) {
    const mg = box(0.32, 0.006, 0.24, mat({ color: ["#c9b38a", "#3a4a6a", "#8a2a2a", "#e0d6c0", "#2a2a2a"][i], roughness: 0.6 }), -0.25 + r() * 0.05, 0.136 + i * 0.007, -0.02 + r() * 0.04);
    mg.rotation.y = (r() - 0.5) * 0.4;
    g.add(mg);
  }
  for (let i = 0; i < 4; i++) {
    const lp = box(0.31, 0.004, 0.31, mat({ color: ["#1f2a44", "#c0392b", "#e8d6b0", "#2f5d62"][i], roughness: 0.6 }), 0.25, 0.136 + i * 0.005, 0);
    lp.rotation.y = (r() - 0.5) * 0.3;
    g.add(lp);
  }
  const book = rbox(0.22, 0.04, 0.16, 0.004, mat({ color: "#6b1f1c", roughness: 0.6 }), 0.3, 0.465, 0.1);
  book.rotation.y = 0.3;
  g.add(book);
  const ash = lathe([[0.0001, 0], [0.07, 0], [0.08, 0.025], [0.07, 0.03], [0.055, 0.01], [0.0001, 0.01]], mat({ physical: true, color: "#9ab", roughness: 0.05, transmission: 0.6, thickness: 0.02 }), 32);
  ash.position.set(-0.32, 0.445, -0.12);
  g.add(ash);
  return g;
}

// -------------------------------------------------------------------- lamps & plants
function buildFloorLamp() {
  const g = group("FloorLamp");
  const brass = M.metal("#a5824a", 0.35);
  g.add(lathe([[0.0001, 0], [0.16, 0], [0.16, 0.02], [0.05, 0.04], [0.016, 0.06], [0.0001, 0.06]], brass, 32));
  const pole = mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.45, 12), brass);
  pole.position.y = 0.76;
  g.add(pole);
  const shadeMat = mat({ physical: true, color: "#d9b07a", roughness: 0.85, emissive: "#ff9a48", emissiveIntensity: 0.55, side: THREE.DoubleSide, sheen: 0.6, sheenColor: "#ffd2a0" });
  const shade = mesh(new THREE.CylinderGeometry(0.17, 0.25, 0.32, 40, 1, true), shadeMat);
  shade.position.y = 1.55;
  shade.name = "LampShade";
  g.add(shade);
  const bulb = mesh(new THREE.SphereGeometry(0.04, 16, 12), M.emissive("#ffd8a0", 4));
  bulb.position.y = 1.5;
  g.add(bulb);
  return g;
}

function buildDeskLamp() {
  const g = group("DeskLamp");
  const brass = M.metal("#b08d50", 0.3);
  g.add(rbox(0.22, 0.03, 0.13, 0.01, brass, 0, 0.015, 0));
  const stem = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 10), brass);
  stem.position.y = 0.17;
  g.add(stem);
  const shade = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 32, 1, false, 0, Math.PI), mat({ physical: true, color: "#1d5a3a", roughness: 0.15, clearcoat: 1, emissive: "#0a2a14", side: THREE.DoubleSide }));
  shade.rotation.z = Math.PI / 2;
  shade.rotation.x = Math.PI;
  shade.position.y = 0.34;
  g.add(shade);
  const bulb = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 10), M.emissive("#ffd9a0", 3));
  bulb.rotation.z = Math.PI / 2;
  bulb.position.y = 0.31;
  g.add(bulb);
  return g;
}

function buildPlant(kind, seed, scale = 1) {
  const g = group("Plant");
  const r = rng(seed);
  const pot = lathe([[0.0001, 0], [0.13, 0], [0.16, 0.26], [0.17, 0.3], [0.15, 0.3], [0.14, 0.27], [0.0001, 0.27]], mat({ color: kind === 1 ? "#a4532e" : "#2a2c30", roughness: 0.75 }), 32);
  g.add(pot);
  const soil = mesh(new THREE.CircleGeometry(0.14, 24), mat({ color: "#1d140d", roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.27;
  g.add(soil);
  const leafM = mat({ color: "#2d4a24", roughness: 0.6, side: THREE.DoubleSide, sheen: 0.3, sheenColor: "#9fd080" });
  const leafM2 = mat({ color: "#3c5e2c", roughness: 0.55, side: THREE.DoubleSide });
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.08, 0.05, 0.09, 0.2, 0, 0.3);
  leafShape.bezierCurveTo(-0.09, 0.2, -0.08, 0.05, 0, 0);
  const lg = new THREE.ShapeGeometry(leafShape, 8);
  const lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) lp.setZ(i, Math.pow(lp.getX(i) * 6, 2) * 0.05 + Math.pow(lp.getY(i), 2) * 0.3);
  lg.computeVertexNormals();
  const n = kind === 0 ? 26 : 16;
  for (let i = 0; i < n; i++) {
    const h = 0.35 + r() * (kind === 0 ? 1.1 : 0.45);
    const a = r() * TAU;
    const stem = tube([[0, 0.27, 0], [Math.cos(a) * 0.05, 0.27 + h * 0.5, Math.sin(a) * 0.05], [Math.cos(a) * 0.12 * (0.5 + r()), 0.27 + h, Math.sin(a) * 0.12 * (0.5 + r())]], 0.006, mat({ color: "#3a4a22", roughness: 0.7 }), 8, 5);
    g.add(stem);
    const leaf = mesh(lg, r() > 0.5 ? leafM : leafM2);
    leaf.position.set(Math.cos(a) * 0.12, 0.27 + h, Math.sin(a) * 0.12);
    leaf.rotation.set(-0.6 - r() * 0.6, a + Math.PI / 2, (r() - 0.5) * 0.6);
    leaf.scale.setScalar((kind === 0 ? 1.6 : 0.9) * (0.7 + r() * 0.5));
    g.add(leaf);
  }
  g.scale.setScalar(scale);
  return g;
}

// -------------------------------------------------------------------- stairs & hallway
function buildStairs() {
  const g = group("Stairs");
  const wood = woodMat("#3b2414", 91, 0.45, [2, 1]);
  const riserM = mat({ color: "#1e130b", roughness: 0.6 });
  const n = 13, rise = 0.2, run = 0.28, x0 = 3.0, x1 = 3.95, zStart = 1.7;
  const w = x1 - x0;
  for (let i = 0; i < n; i++) {
    const y = (i + 1) * rise, z = zStart - i * run;
    g.add(rbox(w, 0.035, run + 0.03, 0.008, wood, (x0 + x1) / 2, y, z - run / 2));
    g.add(box(w - 0.02, rise, 0.02, riserM, (x0 + x1) / 2, y - rise / 2, z));
  }
  const landingZ = zStart - n * run;
  g.add(box(w, 0.05, 1.4, wood, (x0 + x1) / 2, n * rise, landingZ - 0.7));
  // closed stringer / under-stairs wall with panels
  const panel = woodMat("#2b1a0f", 93, 0.55, [3, 1]);
  const shape = new THREE.Shape();
  shape.moveTo(zStart, 0);
  shape.lineTo(zStart, rise);
  shape.lineTo(landingZ, n * rise);
  shape.lineTo(landingZ - 1.4, n * rise);
  shape.lineTo(landingZ - 1.4, 0);
  shape.closePath();
  const side = extrude(shape, 0.06, panel, 0.004);
  side.rotation.y = -Math.PI / 2;
  side.position.set(x0 - 0.03, 0, 0);
  g.add(side);
  // balustrade
  const rail = mat({ color: "#24150b", roughness: 0.35, clearcoat: 0.6 });
  const balM = mat({ color: "#e7dccb", roughness: 0.5 });
  const post = rbox(0.1, 1.15, 0.1, 0.01, rail, x0 + 0.05, 0.575, zStart + 0.02);
  const postCap = ellipsoid(0.07, 0.05, 0.07, rail);
  postCap.position.set(x0 + 0.05, 1.18, zStart + 0.02);
  g.add(post, postCap);
  const balGeo = new THREE.LatheGeometry([[0.0001, 0], [0.022, 0], [0.022, 0.06], [0.014, 0.1], [0.02, 0.3], [0.012, 0.55], [0.018, 0.75], [0.018, 0.8], [0.0001, 0.8]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
  const bals = new THREE.InstancedMesh(balGeo, balM, n * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n * 2; i++) {
    const k = i / 2;
    const y = (Math.floor(k) + 1) * rise + 0.02, z = zStart - k * run - 0.07;
    m.makeTranslation(x0 + 0.05, y, z);
    m.scale(new THREE.Vector3(1, 1.0 + 0.0, 1));
    bals.setMatrixAt(i, m);
  }
  bals.castShadow = true;
  g.add(bals);
  const len = Math.hypot(n * run, n * rise);
  const hand = rbox(0.07, 0.06, len + 0.2, 0.02, rail, 0, 0, 0);
  hand.position.set(x0 + 0.05, (n * rise) / 2 + 1.0, zStart - (n * run) / 2 - 0.07);
  hand.rotation.x = Math.atan2(n * rise, n * run);
  g.add(hand);
  // the old cabinet under the stairs (small door — hidden nook later)
  const cab = group("NookCabinet");
  const cw = woodMat("#4a2c18", 97, 0.5);
  cab.add(rbox(0.06, 0.95, 1.1, 0.01, cw, 0, 0.475, 0));
  const door = group("NookDoor");
  door.position.set(-0.035, 0, 0.42);
  const dp = rbox(0.03, 0.62, 0.62, 0.008, woodMat("#5a3820", 98, 0.45), 0, 0.33, -0.31);
  door.add(dp);
  for (const [dy, dz, ww, hh] of [[0.33, -0.31, 0.5, 0.025], [0.33, -0.31, 0.025, 0.5]]) door.add(box(0.012, hh, ww, mat({ color: "#2a180c" }), -0.018, dy, dz));
  const knob = ellipsoid(0.018, 0.018, 0.018, M.metal("#b8924a", 0.3));
  knob.position.set(-0.035, 0.33, -0.56);
  const keyhole = box(0.004, 0.03, 0.012, mat({ color: "#050505" }), -0.032, 0.29, -0.56);
  door.add(knob, keyhole);
  cab.add(door);
  cab.position.set(x0 - 0.07, 0, -0.8);
  g.add(cab);
  g.userData.nook = cab;
  return g;
}

function buildHallway() {
  const g = group("Hallway");
  const wallTex = wallpaper("#2a2420", 14);
  wallTex.repeat.set(2, 3);
  const wall = mat({ color: "#ffffff", map: wallTex, roughness: 0.9 });
  const trim = mat({ color: "#24170f", roughness: 0.45 });
  const z0 = ROOM.z1 + 0.12, z1 = 6.6;
  const len = z1 - z0;
  g.add(box(0.1, 2.6, len, wall, 1.45, 1.3, z0 + len / 2), box(0.1, 2.6, len, wall, 2.85, 1.3, z0 + len / 2));
  g.add(box(1.5, 0.1, len, mat({ color: "#120f0c", roughness: 1 }), 2.15, 2.6, z0 + len / 2));
  for (const x of [1.51, 2.79]) g.add(box(0.03, 0.14, len, trim, x, 0.07, z0 + len / 2));
  // runner rug
  const runner = mesh(new THREE.PlaneGeometry(0.8, len - 0.3), mat({ color: "#ffffff", map: persianRug(33), roughness: 0.95 }), { cast: false });
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(2.15, 0.004, z0 + len / 2);
  g.add(runner);
  // sconces
  for (const z of [z0 + 1.0, z0 + 2.6]) {
    for (const x of [1.52]) {
      const plate = rbox(0.04, 0.16, 0.1, 0.01, M.metal("#9a7a44", 0.35), x, 1.75, z);
      const shade = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 20, 1, true), mat({ color: "#f2d6a6", emissive: "#ffb068", emissiveIntensity: 1.4, side: THREE.DoubleSide, roughness: 0.8 }));
      shade.position.set(x + 0.09, 1.85, z);
      g.add(plate, shade);
    }
  }
  // front door at the end, slightly open, porch light outside
  const doorM = woodMat("#3a2010", 99, 0.45, [1, 2]);
  const door = group("FrontDoor");
  door.position.set(1.65, 0, z1 - 0.05);
  const slab = rbox(0.95, 2.15, 0.06, 0.01, doorM, 0.475, 1.075, 0);
  door.add(slab);
  for (const [y, h] of [[0.55, 0.7], [1.55, 0.7]]) door.add(box(0.7, h, 0.015, mat({ color: "#2a160a", roughness: 0.5 }), 0.475, y, 0.035));
  const handle = ellipsoid(0.025, 0.025, 0.025, M.metal("#b8924a", 0.3));
  handle.position.set(0.85, 1.0, 0.05);
  door.add(handle);
  door.rotation.y = -0.38;
  g.add(door);
  g.userData.frontDoor = door;
  // outside: porch boards + night
  const out = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ map: nightSky(), color: new THREE.Color(0.45, 0.5, 0.7) }));
  out.position.set(2.15, 1.6, z1 + 3.0);
  out.rotation.y = Math.PI;
  g.add(out);
  const porch = box(3.0, 0.05, 2.5, woodMat("#3a3530", 101, 0.8), 2.15, -0.02, z1 + 1.3);
  g.add(porch);
  // coat rack
  const rack = group("CoatRack");
  rack.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8, 10), trim));
  rack.children[0].position.y = 0.9;
  const coat = ellipsoid(0.22, 0.5, 0.14, mat({ color: "#3a3226", roughness: 0.9 }), 20);
  coat.position.set(0.0, 1.25, 0.08);
  rack.add(coat);
  rack.position.set(2.65, 0, z0 + 1.6);
  g.add(rack);
  return g;
}

// -------------------------------------------------------------------- story props
function buildGuitarCase() {
  const g = group("GuitarCase");
  const shell = mat({ color: "#1d1a17", roughness: 0.6, clearcoat: 0.2 });
  const plush = mat({ color: "#6e1520", roughness: 1, sheen: 1, sheenColor: "#ff6070", sheenRoughness: 0.6 });
  const outline = new THREE.Shape();
  outline.moveTo(0, -0.5);
  outline.bezierCurveTo(0.26, -0.5, 0.24, -0.12, 0.15, -0.05);
  outline.bezierCurveTo(0.2, 0.05, 0.2, 0.18, 0.08, 0.2);
  outline.lineTo(0.06, 0.6); outline.lineTo(-0.06, 0.6); outline.lineTo(-0.08, 0.2);
  outline.bezierCurveTo(-0.2, 0.18, -0.2, 0.05, -0.15, -0.05);
  outline.bezierCurveTo(-0.24, -0.12, -0.26, -0.5, 0, -0.5);
  const base = extrude(outline, 0.12, shell, 0.02);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.06;
  const inner = extrude(outline, 0.02, plush, 0.0);
  inner.scale.set(0.9, 0.93, 1);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.115;
  const lid = extrude(outline, 0.05, shell, 0.02);
  lid.rotation.x = -Math.PI / 2 - 1.9;
  lid.position.set(0, 0.13, -0.0);
  const lidG = group("Lid", lid);
  lidG.position.set(0.0, 0.0, 0.0);
  // hinge along the right edge: approximate by rotating lid about local x near the bottom
  lid.position.set(0, 0.2, -0.12);
  g.add(base, inner, lidG);
  // a few odds inside: strings packet, cloth
  g.add(rbox(0.08, 0.01, 0.06, 0.003, mat({ color: "#d9c27a", roughness: 0.6 }), 0.05, 0.13, 0.32));
  g.add(rbox(0.12, 0.012, 0.09, 0.004, mat({ color: "#e6e0d0", roughness: 0.9 }), -0.06, 0.13, -0.3));
  return g;
}

function buildDeadAmp() {
  const g = group("DeadAmp");
  const tolex = mat({ color: "#191919", roughness: 0.7 });
  g.add(rbox(0.5, 0.42, 0.24, 0.02, tolex, 0, 0.21, 0));
  g.add(box(0.44, 0.26, 0.005, mat({ color: "#4a4234", map: fabric("#4a4234", 41, 3), roughness: 0.9 }), 0, 0.17, 0.122));
  g.add(box(0.46, 0.06, 0.01, mat({ color: "#c8b88a", roughness: 0.4, metalness: 0.6 }), 0, 0.37, 0.12));
  for (let i = 0; i < 6; i++) {
    const k = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.018, 14), mat({ color: "#111", roughness: 0.4 }));
    k.rotation.x = Math.PI / 2;
    k.position.set(-0.18 + i * 0.065, 0.37, 0.13);
    g.add(k);
  }
  const lamp = mesh(new THREE.SphereGeometry(0.008, 10, 8), mat({ color: "#3a0505", roughness: 0.3 }));
  lamp.position.set(0.2, 0.37, 0.13);
  g.add(lamp);
  // unplugged cable curling on the floor
  const pts = [];
  for (let i = 0; i <= 20; i++) { const a = i * 0.7; pts.push([0.25 + Math.cos(a) * 0.1 + i * 0.02, 0.008, 0.2 + Math.sin(a) * 0.08 + i * 0.01]); }
  g.add(tube(pts, 0.005, mat({ color: "#111", roughness: 0.6 }), 60, 6));
  const plug = rbox(0.03, 0.02, 0.04, 0.004, mat({ color: "#111" }), 0.65, 0.01, 0.42);
  g.add(plug);
  // old radio on top
  const radio = group("Radio");
  radio.add(rbox(0.32, 0.18, 0.14, 0.03, woodMat("#6a4222", 103, 0.4), 0, 0.09, 0));
  const dial = mesh(new THREE.CircleGeometry(0.04, 24), mat({ color: "#d9c79a", roughness: 0.5 }));
  dial.position.set(0.08, 0.09, 0.071);
  radio.add(dial);
  const grille = mesh(new THREE.CircleGeometry(0.05, 24), mat({ color: "#3a2a1a", map: fabric("#3a2a1a", 5, 2), roughness: 0.9 }));
  grille.position.set(-0.07, 0.09, 0.071);
  radio.add(grille);
  radio.position.set(0.02, 0.42, 0.0);
  radio.rotation.y = 0.1;
  g.add(radio);
  return g;
}

function buildKeyHook() {
  const g = group("KeyHook");
  const board = rbox(0.42, 0.14, 0.03, 0.01, woodMat("#5a3820", 105, 0.45), 0, 0, 0);
  g.add(board);
  const br = agedBrass(23);
  const brass = mat({ color: "#ffffff", map: br.map, roughness: 0.4, metalness: 1 });
  for (let i = 0; i < 5; i++) {
    const hook = tube([[-0.16 + i * 0.08, 0, 0.015], [-0.16 + i * 0.08, -0.01, 0.05], [-0.16 + i * 0.08, 0.02, 0.06]], 0.005, brass, 8, 6);
    g.add(hook);
    if (i % 2 === 0) {
      const ring = mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16), brass);
      ring.position.set(-0.16 + i * 0.08, -0.02, 0.055);
      const key = rbox(0.008, 0.07, 0.003, 0.002, brass, -0.16 + i * 0.08, -0.065, 0.056);
      g.add(ring, key);
    }
  }
  return g;
}

function buildChessSet() {
  const g = group("ChessSet");
  const board = new THREE.Group();
  const light = mat({ color: "#d8c49a", roughness: 0.4 }), dark = mat({ color: "#3a2414", roughness: 0.4 });
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) board.add(box(0.035, 0.012, 0.035, (i + j) % 2 ? dark : light, -0.1225 + i * 0.035, 0.006, -0.1225 + j * 0.035));
  g.add(board);
  const prof = [[0.0001, 0], [0.012, 0], [0.012, 0.004], [0.007, 0.01], [0.005, 0.03], [0.008, 0.034], [0.006, 0.04], [0.0001, 0.045]];
  const pg = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 12);
  const wM = mat({ color: "#efe4cc", roughness: 0.3, clearcoat: 0.8 }), bM = mat({ color: "#2a1a10", roughness: 0.3, clearcoat: 0.8 });
  for (let i = 0; i < 8; i++) {
    for (const [row, mm] of [[1, wM], [6, bM]]) {
      const p = mesh(pg, mm);
      p.position.set(-0.1225 + i * 0.035, 0.012, -0.1225 + row * 0.035);
      g.add(p);
    }
  }
  for (const [row, mm] of [[0, wM], [7, bM]]) {
    for (let i = 0; i < 8; i++) {
      if (row === 7 && i === 4) continue; // the black king is missing
      const p = mesh(pg, mm);
      p.scale.set(1.15, i === 3 || i === 4 ? 1.7 : 1.3, 1.15);
      p.position.set(-0.1225 + i * 0.035, 0.012, -0.1225 + row * 0.035);
      g.add(p);
    }
  }
  return g;
}

function buildFrames() {
  const g = group("Frames");
  const r = rng(77);
  const frameM = mat({ color: "#1b120c", roughness: 0.45 });
  const goldM = mat({ color: "#a07a3a", roughness: 0.35, metalness: 0.8 });
  const list = [
    [-2.2, 1.85, ROOM.z0 + 0.03, 0, 0.5, 0.5], [-1.5, 2.0, ROOM.z0 + 0.03, 0, 0.42, 0.6], [-0.85, 1.8, ROOM.z0 + 0.03, 0, 0.36, 0.36],
    [-3.2, 2.1, ROOM.z0 + 0.03, 0, 0.3, 0.4], [ROOM.x0 + 0.03, 1.9, 1.0, Math.PI / 2, 0.6, 0.45], [ROOM.x0 + 0.03, 1.75, 2.0, Math.PI / 2, 0.36, 0.48],
    [-0.4, 1.9, ROOM.z1 - 0.03, Math.PI, 0.7, 0.5], [0.6, 1.8, ROOM.z1 - 0.03, Math.PI, 0.4, 0.4],
  ];
  list.forEach(([x, y, z, ry, w, h], i) => {
    const f = group("Frame");
    f.add(rbox(w + 0.06, h + 0.06, 0.03, 0.005, i % 3 === 0 ? goldM : frameM, 0, 0, 0));
    const art = mesh(new THREE.PlaneGeometry(w, h), mat({ color: "#ffffff", map: albumArt(100 + i), roughness: 0.6 }));
    art.position.z = 0.017;
    f.add(art);
    f.position.set(x, y, z);
    f.rotation.y = ry;
    f.rotation.z = (r() - 0.5) * 0.03;
    g.add(f);
  });
  // wall clock
  const clock = group("Clock");
  clock.add(lathe([[0.0001, 0], [0.16, 0], [0.17, 0.02], [0.16, 0.04], [0.0001, 0.04]], goldM, 40));
  const face = mesh(new THREE.CircleGeometry(0.15, 40), mat({ color: "#e9dfc8", roughness: 0.6 }));
  face.rotation.x = -Math.PI / 2; face.position.y = 0.041;
  clock.add(face);
  for (const [len, rot] of [[0.1, 0.6], [0.13, 2.4]]) {
    const hand = box(0.008, 0.002, len, mat({ color: "#111" }), Math.sin(rot) * len / 2, 0.045, -Math.cos(rot) * len / 2);
    hand.rotation.y = -rot;
    clock.add(hand);
  }
  clock.rotation.x = Math.PI / 2;
  clock.position.set(3.2, 2.2, ROOM.z0 + 0.03);
  g.add(clock);
  return g;
}

function buildRug() {
  const g = group("Rug");
  const rug = mesh(new THREE.BoxGeometry(3.4, 0.012, 2.5), mat({ color: "#ffffff", map: persianRug(21), roughness: 0.97 }), { cast: false });
  rug.material.map.rotation = 0;
  rug.position.y = 0.006;
  g.add(rug);
  const fr = mat({ color: "#d9c9a8", roughness: 1 });
  for (const s of [-1, 1]) {
    const fringe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.004, 0.06), fr, 120);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) { m.makeTranslation(-1.18 + i * 0.02 - 0.0, 0.004, 0); fringe.setMatrixAt(i, m); }
    fringe.rotation.y = Math.PI / 2;
    fringe.position.set(s * 1.73, 0, 0);
    g.add(fringe);
  }
  g.position.set(-0.4, 0, -0.5);
  return g;
}

function buildBookStack() {
  const g = group("BookStack");
  const r = rng(55);
  let y = 0;
  const cols = ["#6b1f1c", "#2a3f5a", "#7a6a4a", "#2f4a2a", "#4a2a3a", "#9a7a4a", "#1f1f1f"];
  for (let i = 0; i < 7; i++) {
    const h = 0.035 + r() * 0.03;
    const b = rbox(0.26 + r() * 0.08, h, 0.19 + r() * 0.05, 0.006, mat({ color: cols[i], roughness: 0.65 }), (r() - 0.5) * 0.03, y + h / 2, (r() - 0.5) * 0.03);
    b.rotation.y = (r() - 0.5) * 0.3;
    b.name = i === 6 ? "TopBook" : `Book${i}`;
    // pages edge
    const pages = box(0.005, h * 0.8, 0.17, mat({ color: "#e8dcc2", roughness: 0.9 }), 0.13, 0, 0);
    b.add(pages);
    g.add(b);
    y += h;
  }
  return g;
}

// -------------------------------------------------------------------- assembly
export function buildHouse() {
  const H = group("ODDHAUS");
  H.add(buildShell(H));
  H.add(buildWindow());
  const rug = buildRug();
  H.add(rug);
  // left wall: two tall bookshelves, desk with lamp + dead amp/radio, guitar case
  const bs1 = buildBookshelf(ROOM.x0 + 0.2, -3.0, 1.4, 2.4, 0.36, Math.PI / 2, 3);
  const bs2 = buildBookshelf(ROOM.x0 + 0.2, -1.5, 1.4, 2.4, 0.36, Math.PI / 2, 4);
  H.add(bs1, bs2);
  const chess = buildChessSet();
  chess.position.set(ROOM.x0 + 0.22, bs2.userData.shelfY[3] + 0.012, -1.5);
  chess.rotation.y = Math.PI / 2;
  H.add(chess);
  const desk = group("Desk");
  const dw = woodMat("#3e2716", 111, 0.45);
  desk.add(rbox(1.2, 0.04, 0.6, 0.01, dw, 0, 0.76, 0));
  for (const sx of [-1, 1]) desk.add(box(0.04, 0.76, 0.56, dw, sx * 0.56, 0.38, 0));
  desk.add(box(0.4, 0.5, 0.55, dw, 0.38, 0.5, 0));
  const dl = buildDeskLamp();
  dl.position.set(-0.3, 0.78, -0.12);
  desk.add(dl);
  desk.position.set(ROOM.x0 + 0.32, 0, 0.8);
  desk.rotation.y = Math.PI / 2;
  H.add(desk);
  const amp = buildDeadAmp();
  amp.position.set(-3.25, 0, 1.75);
  amp.rotation.y = 0.9;
  H.add(amp);
  const gcase = buildGuitarCase();
  gcase.position.set(2.45, 0, -0.35);
  gcase.rotation.y = 0.15;
  H.add(gcase);
  // back wall: LP cubes, turntable, speakers, plants
  const lp = buildRecordCubes(-1.3, ROOM.z0 + 0.22, 5, 2, 0, 5);
  H.add(lp);
  const tt = buildTurntable();
  tt.position.set(-1.6, lp.userData.topY, ROOM.z0 + 0.24);
  H.add(tt);
  const recv = rbox(0.42, 0.13, 0.3, 0.01, mat({ color: "#1c1c1c", roughness: 0.4, metalness: 0.5 }), -0.85, lp.userData.topY + 0.065, ROOM.z0 + 0.24);
  const dialGlow = box(0.2, 0.025, 0.005, M.emissive("#ffb347", 1.6), -0.85, lp.userData.topY + 0.08, ROOM.z0 + 0.392);
  H.add(recv, dialGlow);
  const spL = buildSpeaker(1.0);
  spL.position.set(-2.55, 0, ROOM.z0 + 0.3);
  const spR = buildSpeaker(1.0);
  spR.position.set(-0.05, 0, ROOM.z0 + 0.3);
  H.add(spL, spR);
  const crate = group("RecordCrate");
  crate.add(rbox(0.38, 0.3, 0.36, 0.01, woodMat("#7a5a3a", 121, 0.7), 0, 0.15, 0));
  for (let i = 0; i < 16; i++) crate.add(box(0.005, 0.31, 0.31, mat({ color: ["#c0392b", "#e8d6b0", "#1f2a44", "#f2aa4c", "#2f5d62"][i % 5], roughness: 0.7 }), -0.15 + i * 0.019, 0.17, 0));
  crate.position.set(0.55, 0, ROOM.z0 + 0.35);
  crate.rotation.y = -0.2;
  H.add(crate);
  const plantA = buildPlant(0, 5, 1.0);
  plantA.position.set(-3.55, 0, ROOM.z0 + 0.45);
  const plantB = buildPlant(1, 6, 0.9);
  plantB.position.set(3.3, 0, ROOM.z0 + 0.4);
  const plantC = buildPlant(1, 7, 0.55);
  plantC.position.set(-0.85, lp.userData.topY, ROOM.z0 + 0.2);
  H.add(plantA, plantB, plantC);
  // seating
  const sofa = buildSofa();
  sofa.position.set(-0.55, 0, 1.55);
  sofa.rotation.y = Math.PI;
  H.add(sofa);
  const chair = buildArmchair();
  chair.position.set(-2.55, 0, -0.35);
  chair.rotation.y = Math.PI / 2 + 0.35;
  H.add(chair);
  const table = buildCoffeeTable();
  table.position.set(-0.5, 0, 0.2);
  H.add(table);
  const fl = buildFloorLamp();
  fl.position.set(-2.05, 0, 1.75);
  H.add(fl);
  const side = group("SideTable");
  side.add(lathe([[0.0001, 0], [0.2, 0], [0.2, 0.03], [0.04, 0.05], [0.03, 0.55], [0.22, 0.56], [0.22, 0.59], [0.0001, 0.59]], woodMat("#3a2414", 131, 0.4), 40));
  side.position.set(1.0, 0, 1.75);
  H.add(side);
  // stairs, hallway, key hook, frames
  const stairs = buildStairs();
  H.add(stairs);
  H.add(buildHallway());
  const hook = buildKeyHook();
  hook.position.set(1.1, 1.62, ROOM.z1 - 0.03);
  hook.rotation.y = Math.PI;
  H.add(hook);
  H.add(buildFrames());
  const stack = buildBookStack();
  stack.position.set(0.95, 0, 0.55);
  H.add(stack);

  H.traverse((o) => { if (o.isMesh) { if (o.castShadow === undefined) o.castShadow = true; o.receiveShadow = true; } });
  H.userData = { rug, lp, turntable: tt, sofa, table, floorLamp: fl, deskLamp: dl, stairs, nook: stairs.userData.nook, hook, chess, amp, guitarCase: gcase, bookStack: stack, ROOM };
  return H;
}

/** Night lighting rig: ~70% dark, ~30% warm practicals. Returns handles for animation. */
export function buildLighting(scene, H) {
  const L = {};
  L.hemi = new THREE.HemisphereLight("#2a3656", "#120c07", 0.32);
  scene.add(L.hemi);
  // moonlight through the window
  L.moon = new THREE.DirectionalLight("#7f9ad6", 2.4);
  L.moon.position.set(3.4, 4.6, -8.5);
  L.moon.target.position.set(0.6, 0, -0.6);
  L.moon.castShadow = true;
  L.moon.shadow.mapSize.set(2048, 2048);
  Object.assign(L.moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  L.moon.shadow.bias = -0.0004;
  L.moon.shadow.normalBias = 0.02;
  scene.add(L.moon, L.moon.target);
  // floor lamp: warm downward pool + soft fill
  const lampPos = new THREE.Vector3();
  H.userData.floorLamp.updateMatrixWorld(true);
  H.userData.floorLamp.localToWorld(lampPos.set(0, 1.5, 0));
  L.lamp = new THREE.SpotLight("#ffae63", 9, 9, 1.25, 0.75, 1.6);
  L.lamp.position.copy(lampPos);
  L.lamp.target.position.set(lampPos.x + 0.6, 0, lampPos.z - 0.8);
  L.lamp.castShadow = true;
  L.lamp.shadow.mapSize.set(1024, 1024);
  L.lamp.shadow.bias = -0.0005;
  L.lamp.shadow.normalBias = 0.02;
  scene.add(L.lamp, L.lamp.target);
  L.lampFill = new THREE.PointLight("#ff9a4a", 1.6, 4.5, 1.8);
  L.lampFill.position.copy(lampPos).add(new THREE.Vector3(0, 0.15, 0));
  scene.add(L.lampFill);
  // desk lamp
  const dPos = new THREE.Vector3();
  H.userData.deskLamp.updateMatrixWorld(true);
  H.userData.deskLamp.localToWorld(dPos.set(0, 0.3, 0));
  L.desk = new THREE.SpotLight("#ffbe73", 3.2, 4, 0.9, 0.6, 1.6);
  L.desk.position.copy(dPos);
  L.desk.target.position.set(dPos.x + 0.3, 0.7, dPos.z);
  scene.add(L.desk, L.desk.target);
  // hallway sconces (warm spill through the doorway)
  L.hall = [];
  for (const z of [4.1, 5.7]) {
    const p = new THREE.PointLight("#ffaa5c", 2.6, 4.5, 1.6);
    p.position.set(1.75, 1.85, z);
    scene.add(p);
    L.hall.push(p);
  }
  // receiver dial + turntable glow
  L.hifi = new THREE.PointLight("#ffa040", 0.35, 1.5, 2);
  L.hifi.position.set(-0.85, H.userData.lp.userData.topY + 0.2, -3.5);
  scene.add(L.hifi);
  return L;
}
