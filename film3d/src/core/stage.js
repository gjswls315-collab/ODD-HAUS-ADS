// Renderer, cameras and the post stack (DoF -> bloom -> tone map -> grade/grain).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { allTextures } from "./textures.js";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.42 },
    uLift: { value: new THREE.Vector3(0.012, 0.014, 0.022) },
    uGain: { value: new THREE.Vector3(1.0, 0.98, 0.95) },
    uSat: { value: 0.96 },
    uLetterbox: { value: 0.0 },
    uFade: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uGrain, uVignette, uSat, uLetterbox, uFade;
    uniform vec3 uLift, uGain;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = uLift + c * (uGain - uLift);
      vec2 q = vUv - 0.5;
      float v = 1.0 - uVignette * smoothstep(0.25, 0.85, length(q * vec2(1.15, 1.0)) * 1.25);
      c *= v;
      float g = hash(vUv * 1024.0 + fract(uTime * 7.31) * 113.0) - 0.5;
      c += g * uGrain * (0.55 + 0.45 * (1.0 - l));
      float lb = step(0.5 - uLetterbox * 0.5, abs(vUv.y - 0.5));
      c = mix(c, vec3(0.0), lb);
      gl_FragColor = vec4(c * uFade, 1.0);
    }`,
};

export class Stage {
  constructor(canvas, { width, height, quality = "high", pixelRatio = 1 } = {}) {
    this.quality = quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#050608");
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.12;

    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 60);
    this.camera.position.set(0, 1.4, 4);

    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    for (const t of allTextures) t.anisotropy = Math.min(8, aniso);
    this._anisoCount = allTextures.length;

    const rt = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
      type: THREE.HalfFloatType, samples: quality === "high" ? 4 : 0,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(pixelRatio);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 2.0, aperture: 0.0, maxblur: 0.01 });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.5, 0.92);
    this.output = new OutputPass();
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bokeh);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.grade);
    this.dof = { enabled: true, focus: 2, aperture: 0, maxblur: 0.012 };
    this.setSize(width, height);
  }

  setSize(w, h) {
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Focus distance (m), aperture (blur per metre of defocus), max blur. */
  setDOF(focus, aperture, maxblur = 0.012) {
    Object.assign(this.dof, { focus, aperture, maxblur });
  }

  setLook({ grain, vignette, lift, gain, sat, letterbox, fade, exposure } = {}) {
    const u = this.grade.uniforms;
    if (grain !== undefined) u.uGrain.value = grain;
    if (vignette !== undefined) u.uVignette.value = vignette;
    if (lift) u.uLift.value.set(...lift);
    if (gain) u.uGain.value.set(...gain);
    if (sat !== undefined) u.uSat.value = sat;
    if (letterbox !== undefined) u.uLetterbox.value = letterbox;
    if (fade !== undefined) u.uFade.value = fade;
    if (exposure !== undefined) this.renderer.toneMappingExposure = exposure;
  }

  render(time = 0) {
    if (allTextures.length !== this._anisoCount) {
      const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      for (const t of allTextures) t.anisotropy = aniso;
      this._anisoCount = allTextures.length;
    }
    const b = this.bokeh.uniforms;
    const on = this.dof.enabled && this.dof.aperture > 0;
    this.bokeh.enabled = on;
    b.focus.value = this.dof.focus;
    b.aperture.value = this.dof.aperture;
    b.maxblur.value = this.dof.maxblur;
    this.grade.uniforms.uTime.value = time;
    this.renderer.info.reset();
    this.composer.render();
  }
}
