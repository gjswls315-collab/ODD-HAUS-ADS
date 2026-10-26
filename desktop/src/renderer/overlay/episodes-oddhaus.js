// The ODD HAUS pack: 36 little stories the friends act out on the desktop now and then.
// Each episode is an async script against the Stage API (see director.js).
// `need` = how many friends it takes, `requires` = friends it can't do without,
// `prefer` = friends cast first when they're around, `season` = only plays by itself then.

export const CATEGORIES = [
  ['together', '다 같이'],
  ['guests', '손님이 와요'],
  ['story', '쓸모의 발견'],
  ['night', '밤의 오드하우스'],
  ['world', '다른 세계'],
  ['season', '계절·기념일'],
  ['pair', '손님끼리'],
];

import { RIG } from '../shared/draw.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const by = (id, map, dflt) => (map[id] !== undefined ? map[id] : dflt);
const spread = (n, gap = 62) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap);

async function cheer(s, ms = 1800, pose = 'cheer') {
  s.poseAll(pose);
  await s.wait(ms);
  s.poseAll('stand');
}

// Guests ------------------------------------------------------------------

function buddy(s, opts = {}) {
  return s.guest('buddy', { x: s.right + 160 * s.unit, flip: true, layer: 'back', walking: false, ...opts });
}

async function buddyWalk(s, g, x, ms, riders = []) {
  g.walking = true;
  const dx = x - g.x;
  const moves = riders.map((id) => s.tween(s.f(id), { x: s.f(id).x + dx }, ms, 'linear'));
  await Promise.all([s.tween(g, { x }, ms, 'linear'), ...moves]);
  g.walking = false;
}

function bullyHead(s, side = s.awaySide()) {
  const x = side === 'left' ? s.left + 210 * s.unit : s.right - 210 * s.unit;
  return s.guest('bully', { x, y: s.floor + 420 * s.unit, s: 0.85 * s.unit, layer: 'front', flip: side === 'right' });
}

async function rise(s, g, k = 1, ms = 1200) {
  await s.tween(g, { y: s.floor + (420 - 330 * k) * s.unit }, ms, 'out');
}

const bullyMouth = (s, g) => [g.x, g.y - 335 * 0.85 * s.unit];

function oddFace(s, side = s.awaySide()) {
  const left = side === 'left';
  return s.guest('odd', { x: left ? s.left - 120 * s.unit : s.right + 120 * s.unit, y: s.floor - 250 * s.unit, s: 0.95 * s.unit, layer: 'front', smile: 0, flip: left, side });
}

// x where a guest standing at a screen edge is in view (k = how far in, in units)
const edgeX = (s, side, k) => (side === 'left' ? s.left + k * s.unit : s.right - k * s.unit);
// the stage centre for scenes with a guest at one edge
const nearEdge = (s, side, k) => (s.cx = edgeX(s, side, k));

function giantHand(s, x, opts = {}) {
  return s.guest('hand', { x, y: s.top - 60 * s.unit, s: 1.15 * s.unit, layer: 'front', color: '#f0c39c', sleeve: true, ...opts });
}

// Episodes ---------------------------------------------------------------

export const EPISODES = [
  // ======================================================== 다 같이
  {
    id: 'dance',
    cat: 'together',
    emoji: '🎵',
    title: '댄스 타임',
    need: 2,
    async play(s) {
      const amp = s.prop('amp', { x: s.at(-150) });
      await s.gather(spread(s.cast.length, 62).map((u) => u + 20));
      const [a, b] = s.cast;
      await s.talk(a, by(a, { picker: '…음악이라도 틀까.', rex: '악사들이여, 연주하라!' }, '음악 틀자~!'));
      amp.on = true;
      const notes = s.fx('notes', s.around(-150, 60, 60));
      s.emote(b, 'excl', 1.2);
      await s.wait(900);
      s.poseAll('dance');
      await s.wait(3500);
      s.say(b, '빙글빙글~');
      await s.wait(3000);
      notes.stop();
      amp.on = false;
      await cheer(s, 1500);
      await s.talk(a, '아~ 신난다!');
    },
  },
  {
    id: 'chat',
    cat: 'together',
    emoji: '💬',
    title: '모여서 수다',
    need: 2,
    async play(s) {
      const [a, b] = s.cast;
      await s.gather([-34, 34, -100, 100, 160].slice(0, s.cast.length));
      const talks = [
        ['오늘 뭐 했어?', '소파 밑에서 동전 찾았어!', '우와 부자다~', '헤헤, 100원이야.'],
        ['나 요즘 고민 있어…', '뭔데뭔데?', '내가 쓸모가 있을까?', '당연하지! 쓸모없는 건 없어!'],
        ['저 사람 진짜 열심히 한다.', '타닥타닥 소리 좋아~', '우리도 응원하자!', '힘내라~!'],
        ['제일 좋아하는 소리는?', '레코드 튀는 소리!', '…그건 Vin 얘기잖아.', '헤헤, 들켰다.'],
        ['오늘 저녁 뭐 먹지?', '라면!', '또 라면?', '라면은 매일 먹어도 맛있어~'],
      ];
      const lines = pick(talks);
      for (let i = 0; i < lines.length; i++) {
        const who = i % 2 ? b : a;
        if (i === 1) s.pose(b, 'wave');
        if (i === 2) s.pose(a, 'think');
        await s.talk(who, lines[i]);
        s.pose(who, 'stand');
      }
      s.emote(a, 'hearts', 2);
      s.emote(b, 'hearts', 2);
      await s.wait(1600);
    },
  },
  {
    id: 'snack',
    cat: 'together',
    emoji: '🍪',
    title: '간식 시간',
    need: 2,
    async play(s) {
      s.prop('mat', { w: 220 });
      const plate = s.prop('plate', { count: 5, food: 'cookie' });
      const n = s.cast.length;
      await s.gather(spread(n, 62).map((u) => (u === 0 ? 70 : u)));
      await s.talk(s.cast[0], '간식 먹자~!');
      s.poseAll('sit');
      await s.wait(600);
      for (const id of s.cast) {
        s.item(id, 'cookie');
        s.pose(id, 'eat');
      }
      plate.count = 1;
      await s.wait(2600);
      await s.talk(s.cast[1], by(s.cast[1], { picker: '흥, 마지막 하나는 내 거야.', aa: '하, 하나만 더 먹어도 될까…?' }, '하나만 더~'));
      s.say(s.cast[0], '반 나눠 먹자!');
      plate.count = 0;
      for (const id of s.cast) s.emote(id, 'hearts', 2.4);
      await s.wait(2600);
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'sit');
        s.expr(id, 'happy', 'w');
      }
      await s.talk(s.cast[n - 1], '배부르다~');
    },
  },
  {
    id: 'picnic',
    cat: 'together',
    emoji: '🧺',
    title: '소풍 가는 날',
    need: 2,
    async play(s) {
      s.fit(-520, 160);
      const n = s.cast.length;
      const start = s.at(-260);
      await Promise.all(s.cast.map((id, i) => s.walk(id, start - i * 50 * s.unit, { run: true })));
      s.item(s.cast[0], 'flag');
      s.say(s.cast[0], '소풍 출발~!');
      await Promise.all(s.cast.map((id, i) => s.walk(id, s.at(spread(n, 62)[n - 1 - i]))));
      s.item(s.cast[0], null);
      s.prop('mat', { w: 230 });
      s.prop('basket', { x: s.at(0) });
      for (const id of s.cast) s.face(id, s.cx);
      s.poseAll('sit');
      const hearts = s.fx('hearts', s.around(0, 90, 220));
      await s.talk(s.cast[1], '도시락 맛있겠다~');
      for (const id of s.cast) s.pose(id, 'eat');
      await s.wait(2500);
      s.poseAll('sit');
      await s.talk(s.cast[0], '날씨도 좋고~ 최고다!');
      hearts.stop();
      for (const id of s.cast) s.expr(id, 'happy', 'w');
      await s.wait(1800);
    },
  },
  {
    id: 'rain',
    cat: 'together',
    emoji: '☔',
    title: '비 오는 날',
    need: 2,
    prefer: ['aa', 'locke'],
    async play(s) {
      const [a, b] = s.cast;
      await s.gather(spread(s.cast.length, 70));
      const rain = s.fx('rain');
      s.poseAll('shiver');
      await s.talk(a, by(a, { aa: '비, 비 오면… 합선된단 말이야…!' }, '으앗, 비다!'));
      s.set(a, { scared: true });
      s.item(b, 'umbrella');
      s.pose(b, 'holdup');
      await s.talk(b, by(b, { locke: '같이 써요!', picker: '…들어와. 젖으면 곤란하잖아.' }, '여기 들어와!'));
      await s.walk(a, s.f(b).x - 22 * s.unit);
      s.face(a, s.f(b).x);
      s.set(a, { scared: false });
      s.pose(a, 'stand');
      s.emote(a, 'hearts', 3);
      await s.talk(a, '고, 고마워…');
      for (const id of s.cast.slice(2)) {
        await s.walk(id, s.f(b).x + 26 * s.unit);
        s.pose(id, 'stand');
      }
      await s.wait(3000);
      rain.stop();
      await s.wait(1200);
      s.item(b, null);
      s.pose(b, 'stand');
      await s.talk(a, '비 그쳤다~!');
      await cheer(s, 1400);
    },
  },
  {
    id: 'shootingstar',
    cat: 'together',
    emoji: '🌠',
    title: '별똥별',
    need: 2,
    async play(s) {
      const night = s.tint('night');
      s.tween(night, { alpha: 1 }, 1500);
      const area = { x: s.left, y: s.floor - 520 * s.unit, w: s.width, h: 420 * s.unit };
      s.fx('stars', area);
      await s.gather(spread(s.cast.length, 62));
      s.poseAll('sit');
      for (const id of s.cast) s.look(id, [0.3, -1]);
      await s.wait(1500);
      const shoot = s.fx('shooting', area);
      await s.talk(s.cast[0], '앗! 별똥별이다!');
      const wish = {
        vin: '맞는 턴테이블 만나게 해 주세요!',
        picker: '…짝 찾게 해 주세요.',
        aa: '전기 가득 충전되게 해 주세요…',
        locke: '꼭 맞는 문을 찾게 해 주세요.',
        rex: '체스판으로 돌아가게 해 주소서!',
      };
      for (const id of s.cast) {
        s.pose(id, 'think');
        s.expr(id, 'closed', 'smile');
        await s.talk(id, wish[id] || '소원 빌자!');
      }
      shoot.stop();
      for (const id of s.cast) {
        s.pose(id, 'sit');
        s.expr(id, 'happy', 'w');
      }
      await s.wait(1500);
      await s.tween(night, { alpha: 0 }, 1500);
    },
  },
  {
    id: 'nap',
    cat: 'together',
    emoji: '💤',
    title: '낮잠 시간',
    need: 2,
    async play(s) {
      const n = s.cast.length;
      await s.gather(spread(n, 56));
      await s.talk(s.cast[0], '하암~ 졸려…');
      s.poseAll('sleep');
      const blanket = s.prop('blanket', { w: 70 + n * 52, layer: 'front', alpha: 0 });
      await s.tween(blanket, { alpha: 1 }, 600);
      for (const id of s.cast) s.emote(id, 'zzz', 9);
      await s.wait(8000);
      const last = s.cast[n - 1];
      s.expr(last, 'line', 'o');
      await s.talk(last, '…벌써 일어날 시간?');
      await s.fadeOut(blanket, 500);
      s.poseAll('stretch');
      await s.wait(1800);
    },
  },
  {
    id: 'hideseek',
    cat: 'together',
    emoji: '🙈',
    title: '숨바꼭질',
    need: 3,
    async play(s) {
      s.fit(-320, 300);
      const [seeker, ...hiders] = s.cast;
      const spots = [
        s.prop('box', { x: s.at(-170), layer: 'front' }),
        s.prop('plant', { x: s.at(150), layer: 'front' }),
        s.prop('box', { x: s.at(260), layer: 'front', flip: true }),
        s.prop('plant', { x: s.at(-280), layer: 'front' }),
      ];
      await s.gather([0, ...spread(hiders.length, 50)]);
      s.face(seeker, -1);
      s.pose(seeker, 'think');
      s.say(seeker, '하나, 둘, 셋… 열!', 4);
      await Promise.all(hiders.map((id, i) => s.walk(id, spots[i % spots.length].x, { run: true })));
      for (const id of hiders) s.set(id, { z: -1 });
      await s.wait(1200);
      s.pose(seeker, 'look');
      await s.talk(seeker, '어디 있지~?');
      for (let i = 0; i < hiders.length; i++) {
        const id = hiders[i];
        await s.walk(seeker, spots[i % spots.length].x + (i % 2 ? 40 : -40) * s.unit);
        s.face(seeker, spots[i % spots.length].x);
        s.pose(seeker, 'point');
        s.set(id, { z: 2 });
        await s.jump(id, 0.8);
        s.emote(id, 'sweat');
        await s.talk(seeker, '찾았다!');
        s.pose(seeker, 'stand');
      }
      await s.gather(spread(s.cast.length, 62));
      s.poseAll('clap');
      await s.talk(hiders[0], '다음엔 내가 술래!');
    },
  },
  {
    id: 'race',
    cat: 'together',
    emoji: '🏁',
    title: '달리기 시합',
    need: 2,
    prefer: ['rex'],
    async play(s) {
      s.fit(-300, 320);
      const finish = s.prop('finish', { x: s.at(230), w: 140 });
      const startX = s.at(-260);
      await Promise.all(s.cast.map((id, i) => s.walk(id, startX - i * 16 * s.unit)));
      for (const id of s.cast) s.face(id, 1);
      await s.talk(s.cast[s.cast.length - 1], '준비~');
      await s.talk(s.cast[s.cast.length - 1], '땅!', 1);
      const speeds = s.cast.map(() => 1.4 + Math.random() * 0.9);
      let winner = null;
      await Promise.all(
        s.cast.map(async (id, i) => {
          if (id === 'rex') {
            await s.walk(id, s.at(-60), { run: true, speed: 1.1 });
            s.pose(id, 'sit');
            s.say(id, '짐의 망토가…!');
            s.expr(id, 'dizzy', 'wavy');
            await s.wait(1600);
            s.expr(id, null, null);
            await s.walk(id, s.at(260), { speed: 1 });
            return;
          }
          await s.walk(id, s.at(260 + i * 4), { run: true, speed: speeds[i] });
          if (!winner) {
            winner = id;
            finish.broken = true;
            s.pose(id, 'cheer');
            s.say(id, '1등!');
          } else s.pose(id, 'stand');
        }),
      );
      for (const id of s.cast) if (id !== winner) s.pose(id, 'clap');
      await s.wait(1500);
      if (s.has('rex')) await s.talk('rex', '…짐은 일부러 져 준 것이니라.');
      await s.wait(800);
    },
  },
  {
    id: 'lights',
    cat: 'together',
    emoji: '💡',
    title: '꼬마전구 줄타기',
    need: 2,
    prefer: ['aa'],
    async play(s) {
      s.fit(-280, 280);
      const n = s.cast.length;
      const xs = spread(n, 120).map((u) => s.at(u));
      const feetY = xs.map((_, i) => s.floor - (190 + ((i * 97) % 180)) * s.unit);
      // each cord ends right at its friend's raised hands
      const handY = s.cast.map((id, i) => feetY[i] + (RIG[id].top - 2) * s.unit);
      const cords = xs.map((x, i) => s.prop('cord', { x, y: s.top, len: 0, seed: i, layer: 'back', s: 1 }));
      await Promise.all(cords.map((c, i) => s.tween(c, { y: handY[i], len: handY[i] - s.top }, 1400, 'out')));
      for (let i = 0; i < n; i++) {
        const id = s.cast[i];
        s.set(id, { x: xs[i], y: s.top + 120 * s.unit, alpha: 0 });
        s.pose(id, 'hang');
      }
      await Promise.all(s.cast.map((id, i) => s.tween(s.f(id), { y: feetY[i], alpha: 1 }, 1600 + i * 200, 'out')));
      s.say(s.cast[0], '흔들흔들~');
      for (let k = 0; k < 4; k++) {
        const sway = (k % 2 ? -1 : 1) * 14;
        await Promise.all([...cords.map((c) => s.tween(c, { sway }, 900)), ...s.cast.map((id, i) => s.tween(s.f(id), { x: xs[i] + sway }, 900))]);
      }
      const lighter = s.has('aa') ? 'aa' : s.cast[0];
      await s.talk(lighter, by(lighter, { aa: '내, 내가 불 켜 볼게…!' }, '불 켜자!'));
      for (const c of cords) c.lit = true;
      for (const id of s.cast) s.expr(id, 'happy', 'open');
      await s.wait(3000);
      await Promise.all(s.cast.map((id) => s.land(id)));
      for (const c of cords) s.bg(s.tween(c, { len: 0, y: s.top }, 900, 'in'));
      await cheer(s, 1400);
    },
  },

  // ======================================================== 손님이 와요
  {
    id: 'buddywalk',
    cat: 'guests',
    emoji: '🐶',
    title: 'Buddy의 산책',
    need: 1,
    async play(s) {
      s.fit(-300, 300);
      const g = buddy(s);
      await s.gather(spread(s.cast.length, 62).map((u) => u - 120));
      await buddyWalk(s, g, s.at(160), 2600);
      g.sniff = true;
      await s.talk(s.cast[0], 'Buddy다~!');
      g.sniff = false;
      g.happy = true;
      s.sayAt(g.x - 110 * s.unit, g.y - 190 * s.unit, '멍!', 1.5);
      await s.wait(1200);
      const back = s.cast.slice(0, 3);
      for (let i = 0; i < back.length; i++) {
        const id = back[i];
        await s.walk(id, g.x - (30 - i * 42) * s.unit, { run: true });
        s.pose(id, 'jump');
        await s.glide(id, g.x - (40 - i * 42) * s.unit, s.floor - 128 * s.unit, 450, 'out');
        s.pose(id, 'sit');
        s.face(id, -1);
      }
      await s.talk(back[0], '출발~!');
      g.happy = false;
      await buddyWalk(s, g, s.at(-200), 4200, back);
      for (const id of back) s.pose(id, 'cheer');
      await s.wait(1200);
      for (const id of back) s.bg(s.land(id));
      await s.wait(900);
      s.poseAll('wave');
      g.happy = true;
      await s.talk(back[0], '고마워 Buddy~!');
      await buddyWalk(s, g, s.left - 200 * s.unit, 2600);
    },
  },
  {
    id: 'capboat',
    cat: 'guests',
    emoji: '🧢',
    title: 'Bully의 모자 보트',
    need: 2,
    async play(s) {
      s.fit(-200, 200);
      await s.gather(spread(s.cast.length, 62));
      const water = s.prop('waves', { h: 90, rise: 0, layer: 'front' });
      s.bg(s.tween(water, { rise: 0.7 }, 3000));
      s.poseAll('shiver');
      for (const id of s.cast) if (id === 'aa') s.set(id, { scared: true });
      await s.talk(s.cast[0], '무, 물이 차오른다~!');
      const hand = s.guest('hand', { x: s.at(0), y: s.top - 60 * s.unit, s: 1.15 * s.unit, color: '#f5c9a5', wrist: true, layer: 'front' });
      const cap = s.prop('cap', { x: s.at(0), y: s.top - 40 * s.unit, layer: 'front' });
      await Promise.all([
        s.tween(hand, { y: s.floor - 160 * s.unit }, 1200, 'out'),
        s.tween(cap, { y: s.floor - 50 * s.unit }, 1200, 'out'),
      ]);
      s.bg(s.tween(hand, { y: s.top - 300 * s.unit }, 900, 'in'));
      await s.tween(cap, { y: s.floor - 34 * s.unit }, 500);
      const head = bullyHead(s);
      s.bg(rise(s, head, 1));
      await s.wait(700);
      await s.talkAt(...bullyMouth(s, head), '내 모자에 타!');
      for (let i = 0; i < s.cast.length; i++) {
        const id = s.cast[i];
        s.set(id, { scared: false, z: -1 });
        s.pose(id, 'jump');
        await s.glide(id, cap.x + (i - (s.cast.length - 1) / 2) * 20 * s.unit, cap.y - 6 * s.unit, 500, 'out');
        s.pose(id, 'cheer');
      }
      const riders = s.cast.map((id) => [id, s.f(id).x - cap.x]);
      s.say(s.cast[0], '영차영차~');
      for (const dx of [80, -60, 0]) {
        await Promise.all([s.tween(cap, { x: s.at(dx) }, 1600), ...riders.map(([id, off]) => s.tween(s.f(id), { x: s.at(dx) + off }, 1600))]);
      }
      s.bg(s.tween(head, { y: s.floor + 420 * s.unit }, 1200, 'in'));
      await s.tween(water, { rise: 0 }, 1800);
      for (const [id] of riders) s.bg(s.land(id));
      await s.wait(700);
      s.poseAll('wave');
      await s.talk(s.cast[s.cast.length - 1], '고마워 Bully~!');
      await s.fadeOut(cap, 600);
    },
  },
  {
    id: 'mug',
    cat: 'guests',
    emoji: '☕',
    title: 'Mr. ODD의 머그잔',
    need: 1,
    async play(s) {
      s.fit(-200, 200);
      await s.gather(spread(s.cast.length, 60).map((u) => (u >= 0 ? u + 60 : u - 60)));
      s.poseAll('look');
      const hand = giantHand(s, s.at(0), { item: 'mug' });
      await s.tween(hand, { y: s.floor - 88 * s.unit * 1.15 }, 1500, 'out');
      const mug = s.prop('mug', { x: s.at(-4 * 1.15), s: 1.15 * s.unit, layer: 'back' });
      hand.item = null;
      await s.tween(hand, { y: s.top - 80 * s.unit }, 1100, 'in');
      await s.talk(s.cast[0], '…따뜻한 코코아다!');
      for (const id of s.cast) {
        s.face(id, mug.x);
        s.pose(id, 'hold');
        s.expr(id, 'happy', 'w');
      }
      await s.talk(s.cast[s.cast.length - 1], '따뜻해~');
      hand.item = 'plate';
      hand.x = s.at(110);
      await s.tween(hand, { y: s.floor - 26 * s.unit }, 1300, 'out');
      const plate = s.prop('plate', { x: s.at(110), count: 4 });
      hand.item = null;
      s.sayAt(s.at(0), s.top + 140 * s.unit, '…', 2);
      await s.tween(hand, { y: s.top - 80 * s.unit }, 1000, 'in');
      void plate;
      s.poseAll('cheer');
      await s.talk(s.cast[0], '고맙습니다, Mr. ODD!');
      s.fx('hearts', s.around(0, 100, 180), { duration: 2.5 });
      await s.wait(2600);
    },
  },
  {
    id: 'peek',
    cat: 'guests',
    emoji: '👀',
    title: '깜짝 손님',
    need: 1,
    async play(s) {
      const side = s.awaySide();
      const dir = side === 'left' ? -1 : 1;
      nearEdge(s, side, 420);
      await s.gather(spread(s.cast.length, 62));
      for (const id of s.cast) s.face(id, dir);
      const face = oddFace(s, side);
      await s.tween(face, { x: edgeX(s, side, 150) }, 2600, 'inout');
      for (const id of s.cast) {
        s.pose(id, 'shiver');
        s.emote(id, 'excl', 1.5);
        if (id === 'aa') s.set(id, { scared: true });
      }
      const brave = s.cast.find((x) => x === 'picker') || s.cast[0];
      await s.talk(brave, by(brave, { picker: '누, 누구야!', rex: '무, 무엄하도다…!' }, '누, 누구세요…?'));
      s.sayAt(face.x - dir * 40 * s.unit, face.y - 170 * s.unit, '…', 2.4);
      await s.wait(2600);
      await s.tween(face, { smile: 1 }, 1500);
      for (const id of s.cast) {
        s.set(id, { scared: false });
        s.pose(id, 'stand');
        s.expr(id, 'happy', 'w');
      }
      await s.talk(s.cast[s.cast.length - 1], 'Mr. ODD였구나~');
      s.poseAll('wave');
      await s.tween(face, { x: edgeX(s, side, -140) }, 2000, 'in');
    },
  },
  {
    id: 'guitar',
    cat: 'guests',
    emoji: '🎸',
    title: 'Bully의 기타',
    need: 1,
    async play(s) {
      const side = s.awaySide();
      const dir = side === 'left' ? -1 : 1;
      nearEdge(s, side, 560);
      await s.gather(spread(s.cast.length, 62));
      for (const id of s.cast) s.face(id, dir);
      const head = bullyHead(s, side);
      await rise(s, head, 1);
      await s.talkAt(...bullyMouth(s, head), '한 곡 들어 볼래?');
      s.prop('amp', { x: s.at(dir * 130), on: true });
      s.sayAt(head.x - dir * 120 * s.unit, head.y - 300 * s.unit, '징~~~!', 1.6);
      const notes = s.fx('notes', s.around(dir * 60, 140, 260));
      s.poseAll('headbang');
      await s.wait(4500);
      s.poseAll('dance');
      await s.wait(3000);
      notes.stop();
      await cheer(s, 1400);
      await s.talk(s.cast[0], '앵콜! 앵콜!');
      await s.tween(head, { y: s.floor + 440 * s.unit }, 1300, 'in');
    },
  },
  {
    id: 'ball',
    cat: 'guests',
    emoji: '🎾',
    title: 'Buddy와 공놀이',
    need: 1,
    prefer: ['vin'],
    async play(s) {
      s.fit(-260, 420);
      await s.gather(spread(s.cast.length, 62).map((u) => u - 160));
      const ball = s.prop('ball', { x: s.at(-80), spin: 0 });
      const kicker = s.cast[0];
      await s.walk(kicker, s.at(-110));
      s.face(kicker, 1);
      s.pose(kicker, 'push');
      await s.talk(kicker, '받아라~!', 1);
      s.pose(kicker, 'cheer');
      await s.tween(ball, { x: s.at(320), spin: 14 }, 1600, 'out');
      const g = buddy(s, { happy: true });
      await buddyWalk(s, g, s.at(380), 1500);
      ball.alpha = 0;
      g.item = null;
      g.flip = false;
      s.sayAt(g.x + 110 * s.unit, g.y - 190 * s.unit, '멍멍!', 1.4);
      await buddyWalk(s, g, s.at(-20), 2200);
      ball.x = s.at(-40);
      ball.alpha = 1;
      for (const id of s.cast) s.pose(id, 'clap');
      await s.talk(s.cast[s.cast.length - 1], '잘했어, Buddy~!');
      g.flip = true;
      s.sayAt(g.x - 110 * s.unit, g.y - 190 * s.unit, '헥헥', 1.4);
      await s.wait(1200);
      await buddyWalk(s, g, s.right + 220 * s.unit, 2600);
    },
  },
  {
    id: 'letter',
    cat: 'guests',
    emoji: '💌',
    title: 'Buddy의 편지',
    need: 1,
    prefer: ['locke'],
    async play(s) {
      s.fit(-220, 260);
      await s.gather(spread(s.cast.length, 62).map((u) => u - 150));
      const g = buddy(s, { item: 'letter' });
      await buddyWalk(s, g, s.at(110), 2600);
      g.item = null;
      g.happy = true;
      const reader = s.cast[0];
      await s.walk(reader, s.at(-20));
      s.face(reader, -1);
      s.item(reader, 'letter');
      s.pose(reader, 'hold');
      await s.talk(reader, '편지다! 읽어 볼게…');
      await s.talk(reader, '“쓸모없는 것은 없다.”', 3);
      await s.talk(reader, '“모두에게는 집이 필요하다.”', 3);
      await s.talk(reader, '— Mr. ODD', 2);
      for (const id of s.cast) {
        s.expr(id, 'happy', 'w');
        s.emote(id, 'hearts', 3);
      }
      s.sayAt(g.x - 110 * s.unit, g.y - 190 * s.unit, '멍!', 1.4);
      await s.wait(2600);
      s.item(reader, null);
      await buddyWalk(s, g, s.right + 220 * s.unit, 2400);
    },
  },

  // ======================================================== 쓸모의 발견
  {
    id: 'home',
    cat: 'story',
    emoji: '🏠',
    title: '오드하우스로 가는 길',
    need: 2,
    async play(s) {
      s.fit(-620, 300);
      const house = s.prop('house', { x: s.at(250), open: 0, s: 1.7 * s.unit });
      const g = buddy(s, { x: s.at(-420), flip: false });
      await Promise.all(s.cast.map((id, i) => s.walk(id, s.at(-460 - i * 50))));
      for (const id of s.cast) s.face(id, 1);
      await s.talk(s.cast[0], '어디로 가는 거야?');
      s.sayAt(g.x + 110 * s.unit, g.y - 190 * s.unit, '멍!', 1.2);
      await Promise.all([buddyWalk(s, g, s.at(40), 4200), ...s.cast.map((id, i) => s.walk(id, s.at(-80 - i * 52)))]);
      await s.talk(s.cast[1], '와아… 집이다…');
      await s.tween(house, { open: 1 }, 1200);
      house.lit = true;
      await s.talk(s.cast[0], '여기가… 우리 집이야?');
      s.sayAt(house.x, s.floor - 235 * s.unit, '쓸모없는 것은 없다.', 3);
      await s.wait(3000);
      s.sayAt(house.x, s.floor - 235 * s.unit, '모두에게는 집이 필요하다.', 3);
      for (const id of s.cast) s.emote(id, 'hearts', 3);
      await s.wait(3000);
      g.happy = true;
      await cheer(s, 1800);
    },
  },
  {
    id: 'aa_light',
    cat: 'story',
    emoji: '🔋',
    title: 'A.A.의 불빛',
    need: 1,
    requires: ['aa'],
    async play(s) {
      const pack = s.prop('batterypack', { x: s.at(-60), lit: false, filled: false, bulbs: 6, span: 300 });
      const others = s.cast.filter((x) => x !== 'aa');
      await s.gather([-150, ...spread(others.length, 60).map((u) => u + 160)]);
      s.face('aa', pack.x);
      if (others[0]) await s.talk(others[0], '전구가 다 꺼져 있네…');
      s.pose('aa', 'shiver');
      await s.talk('aa', '나, 나는 반쯤 닳았는데… 될까?');
      if (others[0]) {
        s.poseAll('cheer');
        s.pose('aa', 'stand');
        await s.talk(others[0], '할 수 있어!');
        for (const id of others) s.pose(id, 'stand');
      }
      await s.walk('aa', pack.x - 13 * s.unit);
      s.pose('aa', 'jump');
      await s.tween(s.f('aa'), { alpha: 0 }, 400);
      pack.filled = true;
      await s.wait(700);
      pack.lit = true;
      for (const id of others) {
        s.expr(id, 'wide', 'open');
        s.emote(id, 'excl', 1.4);
      }
      await s.wait(1500);
      for (const id of others) s.pose(id, 'cheer');
      if (others[0]) await s.talk(others[0], '와아~ 반짝반짝해!');
      pack.filled = false;
      s.set('aa', { y: s.floor, alpha: 1 });
      s.pose('aa', 'cheer');
      s.emote('aa', 'sparkle', 3);
      await s.talk('aa', '나… 아직 쓸모 있구나!');
      await s.wait(1200);
    },
  },
  {
    id: 'vin_skip',
    cat: 'story',
    emoji: '💿',
    title: '튀는 소리가 비트로',
    need: 1,
    requires: ['vin'],
    async play(s) {
      const tt = s.prop('turntable', { x: s.at(-40) });
      const others = s.cast.filter((x) => x !== 'vin');
      await s.gather([-120, ...spread(others.length, 60).map((u) => u + 120)]);
      s.pose('vin', 'sit');
      s.expr('vin', 'sad', 'frown');
      await s.talk('vin', '나는 바늘이 튀어서… 아무도 안 틀어 줘.');
      if (others[0]) await s.talk(others[0], '한번 올라가 봐!');
      s.expr('vin', null, null);
      await s.walk('vin', tt.x - 8 * s.unit);
      await s.glide('vin', tt.x - 8 * s.unit, s.floor - 24 * s.unit, 400, 'out');
      tt.spinning = true;
      tt.needleDown = true;
      s.set('vin', { spin: 0 });
      const spinning = (async () => {
        for (let k = 0; k < 60; k++) {
          s.set('vin', { spin: k * 0.5 });
          await s.wait(80);
        }
      })();
      s.say('vin', '찌직… 찌직… 찌직…', 2.5);
      await s.wait(2500);
      if (others[0]) await s.talk(others[0], '어? 이거… 비트잖아!');
      const notes = s.fx('notes', s.around(-40, 70, 200));
      for (const id of others) s.pose(id, 'dance');
      s.expr('vin', 'happy', 'open');
      await spinning;
      notes.stop();
      tt.spinning = false;
      await s.land('vin');
      s.pose('vin', 'cheer');
      await s.talk('vin', '튀는 소리도… 음악이 되는구나!');
      await s.wait(800);
    },
  },
  {
    id: 'locke_door',
    cat: 'story',
    emoji: '🔑',
    title: 'Locke의 작은 문',
    need: 1,
    requires: ['locke'],
    async play(s) {
      const door = s.prop('door', { x: s.at(140), open: 0 });
      const others = s.cast.filter((x) => x !== 'locke');
      await s.gather([-60, ...spread(others.length, 60).map((u) => u - 170)]);
      s.face('locke', door.x);
      await s.talk('locke', '이 문… 열쇠 구멍 모양이 어디서 많이 본 것 같아요.');
      await s.walk('locke', door.x - 40 * s.unit);
      s.pose('locke', 'push');
      await s.wait(900);
      s.sayAt(door.x, s.floor - 90 * s.unit, '딸깍!', 1.2);
      await s.wait(500);
      await s.tween(door, { open: 1 }, 1200);
      s.pose('locke', 'stand');
      s.expr('locke', 'wide', 'o');
      s.emote('locke', 'sparkle', 3);
      for (const id of others) s.pose(id, 'cheer');
      await s.wait(1000);
      s.expr('locke', 'happy', 'smile');
      await s.talk('locke', '드디어… 꼭 맞는 문을 찾았어요.');
      s.fx('hearts', s.around(140, 90, 160), { duration: 2.5 });
      await s.wait(2400);
    },
  },
  {
    id: 'rex_square',
    cat: 'story',
    emoji: '♟️',
    title: 'Rex의 빈칸',
    need: 1,
    requires: ['rex'],
    async play(s) {
      const board = s.prop('chessboard', { x: s.at(120), highlight: true });
      const others = s.cast.filter((x) => x !== 'rex');
      await s.gather([-200, ...spread(others.length, 60).map((u) => u - 60)]);
      if (others[0]) await s.talk(others[0], '저기 체스판에 빈칸이 하나 있어!');
      s.face('rex', 1);
      await s.talk('rex', '짐의… 자리로다!');
      await s.walk('rex', board.x - 30 * s.unit, { speed: 0.6 });
      s.say('rex', '헉… 헉… 망토가 무겁도다…', 2.2);
      await s.wait(2200);
      await s.jump('rex', 0.9);
      await s.glide('rex', board.x + 10 * s.unit, s.floor - 34 * s.unit, 500, 'out');
      board.highlight = false;
      s.pose('rex', 'cheer');
      s.fx('confetti', { x: board.x - 40, y: s.floor - 160 * s.unit, w: 80, h: 80 });
      await s.talk('rex', '체크메이트…가 아니라, 완성이노라!');
      for (const id of others) s.pose(id, 'clap');
      await s.wait(2000);
      await s.land('rex');
    },
  },
  {
    id: 'picker_strum',
    cat: 'story',
    emoji: '🎸',
    title: 'Picker의 첫 스트럼',
    need: 1,
    requires: ['picker'],
    async play(s) {
      const side = s.awaySide();
      const dir = side === 'left' ? -1 : 1;
      nearEdge(s, side, 520);
      const others = s.cast.filter((x) => x !== 'picker');
      await s.gather([dir * 40, ...spread(others.length, 60).map((u) => u - dir * 110)]);
      const head = bullyHead(s, side);
      await rise(s, head, 1);
      await s.talkAt(...bullyMouth(s, head), '피크를 잃어버려서 기타를 못 치겠네…');
      s.face('picker', dir);
      s.pose('picker', 'think');
      await s.talk('picker', '…흥. 이번만이야.');
      const hand = s.guest('hand', { x: s.f('picker').x, y: s.top - 60 * s.unit, s: 1.15 * s.unit, color: '#f5c9a5', wrist: true });
      await s.tween(hand, { y: s.floor - 82 * s.unit * 1.15 }, 1200, 'out');
      s.pose('picker', 'held');
      const up = s.floor - 260 * s.unit;
      await Promise.all([s.tween(hand, { y: up - 50 * s.unit }, 900), s.glide('picker', hand.x, up + 40 * s.unit, 900)]);
      s.sayAt(head.x - dir * 150 * s.unit, up - 40 * s.unit, '징~~~~!!', 2);
      s.fx('notes', s.around(dir * 80, 220, 300), { duration: 4 });
      for (const id of others) s.pose(id, 'headbang');
      s.expr('picker', 'happy', 'open');
      await s.wait(3500);
      await Promise.all([s.tween(hand, { y: s.floor - 92 * s.unit }, 900), s.glide('picker', hand.x, s.floor, 900)]);
      s.bg(s.tween(hand, { y: s.top - 300 * s.unit }, 900, 'in'));
      s.pose('picker', 'stand');
      await s.talk('picker', '…나쁘지 않네.');
      s.emote('picker', 'hearts', 2);
      await s.tween(head, { y: s.floor + 440 * s.unit }, 1200, 'in');
    },
  },

  // ======================================================== 밤의 오드하우스
  {
    id: 'pajama',
    cat: 'night',
    emoji: '🌙',
    title: '파자마 파티',
    need: 2,
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 1 }, 1400));
      const lamp = s.prop('lamp', { x: s.at(-170), on: true });
      s.prop('pillows', { x: s.at(40) });
      for (const id of s.cast) s.acc(id, ['nightcap']);
      await s.gather(spread(s.cast.length, 62).map((u) => u + 30));
      await s.talk(s.cast[0], '파자마 파티다~!');
      for (const id of s.cast) {
        s.item(id, 'pillow');
        s.pose(id, 'cheer');
      }
      await s.talk(s.cast[1], '베개 싸움이다! 에잇!', 1.5);
      for (let k = 0; k < 4; k++) {
        const id = s.cast[k % s.cast.length];
        s.bg(s.jump(id, 0.7));
        s.say(id, pick(['퍽!', '에잇!', '받아라~', '으악!']), 1);
        await s.wait(700);
      }
      for (const id of s.cast) s.item(id, null);
      lamp.on = false;
      s.fx('stars', { x: s.left, y: s.floor - 480 * s.unit, w: s.width, h: 360 * s.unit });
      await s.talk(s.cast[s.cast.length - 1], '이제 자자… 잘 자~');
      s.poseAll('sleep');
      for (const id of s.cast) s.emote(id, 'zzz', 6);
      await s.wait(5000);
      await s.tween(night, { alpha: 0 }, 1500);
      s.poseAll('stretch');
      await s.wait(1200);
    },
  },
  {
    id: 'campfire',
    cat: 'night',
    emoji: '🔥',
    title: '모닥불 이야기',
    need: 2,
    prefer: ['locke', 'aa', 'picker'],
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 1 }, 1400));
      s.prop('campfire', { x: s.at(0) });
      const n = s.cast.length;
      await s.gather(spread(n, 60).map((u) => (Math.abs(u) < 30 ? 70 : u)));
      s.poseAll('sit');
      const teller = s.cast[0];
      s.item(teller, 'flashlight');
      s.pose(teller, 'holdup');
      await s.talk(teller, '옛날 옛적에… 맞는 문이 하나도 없는 열쇠가 있었는데…', 4);
      const scared = s.cast.find((x) => x === 'aa') || s.cast[1];
      s.pose(scared, 'shiver');
      if (scared === 'aa') s.set('aa', { scared: true });
      await s.talk(scared, '히, 히익…!');
      const quip = s.cast.find((x) => x === 'picker' && x !== teller);
      if (quip) await s.talk(quip, '…그거 Locke 얘기잖아.');
      else await s.talk(s.cast[n - 1], '…혹시 그거 자기 얘기야?');
      s.item(teller, null);
      s.set(scared, { scared: false });
      for (const id of s.cast) {
        s.pose(id, 'sit');
        s.expr(id, 'happy', 'open');
      }
      await s.wait(2200);
      await s.tween(night, { alpha: 0 }, 1500);
    },
  },

  // ======================================================== 다른 세계
  {
    id: 'cartoon',
    cat: 'world',
    emoji: '🎞️',
    title: '흑백 카툰 월드',
    need: 2,
    async play(s) {
      await s.gather(spread(s.cast.length, 60));
      const film = s.tint('cartoon', { w: 520 * s.unit, h: 300 * s.unit, iris: 1 });
      await s.tween(film, { alpha: 1 }, 800);
      await s.talk(s.cast[0], '어? 세상이 흑백이 됐어!');
      const notes = s.fx('notes', s.around(0, 120, 300));
      for (let k = 0; k < 6; k++) {
        s.poseAll(k % 2 ? 'cheer' : 'dance');
        await Promise.all(s.cast.map((id) => s.jump(id, 0.5)));
      }
      notes.stop();
      s.poseAll('wave');
      await s.wait(1200);
      await s.tween(film, { iris: 0 }, 1600, 'in');
      s.sayAt(s.cx, s.floor - 150 * s.unit, '끝!', 1.5);
      await s.wait(1400);
      film.iris = 1;
      await s.tween(film, { alpha: 0 }, 700);
    },
  },

  // ======================================================== 계절·기념일
  {
    id: 'newyear',
    cat: 'season',
    emoji: '🌅',
    title: '새해 첫날',
    need: 1,
    season: { from: [1, 1], to: [1, 3] },
    async play(s) {
      const dawn = s.tint('dawn');
      s.bg(s.tween(dawn, { alpha: 1 }, 1500));
      const sun = s.prop('sun', { x: s.at(0), y: s.floor + 40 * s.unit });
      await s.gather(spread(s.cast.length, 60).map((u) => (Math.abs(u) < 40 ? u + 80 : u)));
      for (const id of s.cast) s.face(id, s.cx);
      await s.tween(sun, { y: s.floor - 230 * s.unit }, 3500, 'out');
      await s.talk(s.cast[0], '새해 첫 해다~!');
      for (const id of s.cast) s.face(id, -1);
      s.poseAll('bow');
      await s.talk(s.cast[s.cast.length - 1], '새해 복 많이 받으세요!', 2.4);
      s.fx('confetti', { x: s.cx - 60, y: s.floor - 200 * s.unit, w: 120, h: 60 });
      await cheer(s, 1800);
      await s.tween(dawn, { alpha: 0 }, 1500);
    },
  },
  {
    id: 'seollal',
    cat: 'season',
    emoji: '🪁',
    title: '설날',
    need: 2,
    season: { lunar: 'seollal' },
    async play(s) {
      await s.gather(spread(s.cast.length, 60));
      const elder = s.has('rex') ? 'rex' : s.cast[0];
      const young = s.cast.filter((x) => x !== elder);
      s.face(elder, young[0] && s.f(young[0]).x);
      for (const id of young) s.face(id, s.f(elder).x);
      for (const id of young) s.pose(id, 'bow');
      await s.talk(young[0], '새해 복 많이 받으세요~!');
      s.item(elder, 'letter');
      s.pose(elder, 'hold');
      await s.talk(elder, by(elder, { rex: '옛다, 세뱃돈이니라!' }, '세뱃돈이야~!'));
      for (const id of young) s.pose(id, 'cheer');
      await s.wait(1500);
      s.item(elder, null);
      const flyer = young[0];
      s.item(flyer, 'kite');
      s.pose(flyer, 'holdup');
      await s.talk(flyer, '연 날리자~!', 2);
      await s.wait(3000);
      s.item(flyer, null);
    },
  },
  {
    id: 'blossom',
    cat: 'season',
    emoji: '🌸',
    title: '벚꽃 구경',
    need: 1,
    season: { from: [3, 25], to: [4, 15] },
    async play(s) {
      s.prop('blossom', { x: s.at(0), s: 1.2 * s.unit });
      const petals = s.fx('petals');
      await s.gather(spread(s.cast.length, 58).map((u) => (Math.abs(u) < 30 ? u + 70 : u)));
      s.poseAll('sit');
      for (const id of s.cast) s.look(id, [0, -1]);
      await s.talk(s.cast[0], '꽃잎이 눈처럼 내려~');
      const catcher = s.cast[s.cast.length - 1];
      s.pose(catcher, 'stand');
      await s.jump(catcher, 0.9);
      s.item(catcher, 'flower');
      await s.talk(catcher, '꽃잎 잡았다!');
      for (const id of s.cast) s.expr(id, 'happy', 'w');
      await s.wait(3000);
      petals.stop();
    },
  },
  {
    id: 'chuseok',
    cat: 'season',
    emoji: '🌕',
    title: '추석',
    need: 1,
    season: { lunar: 'chuseok' },
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 1 }, 1400));
      const moon = s.prop('moon', { x: s.at(-60), y: s.floor - 360 * s.unit, full: true, alpha: 0 });
      s.bg(s.tween(moon, { alpha: 1 }, 1500));
      s.prop('plate', { x: s.at(0), count: 5, food: 'songpyeon' });
      await s.gather(spread(s.cast.length, 60).map((u) => (Math.abs(u) < 30 ? u + 70 : u)));
      s.poseAll('sit');
      for (const id of s.cast) {
        s.item(id, 'songpyeon');
        s.pose(id, 'eat');
      }
      await s.talk(s.cast[0], '송편 맛있다~');
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'sit');
        s.look(id, [-0.4, -1]);
      }
      await s.talk(s.cast[s.cast.length - 1], '보름달처럼 꽉 찬 하루 되세요~', 3);
      await s.wait(1200);
      await s.tween(night, { alpha: 0 }, 1500);
    },
  },
  {
    id: 'halloween',
    cat: 'season',
    emoji: '🎃',
    title: '할로윈',
    need: 2,
    season: { from: [10, 24], to: [10, 31] },
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 0.7 }, 1400));
      s.prop('pumpkin', { x: s.at(-150), lit: true });
      s.prop('pumpkin', { x: s.at(170), lit: true, size: 0.8 });
      const ghost = s.cast.find((x) => x === 'locke') || s.cast[0];
      const others = s.cast.filter((x) => x !== ghost);
      for (const id of others) s.acc(id, ['witch']);
      await Promise.all([s.walk(ghost, s.at(140)), ...others.map((id, i) => s.walk(id, s.at(spread(others.length, 60)[i] - 60)))]);
      for (const id of s.cast) s.face(id, s.cx);
      s.acc(ghost, ['ghost']);
      s.set(ghost, { alpha: 0 });
      await s.talk(others[0], '트릭 오어 트릿~!');
      await s.tween(s.f(ghost), { alpha: 1 }, 600);
      await s.talk(ghost, '우~~ 사탕 안 주면 장난칠 거야~');
      for (const id of others) {
        s.pose(id, 'shiver');
        if (id === 'aa') s.set(id, { scared: true });
      }
      await s.talk(others[others.length - 1], '으아악! 유령이다!');
      s.acc(ghost, []);
      await s.talk(ghost, by(ghost, { locke: '헤헤, 저예요~ Locke!' }, '헤헤, 나야~!'));
      for (const id of s.cast) {
        s.set(id, { scared: false });
        s.item(id, 'candy');
        s.pose(id, 'cheer');
      }
      await s.talk(others[0], '사탕 파티다~!');
      await s.wait(1200);
      await s.tween(night, { alpha: 0 }, 1500);
    },
  },
  {
    id: 'snow',
    cat: 'season',
    emoji: '☃️',
    title: '눈 오는 날',
    need: 2,
    season: { from: [12, 1], to: [2, 28] },
    async play(s) {
      const snow = s.fx('snow');
      for (const id of s.cast) s.acc(id, ['scarf']);
      await s.gather(spread(s.cast.length, 62).map((u) => u - 60));
      for (const id of s.cast) s.look(id, [0, -1]);
      await s.talk(s.cast[0], '눈이다~!');
      const man = s.prop('snowman', { x: s.at(140), built: 0 });
      for (const step of [0.4, 0.7, 1]) {
        for (const id of s.cast) {
          s.face(id, man.x);
          s.pose(id, 'push');
        }
        await s.wait(1200);
        man.built = step;
      }
      s.poseAll('cheer');
      await s.talk(s.cast[1], '눈사람 완성!');
      await s.wait(2000);
      snow.stop();
    },
  },
  {
    id: 'xmas',
    cat: 'season',
    emoji: '🎄',
    title: '크리스마스',
    need: 2,
    season: { from: [12, 18], to: [12, 26] },
    async play(s) {
      s.prop('tree', { x: s.at(-20), s: 1.3 * s.unit });
      s.prop('presents', { x: s.at(60) });
      const snow = s.fx('snow');
      for (const id of s.cast) s.acc(id, ['santa']);
      await s.gather(spread(s.cast.length, 62).map((u) => (Math.abs(u) < 60 ? u + (u >= 0 ? 120 : -120) : u)));
      await s.talk(s.cast[0], '메리 크리스마스~!');
      const notes = s.fx('notes', s.around(0, 120, 300));
      s.poseAll('sing');
      await s.wait(3500);
      notes.stop();
      s.poseAll('cheer');
      await s.talk(s.cast[s.cast.length - 1], '선물 뜯어 보자~!');
      s.fx('confetti', { x: s.at(60) - 40, y: s.floor - 80 * s.unit, w: 80, h: 40 });
      await s.wait(2200);
      snow.stop();
    },
  },

  // ======================================================== 손님끼리
  {
    id: 'jam',
    cat: 'pair',
    emoji: '🎤',
    title: 'Bully와 Buddy의 잼',
    need: 1,
    async play(s) {
      const side = s.awaySide();
      const dir = side === 'left' ? -1 : 1;
      nearEdge(s, side, 600);
      await s.gather(spread(s.cast.length, 62).map((u) => u - dir * 120));
      const head = bullyHead(s, side);
      await rise(s, head, 0.9);
      await s.talkAt(...bullyMouth(s, head), 'Buddy! 같이 노래하자!');
      const g = buddy(s, { flip: dir < 0, x: edgeX(s, side === 'left' ? 'right' : 'left', -200) });
      await buddyWalk(s, g, s.at(dir * 60), 2600);
      g.happy = true;
      s.sayAt(head.x - dir * 120 * s.unit, head.y - 300 * s.unit, '징징~ 지잉~♪', 2.5);
      await s.wait(1200);
      s.sayAt(g.x + dir * 120 * s.unit, g.y - 200 * s.unit, '아우우우~♪', 2.5);
      const notes = s.fx('notes', s.around(dir * 60, 200, 360));
      s.poseAll('dance');
      await s.wait(4500);
      notes.stop();
      await cheer(s, 1500);
      await s.talk(s.cast[0], '최고의 듀엣이야!');
      s.bg(s.tween(head, { y: s.floor + 440 * s.unit }, 1200, 'in'));
      g.flip = !g.flip;
      await buddyWalk(s, g, edgeX(s, side === 'left' ? 'right' : 'left', -220), 3000);
    },
  },
  {
    id: 'chess',
    cat: 'pair',
    emoji: '♟️',
    title: 'Mr. ODD의 체스 한 판',
    need: 1,
    prefer: ['rex'],
    async play(s) {
      s.fit(-260, 260);
      const board = s.prop('chessboard', { x: s.at(0) });
      await s.gather(spread(s.cast.length, 62).map((u) => (u >= 0 ? u + 110 : u - 110)));
      for (const id of s.cast) s.face(id, board.x);
      const hand = giantHand(s, board.x - 10 * s.unit);
      await s.tween(hand, { y: s.floor - 70 * s.unit }, 1300, 'out');
      await s.wait(500);
      s.bg(s.tween(hand, { x: board.x + 30 * s.unit }, 700));
      await s.wait(800);
      const nervous = s.has('rex') ? 'rex' : s.cast[0];
      s.pose(nervous, 'shiver');
      await s.talk(nervous, by(nervous, { rex: '짐, 짐을 잡으려는 것이냐?!' }, '나, 나를 잡으려는 거야?!'));
      await s.tween(hand, { x: s.f(nervous).x, y: s.floor - 92 * s.unit }, 1000);
      s.pose(nervous, 'stand');
      s.expr(nervous, 'happy', 'w');
      for (let k = 0; k < 3; k++) {
        await s.tween(hand, { y: s.floor - 84 * s.unit }, 220);
        await s.tween(hand, { y: s.floor - 96 * s.unit }, 220);
      }
      s.emote(nervous, 'hearts', 2.5);
      await s.talk(nervous, by(nervous, { rex: '…쓰다듬어 주는 것이었구나.' }, '…쓰다듬어 줬어!'));
      await s.tween(hand, { y: s.top - 80 * s.unit }, 1100, 'in');
      for (const id of s.cast) s.pose(id, 'clap');
      await s.wait(1500);
    },
  },
  {
    id: 'random',
    cat: 'pair',
    emoji: '🎲',
    title: '아무거나',
    need: 1,
    async play() {},
  },
];
