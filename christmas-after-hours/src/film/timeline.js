// The edit: 24 camera set-ups in 40 seconds. Cuts sit on the eighth-note grid of the score
// (90 BPM -> 1/3 s). Every set-up is a short, physically plausible move (dolly / slide / tilt)
// with deterministic hand-held drift; the path of each one is checked against the set.
import * as THREE from 'three';
import { DURATION } from '../config.js';
import { ease, lerp, fbm1, smooth, clamp } from '../core/util.js';

const E = 1 / 3; // one eighth note

export function makeTimeline(world) {
  const A = world.anchors;
  const v = (o, dx = 0, dy = 0, dz = 0) => [o.x + dx, o.y + dy, o.z + dz];
  const P = A.poster;
  const tt = A.turntable, st = A.stylus || tt;

  // p: camera position, l: look-at, fov in degrees. focus: 'look' or [from, to] metres. ap: aperture.
  const SHOTS = [
    // ---- 00:00 THE WINTER STREET
    { t: 0, name: 'street / wide', sec: 'THE WINTER STREET', a: { p: [-13.8, 1.55, 5.4], l: [1.5, 2.7, 3.7], fov: 36 }, b: { p: [-11.9, 1.55, 5.2], l: [2.0, 2.7, 3.5], fov: 36 }, ap: 0.35, shake: 1.0 },
    { t: 8 * E, name: 'street / lamp', a: { p: [-8.7, 2.25, 3.9], l: [-6.2, 3.85, 1.85], fov: 27 }, b: { p: [-8.4, 2.3, 3.75], l: [-6.2, 3.95, 1.85], fov: 27 }, ap: 1.1, shake: 0.8 },
    { t: 11 * E, name: 'street / sign', a: { p: [-5.6, 1.6, 3.5], l: [-1.9, 3.25, 0.2], fov: 30 }, b: { p: [-4.3, 1.6, 3.7], l: [-0.9, 3.3, 0.2], fov: 30 }, ap: 0.6, shake: 1.0 },
    // ---- 00:05 THE STORE
    { t: 15 * E, name: 'store / front', sec: 'THE STORE', a: { p: [-1.15, 1.5, 7.3], l: [-0.65, 2.1, 0], fov: 34 }, b: { p: [-1.05, 1.5, 5.7], l: [-0.7, 2.0, 0], fov: 34 }, ap: 0.4, shake: 0.9 },
    { t: 22 * E, name: 'store / glass', a: { p: [-2.35, 1.22, 1.55], l: [-1.75, 1.0, -0.36], fov: 28 }, b: { p: [-1.7, 1.22, 1.5], l: [-1.2, 0.98, -0.36], fov: 28 }, ap: 1.2, shake: 0.8 },
    { t: 26 * E, name: 'store / through the glass', a: { p: [-1.0, 1.42, 0.78], l: [-0.8, 1.62, -6], fov: 30 }, b: { p: [-0.92, 1.44, 0.56], l: [-0.78, 1.64, -6], fov: 30 }, focus: [0.7, 6.4], ap: 1.6, shake: 0.7, ez: 'io' },
    // ---- 00:10 RECORDS & MUSIC
    { t: 30 * E, name: 'records / turntable', sec: 'RECORDS & MUSIC', a: { p: [1.22, 1.46, -3.62], l: v(tt, -0.02, 0, -0.02), fov: 30 }, b: { p: [1.4, 1.38, -3.76], l: v(tt, -0.02, 0, -0.02), fov: 30 }, ap: 1.3, shake: 0.6 },
    { t: 35 * E, name: 'records / stylus', a: { p: v(st, -0.3, 0.085, 0.2), l: v(st, 0.02, 0.0, -0.03), fov: 24 }, b: { p: v(st, -0.29, 0.08, 0.1), l: v(st, 0.02, 0.0, -0.04), fov: 24 }, ap: 2.6, shake: 0.35 },
    { t: 39 * E, name: 'records / speaker', a: { p: [1.92, 1.86, -3.2], l: [2.72, 1.93, -3.6], fov: 24 }, b: { p: [2.04, 1.88, -3.27], l: [2.72, 1.94, -3.6], fov: 24 }, ap: 1.8, shake: 0.4 },
    { t: 43 * E, name: 'records / sleeve', a: { p: [1.42, 1.2, -3.12], l: v(A.heroSleeve, 0, 0, -0.03), fov: 27 }, b: { p: [1.5, 1.18, -3.4], l: v(A.heroSleeve, 0, 0, -0.06), fov: 27 }, ap: 1.7, shake: 0.5 },
    // ---- 00:16 THE GARMENTS
    { t: 48 * E, name: 'garments / rail', sec: 'THE GARMENTS', a: { p: [-1.25, 1.46, -2.5], l: [-3.2, 1.42, -3.1], fov: 34 }, b: { p: [-1.25, 1.46, -3.3], l: [-3.2, 1.42, -3.55], fov: 34 }, ap: 0.9, shake: 0.7 },
    { t: 53 * E, name: 'garments / stitching', a: { p: v(A.pocket, 0.44, 0.03, 0.2), l: v(A.pocket, 0, 0, 0.01), fov: 22 }, b: { p: v(A.pocket, 0.44, 0.0, 0.05), l: v(A.pocket, 0, -0.01, 0), fov: 22 }, ap: 2.2, shake: 0.35 },
    { t: 56 * E, name: 'garments / label', a: { p: v(A.label, 0.36, 0.1, 0.12), l: v(A.label, 0, 0, 0), fov: 19 }, b: { p: v(A.label, 0.36, 0.085, -0.03), l: v(A.label, 0, 0, 0), fov: 19 }, ap: 2.4, shake: 0.3 },
    { t: 59 * E, name: 'garments / wrapping', a: { p: [-2.0, 1.27, -2.72], l: [-1.2, 0.84, -1.82], fov: 30 }, b: { p: [-1.6, 1.24, -2.78], l: [-1.05, 0.86, -1.84], fov: 30 }, ap: 1.4, shake: 0.5 },
    { t: 62 * E, name: 'garments / print', a: { p: v(A.tee, 0.98, -0.02, 0.3), l: v(A.tee, 0, 0, 0), fov: 25 }, b: { p: v(A.tee, 0.94, 0.03, -0.04), l: v(A.tee, 0, 0.02, 0), fov: 25 }, ap: 1.6, shake: 0.45 },
    // ---- 00:22 THE MASCOT
    { t: 66 * E, name: 'mascot / the wall', sec: 'THE MASCOT', a: { p: [-0.05, 1.46, -2.45], l: [P.x, P.y + 0.02, P.z], fov: 33 }, b: { p: [-0.28, 1.5, -2.98], l: [P.x, P.y + 0.04, P.z], fov: 33 }, ap: 1.2, shake: 0.55 },
    { t: 73 * E, name: 'mascot / ink', a: { p: [P.x - 0.42, P.y + 0.3, P.z + 1.02], l: [P.x - 0.16, P.y + 0.38, P.z], fov: 25 }, b: { p: [P.x + 0.3, P.y + 0.3, P.z + 0.98], l: [P.x + 0.1, P.y + 0.36, P.z], fov: 25 }, ap: 1.5, shake: 0.4 },
    { t: 80 * E, name: 'mascot / smoke', a: { p: [P.x - 0.98, P.y + 0.06, P.z + 0.98], l: [P.tip.x + 0.06, P.tip.y + 0.14, P.z], fov: 30 }, b: { p: [P.x - 0.88, P.y + 0.26, P.z + 0.92], l: [P.tip.x + 0.08, P.tip.y + 0.3, P.z], fov: 30 }, ap: 1.5, shake: 0.4 },
    // ---- 00:29 CHRISTMAS AFTER HOURS
    { t: 87 * E, name: 'after hours / gift', sec: 'CHRISTMAS AFTER HOURS', a: { p: [-0.5, 1.13, -2.6], l: v(A.gift, -0.05, 0, 0), fov: 28 }, b: { p: [-0.74, 1.1, -2.66], l: v(A.gift, -0.08, 0.01, 0), fov: 28 }, ap: 1.7, shake: 0.45 },
    { t: 92 * E, name: 'after hours / tape', a: { p: v(A.cassette, 0.25, 0.15, 0.2), l: v(A.cassette, -0.03, 0, -0.01), fov: 22 }, b: { p: v(A.cassette, 0.16, 0.15, 0.25), l: v(A.cassette, -0.05, 0, -0.02), fov: 22 }, ap: 2.3, shake: 0.35 },
    { t: 96 * E, name: 'after hours / to the window', a: { p: [-1.0, 1.5, -3.45], l: [-1.1, 1.42, 0], fov: 34 }, b: { p: [-1.04, 1.5, -2.62], l: [-1.1, 1.44, 0], fov: 34 }, focus: [3.3, 2.8], ap: 0.5, shake: 0.6 },
    { t: 101 * E, name: 'after hours / outside', a: { p: [-1.25, 1.5, 1.05], l: [-1.0, 1.52, 0], fov: 34 }, b: { p: [-0.95, 1.5, 2.5], l: [-0.85, 1.6, 0], fov: 34 }, ap: 0.8, shake: 0.8, ez: 'out' },
    // ---- 00:35 THE IDENTITY
    { t: 105 * E, name: 'identity / lights out', sec: 'THE IDENTITY', a: { p: [-0.85, 1.5, 5.5], l: [-0.45, 2.0, 0], fov: 34 }, b: { p: [-0.75, 1.54, 6.9], l: [-0.4, 2.05, 0], fov: 34 }, ap: 0.4, shake: 0.9, end: 112 * E },
    { t: 112 * E, name: 'identity / end card', a: { p: [-0.75, 1.54, 6.9], l: [-0.4, 2.05, 0], fov: 34 }, b: { p: [-0.75, 1.54, 6.9], l: [-0.4, 2.05, 0], fov: 34 }, ap: 0.4, shake: 0 },
  ];
  SHOTS.forEach((s, i) => { s.end = s.end ?? (SHOTS[i + 1] ? SHOTS[i + 1].t : DURATION); s.i = i; });

  const CARD_IN = 112 * E, CARD_FULL = CARD_IN + 0.3;
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), la = new THREE.Vector3(), lb = new THREE.Vector3();
  const m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), e = new THREE.Euler();

  const shotAt = (t) => { let s = SHOTS[0]; for (const x of SHOTS) if (t >= x.t) s = x; return s; };

  function pose(s, t) {
    const u = clamp((t - s.t) / (s.end - s.t), 0, 1);
    const k = ease[s.ez || 'drift'](u);
    pa.set(...s.a.p).lerp(pb.set(...s.b.p), k);
    la.set(...s.a.l).lerp(lb.set(...s.b.l), k);
    return { pos: pa, look: la, fov: lerp(s.a.fov, s.b.fov, k), k };
  }

  function apply(camera, t) {
    const s = shotAt(t);
    const { pos, look, fov, k } = pose(s, t);
    camera.position.copy(pos);
    // hand-held: slow breathing drift plus a little higher-frequency tremor, scaled per set-up
    const sh = (s.shake ?? 0.6) * 0.0048;
    camera.position.x += fbm1(t * 0.35, 21 + s.i) * sh * 1.6;
    camera.position.y += fbm1(t * 0.4, 22 + s.i) * sh * 1.2;
    m.lookAt(camera.position, look, up);
    q.setFromRotationMatrix(m);
    e.set(fbm1(t * 0.62, 5 + s.i) * sh + fbm1(t * 3.1, 6) * sh * 0.22, fbm1(t * 0.55, 7 + s.i) * sh * 1.2 + fbm1(t * 2.7, 8) * sh * 0.22, fbm1(t * 0.3, 9 + s.i) * sh * 0.5);
    camera.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(e));
    camera.fov = fov;
    camera.updateProjectionMatrix();
    const dist = camera.position.distanceTo(look);
    const focus = Array.isArray(s.focus) ? lerp(s.focus[0], s.focus[1], smooth(0.2, 0.85, k)) : dist;
    const card = smooth(CARD_IN, CARD_FULL, t);
    return {
      shot: s,
      focus, aperture: s.ap ?? 1,
      fade: smooth(0, 0.9, t),
      card, still: t >= CARD_FULL ? 1 : 0,
      exposure: 1,
      filmTime: t >= CARD_FULL ? CARD_FULL : t,     // the last 2.4 s are a held frame
    };
  }

  // Sample every set-up and report any frame where the camera would sit inside set geometry.
  function checkPaths(colliders, margin = 0.06) {
    const hits = [];
    for (const s of SHOTS) {
      for (let i = 0; i <= 12; i++) {
        const { pos } = pose(s, s.t + ((s.end - s.t) * i) / 12);
        for (const c of colliders) {
          const b = c.box;
          if (pos.x > b.min.x - margin && pos.x < b.max.x + margin && pos.y > b.min.y - margin && pos.y < b.max.y + margin && pos.z > b.min.z - margin && pos.z < b.max.z + margin) { hits.push(`${s.name} @${(i / 12).toFixed(2)} inside ${c.name}`); break; }
        }
      }
    }
    return hits;
  }

  return { SHOTS, apply, shotAt, checkPaths, CARD_FULL };
}
