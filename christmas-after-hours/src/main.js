// ODD HAUS - CHRISTMAS AFTER HOURS. Player: clock, render loop, transport, audio, recording.
import * as THREE from 'three';
import { DURATION, QUALITY, CHARACTER } from './config.js';
import { fmtTime, clamp } from './core/util.js';
import { Post } from './core/post.js';
import { buildWorld } from './world/index.js';
import { makeTimeline } from './film/timeline.js';
import { buildScore, renderWav } from './audio/score.js';

const qs = new URLSearchParams(location.search);
const CAPTURE = qs.has('capture');
const $ = (id) => document.getElementById(id);
const ui = { stage: $('stage'), wrap: $('wrap'), canvas: $('film'), veil: $('veil'), start: $('start'), play: $('play'), restart: $('restart'), mute: $('mute'), seek: $('seek'), time: $('time'), record: $('record'), wav: $('wav'), full: $('full'), shot: $('shot'), hint: $('hint'), recdot: $('recdot') };
if (CAPTURE || qs.has('clean')) document.body.classList.add('clean');

const LEAD = 0.08; // audio scheduling lead; the picture clock waits the same amount

// ---------------------------------------------------------------- audio transport
class Sound {
  constructor() { this.ctx = null; this.session = null; this.muted = false; }
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : 1;
    this.out.connect(this.ctx.destination);
    this.tap = this.ctx.createMediaStreamDestination(); this.out.connect(this.tap);
    return this.ctx;
  }
  async play(from) {
    const ctx = this.ensure(); if (!ctx) return;
    this.stop();
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch { /* needs a gesture */ } }
    if (ctx.state !== 'running') return false;
    this.session = buildScore(ctx, this.out, from, LEAD);
    return true;
  }
  stop() { if (this.session) { this.session.stop(); this.session = null; } }
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.015); }
}

// ---------------------------------------------------------------- boot
async function boot() {
  await Promise.all(['400 20px Anton', '400 20px "Patrick Hand SC"', '400 20px Inter', '600 20px Inter'].map((f) => document.fonts.load(f)));

  const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
  renderer.setPixelRatio(1);
  renderer.autoClear = true;
  renderer.setClearColor(0x05070b, 1);
  const post = new Post(renderer);
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.03, 140);

  const { scene, world, colliders, character, T } = await buildWorld();
  post.mFilm.uniforms.tCard.value = T.endCard;
  const timeline = makeTimeline(world);
  const hits = timeline.checkPaths(colliders);
  if (hits.length) console.warn('[camera] path collisions:\n' + hits.join('\n'));

  // ---- size / quality
  let tier = clamp(Number(qs.get('q') ?? 0), 0, QUALITY.length - 1);
  const fixed = CAPTURE ? { w: Number(qs.get('w') || 1280), h: Number(qs.get('h') || 720) } : null;
  function layout() {
    let cw, ch;
    if (fixed) { cw = fixed.w; ch = fixed.h; ui.stage.style.width = cw + 'px'; ui.stage.style.height = ch + 'px'; }
    else {
      const bw = ui.wrap.clientWidth, bh = ui.wrap.clientHeight;
      cw = Math.floor(Math.min(bw, bh * 16 / 9)); ch = Math.floor(cw * 9 / 16);
      ui.stage.style.width = cw + 'px'; ui.stage.style.height = ch + 'px';
    }
    const dpr = fixed ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    let w = Math.round(cw * dpr * QUALITY[tier].scale), h = Math.round(ch * dpr * QUALITY[tier].scale);
    if (!fixed && w > 1920) { h = Math.round(h * 1920 / w); w = 1920; }
    w = Math.max(320, w - (w % 2)); h = Math.max(180, h - (h % 2));
    renderer.setSize(w, h, false);
    post.setSize(w, h);
    post.mLens.uniforms.uTaps.value = QUALITY[tier].dofTaps;
    world.snow.uniforms.uPx.value = h;
    world.snow.uniforms.uAmount.value = QUALITY[tier].snow;
    camera.aspect = 16 / 9; camera.updateProjectionMatrix();
  }
  layout();
  if (!fixed) new ResizeObserver(() => { layout(); if (!state.playing) draw(state.t); }).observe(ui.wrap);

  // ---- picture
  function draw(t) {
    world.update(t, camera);
    const look = timeline.apply(camera, t);
    post.render(scene, camera, look.filmTime, look);
    return look;
  }

  // ---- transport
  const sound = new Sound();
  const state = { t: 0, playing: false, wall: 0, base: 0, ended: false, recording: null, ticket: 0 };
  const now = () => performance.now() / 1000;

  function updateUi(look) {
    ui.time.textContent = `${fmtTime(state.t)} / ${fmtTime(DURATION)}`;
    if (document.activeElement !== ui.seek || state.playing) ui.seek.value = state.t.toFixed(2);
    ui.play.textContent = state.playing ? 'Pause' : state.ended ? 'Replay' : 'Play';
    if (look) ui.shot.textContent = `${String(look.shot.i + 1).padStart(2, '0')}/${timeline.SHOTS.length} · ${look.shot.name}`;
  }
  async function play(from = state.t) {
    if (from >= DURATION - 0.02) from = 0;
    // picture waits for the score to be scheduled, then both start from the same instant
    const ticket = ++state.ticket;
    state.playing = false; state.t = from; state.ended = false;
    ui.veil.classList.add('out');
    updateUi(draw(from));
    const ok = await sound.play(from);
    if (ticket !== state.ticket) return;                       // superseded by a newer play / seek / pause
    state.base = from; state.wall = now() + LEAD; state.playing = true;
    if (ok === false) ui.hint.textContent = 'Sound is blocked until you interact with the page — click anywhere.';
    else ui.hint.textContent = character.present ? '' : 'Original character artwork not found — add public/assets/oddhaus-character.png';
  }
  function pause() {
    state.ticket++;
    if (!state.playing) { sound.stop(); return; }
    state.playing = false; sound.stop(); updateUi();
  }
  function seek(t) {
    const was = state.playing;
    state.t = clamp(t, 0, DURATION); state.ended = state.t >= DURATION;
    if (was) play(state.t); else { state.ticket++; sound.stop(); updateUi(draw(state.t)); }
  }
  const toggle = () => (state.playing ? pause() : play());

  // ---- adaptive quality: step down if the machine cannot hold the frame rate
  let slow = 0, last = now(), ema = 16;
  function adapt() {
    const n = now(), dt = (n - last) * 1000; last = n;
    if (dt > 250) return;
    ema = ema * 0.94 + dt * 0.06;
    if (ema > 27 && tier < QUALITY.length - 1 && !qs.has('q') && !state.recording) { if (++slow > 90) { tier++; slow = 0; ema = 16; layout(); console.info(`[quality] -> ${QUALITY[tier].name}`); } } else slow = Math.max(0, slow - 1);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!state.playing) return;
    state.t = clamp(state.base + Math.max(0, now() - state.wall), 0, DURATION);
    const look = draw(state.t);
    if (state.t >= DURATION) { state.playing = false; state.ended = true; sound.stop(); finishRecording(); }
    updateUi(look); adapt();
  }

  // ---- recording: canvas + Web Audio -> MediaRecorder (MP4 where the browser can, else WebM)
  function startRecording() {
    if (state.recording || !window.MediaRecorder) { if (!window.MediaRecorder) ui.hint.textContent = 'This browser has no MediaRecorder; use `npm run render` instead.'; return; }
    sound.ensure();
    const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mime = types.find((m) => MediaRecorder.isTypeSupported(m));
    const stream = ui.canvas.captureStream(60);
    if (sound.tap) sound.tap.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 256_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunks, { type: mime })); a.download = `odd-haus-christmas-after-hours.${ext}`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      ui.hint.textContent = `Saved ${a.download}` + (ext === 'webm' ? ' — convert with: ffmpeg -i in.webm -c:v libx264 -crf 16 -c:a aac out.mp4' : '');
    };
    state.recording = rec; ui.record.classList.add('on'); ui.record.textContent = 'Stop'; ui.recdot.hidden = false;
    rec.start(250);
    play(0);
  }
  function finishRecording() {
    if (!state.recording) return;
    const rec = state.recording; state.recording = null;
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), 250);
    ui.record.classList.remove('on'); ui.record.textContent = 'Record'; ui.recdot.hidden = true;
  }

  // ---- wiring
  ui.start.disabled = false; ui.start.textContent = 'Play film';
  ui.start.addEventListener('click', () => play(0));
  ui.play.addEventListener('click', toggle);
  ui.restart.addEventListener('click', () => play(0));
  ui.mute.addEventListener('click', () => { const m = !sound.muted; sound.setMuted(m); ui.mute.textContent = m ? 'Unmute' : 'Mute'; ui.mute.setAttribute('aria-pressed', String(m)); });
  ui.seek.addEventListener('input', () => seek(Number(ui.seek.value)));
  ui.record.addEventListener('click', () => (state.recording ? (pause(), finishRecording()) : startRecording()));
  ui.wav.addEventListener('click', async () => {
    ui.wav.disabled = true; ui.hint.textContent = 'Rendering soundtrack…';
    const blob = await renderWav(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'odd-haus-christmas-after-hours.wav'; a.click();
    ui.wav.disabled = false; ui.hint.textContent = 'Saved odd-haus-christmas-after-hours.wav';
  });
  ui.full.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : ui.stage.requestFullscreen?.()));
  ui.canvas.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLButtonElement && e.code === 'Space') return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'KeyR') play(0);
    else if (e.code === 'KeyM') ui.mute.click();
    else if (e.code === 'KeyF') ui.full.click();
    else if (e.code === 'ArrowRight') seek(state.t + (e.shiftKey ? 5 : 1));
    else if (e.code === 'ArrowLeft') seek(state.t - (e.shiftKey ? 5 : 1));
  });
  // if audio was blocked by the autoplay policy, the first gesture brings it in at the right bar
  window.addEventListener('pointerdown', () => { if (state.playing && !sound.session) sound.play(state.t).then((ok) => { if (ok) { state.base = state.t; state.wall = now() + LEAD; ui.hint.textContent = ''; } }); }, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing && !state.recording) pause(); });

  updateUi(draw(qs.has('t') ? Number(qs.get('t')) : 0));
  if (qs.has('t')) state.t = Number(qs.get('t'));
  requestAnimationFrame(frame);
  if (qs.has('autoplay')) play(state.t);
  if (qs.has('pick')) pickCigarette(character);

  // ---- hooks for the headless renderer and for debugging
  window.__film = {
    ready: true, duration: DURATION, shots: timeline.SHOTS.map((s) => ({ t: s.t, end: s.end, name: s.name })),
    renderAt(t) { state.playing = false; state.t = t; draw(t); return true; },
    collisions: hits, character: character.present,
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, lights: world.lights.length, size: [post.w, post.h] }),
    async wavBase64() { const b = await renderWav(); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); },
    play, pause, seek, state,
    clock: () => (state.playing ? clamp(state.base + Math.max(0, now() - state.wall), 0, DURATION) : state.t),
    audio: () => ({ state: sound.ctx ? sound.ctx.state : 'none', scheduled: !!sound.session, muted: sound.muted }),
  };
}

// ?pick : click the cigarette tip on the original drawing to get CHARACTER.cigTip
function pickCigarette(ch) {
  if (!ch.present) return;
  const im = ch.source.cloneNode();
  Object.assign(im.style, { position: 'fixed', inset: '0', margin: 'auto', maxWidth: '90vw', maxHeight: '90vh', zIndex: 20, background: '#fff', cursor: 'crosshair' });
  document.body.appendChild(im);
  im.addEventListener('click', (e) => {
    const r = im.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    localStorage.setItem('oddhaus.cigTip', JSON.stringify({ u, v }));
    alert(`cigTip: { u: ${u.toFixed(3)}, v: ${v.toFixed(3)} }\nSaved for this browser. Paste it into src/config.js (default: ${JSON.stringify(CHARACTER.cigTip)}) and reload.`);
    im.remove();
  });
}

boot().catch((err) => {
  console.error(err);
  window.__film = { ready: false, error: String(err && err.stack || err) };
  ui.start.textContent = 'Could not start'; ui.hint.textContent = String(err.message || err);
});
