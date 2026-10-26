// Settings window (tabs) and the end-of-day summary popup (?view=summary).

import { drawFriend, FRIEND_IDS } from '../shared/draw.js';
import { connect, loadFonts } from '../shared/bridge.js';
import { EPISODES, CATEGORIES } from '../overlay/episodes.js';
import cast from '../../shared/cast.json' with { type: 'json' };

const odd = await connect('settings');
await loadFonts();
const boot = await odd.bootstrap();
const params = new URLSearchParams(location.search);
let settings = boot.settings;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
const pad = (n) => String(n).padStart(2, '0');
const clockText = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function duration(sec) {
  const m = Math.max(0, Math.round(sec / 60));
  const h = Math.floor(m / 60);
  if (!h) return `${m}분`;
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
}

function portrait(canvas, id, { pose = 'stand', expr = null, scale = 0.95 } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const w = canvas.width;
  const h = canvas.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.translate(w / 2, h - 6);
  ctx.scale(scale, scale);
  drawFriend(ctx, id, { pose, expr, seed: 2, t0: 0 }, 1.2);
}

// ------------------------------------------------------------------ today card

const MEAL_HOURS = new Set([12, 13, 18, 19]);

function praiseFor(d) {
  const h = Math.floor(d.focusSec / 3600);
  if (d.focusSec >= d.goalSec) return '목표 달성! 오늘 정말 대단했어~!';
  if (h >= 1) return `${h}시간 집중 성공~! 역시 최고야~!`;
  if (d.focusSec > 0) return '좋은 출발이야~! 같이 힘내자!';
  return '오늘도 같이 힘내 보자~';
}

function renderToday(root, d) {
  const set = (k, text) => {
    const el = $(`[data-t="${k}"]`, root);
    if (el) el.textContent = text;
  };
  set('focus', duration(d.focusSec));
  set('sub', `집중 · ${fmt(d.total)}타 · 최고 콤보 ${fmt(d.maxCombo)}`);
  const s = d.streak || { days: 0, todayOk: false };
  set(
    'streak',
    s.todayOk
      ? `30분 넘게 집중한 날이 ${s.days}일째 이어지고 있어요`
      : s.days
        ? `오늘 30분만 집중하면 ${s.days + 1}일째 이어져요`
        : '오늘 30분 넘게 집중하면 연속 기록이 시작돼요',
  );
  const k = d.goalSec ? Math.min(1, d.focusSec / d.goalSec) : 0;
  $('[data-t="goalbar"]', root).style.width = `${k * 100}%`;
  const goalH = d.goalSec / 3600;
  set('goal', k >= 1 ? `오늘의 목표 ${goalH}시간 달성! 🎉` : `오늘의 목표 ${goalH}시간까지 ${duration(d.goalSec - d.focusSec)} 남았어요`);
  set(
    'times',
    d.first ? `오늘 처음 타자 ${clockText(d.first)} · 퇴근 인사 ${clockText(d.endOfDayAt)} · 🍅 ${d.pomodoros}번` : '아직 오늘 기록이 없어요',
  );
  set('praise', praiseFor(d));
  const chart = $('[data-t="chart"]', root);
  chart.replaceChildren(
    ...d.hourlyFocus.map((sec, hour) => {
      const col = document.createElement('div');
      col.className = `col${MEAL_HOURS.has(hour) ? ' meal' : ''}${hour === d.hour ? ' now' : ''}`;
      col.title = `${hour}시 · 집중 ${duration(sec)} · ${fmt(d.hourlyKeys[hour])}타`;
      const bar = document.createElement('i');
      bar.style.height = `${Math.min(100, (sec / 3600) * 100)}%`;
      col.append(bar);
      if (hour % 6 === 0) {
        const label = document.createElement('span');
        label.textContent = hour;
        col.append(label);
      }
      return col;
    }),
  );
}

function mountToday(slot) {
  slot.replaceChildren($('#today-card').content.cloneNode(true));
  portrait($('.portrait', slot), settings.deskFriend, { pose: 'cheer', scale: 0.92 });
  return slot;
}

// ------------------------------------------------------------------ summary popup

if (params.get('view') === 'summary') {
  document.body.classList.add('summary');
  $('#summary-view').hidden = false;
  const slot = mountToday($('#summary-slot'));
  renderToday(slot, await odd.today());
  odd.onToday((d) => renderToday(slot, d));
  $('#close').addEventListener('click', () => odd.closeWindow());
  document.title = 'ready';
} else {
  await setupSettings();
  document.title = 'ready';
}

// ------------------------------------------------------------------ settings window

async function setupSettings() {
  $('#settings-view').hidden = false;
  $('#version').textContent = `v${boot.version}`;
  portrait($('#logo'), 'vin', { pose: 'wave', scale: 0.72 });

  // tabs
  const show = (tab) => {
    for (const b of $$('#tabs button')) b.classList.toggle('on', b.dataset.tab === tab);
    for (const p of $$('[data-panel]')) p.hidden = p.dataset.panel !== tab;
  };
  $$('#tabs button').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  odd.onTab(show);
  show(params.get('tab') || 'today');

  // today
  const slot = mountToday($('#today-slot'));
  renderToday(slot, await odd.today());
  odd.onToday((d) => renderToday(slot, d));
  renderWeek(await odd.history(7));

  // simple inputs bound to settings keys
  for (const el of $$('[data-key]')) {
    el.addEventListener('change', async () => {
      const key = el.dataset.key;
      const value = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value;
      settings = await odd.setSettings({ [key]: value });
      applySettings();
    });
    if (el.type === 'range') el.addEventListener('input', () => ($('#scale-out').textContent = `${Math.round(el.value * 100)}%`));
  }

  buildFriendPickers();
  buildEpisodes();
  applySettings();
  odd.onSettings((s) => {
    settings = s;
    applySettings();
  });

  odd.onEpisode((s) => {
    const status = $('#ep-status');
    status.classList.toggle('bad', Boolean(s && s.error));
    if (s && s.error) {
      const e = s.error;
      status.textContent =
        e.reason === 'needs'
          ? `이 이야기는 ${e.missing.map((m) => cast.friends[m].name).join(', ')}이(가) 돌아다니고 있어야 볼 수 있어요. 친구들 탭에서 켜 주세요.`
          : e.reason === 'few'
            ? '돌아다니는 친구가 더 있어야 볼 수 있어요.'
            : e.reason || '지금은 볼 수 없어요.';
    } else {
      status.textContent = s && s.playing ? `▶ 지금 상영 중: ${s.title || s.playing}` : '';
    }
    for (const chip of $$('#episode-list .chip')) chip.classList.toggle('playing', Boolean(s && s.playing === chip.dataset.id));
  });

  // AI
  $('#ai-save').addEventListener('click', async () => {
    const key = $('#ai-key').value.trim();
    if (!key) return;
    settings = await odd.setApiKey(key);
    $('#ai-key').value = '';
    applySettings();
  });
  $('#ai-clear').addEventListener('click', async () => {
    settings = await odd.setApiKey('');
    applySettings();
  });
  $('#ai-test').addEventListener('click', async () => {
    const out = $('#ai-status');
    out.classList.remove('bad');
    out.textContent = '물어보는 중…';
    const res = await odd.testAi(settings.deskFriend);
    out.classList.toggle('bad', !res.ok);
    out.textContent = res.ok ? `“${res.before}” → “${res.text}”` : res.error;
  });

  // updates
  const showUpdate = (u) => {
    const out = $('#update-status');
    out.replaceChildren();
    if (u) {
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = `새 버전 ${u.version}이 나왔어요 — 받으러 가기`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        odd.openExternal(u.url);
      });
      out.append(a);
    } else {
      out.textContent = `지금 버전(v${boot.version})이 최신이에요.`;
    }
  };
  if (boot.update) showUpdate(boot.update);
  odd.onUpdate(showUpdate);
  $('#update-check').addEventListener('click', async () => {
    $('#update-status').textContent = '확인하는 중…';
    showUpdate(await odd.checkUpdate());
  });

  // data
  $('#open-data').addEventListener('click', () => odd.openDataFolder());
  $('#reset').addEventListener('click', async () => {
    if (!confirm('지금까지의 집중 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
    renderToday(slot, await odd.resetStats());
    renderWeek(await odd.history(7));
  });
  $('#quit').addEventListener('click', () => odd.quit());
  for (const a of $$('[data-link]')) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      odd.openExternal(a.dataset.link);
    });
  }
}

function renderWeek(days) {
  const max = Math.max(3600, ...days.map((d) => d.focusSec));
  const today = days[days.length - 1].date;
  $('#week').replaceChildren(
    ...days.map((d) => {
      const el = document.createElement('div');
      el.className = `day${d.date === today ? ' today' : ''}`;
      const bar = document.createElement('i');
      bar.style.height = `${(d.focusSec / max) * 80}%`;
      el.title = `${d.date} · 집중 ${duration(d.focusSec)} · ${fmt(d.total)}타`;
      const label = document.createElement('span');
      const [, m, day] = d.date.split('-');
      label.textContent = `${Number(m)}/${Number(day)}`;
      const val = document.createElement('span');
      val.textContent = d.focusSec ? duration(d.focusSec) : '';
      el.append(val, bar, label);
      return el;
    }),
  );
}

function friendCard(id, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'friend';
  b.dataset.id = id;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  portrait(c, id);
  const name = document.createElement('b');
  name.textContent = `${cast.friends[id].name}`;
  const what = document.createElement('small');
  what.textContent = cast.friends[id].what;
  b.append(c, name, what);
  b.addEventListener('click', onClick);
  return b;
}

function buildFriendPickers() {
  $('#desk-friend').replaceChildren(
    ...FRIEND_IDS.map((id) =>
      friendCard(id, async () => {
        const wanderers = settings.wanderers.filter((x) => x !== id);
        if (!settings.wanderers.includes(settings.deskFriend) && settings.deskFriend !== id) wanderers.push(settings.deskFriend);
        settings = await odd.setSettings({ deskFriend: id, wanderers });
        applySettings();
      }),
    ),
  );
  $('#wanderers').replaceChildren(
    ...FRIEND_IDS.map((id) =>
      friendCard(id, async () => {
        if (id === settings.deskFriend) return;
        const on = settings.wanderers.includes(id);
        settings = await odd.setSettings({ wanderers: on ? settings.wanderers.filter((x) => x !== id) : [...settings.wanderers, id] });
        applySettings();
      }),
    ),
  );
}

function buildEpisodes() {
  const list = $('#episode-list');
  for (const [cat, label] of CATEGORIES) {
    const eps = EPISODES.filter((e) => e.cat === cat);
    if (!eps.length) continue;
    const h = document.createElement('div');
    h.className = 'cat';
    h.textContent = label;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const ep of eps) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.id = ep.id;
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.title = '저절로 나오기 켜기/끄기';
      dot.addEventListener('click', async (e) => {
        e.stopPropagation();
        const off = settings.disabledEpisodes.includes(ep.id);
        settings = await odd.setSettings({
          disabledEpisodes: off ? settings.disabledEpisodes.filter((x) => x !== ep.id) : [...settings.disabledEpisodes, ep.id],
        });
        applySettings();
      });
      const text = document.createElement('span');
      text.textContent = `${ep.emoji} ${ep.title}`;
      const need = document.createElement('span');
      need.className = 'need';
      chip.append(...(ep.id === 'random' ? [] : [dot]), text, need);
      chip.addEventListener('click', () => odd.playEpisode(ep.id));
      chips.append(chip);
    }
    list.append(h, chips);
  }
}

function applySettings() {
  for (const el of $$('[data-key]')) {
    const v = settings[el.dataset.key];
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else if (document.activeElement !== el) el.value = v;
  }
  $('#scale-out').textContent = `${Math.round(settings.scale * 100)}%`;
  for (const b of $$('#desk-friend .friend')) b.classList.toggle('on', b.dataset.id === settings.deskFriend);
  for (const b of $$('#wanderers .friend')) {
    const desk = b.dataset.id === settings.deskFriend;
    b.classList.toggle('on', settings.wanderers.includes(b.dataset.id));
    b.disabled = desk;
    b.title = desk ? '책상에 앉아 있어요' : '';
  }
  for (const chip of $$('#episode-list .chip')) {
    const ep = EPISODES.find((e) => e.id === chip.dataset.id);
    const dot = $('.dot', chip);
    if (dot) dot.classList.toggle('off', settings.disabledEpisodes.includes(ep.id));
    const missing = (ep.requires || []).filter((x) => !settings.wanderers.includes(x));
    chip.classList.toggle('unavailable', missing.length > 0);
    $('.need', chip).textContent = missing.length ? `(${missing.map((m) => cast.friends[m].name).join(', ')} 필요)` : '';
  }
  const kb = settings.keyboard || {};
  const status = $('#kb-status');
  status.classList.toggle('bad', Boolean(kb.needsPermission || kb.error));
  status.textContent = !settings.typingReact
    ? '꺼져 있어요. 키보드 감지를 전혀 하지 않아요.'
    : kb.needsPermission
      ? 'macOS의 [시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용]에서 ODD HAUS Desktop을 허용해 주세요. 허용하면 바로 시작해요.'
      : kb.error
        ? `키보드 감지를 시작하지 못했어요: ${kb.error}`
        : kb.running
          ? '타자에 반응하는 중이에요 ✓'
          : '';
  $('#ai-key').placeholder = settings.aiHasKey ? '저장된 키가 있어요 (바꾸려면 새 키 입력)' : 'Anthropic API 키 (sk-ant-…)';
}
