'use strict';
// Page behaviour for the Visual Design Bible: palette, L* map, contrast checks, blockout figures, AS-IS gallery, prompt cards.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const json = (id) => JSON.parse(document.getElementById(id).textContent);
  const PALETTE = json('data-palette'), PROMPTS = json('data-prompts'), ASIS = json('data-asis');
  ER.loadPalette(PALETTE);
  const PAL = ER.PAL;

  // ---------- colour maths (sRGB -> relative luminance -> CIE L*) ----------
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const Y = (h) => 0.2126 * lin(parseInt(h.slice(1, 3), 16)) + 0.7152 * lin(parseInt(h.slice(3, 5), 16)) + 0.0722 * lin(parseInt(h.slice(5, 7), 16));
  const Lstar = (h) => { const y = Y(h); return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y; };
  const cr = (a, b) => { const ya = Y(a) + 0.05, yb = Y(b) + 0.05; return Math.max(ya, yb) / Math.min(ya, yb); };
  const fmt = (n, d = 1) => n.toFixed(d);

  // ---------- palette ramps ----------
  const rampsEl = $('#ramps');
  for (const r of PALETTE.ramps) {
    const row = document.createElement('div');
    row.className = 'ramp';
    row.innerHTML = `<div class="ramp-head"><b>${r.id}</b><span>${r.name}</span><small>${r.kr}</small><p>${r.use}</p></div><div class="ramp-sw"></div>`;
    const sw = row.querySelector('.ramp-sw');
    r.colors.forEach((h, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw';
      b.style.setProperty('--c', h);
      b.style.setProperty('--t', Lstar(h) > 55 ? '#0E1015' : '#E4DFD5');
      b.title = `${r.id}${i} ${h} 복사`;
      b.innerHTML = `<span class="sw-chip"></span><span class="sw-id">${r.id}${i}</span><span class="sw-hex">${h.toUpperCase()}</span><span class="sw-l">L* ${Math.round(Lstar(h))}</span>`;
      b.addEventListener('click', () => copy(h.toUpperCase(), b));
      sw.appendChild(b);
    });
    rampsEl.appendChild(row);
  }
  $('#pal-count').textContent = Object.keys(PAL).length;

  // ---------- L* map ----------
  const LMAP = [
    ['배경 면', 'S0 S1 S2 S3 S4 S5 S6 T0 T1 T2 T3 T4 T5 N1 N2 N3 N4 N5', [5, 42], 'S7 S8 T6 T7'],
    ['행위자 (캐릭터·적·보스)', 'B0 B1 B2 B3 B4 B5 Z1 Z2 Z3 Z4 Z5 N4 N5 N6 N7 N8 N9', [20, 85]],
    ['플레이어 탄', 'G2 G3 G4 A2 A3 A4 V2 V3 V4', [58, 96]],
    ['적탄', 'R0 R3 R4 R5 R6', [96, 100], '', [0, 6]],
    ['UI 텍스트·아이콘', 'B4 B5 N8 N7 U1', [46, 94]],
  ];
  const lm = $('#lmap');
  for (const [label, toks, band, edge = '', band2] of LMAP) {
    const row = document.createElement('div');
    row.className = 'lrow';
    row.innerHTML = `<div class="lrow-l">${label}</div><div class="lrow-t"><span class="lband" style="left:${band[0]}%;width:${band[1] - band[0]}%"></span>${band2 ? `<span class="lband" style="left:${band2[0]}%;width:${band2[1] - band2[0]}%"></span>` : ''}</div>`;
    const t = row.querySelector('.lrow-t');
    const place = (tok, cls) => {
      const h = PAL[tok], l = Lstar(h), d = document.createElement('span');
      d.className = 'ldot ' + cls;
      d.style.left = `calc(${l}% - 6px)`;
      d.style.background = h;
      d.title = `${tok} ${h.toUpperCase()} · L* ${Math.round(l)}`;
      d.dataset.tok = tok;
      t.appendChild(d);
    };
    toks.split(' ').forEach((k, i) => place(k, i % 2 ? 'lo' : 'hi'));
    edge.split(' ').filter(Boolean).forEach((k) => place(k, 'edge'));
    lm.appendChild(row);
  }

  // ---------- contrast checks (computed from the palette) ----------
  const bgToks = Object.keys(PAL).filter((k) => /^S|^T/.test(k) || /^N[0-7]$/.test(k) || /^M/.test(k));
  let worst = null;
  for (const k of bgToks) { const v = Math.max(cr(PAL.R6, PAL[k]), cr(PAL.R0, PAL[k])); if (!worst || v < worst.v) worst = { k, v }; }
  const C = {
    'bullet-worst': `${fmt(worst.v, 2)}:1 (${worst.k})`,
    'core-sky': `${fmt(Math.min(...[0, 1, 2, 3, 4, 5, 6].map((i) => cr(PAL.R6, PAL['S' + i]))), 2)}:1`,
    'outline-pearl': `${fmt(cr(PAL.R0, PAL.M0))}–${fmt(cr(PAL.R0, PAL.M2))}:1`,
    'player-min': `${fmt(Math.min(...['G3', 'A3', 'V3'].flatMap((p) => ['S2', 'T3', 'S5'].map((b) => cr(PAL[p], PAL[b])))))}:1`,
    'player-max': `${fmt(Math.max(...['G3', 'A3', 'V3'].flatMap((p) => ['S2', 'T3', 'S5'].map((b) => cr(PAL[p], PAL[b])))))}:1`,
    'ui-b4': `${fmt(cr(PAL.B4, PAL.T1))}:1`,
    'ui-n8': `${fmt(cr(PAL.N8, PAL.T1))}:1`,
    'ui-n7': `${fmt(cr(PAL.N7, PAL.T1))}:1`,
  };
  for (const el of $$('[data-c]')) el.textContent = C[el.dataset.c] || '?';

  // ---------- AS-IS gallery ----------
  for (const fig of $$('.asis-fig')) {
    const k = fig.dataset.k;
    const img = fig.querySelector('img');
    img.src = ASIS[k];
    for (const m of (fig.dataset.marks || '').split(';').filter(Boolean)) {
      const [id, x, y] = m.split(',');
      const a = document.createElement('a');
      a.className = 'mark';
      a.href = '#' + id.toLowerCase();
      a.style.left = x + '%';
      a.style.top = y + '%';
      a.textContent = id.replace('P-', '');
      a.title = id;
      fig.querySelector('.asis-img').appendChild(a);
    }
  }

  // ---------- prompts ----------
  const pl = $('#prompts');
  for (const p of PROMPTS.items) {
    const card = document.createElement('article');
    card.className = 'prompt' + (p.id === 'COMMON' ? ' common' : '');
    card.id = 'pr-' + p.id.toLowerCase();
    const meta = p.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    card.innerHTML = `<header><span class="pid">${p.id}</span><h4>${esc(p.title)}</h4></header><dl class="pmeta">${meta}</dl>` +
      ['prompt', 'negative'].filter((t) => p[t]).map((t) => `<div class="pblock"><div class="pbar"><span>${t === 'prompt' ? 'PROMPT' : 'NEGATIVE'}</span><button type="button" class="btn-copy">복사</button></div><pre>${esc(p[t])}</pre></div>`).join('');
    card.querySelectorAll('.btn-copy').forEach((b) => b.addEventListener('click', () => copy(b.closest('.pblock').querySelector('pre').textContent, b)));
    pl.appendChild(card);
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`([^`]+)`/g, '<code>$1</code>'); }

  function copy(text, btn) {
    const done = () => { const o = btn.dataset.label || btn.textContent; btn.dataset.label = o; btn.classList.add('copied'); if (btn.classList.contains('btn-copy')) btn.textContent = '복사됨'; setTimeout(() => { btn.classList.remove('copied'); if (btn.classList.contains('btn-copy')) btn.textContent = o; }, 1200); };
    try {
      navigator.clipboard.writeText(text).then(done, () => selectFallback(btn));
    } catch { selectFallback(btn); }
  }
  function selectFallback(btn) {
    const pre = btn.closest('.pblock')?.querySelector('pre');
    if (!pre) return;
    const r = document.createRange();
    r.selectNodeContents(pre);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }

  // ---------- blockout figures ----------
  const figs = $$('.bfig');
  async function renderFigures() {
    try {
      await Promise.race([Promise.all(['12px Galmuri11', '12px Galmuri11B', '10px Galmuri9'].map((f) => document.fonts.load(f, '가A'))), new Promise((r) => setTimeout(r, 3000))]);
    } catch { /* bitmap text falls back to the system font */ }
    for (const fig of figs) {
      const kind = fig.dataset.scene ? 'scene' : 'sheet', name = fig.dataset.scene || fig.dataset.sheet;
      let art, guide = null;
      if (kind === 'scene') {
        art = new ER.Px(640, 360);
        ER.scenes[name](art);
        if (ER.guides[name]) { guide = new ER.Px(640, 360); ER.guides[name](guide); }
      } else if (name.startsWith('hero:')) {
        const id = name.slice(5), spr = ER.HERO[id]();
        art = new ER.Px(120, 36);
        art.rect(0, 0, 120, 36, 'S2');
        art.blit(spr, 4, 2);
        art.rect(60, 0, 60, 36, 'N9');
        art.blit(spr.silhouette('N0'), 66, 2);
      } else art = ER.sheets[name]();
      const stage = fig.querySelector('.stage');
      stage.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cv';
      art.c.setAttribute('role', 'img');
      art.c.setAttribute('aria-label', fig.querySelector('figcaption')?.textContent.trim() || name);
      wrap.appendChild(art.c);
      if (guide) { guide.c.className = 'guide'; guide.c.hidden = true; wrap.appendChild(guide.c); }
      stage.appendChild(wrap);
      fig._art = art;
      fig._guide = guide;
      fig.dataset.w = art.w;
      setupToolbar(fig);
      applyScale(fig, 'auto');
    }
  }
  function setupToolbar(fig) {
    const bar = fig.querySelector('.tools');
    if (!bar) return;
    const max = +(fig.dataset.max || 4);
    const scales = [1, 2, 3, 4, 6].filter((s) => s <= max);
    bar.innerHTML = scales.map((s) => `<button type="button" data-s="${s}">×${s}</button>`).join('') +
      (fig._guide ? '<button type="button" data-t="guide" aria-pressed="false">가이드</button>' : '') +
      '<button type="button" data-t="gray" aria-pressed="false">흑백</button><span class="scale-note"></span>';
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.s) applyScale(fig, +b.dataset.s);
      else if (b.dataset.t === 'guide') { const on = fig._guide.c.hidden; fig._guide.c.hidden = !on; b.setAttribute('aria-pressed', on); }
      else if (b.dataset.t === 'gray') { const on = !fig.classList.contains('gray'); fig.classList.toggle('gray', on); b.setAttribute('aria-pressed', on); }
    });
  }
  function applyScale(fig, s) {
    const w = +fig.dataset.w, avail = fig.querySelector('.stage').clientWidth;
    fig.dataset.mode = s === 'auto' ? 'auto' : 'manual';
    let sc = s === 'auto' ? Math.min(+(fig.dataset.max || 4), Math.floor(avail / w)) : s;
    const fit = sc < 1;
    const cv = fig.querySelector('.cv');
    if (fit) { cv.style.width = '100%'; }
    else cv.style.width = w * sc + 'px';
    for (const b of fig.querySelectorAll('.tools [data-s]')) b.setAttribute('aria-pressed', !fit && +b.dataset.s === sc);
    const note = fig.querySelector('.scale-note');
    if (note) note.textContent = fit ? '화면이 좁아 비정수 축소 표시 중' : `정수 배율 ×${sc}`;
  }
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => figs.filter((f) => f.dataset.mode !== 'manual' && f._art).forEach((f) => applyScale(f, 'auto')), 120); });
  renderFigures();

  // ---------- chapter nav ----------
  const links = $$('.chapters a');
  const secs = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => {
      for (const e of ents) if (e.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => io.observe(s));
  }
})();
