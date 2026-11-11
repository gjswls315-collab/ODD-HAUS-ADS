// Post pipeline (hand-rolled so every stage is under art direction):
//   scene (HDR colour + depth)
//   -> bright pass + 2-level blur            (warm light bloom / halation)
//   -> lens pass: depth of field, ink outlines with 8 fps line boil, bloom add
//   -> film pass: subtle chromatic aberration, vintage grade, animated paper, grain, dust,
//                 gate weave, vignette, fades and the paper end card
import * as THREE from 'three';

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COMMON = /* glsl */ `
precision highp float;
varying vec2 vUv;
float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
`;

const BRIGHT = COMMON + /* glsl */ `
uniform sampler2D tScene; uniform vec2 uTexel;
void main() {
  vec3 c = vec3(0.0);
  c += texture2D(tScene, vUv + uTexel * vec2(-1, -1)).rgb;
  c += texture2D(tScene, vUv + uTexel * vec2( 1, -1)).rgb;
  c += texture2D(tScene, vUv + uTexel * vec2(-1,  1)).rgb;
  c += texture2D(tScene, vUv + uTexel * vec2( 1,  1)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(0.62, 1.25, l);
  gl_FragColor = vec4(min(c * k, vec3(6.0)), 1.0);
}`;

const BLUR = COMMON + /* glsl */ `
uniform sampler2D tIn; uniform vec2 uDir;
void main() {
  vec3 c = texture2D(tIn, vUv).rgb * 0.227027;
  c += (texture2D(tIn, vUv + uDir * 1.3846).rgb + texture2D(tIn, vUv - uDir * 1.3846).rgb) * 0.316216;
  c += (texture2D(tIn, vUv + uDir * 3.2308).rgb + texture2D(tIn, vUv - uDir * 3.2308).rgb) * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}`;

const LENS = COMMON + /* glsl */ `
uniform sampler2D tScene, tDepth, tBloomA, tBloomB;
uniform vec2 uRes;
uniform float uNear, uFar, uFocus, uAperture, uTime, uBloom, uInk;
uniform int uTaps;
float linZ(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float cocAt(float z) { return clamp(uAperture * abs(z - uFocus) / max(z, 0.05), 0.0, 1.0); }
void main() {
  float aspect = uRes.x / uRes.y;
  float raw = texture2D(tDepth, vUv).x;
  float z = linZ(raw);
  float coc = cocAt(z);

  // --- depth of field: golden-angle disc gather
  float maxR = 0.019;                    // of frame height
  vec3 acc = texture2D(tScene, vUv).rgb; float wsum = 1.0;
  float rad = coc * maxR;
  if (rad * uRes.y > 0.7) {
    float n = float(uTaps);
    float rot = h21(gl_FragCoord.xy) * 6.2831;
    for (int i = 0; i < 32; i++) {
      if (i >= uTaps) break;
      float fi = float(i) + 0.5;
      float r = sqrt(fi / n);
      float a = fi * 2.39996 + rot;
      vec2 o = vec2(cos(a), sin(a)) * r * rad;
      vec2 uv2 = vUv + vec2(o.x / aspect, o.y);
      float z2 = linZ(texture2D(tDepth, uv2).x);
      // a sharp thing in front must not smear into a blurred thing behind it
      float w = (z2 < z - 0.02) ? clamp(cocAt(z2) / max(coc, 1e-3), 0.05, 1.0) : 1.0;
      vec3 s = texture2D(tScene, uv2).rgb;
      w *= 1.0 + 0.6 * max(s.r, max(s.g, s.b)); // let highlights open into bokeh
      acc += s * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;

  // --- ink outline from depth discontinuities. The line is re-drawn 8 times a second.
  float f8 = floor(uTime * 8.0);
  vec2 px = vec2(1.0 / (720.0 * aspect), 1.0 / 720.0);
  vec2 wob = (vec2(vn(vUv * vec2(aspect, 1.0) * 90.0 + f8 * 7.1), vn(vUv * vec2(aspect, 1.0) * 90.0 + 31.7 + f8 * 3.3)) - 0.5) * 2.2 * px;
  float wgt = 0.9 + 0.7 * vn(vUv * vec2(aspect, 1.0) * 46.0 + f8 * 1.7);   // pressure
  vec2 e = px * wgt;
  vec2 u0 = vUv + wob;
  float dc = texture2D(tDepth, u0).x;
  float dl = texture2D(tDepth, u0 - vec2(e.x, 0.0)).x, dr = texture2D(tDepth, u0 + vec2(e.x, 0.0)).x;
  float du = texture2D(tDepth, u0 + vec2(0.0, e.y)).x, dd = texture2D(tDepth, u0 - vec2(0.0, e.y)).x;
  // raw depth is linear in screen space on a plane, so its laplacian only fires on real edges
  float lap = abs(dl + dr - 2.0 * dc) + abs(du + dd - 2.0 * dc);
  float zc = linZ(dc);
  float edge = lap * zc * (uFar - uNear) / (uFar * uNear);
  float line = smoothstep(0.012, 0.045, edge);
  line *= 1.0 - smoothstep(0.25, 0.8, coc);        // out-of-focus things lose their line
  line *= 1.0 - smoothstep(14.0, 38.0, zc);        // and so do things lost in the fog
  line *= 0.55 + 0.45 * vn(vUv * vec2(aspect, 1.0) * 300.0 + f8); // dry-brush breaks
  col = mix(col, col * vec3(0.05, 0.055, 0.07), line * uInk);

  // --- bloom / halation
  vec3 bl = texture2D(tBloomA, vUv).rgb * 0.55 + texture2D(tBloomB, vUv).rgb * 0.75;
  col += bl * uBloom * vec3(1.0, 0.86, 0.66);

  gl_FragColor = vec4(col, 1.0);
}`;

const FILM = COMMON + /* glsl */ `
uniform sampler2D tIn, tCard;
uniform vec2 uRes;
uniform float uTime, uFade, uCard, uGrain, uCA, uExposure, uStill;
vec3 tone(vec3 x) { x = max(x, 0.0); return (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14); }
float paperTex(vec2 p) {
  float n = vn(p * 3.0) * 0.5 + vn(p * 9.0) * 0.3 + vn(p * 31.0) * 0.2;
  float fib = vn(vec2(p.x * 2.0, p.y * 90.0)) * 0.5 + vn(vec2(p.x * 120.0, p.y * 3.0)) * 0.5;
  return n * 0.7 + fib * 0.3;
}
void main() {
  float aspect = uRes.x / uRes.y;
  float f24 = floor(uTime * 24.0);
  float f6 = floor(uTime * 6.0);
  // gate weave: the whole frame sits a hair differently on every exposure
  vec2 weave = (vec2(h21(vec2(f24, 1.3)), h21(vec2(f24, 7.7))) - 0.5) * 0.0011 * (1.0 - uStill);
  vec2 uv = vUv + weave;
  vec2 c = uv - 0.5;
  float r2 = dot(c * vec2(aspect, 1.0), c * vec2(aspect, 1.0));

  // very subtle lateral chromatic aberration, growing toward the corners
  vec2 ca = c * r2 * uCA;
  vec3 col;
  col.r = texture2D(tIn, uv - ca).r;
  col.g = texture2D(tIn, uv).g;
  col.b = texture2D(tIn, uv + ca).b;

  col *= uExposure * (1.0 + (h21(vec2(f24, 3.1)) - 0.5) * 0.035 * (1.0 - uStill)); // lamp flicker of the projector
  col = tone(col * 1.1);

  // vintage grade: navy in the shadows, cream in the highlights, a little less chroma
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 0.86);
  col += vec3(0.012, 0.022, 0.045) * (1.0 - smoothstep(0.0, 0.5, l));
  col = mix(col, col * vec3(1.06, 1.0, 0.86), smoothstep(0.35, 1.0, l));
  col = pow(col, vec3(1.0 / 2.2));
  col = col * 0.955 + 0.03; // lifted, faded blacks; highlights never quite reach paper white

  col *= uFade;

  // paper end card (already display-referred)
  vec3 card = texture2D(tCard, vUv).rgb;
  col = mix(col, card, uCard);

  // animated paper: the stock shows through and shifts 6 times a second
  vec2 pp = vUv * vec2(aspect, 1.0) * 6.0 + vec2(h21(vec2(f6, 2.0)), h21(vec2(f6, 5.0))) * 40.0 * (1.0 - uStill);
  float pt = paperTex(pp);
  col *= 0.93 + 0.14 * pt;
  col += (pt - 0.5) * 0.035 * (1.0 - l);

  // grain, sized for a 720-line frame whatever the output resolution
  vec2 gp = floor(vUv * vec2(720.0 * aspect, 720.0) * 1.15);
  float g = (h21(gp + f24 * 17.0) + h21(gp * 1.7 + f24 * 29.0) - 1.0);
  col += g * uGrain * (0.55 + 0.9 * (1.0 - l));

  // dust and a rare hair on the gate
  float fd = floor(uTime * 12.0);
  for (int i = 0; i < 3; i++) {
    vec2 dp = vec2(h21(vec2(fd, float(i) * 3.7 + 1.0)), h21(vec2(fd, float(i) * 9.1 + 4.0)));
    float on = step(0.62, h21(vec2(fd, float(i) + 11.0))) * (1.0 - uStill);
    float d = length((vUv - dp) * vec2(aspect, 1.0));
    col *= 1.0 - on * 0.5 * smoothstep(0.0028, 0.0008, d);
  }

  // vignette
  col *= 1.0 - smoothstep(0.18, 1.05, r2) * 0.62;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.qscene = new THREE.Scene();
    this.qscene.add(this.quad);

    const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    this.mBright = mk(BRIGHT, { tScene: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mBlur = mk(BLUR, { tIn: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mLens = mk(LENS, {
      tScene: { value: null }, tDepth: { value: null }, tBloomA: { value: null }, tBloomB: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.05 }, uFar: { value: 120 },
      uFocus: { value: 5 }, uAperture: { value: 1 }, uTime: { value: 0 }, uBloom: { value: 0.9 }, uInk: { value: 0.85 },
      uTaps: { value: 20 },
    });
    this.mFilm = mk(FILM, {
      tIn: { value: null }, tCard: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
      uFade: { value: 1 }, uCard: { value: 0 }, uGrain: { value: 0.075 }, uCA: { value: 0.012 }, uExposure: { value: 1 }, uStill: { value: 0 },
    });
    this.targets = null;
  }

  setSize(w, h) {
    if (this.targets) Object.values(this.targets).forEach((t) => t.dispose());
    const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    const scene = new THREE.WebGLRenderTarget(w, h, { ...hf, depthBuffer: true, samples: 0 });
    scene.depthTexture = new THREE.DepthTexture(w, h);
    scene.depthTexture.type = THREE.UnsignedIntType;
    scene.depthTexture.minFilter = scene.depthTexture.magFilter = THREE.NearestFilter;
    const w2 = Math.max(2, w >> 1), h2 = Math.max(2, h >> 1), w4 = Math.max(2, w >> 2), h4 = Math.max(2, h >> 2), w8 = Math.max(2, w >> 3), h8 = Math.max(2, h >> 3);
    this.targets = {
      scene,
      bright: new THREE.WebGLRenderTarget(w2, h2, hf),
      a1: new THREE.WebGLRenderTarget(w4, h4, hf), a2: new THREE.WebGLRenderTarget(w4, h4, hf),
      b1: new THREE.WebGLRenderTarget(w8, h8, hf), b2: new THREE.WebGLRenderTarget(w8, h8, hf),
      lens: new THREE.WebGLRenderTarget(w, h, hf),
    };
    this.w = w; this.h = h;
    this.mLens.uniforms.uRes.value.set(w, h);
    this.mFilm.uniforms.uRes.value.set(w, h);
    this.mBright.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.qscene, this.cam);
  }

  blur(src, tmp, dst, spread) {
    const u = this.mBlur.uniforms;
    u.tIn.value = src.texture; u.uDir.value.set(spread / tmp.width, 0); this.pass(this.mBlur, tmp);
    u.tIn.value = tmp.texture; u.uDir.value.set(0, spread / tmp.height); this.pass(this.mBlur, dst);
  }

  // look: { focus, aperture, fade, card, still, exposure, bloom }
  render(scene, camera, t, look) {
    const T = this.targets, r = this.r;
    r.setRenderTarget(T.scene);
    r.render(scene, camera);

    this.mBright.uniforms.tScene.value = T.scene.texture;
    this.pass(this.mBright, T.bright);
    this.blur(T.bright, T.a1, T.a2, 1.0);
    this.blur(T.a2, T.a1, T.a2, 1.6);
    this.blur(T.a2, T.b1, T.b2, 1.0);
    this.blur(T.b2, T.b1, T.b2, 2.0);

    const L = this.mLens.uniforms;
    L.tScene.value = T.scene.texture; L.tDepth.value = T.scene.depthTexture;
    L.tBloomA.value = T.a2.texture; L.tBloomB.value = T.b2.texture;
    L.uNear.value = camera.near; L.uFar.value = camera.far;
    L.uFocus.value = look.focus; L.uAperture.value = look.aperture; L.uTime.value = t;
    L.uBloom.value = look.bloom ?? 0.9;
    this.pass(this.mLens, T.lens);

    const F = this.mFilm.uniforms;
    F.tIn.value = T.lens.texture; F.uTime.value = t;
    F.uFade.value = look.fade; F.uCard.value = look.card; F.uStill.value = look.still; F.uExposure.value = look.exposure ?? 1;
    this.pass(this.mFilm, null);
  }
}
