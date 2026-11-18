// Goods: checkerboard pegboard, clothing rack, stainless shelving with the boxed
// figure, JDV Records lightbox, toy vitrine, framed sleeves, bench, New Arrivals island.
import * as THREE from "three";
import { F, ROOM } from "../layout.js";
import { M, T } from "../materials.js";
import { bx, cbox, cyl, at, rod, lathe, sph } from "../geo.js";
import { canvas, tex, PAL, rng, shade } from "../textures.js";
import { img, FONT_DISPLAY } from "../brand.js";
import { galvBox, mug, frame } from "./props.js";
import { buildMascot } from "./mascot.js";
import { mushroomLamp, flipCrate } from "./records.js";

export function buildMerch(ctx) {
  const g = new THREE.Group(); g.name = "merch";
  ctx.scene.add(g);
  pegboard(g, ctx);
  rack(g, ctx);
  steelShelf(g, ctx);
  lightbox(g, ctx);
  vitrine(g, ctx);
  frames(g, ctx);
  bench(g, ctx);
  island(g, ctx);
  return g;
}

// ---------------------------------------------------------------------------
// Merch objects (also used by the inspect view)
// ---------------------------------------------------------------------------
export function buildCap(crownMat = M.capNavy, brimMat = M.navyPaint, s = 1) {
  const g = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.095, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), crownMat);
  crown.scale.set(1, 0.82, 1.05); crown.castShadow = true; g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.096, 0.012, 36, 1, true), crownMat); band.position.y = -0.006; g.add(band);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 6), brimMat); button.position.y = 0.077; g.add(button);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.006, 28, 1, false, -Math.PI / 2, Math.PI), brimMat);
  brim.scale.set(1.05, 1, 1.15); brim.position.set(0, -0.008, 0.08); brim.rotation.x = 0.12; brim.castShadow = true; g.add(brim);
  g.scale.setScalar(s);
  return g;
}

export function buildHeadphones() {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 10, 40, Math.PI), M.blackMatte); band.castShadow = true; g.add(band);
  const pad = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 10, 30, Math.PI * 0.5), M.leather); pad.rotation.z = Math.PI * 0.25; g.add(pad);
  for (const s of [-1, 1]) {
    const cup = cyl(0.043, 0.043, 0.032, M.blackMatte, 28); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.088, -0.03, 0); g.add(cup);
    const cush = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.012, 10, 24), M.leather); cush.rotation.y = Math.PI / 2; cush.position.set(s * 0.07, -0.03, 0); g.add(cush);
    const yoke = cbox(0.006, 0.05, 0.012, M.chrome, s * 0.09, 0.0, 0, { uv: false }); g.add(yoke);
  }
  return g;
}

export function buildTote() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.36, 0.42, 8, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.02 * Math.cos((x / 0.36) * Math.PI) * (0.5 + 0.5 * (y / 0.42 + 0.5)) - 0.005 * Math.sin(y * 9)); }
  geo.computeVertexNormals();
  const bag = new THREE.Mesh(geo, M.tote); bag.castShadow = true; g.add(bag);
  for (const s of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 30, Math.PI), M.creamFabric);
    strap.position.set(0, 0.2, s * 0.004); strap.scale.set(0.55, 1, 1); strap.castShadow = true; g.add(strap);
  }
  return g;
}

export function buildKeychain() {
  const g = new THREE.Group();
  const c = canvas(256, 256); const x = c.getContext("2d");
  x.fillStyle = "#efe5cf"; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
  x.drawImage(img.mascotNavy, 30, 22, 196, 196 * img.mascotNavy.height / img.mascotNavy.width);
  const mat = new THREE.MeshPhysicalMaterial({ map: tex(c, { wrap: false }), roughness: 0.15, clearcoat: 1 });
  const disc = cyl(0.03, 0.03, 0.006, mat, 32); disc.rotation.x = Math.PI / 2; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0018, 6, 20), M.chrome); ring.position.y = 0.043; g.add(ring);
  const link = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0012, 6, 12), M.chrome); link.position.y = 0.032; link.rotation.y = Math.PI / 2; g.add(link);
  return g;
}

export function buildFolded(printMat, baseMat, n = 3) {
  const g = new THREE.Group();
  let y = 0;
  for (let i = 0; i < n; i++) {
    const h = 0.055;
    const b = cbox(0.34, h, 0.28, baseMat, (i % 2 ? 0.006 : -0.004), y + h / 2, (i % 2 ? -0.004 : 0.005), { tile: [0.4, 0.4], round: 0.022, seg: 3 });
    g.add(b);
    y += h - 0.004;
  }
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.25), printMat);
  top.rotation.x = -Math.PI / 2; top.position.set(0, y + 0.0015, 0.0); g.add(top);
  // the print also shows on the folded front edge
  return g;
}

export function buildFigureBox() {
  const g = new THREE.Group();
  const W = 0.3, H = 0.42, D = 0.22, t = 0.006;
  g.add(cbox(W, t, D, M.figRed, 0, t / 2, 0, { uv: false }));
  g.add(cbox(W, t, D, M.figRed, 0, H - t / 2, 0, { uv: false }));
  g.add(cbox(W, H, t, M.figRed, 0, H / 2, -D / 2 + t / 2, { uv: false }));
  for (const s of [-1, 1]) {
    g.add(cbox(t, H, D, M.figRed, s * (W / 2 - t / 2), H / 2, 0, { uv: false }));
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(D, H), M.figSide);
    sp.position.set(s * (W / 2 + 0.0005), H / 2, 0); sp.rotation.y = s * Math.PI / 2; g.add(sp);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * t, H - 2 * t), M.figBack);
  back.position.set(0, H / 2, -D / 2 + t + 0.001); g.add(back);
  // front frame bands with print
  const band = (y0, y1, mat) => {
    g.add(cbox(W, y1 - y0, t, M.figRed, 0, (y0 + y1) / 2, D / 2 - t / 2, { uv: false }));
    const p = new THREE.Mesh(new THREE.PlaneGeometry(W, y1 - y0), mat); p.position.set(0, (y0 + y1) / 2, D / 2 + 0.0006); g.add(p);
  };
  band(H - 0.095, H, M.figTop);
  band(0, 0.075, M.figBottom);
  for (const s of [-1, 1]) g.add(cbox(0.035, H - 0.17, t, M.figRed, s * (W / 2 - 0.0175), 0.075 + (H - 0.17) / 2, D / 2 - t / 2, { uv: false }));
  const win = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.07, H - 0.17), M.acrylic);
  win.position.set(0, 0.075 + (H - 0.17) / 2, D / 2 - 0.002); win.renderOrder = 4; g.add(win);
  const fig = buildMascot("classic", { scale: 0.27 });
  fig.position.set(0, t, 0.0); g.add(fig);
  return g;
}

// ---------------------------------------------------------------------------
function pegboardTexture() {
  const cols = 7, rows = 8, S = 128;
  const c = canvas(cols * S, rows * S);
  const g = c.getContext("2d");
  const oak = M.oak.map.image;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * S, y = j * S;
    if ((i + j) % 2 === 0) g.drawImage(oak, (i * 97) % 600, (j * 53) % 300, 180, 180, x, y, S, S);
    else { g.fillStyle = "#1c2338"; g.fillRect(x, y, S, S); g.fillStyle = "rgba(255,255,255,0.03)"; for (let k = 0; k < 40; k++) g.fillRect(x + Math.random() * S, y + Math.random() * S, 2, 2); }
  }
  g.strokeStyle = "rgba(20,14,8,0.35)"; g.lineWidth = 2;
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * S, 0); g.lineTo(i * S, rows * S); g.stroke(); }
  for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * S); g.lineTo(cols * S, j * S); g.stroke(); }
  // peg holes at square centres
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const grd = g.createRadialGradient(i * S + S / 2, j * S + S / 2, 1, i * S + S / 2, j * S + S / 2, 10);
    grd.addColorStop(0, "rgba(5,4,3,0.95)"); grd.addColorStop(1, "rgba(5,4,3,0)");
    g.fillStyle = grd; g.beginPath(); g.arc(i * S + S / 2, j * S + S / 2, 10, 0, 7); g.fill();
  }
  return { c, cols, rows };
}

function pegboard(g, ctx) {
  const P = F.pegboard, x = ROOM.x0 + 0.012, t = 0.024;
  const { c, cols, rows } = pegboardTexture();
  const mat = new THREE.MeshStandardMaterial({ map: tex(c, { wrap: false }), roughness: 0.55 });
  const w = P.z1 - P.z0, h = P.y1 - P.y0;
  g.add(bx(ROOM.x0 + 0.004, P.y0, P.z0, x + t, P.y1, P.z1, M.walnutDark, { uv: false }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  face.position.set(x + t + 0.0008, (P.y0 + P.y1) / 2, (P.z0 + P.z1) / 2); face.rotation.y = Math.PI / 2; face.receiveShadow = true; g.add(face);
  // square centres → world (face u runs toward -z)
  const cell = (i, j) => ({ z: P.z1 - (i + 0.5) * (w / cols), y: P.y1 - (j + 0.5) * (h / rows) });
  const pegAt = (i, j, len = 0.1) => {
    const p = cell(i, j);
    const peg = cyl(0.011, 0.011, len, M.oak, 12); peg.rotation.z = Math.PI / 2; peg.position.set(x + t + len / 2, p.y, p.z); g.add(peg);
    const tip = sph(0.014, M.oak, 12, 8); tip.position.set(x + t + len, p.y, p.z); g.add(tip);
    return { x: x + t + len, ...p };
  };
  for (const [i, j] of [[0, 1], [2, 0], [4, 1], [6, 0], [1, 4], [3, 3], [5, 5], [6, 3], [2, 6]]) pegAt(i, j, 0.07);
  // headphones
  const hp = pegAt(5, 3, 0.12);
  const ph = buildHeadphones(); ph.rotation.y = Math.PI / 2; ph.position.set(hp.x - 0.05, hp.y - 0.075, hp.z); g.add(ph);
  // keychain
  const kp = pegAt(3, 2, 0.09);
  const kc = buildKeychain(); kc.rotation.y = Math.PI / 2; kc.position.set(kp.x - 0.02, kp.y - 0.05, kp.z); g.add(kc);
  // navy cap
  const cp = pegAt(1, 6, 0.12);
  const cap = buildCap(); cap.rotation.set(0, Math.PI / 2, -1.25); cap.position.set(cp.x - 0.035, cp.y - 0.05, cp.z); g.add(cap);
  // tote hanging off the right edge
  const tp = pegAt(0, 2, 0.12);
  const tote = buildTote(); tote.rotation.y = Math.PI / 2; tote.position.set(tp.x - 0.04, tp.y - 0.29, tp.z + 0.02); g.add(tote);

  ctx.interactions.push(
    { box: [x, hp.y - 0.18, hp.z - 0.12, x + 0.2, hp.y + 0.05, hp.z + 0.12], name: "Studio headphones", verb: "Inspect", dist: 2.2,
      inspect: { title: "Shop listening headphones", kind: "Closed-back · for the listening table", text: "Grab a pair and take any record to the turntable. We keep a couple of these on the board for crate diggers.", details: ["Leather pads", "3 m coiled cable", "Not for sale (but ask)"], make: buildHeadphones } },
    { box: [x, kp.y - 0.09, kp.z - 0.06, x + 0.16, kp.y + 0.03, kp.z + 0.06], name: "Mascot keychain", verb: "Inspect", dist: 2.2,
      inspect: { title: "Mascot acrylic keychain", kind: "Accessory", text: "The JDV mascot on a thick, glossy acrylic disc with a nickel ring.", details: ["60 mm acrylic", "Double-sided print", "Nickel split ring"], make: buildKeychain } },
    { box: [x, cp.y - 0.15, cp.z - 0.13, x + 0.22, cp.y + 0.06, cp.z + 0.13], name: "JDV logo cap", verb: "Inspect", dist: 2.2,
      inspect: { title: "JDV logo cap", kind: "Headwear · navy", text: "Six-panel washed twill cap with the JDV monogram embroidered in cream, as worn by the mascot.", details: ["100% cotton twill", "Embroidered front", "Brass buckle strap"], make: () => buildCap() } },
    { box: [x, tp.y - 0.52, tp.z - 0.2, x + 0.18, tp.y + 0.05, tp.z + 0.24], name: "Jeon de Vero tote", verb: "Inspect", dist: 2.2,
      inspect: { title: "Jeon de Vero canvas tote", kind: "Bag · natural canvas", text: "Heavy canvas tote with the script logo printed in navy. Fits about fifteen LPs.", details: ["12 oz cotton canvas", "Screen printed", "Long handles"], make: buildTote } },
  );
}

// ---------------------------------------------------------------------------
function garmentTexture(kind) {
  const S = 512, c = canvas(S, S), g = c.getContext("2d");
  // canvas maps shape coords x∈[-0.3,0.3], y∈[-0.72,0.02]
  const X = (x) => ((x + 0.3) / 0.6) * S, Y = (y) => S - ((y + 0.72) / 0.74) * S;
  const spec = {
    varsityNavy: { body: PAL.navy, sleeve: "#ece2cb", rib: [PAL.navy, PAL.cream, PAL.red], chest: "JDV", chestCol: PAL.cream },
    coachCream: { body: "#e9dec6", sleeve: "#e9dec6", rib: ["#e9dec6"], script: "navy" },
    sweatNavy: { body: PAL.navy, sleeve: PAL.navy, rib: [shade(PAL.navy, -0.2)], script: "cream" },
    hoodieCream: { body: "#efe5cf", sleeve: "#efe5cf", rib: ["#e2d6bc"], mascot: true },
    varsityBurg: { body: PAL.burgundy, sleeve: "#ece2cb", rib: [PAL.burgundy, PAL.cream, PAL.burgundy], chest: "JDV", chestCol: PAL.cream },
    coachNavy: { body: "#232f4c", sleeve: "#232f4c", rib: ["#232f4c"], chest: "JDV", chestCol: PAL.cream, small: true },
  }[kind];
  g.fillStyle = spec.body; g.fillRect(0, 0, S, S);
  g.fillStyle = spec.sleeve; g.fillRect(0, 0, X(-0.19), S); g.fillRect(X(0.19), 0, S, S);
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 3;
  for (const sx of [-0.19, 0.19]) { g.beginPath(); g.moveTo(X(sx), Y(-0.1)); g.lineTo(X(sx), Y(-0.69)); g.stroke(); }
  // ribs: hem + cuffs + collar
  const ribH = 0.045;
  spec.rib.forEach((col, i) => { g.fillStyle = col; const k = ribH / spec.rib.length; g.fillRect(X(-0.21), Y(-0.695 + ribH - i * k), X(0.21) - X(-0.21), Y(-0.695 + ribH - (i + 1) * k) - Y(-0.695 + ribH - i * k)); });
  g.fillStyle = spec.rib[0]; g.fillRect(0, Y(-0.58), X(-0.19), Y(-0.64) - Y(-0.58)); g.fillRect(X(0.19), Y(-0.58), S, Y(-0.64) - Y(-0.58));
  if (spec.rib.length > 1) { g.fillStyle = spec.rib[2]; for (const sx of [[0, X(-0.19)], [X(0.19), S]]) g.fillRect(sx[0], Y(-0.45), sx[1] - sx[0], 8); }
  // placket / zip
  g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(X(-0.004), Y(-0.03), 4, Y(-0.65) - Y(-0.03));
  if (kind.startsWith("varsity")) { g.fillStyle = "#d9cdb0"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(X(0.012), Y(-0.12 - k * 0.11), 6, 0, 7); g.fill(); } }
  if (spec.chest) {
    g.fillStyle = spec.chestCol; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `${spec.small ? 34 : 64}px ${FONT_DISPLAY}`;
    g.save(); g.translate(X(spec.small ? -0.09 : -0.085), Y(-0.2)); g.scale(1, 1.2); g.fillText("JDV", 0, 0); g.restore();
  }
  if (spec.script) { const im = spec.script === "navy" ? img.scriptNavy : img.scriptCream; const w = X(0.17) - X(-0.17); g.drawImage(im, X(-0.17), Y(-0.17), w, w * im.height / im.width); }
  if (spec.mascot) { const w = X(0.13) - X(-0.13); g.drawImage(img.mascotNavy, X(-0.13), Y(-0.12), w, w * img.mascotNavy.height / img.mascotNavy.width); }
  // fabric noise
  const d = g.getImageData(0, 0, S, S); const r = rng(kind.length * 13);
  for (let i = 0; i < d.data.length; i += 4) { const k = (r() - 0.5) * 12; d.data[i] += k; d.data[i + 1] += k; d.data[i + 2] += k; }
  g.putImageData(d, 0, 0);
  return c;
}

let garmentGeo = null;
function garmentGeometry() {
  if (garmentGeo) return garmentGeo;
  const pts = [[0.07, -0.025], [0.2, -0.07], [0.248, -0.14], [0.27, -0.58], [0.262, -0.64], [0.2, -0.645], [0.212, -0.69], [0.2, -0.7]];
  const s = new THREE.Shape();
  s.moveTo(-0.07, -0.025);
  s.quadraticCurveTo(0, -0.07, 0.07, -0.025);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  for (const [x, y] of [...pts].reverse().slice(0, -1)) s.lineTo(-x, y);
  s.lineTo(-0.07, -0.025);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 3, curveSegments: 8 });
  geo.translate(0, 0, -0.0175);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.3) / 0.6, (uv.getY(i) + 0.72) / 0.74);
  geo.computeVertexNormals();
  return (garmentGeo = geo);
}

const GARMENTS = {
  varsityNavy: { title: "JDV varsity jacket", kind: "Outerwear · navy / cream", text: "Wool body, cream leather-look sleeves and striped ribbing in navy, cream and red, with the JDV chest mark.", details: ["Wool blend body", "Snap front", "Quilted lining"] },
  coachCream: { title: "Script coach jacket", kind: "Outerwear · cream", text: "Light nylon coach jacket with the Jeon de Vero script across the chest.", details: ["Water-resistant nylon", "Snap front", "Drawcord hem"] },
  sweatNavy: { title: "Script crewneck", kind: "Sweatshirt · navy", text: "Heavyweight loopback crewneck with the cream script logo, the same one painted on the wall.", details: ["450 gsm cotton", "Ribbed cuffs", "Garment dyed"] },
  hoodieCream: { title: "Mascot hoodie", kind: "Hoodie · cream", text: "Brushed fleece hoodie with the JDV mascot printed in navy.", details: ["Brushed fleece", "Double-layer hood", "Kangaroo pocket"] },
  varsityBurg: { title: "Burgundy varsity jacket", kind: "Outerwear · burgundy / cream", text: "The burgundy colourway of the shop varsity, with cream sleeves.", details: ["Wool blend body", "Snap front", "Striped rib"] },
  coachNavy: { title: "Navy coach jacket", kind: "Outerwear · navy", text: "Everyday navy coach jacket with a small JDV mark on the chest.", details: ["Nylon shell", "Snap front", "Drawcord hem"] },
};

export function buildGarment(kind) {
  const mat = new THREE.MeshStandardMaterial({ map: tex(garmentTexture(kind), { wrap: false }), roughness: 0.92 });
  const g = new THREE.Group();
  const m = new THREE.Mesh(garmentGeometry(), mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
  // wooden hanger + hook
  const bar = cyl(0.009, 0.009, 0.4, M.oak, 8); bar.rotation.z = Math.PI / 2; bar.position.y = -0.03; g.add(bar);
  for (const s of [-1, 1]) g.add(rod(new THREE.Vector3(0, 0.0, 0), new THREE.Vector3(s * 0.19, -0.05, 0), 0.008, M.oak, 8));
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 16, Math.PI * 1.3), M.chrome); hook.position.y = 0.035; hook.rotation.z = -0.3; g.add(hook);
  return g;
}

function rack(g, ctx) {
  const R = F.rack, x = R.x, y = R.h;
  for (const z of [R.z0, R.z1]) {
    g.add(rod(new THREE.Vector3(x, 0.07, z), new THREE.Vector3(x, y, z), 0.014, M.chrome, 12));
    g.add(rod(new THREE.Vector3(x - 0.3, 0.06, z), new THREE.Vector3(x + 0.3, 0.06, z), 0.014, M.chrome, 12));
    for (const dx of [-0.28, 0.28]) { const w = sph(0.025, M.rubber, 10, 8); w.position.set(x + dx, 0.025, z); g.add(w); }
  }
  g.add(rod(new THREE.Vector3(x, y, R.z0 - 0.04), new THREE.Vector3(x, y, R.z1 + 0.04), 0.013, M.chrome, 12));
  const kinds = ["varsityBurg", "coachNavy", "hoodieCream", "sweatNavy", "coachCream", "varsityNavy"];
  const r = rng(5);
  kinds.forEach((k, i) => {
    const gm = buildGarment(k);
    const z = R.z0 + 0.12 + (i * (R.z1 - R.z0 - 0.2)) / (kinds.length - 1);
    gm.position.set(x, y - 0.035, z);
    gm.rotation.y = (r() - 0.5) * 0.22 + (i === kinds.length - 1 ? 0.18 : 0);
    gm.rotation.z = (r() - 0.5) * 0.03;
    g.add(gm);
  });
  ctx.interactions.push({
    box: [x - 0.32, 0.4, R.z1 - 0.25, x + 0.32, y + 0.08, R.z1 + 0.08], name: "Clothing rack", verb: "Browse", dist: 2.4,
    use: (game) => { rackIndex = (rackIndex + 1) % kinds.length; const k = kinds[kinds.length - 1 - rackIndex]; game.openInspect({ ...GARMENTS[k], make: () => buildGarment(k) }); },
  });
}
let rackIndex = -1;

// ---------------------------------------------------------------------------
function steelShelf(g, ctx) {
  const S = F.steelShelf, w = S.x1 - S.x0, d = S.z1 - S.z0, top = S.levels[S.levels.length - 1] + 0.03;
  // angle posts
  for (const x of [S.x0, S.x1]) for (const z of [S.z0, S.z1]) {
    const sx = x === S.x0 ? 1 : -1, sz = z === S.z0 ? 1 : -1;
    g.add(bx(x, 0, z, x + sx * 0.035, top, z + sz * 0.003, M.steel, { uv: false }));
    g.add(bx(x, 0, z, x + sx * 0.003, top, z + sz * 0.035, M.steel, { uv: false }));
    g.add(at(cyl(0.016, 0.016, 0.012, M.rubber, 10), x + sx * 0.018, 0.006, z + sz * 0.018));
  }
  for (const y of S.levels) {
    g.add(bx(S.x0, y, S.z0, S.x1, y + 0.025, S.z1, M.steel, { tile: [0.5, 0.5] }));
    g.add(bx(S.x0, y - 0.025, S.z1 - 0.004, S.x1, y + 0.025, S.z1, M.steel, { tile: [0.5, 0.5] }));
  }
  const L = (i) => S.levels[i] + 0.025, zc = (S.z0 + S.z1) / 2;
  // top: boxed figure + loose mini figure
  const box = buildFigureBox(); box.position.set(2.43, L(4), zc + 0.01); g.add(box);
  const fig = buildMascot("classic", { scale: 0.17 }); fig.position.set(2.02, L(4), zc + 0.06); fig.rotation.y = 0.25; g.add(fig);
  ctx.shelfPotSpot2 = new THREE.Vector3(1.66, L(4), zc);
  ctx.interactions.push(
    { box: [2.27, L(4), S.z0, 2.6, L(4) + 0.44, S.z1 + 0.05], name: "Boxed JDV figure", verb: "Inspect", dist: 2.6,
      inspect: { title: "JDV mascot vinyl figure", kind: "Designer toy · boxed edition", text: "The mascot as a 25 cm soft-vinyl figure: cream cap, sleepy eyes, the moustache. Comes in the red window box.", details: ["Soft vinyl", "25 cm", "Numbered box"], make: buildFigureBox } },
    { box: [1.9, L(4), S.z0, 2.14, L(4) + 0.2, S.z1 + 0.05], name: "Mascot figure (loose)", verb: "Inspect", dist: 2.6,
      inspect: { title: "Desk-size mascot figure", kind: "Designer toy · 17 cm", text: "A smaller loose version of the figure, sized for a desk or a record shelf.", details: ["Soft vinyl", "17 cm", "Classic colourway"], make: () => buildMascot("classic", { scale: 0.6 }) } },
  );
  // level 3: mug, amber lamp, cap, books
  const mg = mug(); mg.position.set(1.62, L(3), zc + 0.08); mg.rotation.y = -0.4; g.add(mg);
  mushroomLamp(g, ctx, { x: 1.86, y: L(3), z: zc }, "shelf", { scale: 0.72, amber: true });
  const cap = buildCap(); cap.position.set(2.27, L(3) + 0.012, zc + 0.02); cap.rotation.y = 0.25; g.add(cap);
  ctx.books.row(2.46, L(3), zc - 0.02, 0, 0.27, { hMin: 0.2, hMax: 0.26, dMin: 0.15, dMax: 0.19 });
  ctx.interactions.push(
    { box: [1.55, L(3), S.z0, 1.7, L(3) + 0.12, S.z1 + 0.05], name: "JDV mug", verb: "Inspect", dist: 2.4,
      inspect: { title: "JDV diner mug", kind: "Ceramic · 350 ml", text: "Thick-walled glossy mug with the JDV mark. The same one we serve hand drip in.", details: ["Stoneware", "350 ml", "Dishwasher safe"], make: () => mug() } },
    { box: [2.14, L(3), S.z0, 2.4, L(3) + 0.12, S.z1 + 0.05], name: "JDV logo cap", verb: "Inspect", dist: 2.4,
      inspect: { title: "JDV logo cap", kind: "Headwear · navy", text: "Six-panel washed twill cap with the JDV monogram embroidered in cream.", details: ["100% cotton twill", "Embroidered front", "Brass buckle strap"], make: () => buildCap() } },
  );
  // level 2: folded sweatshirts
  const navy = buildFolded(M.print_script, M.navyFabric); navy.position.set(1.85, L(2), zc + 0.01); g.add(navy);
  const cream = buildFolded(M.print_mascot, M.creamFabric); cream.position.set(2.42, L(2), zc + 0.01); g.add(cream);
  ctx.interactions.push(
    { box: [1.62, L(2), S.z0, 2.08, L(2) + 0.2, S.z1 + 0.05], name: "Script crewneck", verb: "Inspect", dist: 2.4,
      inspect: { title: "Script crewneck", kind: "Sweatshirt · navy", text: "Heavyweight crewneck with the cream Jeon de Vero script.", details: ["450 gsm cotton", "Garment dyed", "S–XL"], make: () => buildFolded(M.print_script, M.navyFabric, 1) } },
    { box: [2.2, L(2), S.z0, 2.66, L(2) + 0.2, S.z1 + 0.05], name: "Mascot crewneck", verb: "Inspect", dist: 2.4,
      inspect: { title: "Mascot crewneck", kind: "Sweatshirt · cream", text: "Cream crewneck with the mascot printed in navy.", details: ["450 gsm cotton", "Water-based ink", "S–XL"], make: () => buildFolded(M.print_mascot, M.creamFabric, 1) } },
  );
  // level 1: canister + galvanised box
  const can = new THREE.Group(); can.add(at(cyl(0.1, 0.1, 0.2, M.steel, 32), 0, 0.1, 0)); can.add(at(cyl(0.104, 0.104, 0.025, M.chrome, 32), 0, 0.205, 0)); can.add(at(cyl(0.02, 0.02, 0.02, M.chrome, 12), 0, 0.225, 0));
  can.position.set(1.8, L(1), zc); g.add(can);
  const gb = galvBox(0.36, 0.22, 0.32); gb.position.set(2.4, L(1), zc); g.add(gb);
  const gb2 = galvBox(0.36, 0.22, 0.32); gb2.position.set(1.82, L(0), zc); g.add(gb2);
  const gb3 = galvBox(0.36, 0.22, 0.32); gb3.position.set(2.4, L(0), zc); g.add(gb3);
}

function lightbox(g, ctx) {
  const L = F.lightbox, z0 = ROOM.z0;
  g.add(bx(L.x - L.w / 2, L.y - L.h / 2, z0, L.x + L.w / 2, L.y + L.h / 2, z0 + 0.1, M.blackMetal, { uv: false }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(L.w - 0.05, L.h - 0.05), M.lightbox);
  face.position.set(L.x, L.y, z0 + 0.101); g.add(face);
  const glow = new THREE.PointLight(0xffe7c2, 1.2, 2.2, 2);
  glow.position.set(L.x, L.y - 0.1, z0 + 0.45); ctx.scene.add(glow);
}

// ---------------------------------------------------------------------------
function toyRecordHead(color) {
  const g = new THREE.Group();
  const body = cyl(0.05, 0.06, 0.1, new THREE.MeshPhysicalMaterial({ color, roughness: 0.4, clearcoat: 0.5 }), 20); body.position.y = 0.05; g.add(body);
  const head = cyl(0.075, 0.075, 0.012, M.vinyl, 40); head.rotation.x = Math.PI / 2; head.position.y = 0.17; g.add(head);
  const lab = cyl(0.025, 0.025, 0.014, M.recordLabel, 24); lab.rotation.x = Math.PI / 2; lab.position.y = 0.17; g.add(lab);
  for (const s of [-1, 1]) { const e = sph(0.008, M.eyeWhite, 8, 6); e.position.set(s * 0.012, 0.18, 0.009); g.add(e); }
  return g;
}
function toyCup() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.045, 0], [0.06, 0.12], [0.064, 0.13], [0, 0.13]], M.ceramic, 24));
  const lid = cyl(0.066, 0.064, 0.02, M.navyPaint, 24); lid.position.y = 0.14; g.add(lid);
  const sleeve = cyl(0.058, 0.052, 0.045, M.kraft, 24); sleeve.position.y = 0.07; g.add(sleeve);
  for (const s of [-1, 1]) { const e = sph(0.009, M.ink, 8, 6); e.position.set(s * 0.02, 0.075, 0.056); g.add(e); }
  return g;
}

function vitrine(g, ctx) {
  const V = F.vitrine, x0 = V.x0, x1 = V.x1, h = V.h;
  const w = (a, b, c, d, e, f, grain = "y") => g.add(bx(a, b, c, d, e, f, M.walnut, { tile: [1.2, 0.6], grain }));
  w(x0, 0, V.z0, x1, 0.12, V.z1, "z");
  w(x0, h - 0.06, V.z0, x1, h, V.z1, "z");
  for (const z of [V.z0, V.z1 - 0.04]) w(x0, 0, z, x0 + 0.04, h, z + 0.04);
  w(x1 - 0.02, 0.12, V.z0, x1, h - 0.06, V.z1, "z");
  const glassF = new THREE.Mesh(new THREE.PlaneGeometry(V.z1 - V.z0 - 0.08, h - 0.18), M.glass);
  glassF.position.set(x0 + 0.02, (0.12 + h - 0.06) / 2, (V.z0 + V.z1) / 2); glassF.rotation.y = Math.PI / 2; g.add(glassF);
  for (const z of [V.z0 + 0.002, V.z1 - 0.002]) {
    const gs = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.04, h - 0.18), M.glass);
    gs.position.set((x0 + x1) / 2, (0.12 + h - 0.06) / 2, z); g.add(gs);
  }
  const shelves = [0.12, 0.55, 0.96, 1.36];
  for (const y of shelves.slice(1)) { const s = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.06, 0.008, V.z1 - V.z0 - 0.08), M.glassTint); s.position.set((x0 + x1) / 2, y, (V.z0 + V.z1) / 2); g.add(s); }
  // LED strip
  g.add(bx(x0 + 0.05, h - 0.075, V.z0 + 0.05, x0 + 0.07, h - 0.065, V.z1 - 0.05, M.bulb, { uv: false, cast: false }));
  const led = new THREE.PointLight(0xffe2b8, 1.4, 1.8, 2); led.position.set(x0 + 0.15, h - 0.25, (V.z0 + V.z1) / 2); ctx.scene.add(led);
  const face = -Math.PI / 2;
  const put = (o, y, z) => { o.position.set((x0 + x1) / 2 - 0.02, y, z); o.rotation.y = face + (Math.random() - 0.5) * 0.3; g.add(o); };
  const zs = (n) => Array.from({ length: n }, (_, i) => V.z0 + 0.15 + (i * (V.z1 - V.z0 - 0.3)) / (n - 1));
  const [a, b, c] = zs(3);
  put(buildMascot("classic", { scale: 0.22 }), shelves[3] + 0.004, b);
  put(buildMascot("midnight", { scale: 0.17 }), shelves[3] + 0.004, a);
  put(buildMascot("burgundy", { scale: 0.17 }), shelves[3] + 0.004, c);
  put(toyRecordHead("#a6382a"), shelves[2] + 0.004, a);
  put(buildMascot("forest", { scale: 0.17 }), shelves[2] + 0.004, b);
  put(toyCup(), shelves[2] + 0.004, c);
  put(toyRecordHead("#1f2b45"), shelves[1] + 0.004, c);
  put(toyCup(), shelves[1] + 0.004, a);
  const sm = buildFigureBox(); sm.scale.setScalar(0.55); put(sm, shelves[1] + 0.004, b);
  put(buildMascot("classic", { scale: 0.26 }), shelves[0] + 0.004, b);
  ctx.interactions.push({
    box: [x0 - 0.04, 0.1, V.z0, x1, h, V.z1], name: "Collector's cabinet", verb: "Look closer", dist: 2.6,
    inspect: { title: "Collector's cabinet", kind: "JDV vinyl figures", text: "The mascot in its colourways, next to the record-head and coffee-cup toys. Five pocket-size minis have wandered off somewhere in the shop. Keep an eye out.", details: ["Classic, Midnight, Burgundy, Forest", "Minis: 5 hidden", "Gold edition: rumoured"], make: () => buildMascot("burgundy", { scale: 0.6 }) },
  });
}

function coverPlane(idx, size) {
  const geo = new THREE.PlaneGeometry(size, size);
  const uv = geo.attributes.uv;
  const cx = idx % 8, cy = Math.floor(idx / 8);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / 8, (7 - cy + uv.getY(i)) / 8);
  return geo;
}

function frames(g, ctx) {
  const Fr = F.frames;
  M.coverArt ??= new THREE.MeshStandardMaterial({ map: T.covers, roughness: 0.5 });
  const picks = [9, 22, 37, 5, 50, 14, 29, 44];
  const n = 4, size = 0.36, gap = (Fr.z1 - Fr.z0 - n * size) / (n - 1);
  picks.forEach((idx, i) => {
    const col = i % n, row = Math.floor(i / n);
    const z = Fr.z0 + size / 2 + col * (size + gap);
    const y = 1.62 + row * 0.46;
    const f = new THREE.Group();
    f.add(cbox(0.03, size + 0.04, size + 0.04, M.walnutDark, 0, 0, 0, { uv: false }));
    const art = new THREE.Mesh(coverPlane(idx, size - 0.01), M.coverArt); art.position.x = -0.016; art.rotation.y = -Math.PI / 2; f.add(art);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(size, size), M.glass); gl.position.x = -0.017; gl.rotation.y = -Math.PI / 2; f.add(gl);
    f.position.set(ROOM.x1 - 0.016, y, z);
    g.add(f);
  });
  ctx.interactions.push({
    box: [ROOM.x1 - 0.1, 1.4, Fr.z0, ROOM.x1, 2.32, Fr.z1], name: "Framed sleeves", verb: "Look closer", dist: 2.6,
    use: (game) => { const i = Math.floor(Math.random() * picks.length); game.ui.caption("On the wall", T.catalogue[picks[i]], picks[i]); },
  });
}

function bench(g, ctx) {
  const B = F.bench;
  g.add(bx(B.x0, B.h - 0.05, B.z0, B.x1, B.h, B.z1, M.walnut, { tile: [1.2, 0.6], grain: "z", round: 0.01 }));
  for (const z of [B.z0 + 0.12, B.z1 - 0.12]) g.add(bx(B.x0 + 0.05, 0, z - 0.03, B.x1 - 0.02, B.h - 0.05, z + 0.03, M.walnutDark, { tile: [1.2, 0.6], grain: "y" }));
  g.add(bx(B.x0 + 0.02, B.h, B.z0 + 0.15, B.x1 - 0.02, B.h + 0.06, B.z1 - 0.5, M.cushion, { tile: [0.5, 0.5], round: 0.025, seg: 3 }));
  ctx.books.stack(3.3, B.h, B.z1 - 0.25, 3, 0.1);
}

function island(g, ctx) {
  const I = F.island, h = I.h, t = 0.02, floorY = h - 0.2;
  const w = (a, b, c, d, e, f, grain = "x") => g.add(bx(a, b, c, d, e, f, M.walnut, { tile: [1.2, 0.6], grain }));
  // body + plinth
  g.add(bx(I.x0 + 0.04, 0, I.z0 + 0.04, I.x1 - 0.04, 0.07, I.z1 - 0.04, M.walnutDark, { tile: [1.2, 0.6] }));
  w(I.x0, 0.07, I.z1 - t, I.x1, h, I.z1);
  w(I.x0, 0.07, I.z0, I.x1, h, I.z0 + t);
  w(I.x0, 0.07, I.z0, I.x0 + t, h, I.z1, "z");
  w(I.x1 - t, 0.07, I.z0, I.x1, h, I.z1, "z");
  w(I.x0, floorY - 0.02, I.z0, I.x1, floorY, I.z1);
  const n = 3, cw = (I.x1 - I.x0 - 2 * t) / n;
  for (let k = 1; k < n; k++) w(I.x0 + t + k * cw - 0.01, floorY, I.z0, I.x0 + t + k * cw + 0.01, h, I.z1, "z");
  // header board + sign
  g.add(bx(I.x0, h, I.z0, I.x1, h + 0.26, I.z0 + 0.025, M.walnut, { tile: [1.2, 0.6], round: 0.006 }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), M.newArrivals);
  sign.position.set((I.x0 + I.x1) / 2, h + 0.13, I.z0 + 0.026); g.add(sign);
  // records facing +z (customer side)
  const r = rng(88);
  ctx.bins = [];
  for (let k = 0; k < n; k++) {
    const xc = I.x0 + t + (k + 0.5) * cw;
    const items = [];
    const N = 30, za = I.z0 + t + 0.06, zb = I.z1 - t - 0.03;
    for (let i = 0; i < N; i++) {
      const z = za + ((zb - za) * i) / (N - 1);
      items.push(ctx.lps.add(xc, floorY, z, -Math.PI / 2, 0.2 - i * 0.002, Math.floor(r() * 63)));
    }
    const bin = { items, flipped: 0 };
    ctx.bins.push(bin);
    ctx.interactions.push({ box: [xc - cw / 2, floorY, I.z0, xc + cw / 2, h + 0.18, I.z1 + 0.04], name: "New arrivals", verb: "Flip through", dist: 2.3, use: (game) => flipCrate(bin, game, items[N - 1].pos) });
  }
}
