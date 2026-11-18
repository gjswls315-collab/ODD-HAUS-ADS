// Specialty coffee corner on the right wall, near the entrance.
import * as THREE from "three";
import { F, ROOM } from "../layout.js";
import { M } from "../materials.js";
import { bx, cbox, cyl, at, lathe, rod, sph } from "../geo.js";
import { mug } from "./props.js";
import { stool } from "./records.js";
import { canvas, tex } from "../textures.js";

export function buildCoffeeBar(ctx) {
  const g = new THREE.Group(); g.name = "coffee-bar";
  ctx.scene.add(g);
  const Fc = F.barFront, Bc = F.barBack;

  // ---- front counter: green tile face, walnut top ----
  g.add(bx(Fc.x0 - 0.05, Fc.h - 0.045, Fc.z0 - 0.04, Fc.x1 + 0.02, Fc.h, Fc.z1, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.012 }));
  g.add(bx(Fc.x0, 0.08, Fc.z0, Fc.x0 + 0.05, Fc.h - 0.045, Fc.z1, M.tile, { tile: [0.4, 0.4] }));
  g.add(bx(Fc.x0, 0.08, Fc.z0, Fc.x1, Fc.h - 0.045, Fc.z0 + 0.05, M.tile, { tile: [0.4, 0.4] }));
  g.add(bx(Fc.x0 + 0.05, 0.08, Fc.z0 + 0.05, Fc.x1, Fc.h - 0.045, Fc.z1, M.walnutDark, { tile: [1.2, 0.6], grain: "z" }));
  g.add(bx(Fc.x0 + 0.06, 0, Fc.z0 + 0.06, Fc.x1, 0.08, Fc.z1, M.blackMatte, { uv: false }));
  // under-counter cup shelf on the barista side
  g.add(bx(Fc.x1 - 0.005, 0.5, Fc.z0 + 0.1, Fc.x1 + 0.0, 0.52, Fc.z1 - 0.05, M.walnut, { uv: false }));

  // ---- back counter + tiled splashback + shelves ----
  g.add(bx(Bc.x0, 0.1, Bc.z0, Bc.x1, Bc.h - 0.03, Bc.z1, M.walnutDark, { tile: [1.2, 0.6], grain: "y" }));
  g.add(bx(Bc.x0 + 0.04, 0, Bc.z0 + 0.04, Bc.x1, 0.1, Bc.z1, M.blackMatte, { uv: false }));
  g.add(bx(Bc.x0 - 0.02, Bc.h - 0.03, Bc.z0, Bc.x1, Bc.h, Bc.z1, M.steel, { tile: [0.5, 0.5], round: 0.006 }));
  // door seams + pulls
  for (let z = Bc.z0 + 0.5; z < Bc.z1; z += 0.5) g.add(bx(Bc.x0 - 0.002, 0.12, z - 0.003, Bc.x0, Bc.h - 0.05, z + 0.003, M.blackMatte, { uv: false, cast: false }));
  for (let z = Bc.z0 + 0.25; z < Bc.z1; z += 0.5) g.add(bx(Bc.x0 - 0.02, Bc.h - 0.12, z - 0.07, Bc.x0, Bc.h - 0.105, z + 0.07, M.brass, { uv: false }));
  g.add(bx(ROOM.x1 - 0.015, Bc.h, Bc.z0, ROOM.x1, 1.42, Bc.z1, M.tile, { tile: [0.4, 0.4] }));
  for (const [z0, z1] of [[0.55, 1.62], [2.98, 3.95]]) for (const y of [1.6, 2.0]) {
    g.add(bx(ROOM.x1 - 0.26, y - 0.03, z0, ROOM.x1, y, z1, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.005 }));
    for (const z of [z0 + 0.1, z1 - 0.1]) g.add(bx(ROOM.x1 - 0.2, y - 0.09, z - 0.008, ROOM.x1, y - 0.03, z + 0.008, M.blackMetal, { uv: false }));
  }
  // menu board between the shelves
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.72), M.menu);
  menu.position.set(ROOM.x1 - 0.022, 1.86, 2.3); menu.rotation.y = -Math.PI / 2; g.add(menu);
  g.add(bx(ROOM.x1 - 0.02, 1.48, 1.74, ROOM.x1, 2.24, 2.86, M.walnutDark, { uv: false }));
  // coffee bags + jars on the shelves
  const bag = (x, y, z, dark = false, ry = 0) => {
    const b = new THREE.Group();
    b.add(cbox(0.1, 0.19, 0.075, dark ? M.coffeeBagDark : M.kraft, 0, 0.095, 0, { uv: false }));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.17), dark ? M.coffeeBagDark : M.coffeeBag); f.position.set(-0.0381, 0.09, 0); f.rotation.y = -Math.PI / 2;
    b.add(f);
    b.add(cbox(0.1, 0.02, 0.05, dark ? M.coffeeBagDark : M.kraft, 0, 0.2, 0, { uv: false }));
    b.position.set(x, y, z); b.rotation.y = ry; g.add(b);
  };
  [[0.68, false], [0.82, true], [0.96, false], [1.1, false]].forEach(([z, d], i) => bag(ROOM.x1 - 0.12, 1.6, z, d, (i - 1.5) * 0.08));
  [[3.1, true], [3.24, false], [3.38, false]].forEach(([z, d], i) => bag(ROOM.x1 - 0.12, 1.6, z, d, (i - 1) * 0.1));
  const jar = (x, y, z, h = 0.18) => {
    const j = new THREE.Group();
    j.add(lathe([[0, 0], [0.055, 0], [0.058, 0.01], [0.058, h], [0.045, h + 0.012], [0, h + 0.012]], M.glassTint, 24));
    j.add(at(cyl(0.052, 0.052, h * 0.7, M.soil, 20), 0, h * 0.35 + 0.004, 0));
    j.add(at(cyl(0.05, 0.05, 0.02, M.walnut, 20), 0, h + 0.022, 0));
    j.position.set(x, y, z); g.add(j);
  };
  for (const z of [1.28, 1.42]) jar(ROOM.x1 - 0.12, 1.6, z);
  for (const z of [0.7, 0.86, 1.02]) jar(ROOM.x1 - 0.12, 2.0, z, 0.14);
  for (const z of [3.1, 3.26]) jar(ROOM.x1 - 0.12, 2.0, z, 0.14);
  ctx.barPotSpot = new THREE.Vector3(ROOM.x1 - 0.13, 2.0, 3.65);

  // ---- espresso machine ----
  const em = espressoMachine();
  em.position.set(3.2, Bc.h, 2.45); g.add(em);
  const cups = new THREE.Group();
  for (let i = 0; i < 6; i++) { const c = demitasse(); c.rotation.x = Math.PI; c.position.set(((i % 3) - 1) * 0.085, 0.47 + 0.055, (Math.floor(i / 3) - 0.5) * 0.09); cups.add(c); }
  cups.position.copy(em.position); g.add(cups);
  // grinder
  const gr = grinder(); gr.position.set(3.22, Bc.h, 1.72); g.add(gr);
  // knock box, pitchers, sink
  g.add(at(cyl(0.07, 0.065, 0.12, M.blackMatte, 20), 3.2, Bc.h + 0.06, 1.35));
  for (const [z, s] of [[3.0, 1], [3.1, 0.8]]) { const p = pitcher(s); p.position.set(3.15, Bc.h, z); g.add(p); }
  g.add(bx(3.08, Bc.h - 0.002, 3.3, 3.38, Bc.h + 0.001, 3.75, M.darkMetal, { uv: false, cast: false }));
  const faucet = new THREE.Group();
  faucet.add(at(cyl(0.015, 0.018, 0.25, M.chrome, 12), 0, 0.125, 0));
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 10, 20, Math.PI), M.chrome); arc.position.set(-0.08, 0.25, 0); arc.rotation.y = 0; faucet.add(arc);
  faucet.position.set(3.42, Bc.h, 3.52); faucet.rotation.y = 0; g.add(faucet);
  // takeaway cups on the back counter
  for (let i = 0; i < 3; i++) { const t = takeawayStack(6 - i); t.position.set(3.32, Bc.h, 0.62 + i * 0.12); g.add(t); }

  // ---- front counter items ----
  const top = Fc.h;
  const po = pourOver(); po.position.set(2.0, top, 1.38); g.add(po);
  const pd = pastryDome(); pd.position.set(2.0, top, 2.18); g.add(pd);
  const pos = tablet(); pos.position.set(2.04, top, 3.05); pos.rotation.y = -Math.PI / 2; g.add(pos);
  const m1 = mug(); m1.position.set(1.86, top, 1.78); m1.rotation.y = 0.9; g.add(m1);
  const tk = takeawayStack(4); tk.position.set(2.1, top, 3.45); g.add(tk);

  // stools
  for (const s of F.barStools) stool(g, s.x, s.z, 0.74, { tall: true });

  // pendants over the bar
  for (const z of [1.55, 3.05]) {
    const p = new THREE.Group();
    p.add(at(cyl(0.004, 0.004, ROOM.h - 2.38, M.blackMatte, 6), 0, (ROOM.h + 2.38) / 2 - 2.12, 0));
    p.add(at(cyl(0.035, 0.03, 0.05, M.brass, 16), 0, 0.27, 0));
    const globe = sph(0.115, M.lampGlass, 32, 20); globe.position.y = 0.15; globe.castShadow = false; p.add(globe);
    p.position.set(2.02, 2.12, z); g.add(p);
  }
  const barLight = new THREE.PointLight(0xffcf98, 4.5, 4.5, 2);
  barLight.position.set(2.02, 2.15, 2.3); ctx.scene.add(barLight);

  // ---- steam + interaction ----
  const steam = makeSteam(ctx);
  const wand = new THREE.Vector3(3.0, Bc.h + 0.2, 2.2);
  const cupSpot = new THREE.Vector3(1.95, top, 2.62);
  const served = new THREE.Group(); served.userData.dynamic = true;
  const saucer = cyl(0.06, 0.055, 0.008, M.ceramic, 28); saucer.position.y = 0.004; served.add(saucer);
  const dc = demitasse(); dc.position.y = 0.008; served.add(dc);
  const crema = cyl(0.03, 0.03, 0.002, new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.3 }), 20); crema.position.y = 0.052; served.add(crema);
  served.position.copy(cupSpot); served.visible = false; g.add(served);
  let busy = 0;
  ctx.anim.push((dt) => {
    if (busy > 0) {
      busy -= dt;
      if (busy > 2.5) steam.emit(wand, 2);
      if (busy <= 0.01) { served.visible = true; ctx.game?.ui.caption("Coffee's up", { title: "Espresso, Vero No.1", artist: "On the counter by the pastry dome", year: "", genre: "", grade: "" }); }
    }
    if (served.visible) steam.emit(new THREE.Vector3(cupSpot.x, cupSpot.y + 0.06, cupSpot.z), 0.25);
    steam.update(dt);
  });
  ctx.interactions.push({
    box: [2.9, Bc.h, 2.15, 3.5, Bc.h + 0.55, 2.78], name: "Espresso machine", dist: 2.8,
    verb: () => (busy > 0 ? "Pulling a shot…" : served.visible ? "Pull another shot" : "Pull a shot"),
    use: (game) => {
      if (busy > 0) return;
      served.visible = false; busy = 7.5;
      game.audio?.espresso(new THREE.Vector3(3.2, 1.2, 2.3));
      game.ui.caption("Pulling a shot", { title: "Vero No.1 house blend", artist: "18 g in · 36 g out · 28 s", year: "", genre: "chocolate, cherry, toasted walnut", grade: "" });
    },
  });
  ctx.interactions.push({
    box: [1.75, top, 2.0, 2.3, top + 0.28, 2.38], name: "Pastry dome", verb: "Inspect", dist: 2.4,
    inspect: { title: "Today's pastries", kind: "Coffee corner", text: "Brown-butter cookies and canelés from the bakery down the street, delivered every morning.", details: ["Brown-butter cookie", "Canelé", "Gone by 3 pm"], make: pastryDome },
  });
  ctx.interactions.push({
    box: [1.8, top, 1.2, 2.25, top + 0.4, 1.58], name: "Pour-over station", verb: "Inspect", dist: 2.4,
    inspect: { title: "Hand drip station", kind: "Coffee corner", text: "Two ceramic drippers on a walnut stand. Single origins rotate weekly; ask what's on.", details: ["Ceramic cone drippers", "Glass servers", "15 g : 250 ml"], make: pourOver },
  });
  ctx.interactions.push({
    box: [3.05, Bc.h + 0.12, 0.55, 3.5, 1.84, 1.2], name: "Coffee beans", verb: "Inspect", dist: 2.6,
    inspect: { title: "Vero No.1 house blend", kind: "Whole bean · 200 g", text: "Our espresso blend, roasted medium for a round, chocolatey cup that holds up to milk.", details: ["Brazil · Colombia · Ethiopia", "Chocolate, cherry, walnut", "Roasted weekly"], make: () => { const b = new THREE.Group(); b.add(cbox(0.1, 0.19, 0.075, M.kraft, 0, 0.095, 0, { uv: false })); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.17), M.coffeeBag); f.position.set(0, 0.09, 0.0381); b.add(f); return b; } },
  });
  return g;
}

function espressoMachine() {
  const g = new THREE.Group();
  M.enamelGreenBody ??= new THREE.MeshPhysicalMaterial({ color: 0x24432b, roughness: 0.25, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
  // body (faces -x)
  g.add(cbox(0.46, 0.36, 0.62, M.enamelGreenBody, 0, 0.24, 0, { uv: false, round: 0.03, seg: 3 }));
  g.add(cbox(0.02, 0.2, 0.56, M.steel, -0.232, 0.31, 0, { uv: false, round: 0.006 }));
  g.add(cbox(0.48, 0.03, 0.64, M.steel, 0, 0.435, 0, { uv: false, round: 0.01 }));
  for (let i = 0; i < 6; i++) g.add(cbox(0.42, 0.006, 0.006, M.chrome, 0, 0.452, -0.25 + i * 0.1, { uv: false }));
  // feet + drip tray
  for (const z of [-0.26, 0.26]) for (const x of [-0.18, 0.18]) g.add(at(cyl(0.02, 0.02, 0.06, M.chrome, 10), x, 0.03, z));
  g.add(cbox(0.18, 0.03, 0.58, M.steel, -0.28, 0.075, 0, { uv: false }));
  for (let i = 0; i < 9; i++) g.add(cbox(0.16, 0.004, 0.006, M.darkMetal, -0.28, 0.092, -0.26 + i * 0.065, { uv: false }));
  // group heads + portafilters
  for (const z of [-0.14, 0.14]) {
    g.add(at(cyl(0.045, 0.05, 0.05, M.chrome, 24), -0.25, 0.32, z, 0, 0, Math.PI / 2));
    g.add(at(cyl(0.05, 0.045, 0.05, M.chrome, 24), -0.28, 0.265, z));
    const handle = rod(new THREE.Vector3(-0.3, 0.26, z), new THREE.Vector3(-0.45, 0.24, z + 0.02), 0.014, M.walnut, 10);
    g.add(handle);
    g.add(at(cyl(0.006, 0.006, 0.04, M.chrome, 8), -0.28, 0.22, z));
    // gauge
    const gauge = cyl(0.03, 0.03, 0.01, M.ceramic, 24); gauge.rotation.z = Math.PI / 2; gauge.position.set(-0.243, 0.39, z * 0.4); g.add(gauge);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 24), M.chrome); rim.rotation.y = Math.PI / 2; rim.position.set(-0.249, 0.39, z * 0.4); g.add(rim);
  }
  // steam wands
  for (const z of [-0.28, 0.28]) g.add(rod(new THREE.Vector3(-0.24, 0.3, z), new THREE.Vector3(-0.33, 0.13, z * 1.05), 0.006, M.chrome, 8));
  return g;
}

function grinder() {
  const g = new THREE.Group();
  g.add(cbox(0.2, 0.32, 0.18, M.blackMatte, 0, 0.16, 0, { uv: false, round: 0.02, seg: 3 }));
  g.add(cbox(0.2, 0.025, 0.18, M.steel, 0, 0.33, 0, { uv: false }));
  g.add(lathe([[0.03, 0.34], [0.08, 0.38], [0.1, 0.55], [0.0, 0.55]], M.glassTint, 24));
  g.add(lathe([[0.025, 0.345], [0.072, 0.38], [0.085, 0.47], [0, 0.47]], M.soil, 20));
  g.add(at(cyl(0.012, 0.016, 0.04, M.chrome, 12), -0.1, 0.2, 0, 0, 0, Math.PI / 2));
  g.add(cbox(0.06, 0.012, 0.1, M.chrome, -0.12, 0.14, 0, { uv: false }));
  return g;
}

function pitcher(s = 1) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.04, 0], [0.042, 0.04], [0.036, 0.1], [0.04, 0.11], [0.034, 0.11], [0.03, 0.1], [0.036, 0.04], [0.032, 0.006], [0, 0.006]], M.chrome, 24));
  g.scale.setScalar(s);
  return g;
}

export function demitasse() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.022, 0], [0.026, 0.006], [0.034, 0.045], [0.036, 0.05], [0.032, 0.05], [0.03, 0.045], [0.022, 0.012], [0, 0.012]], M.ceramic, 24));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 12, Math.PI * 1.2), M.ceramic); h.position.set(0.036, 0.03, 0); h.rotation.z = -1.9; g.add(h);
  return g;
}

function takeawayStack(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) g.add(at(cyl(0.045, 0.034, 0.11, M.kraft, 20, { open: true }), 0, 0.055 + i * 0.022, 0));
  g.add(at(cyl(0.047, 0.047, 0.012, M.ceramic, 20), 0, 0.11 + (n - 1) * 0.022 + 0.006, 0));
  return g;
}

function pourOver() {
  const g = new THREE.Group();
  g.add(cbox(0.14, 0.02, 0.36, M.walnut, 0, 0.01, 0, { uv: false, round: 0.005 }));
  for (const z of [-0.17, 0.17]) g.add(cbox(0.14, 0.24, 0.02, M.walnut, 0, 0.12, z, { uv: false, round: 0.004 }));
  g.add(cbox(0.14, 0.02, 0.36, M.walnut, 0, 0.235, 0, { uv: false, round: 0.004 }));
  for (const z of [-0.08, 0.08]) {
    g.add(at(lathe([[0, 0], [0.045, 0], [0.05, 0.03], [0.042, 0.1], [0.03, 0.12], [0, 0.12]], M.glassTint, 24), 0, 0.02, z));
    g.add(at(lathe([[0.012, 0], [0.025, 0], [0.065, 0.08], [0.07, 0.085], [0.064, 0.085], [0.02, 0.006]], M.ceramic, 28), 0, 0.245, z));
  }
  // gooseneck kettle beside
  const k = new THREE.Group();
  k.add(lathe([[0, 0], [0.06, 0], [0.065, 0.06], [0.05, 0.12], [0.02, 0.13], [0, 0.13]], M.blackMetal, 24));
  k.add(rod(new THREE.Vector3(0.05, 0.03, 0), new THREE.Vector3(0.13, 0.15, 0), 0.007, M.blackMetal, 8));
  k.add(rod(new THREE.Vector3(-0.05, 0.11, 0), new THREE.Vector3(-0.09, 0.05, 0), 0.009, M.walnut, 8));
  k.position.set(0.0, 0, 0.3); k.rotation.y = Math.PI / 2 + 0.4; g.add(k);
  return g;
}

function pastryDome() {
  const g = new THREE.Group();
  g.add(at(cyl(0.16, 0.16, 0.025, M.walnut, 40), 0, 0.0125, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.glass); dome.scale.y = 1.1; dome.position.y = 0.025; dome.renderOrder = 4; g.add(dome);
  g.add(at(sph(0.015, M.glassTint, 10, 8), 0, 0.195, 0));
  M.cookie ??= new THREE.MeshStandardMaterial({ color: 0xa8743d, roughness: 0.9 });
  M.canele ??= new THREE.MeshStandardMaterial({ color: 0x5a2d14, roughness: 0.45 });
  for (let i = 0; i < 4; i++) { const c = cyl(0.04, 0.042, 0.014, M.cookie, 18); c.position.set(-0.05 + (i % 2) * 0.03, 0.035 + i * 0.012, -0.03 + (i % 2) * 0.01); c.rotation.x = 0.1 * (i % 2); g.add(c); }
  for (const [x, z] of [[0.06, 0.04], [0.04, -0.06], [0.09, -0.01]]) g.add(at(cyl(0.022, 0.026, 0.045, M.canele, 10), x, 0.048, z));
  return g;
}

function tablet() {
  const g = new THREE.Group();
  g.add(at(cyl(0.05, 0.06, 0.012, M.darkMetal, 20), 0, 0.006, 0));
  g.add(rod(new THREE.Vector3(0, 0.01, 0), new THREE.Vector3(0, 0.12, -0.02), 0.01, M.darkMetal, 8));
  const c = canvas(256, 192), x = c.getContext("2d");
  x.fillStyle = "#14161a"; x.fillRect(0, 0, 256, 192);
  x.fillStyle = "#f1e5cc"; x.font = "600 18px Archivo, sans-serif"; x.fillText("JDV · Order", 16, 30);
  for (let i = 0; i < 4; i++) { x.fillStyle = "rgba(241,229,204,0.18)"; x.fillRect(16, 46 + i * 30, 224, 22); }
  x.fillStyle = "#a6382a"; x.fillRect(16, 162, 224, 20);
  const scr = new THREE.MeshStandardMaterial({ map: tex(c, { wrap: false }), emissive: 0xffffff, emissiveMap: tex(c, { wrap: false }), emissiveIntensity: 0.6, roughness: 0.2 });
  const t = cbox(0.24, 0.17, 0.012, M.blackMatte, 0, 0.17, -0.03, { uv: false });
  t.rotation.x = -0.35; g.add(t);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.15), scr); s.position.set(0, 0.172, -0.023); s.rotation.x = -0.35; g.add(s);
  return g;
}

function makeSteam(ctx) {
  const c = canvas(64, 64), x = c.getContext("2d");
  const grd = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,255,255,0.5)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
  const mat = new THREE.SpriteMaterial({ map: tex(c, { wrap: false }), transparent: true, depthWrite: false, opacity: 0.4, color: 0xfff4e6 });
  const pool = [];
  for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(mat.clone()); s.visible = false; s.userData.dynamic = true; ctx.scene.add(s); pool.push({ s, life: 0 }); }
  let acc = 0;
  return {
    emit(p, rate) {
      acc += rate * 0.5;
      while (acc >= 1) {
        acc -= 1;
        const it = pool.find((q) => q.life <= 0);
        if (!it) return;
        it.life = 1.6 + Math.random() * 0.8; it.max = it.life;
        it.s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.02, 0, (Math.random() - 0.5) * 0.02));
        it.v = new THREE.Vector3((Math.random() - 0.5) * 0.03, 0.12 + Math.random() * 0.08, (Math.random() - 0.5) * 0.03);
        it.s.visible = true;
      }
    },
    update(dt) {
      for (const it of pool) {
        if (it.life <= 0) continue;
        it.life -= dt;
        it.s.position.addScaledVector(it.v, dt);
        const k = 1 - it.life / it.max;
        it.s.scale.setScalar(0.04 + k * 0.16);
        it.s.material.opacity = 0.35 * Math.sin(Math.PI * Math.min(1, k * 1.1));
        if (it.life <= 0) it.s.visible = false;
      }
    },
  };
}
