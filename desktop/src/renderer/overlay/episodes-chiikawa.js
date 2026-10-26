// The Chiikawa pack: the same 36 stories (+ 아무거나) as the original Chiikawa desktop,
// with Chiikawa, Hachiware and Usagi and the guests who drop by.
// Fan-made for personal, non-commercial use. Characters © nagano / chiikawa committee.

import { pick, by, spread, cheer } from './kit.js';

export const CATEGORIES = [
  ['together', '다 같이'],
  ['guests', '손님이 와요'],
  ['sea', '바닷가 이야기'],
  ['pajama', '파자마 파티'],
  ['world', '다른 세계'],
  ['season', '계절·기념일'],
  ['pair', '손님끼리'],
];

// the friend playing a part, or whoever is around
const role = (s, id, i = 0) => (s.has(id) ? id : s.cast[i % s.cast.length]);
const away = (s) => s.awaySide();
const other = (side) => (side === 'left' ? 'right' : 'left');

const WISH = {
  chiikawa: '풀 뽑기 검정… 합격하게 해 주세요…!',
  hachiware: '모두랑 계속 같이 있게 해 주세요~',
  usagi: '우라! 야하!',
};

export const EPISODES = [
  // ======================================================== 다 같이
  {
    id: 'ramen',
    cat: 'together',
    emoji: '🍜',
    title: '라멘 가게에 가다',
    need: 1,
    async play(s) {
      s.fit(-220, 200);
      s.prop('stall', { x: s.at(50), layer: 'front' });
      const side = away(s);
      await s.visit('shisa', { side: side === 'left' ? 'right' : 'left', x: s.at(50), run: true });
      s.set('shisa', { z: -1 });
      await s.glide('shisa', s.at(50), s.floor - 26 * s.unit, 300); // up on the step behind the counter
      s.face('shisa', -1);
      await s.gather(spread(s.cast.length, 46).map((u) => u - 30));
      await s.talk('shisa', '어서 오세요~!');
      const C = role(s, 'chiikawa');
      await s.talk(C, by(C, { chiikawa: '라멘…!', usagi: '우라!' }, '라멘 주세요~!'));
      s.poseAll('sit');
      await s.wait(1200);
      await s.talk('shisa', '라멘 나왔습니다~!');
      for (const id of s.cast) {
        s.item(id, 'ramen');
        s.pose(id, 'eat');
      }
      s.say(s.cast[s.cast.length - 1], '후루룩~', 2);
      await s.wait(2600);
      for (const id of s.cast) {
        s.pose(id, 'sit');
        s.expr(id, 'happy', 'w');
      }
      await s.talk(C, by(C, { chiikawa: '맛있다…!' }, '맛있다~!'));
      if (s.has('usagi')) await s.talk('usagi', '야하!');
      if (s.has('hachiware')) await s.talk('hachiware', '국물까지 다 마셨어~');
      s.emote('shisa', 'hearts', 2.5);
      await s.talk('shisa', '또 오세요~!');
      for (const id of s.cast) s.item(id, null);
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
      await s.gather([-34, 34, 100].slice(0, s.cast.length));
      const talks = [
        [[a, '오늘 뭐 할까?'], [b, '토벌 가 볼까?'], [a, '…무서운데…'], [b, '괜찮아~ 같이 가면!']],
        [[a, '어제 꿈에서~'], [b, '응응!'], [a, '라멘이 산더미만큼 나왔어!'], [b, '…부럽다…!']],
        [[a, '저 사람 열심히 일한다~'], [b, '타닥타닥!'], [a, '우리도 응원하자!'], [b, '힘내라~!']],
        [[a, '모몽가가 또 귀엽다고 해 달래~'], [b, '…귀엽긴 하지.'], [a, '그치~'], [b, '(끄덕끄덕)']],
      ];
      const lines = pick(talks);
      for (let i = 0; i < lines.length; i++) {
        const [who, text] = lines[i];
        if (i === 1) s.pose(b, 'wave');
        if (i === 2) s.pose(a, 'think');
        await s.talk(who, by(who, { usagi: pick(['우라!', '야하!', '후울~', '하아?!']) }, text));
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
    need: 1,
    async play(s) {
      s.prop('mat', { w: 200 });
      const plate = s.prop('plate', { count: 5, food: 'cookie' });
      await s.gather(spread(s.cast.length, 54).map((u) => (Math.abs(u) < 20 ? u + 60 : u)));
      const H = role(s, 'hachiware');
      await s.talk(H, by(H, { usagi: '우라!' }, '간식 먹자~!'));
      s.poseAll('sit');
      await s.wait(600);
      for (const id of s.cast) {
        s.item(id, 'cookie');
        s.pose(id, 'eat');
      }
      plate.count = 1;
      await s.wait(2600);
      const C = role(s, 'chiikawa', 1);
      await s.talk(C, by(C, { chiikawa: '…하나 더…', usagi: '야하!' }, '하나만 더~'));
      plate.count = 0;
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'sit');
        s.expr(id, 'happy', 'w');
        s.emote(id, 'hearts', 2.4);
      }
      await s.wait(2400);
    },
  },
  {
    id: 'picnic',
    cat: 'together',
    emoji: '🧺',
    title: '소풍 가는 날',
    need: 1,
    async play(s) {
      s.fit(-480, 160);
      const n = s.cast.length;
      await Promise.all(s.cast.map((id, i) => s.walk(id, s.at(-260 - i * 50), { run: true })));
      s.item(s.cast[0], 'flag');
      s.say(s.cast[0], by(s.cast[0], { usagi: '우라~!', chiikawa: '…출발!' }, '소풍 출발~!'));
      await Promise.all(s.cast.map((id, i) => s.walk(id, s.at(spread(n, 62)[n - 1 - i]))));
      s.item(s.cast[0], null);
      s.prop('mat', { w: 220 });
      s.prop('basket', { x: s.at(0) });
      for (const id of s.cast) s.face(id, s.cx);
      s.poseAll('sit');
      const hearts = s.fx('hearts', s.around(0, 90, 220));
      const H = role(s, 'hachiware');
      await s.talk(H, by(H, { hachiware: '도시락 맛있겠다~!' }, '…!'));
      for (const id of s.cast) {
        s.item(id, 'cookie');
        s.pose(id, 'eat');
      }
      await s.wait(2500);
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'sit');
        s.expr(id, 'happy', 'w');
      }
      await s.talk(role(s, 'chiikawa', 1), by(role(s, 'chiikawa', 1), { chiikawa: '와아…' }, '날씨 최고~!'));
      hearts.stop();
      await s.wait(1500);
    },
  },
  {
    id: 'rain',
    cat: 'together',
    emoji: '☔',
    title: '비 오는 날',
    need: 2,
    prefer: ['chiikawa', 'hachiware'],
    async play(s) {
      const [a, b] = s.cast;
      await s.gather(spread(s.cast.length, 70));
      const rain = s.fx('rain');
      s.poseAll('shiver');
      await s.talk(a, by(a, { chiikawa: '흐엣…! 비…!', usagi: '하아?!' }, '으앗, 비다!'));
      s.item(b, 'umbrella');
      s.pose(b, 'holdup');
      await s.talk(b, by(b, { hachiware: '같이 쓰자~!', usagi: '야하!' }, '여기 들어와!'));
      await s.walk(a, s.f(b).x - 20 * s.unit);
      s.face(a, s.f(b).x);
      s.pose(a, 'stand');
      s.emote(a, 'hearts', 3);
      await s.talk(a, by(a, { chiikawa: '…고마워…!' }, '고마워~'));
      for (const id of s.cast.slice(2)) {
        await s.walk(id, s.f(b).x + 22 * s.unit);
        s.pose(id, 'stand');
      }
      await s.wait(3000);
      rain.stop();
      await s.wait(1200);
      s.item(b, null);
      s.pose(b, 'stand');
      await s.talk(b, '비 그쳤다~!');
      await cheer(s, 1400);
    },
  },
  {
    id: 'shootingstar',
    cat: 'together',
    emoji: '🌠',
    title: '별똥별',
    need: 1,
    async play(s) {
      const night = s.tint('night');
      s.tween(night, { alpha: 1 }, 1500);
      const area = { x: s.left, y: s.floor - 520 * s.unit, w: s.width, h: 420 * s.unit };
      s.fx('stars', area);
      await s.gather(spread(s.cast.length, 58));
      s.poseAll('sit');
      for (const id of s.cast) s.look(id, [0.3, -1]);
      await s.wait(1500);
      const shoot = s.fx('shooting', area);
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…!! 별똥별…!', usagi: '우라!!' }, '앗! 별똥별이다!'));
      for (const id of s.cast) {
        s.pose(id, 'think');
        s.expr(id, 'closed', 'w');
        await s.talk(id, WISH[id] || '소원 빌자~');
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
    need: 1,
    async play(s) {
      const n = s.cast.length;
      await s.gather(spread(n, 60));
      await s.talk(s.cast[0], by(s.cast[0], { usagi: '후울~' }, '하암~ 졸려…'));
      s.poseAll('sleep');
      const blanket = s.prop('blanket', { w: 80 + n * 60, layer: 'front', alpha: 0 });
      await s.tween(blanket, { alpha: 1 }, 600);
      for (const id of s.cast) s.emote(id, 'zzz', 9);
      await s.wait(8000);
      const last = s.cast[n - 1];
      s.expr(last, 'line', 'o');
      await s.talk(last, by(last, { chiikawa: '…응?', usagi: '야하!' }, '…벌써 일어날 시간?'));
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
    prefer: ['hachiware'],
    async play(s) {
      s.fit(-320, 300);
      const [seeker, ...hiders] = s.cast;
      const spots = [s.prop('box', { x: s.at(-170), layer: 'front' }), s.prop('plant', { x: s.at(160), layer: 'front' }), s.prop('box', { x: s.at(270), layer: 'front', flip: true })];
      await s.gather([0, ...spread(hiders.length, 56)]);
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
        await s.walk(seeker, spots[i % spots.length].x + (i % 2 ? 44 : -44) * s.unit);
        s.face(seeker, spots[i % spots.length].x);
        s.pose(seeker, 'point');
        s.set(id, { z: 2 });
        await s.jump(id, 0.8);
        s.emote(id, 'sweat');
        await s.talk(id, by(id, { chiikawa: '흐엣…!', usagi: '하아?!' }, '들켰다~!'));
        s.pose(seeker, 'stand');
      }
      await s.gather(spread(s.cast.length, 56));
      s.poseAll('clap');
      await s.wait(1800);
    },
  },
  {
    id: 'race',
    cat: 'together',
    emoji: '🏁',
    title: '달리기 시합',
    need: 2,
    prefer: ['usagi'],
    async play(s) {
      s.fit(-300, 320);
      const finish = s.prop('finish', { x: s.at(230), w: 140 });
      await Promise.all(s.cast.map((id, i) => s.walk(id, s.at(-260) - i * 16 * s.unit)));
      for (const id of s.cast) s.face(id, 1);
      const caller = role(s, 'hachiware', 1);
      await s.talk(caller, '준비~');
      await s.talk(caller, '땅!', 1);
      let winner = null;
      await Promise.all(
        s.cast.map(async (id, i) => {
          if (id === 'chiikawa') {
            await s.walk(id, s.at(-40), { run: true, speed: 1.2 });
            s.pose(id, 'sit');
            s.expr(id, 'sad', 'wavy');
            s.say(id, '흐엣…!');
            await s.wait(1400);
            s.expr(id, null, null);
            await s.walk(id, s.at(262), { run: true, speed: 1.3 });
            return;
          }
          await s.walk(id, s.at(260 + i * 4), { run: true, speed: id === 'usagi' ? 3.2 : 1.5 + Math.random() * 0.6 });
          if (!winner) {
            winner = id;
            finish.broken = true;
            s.pose(id, 'cheer');
            s.say(id, by(id, { usagi: '야하!!' }, '1등!'));
          } else s.pose(id, 'stand');
        }),
      );
      for (const id of s.cast) if (id !== winner) s.pose(id, 'clap');
      if (s.has('hachiware') && winner !== 'hachiware') await s.talk('hachiware', '빠르다~!');
      await s.wait(1200);
    },
  },
  {
    id: 'concert',
    cat: 'together',
    emoji: '🎤',
    title: '하치와레 콘서트',
    need: 1,
    requires: ['hachiware'],
    async play(s) {
      const stage = s.prop('stage', { x: s.at(0), w: 140, lit: false });
      const fans = s.cast.filter((x) => x !== 'hachiware');
      await Promise.all([s.walk('hachiware', s.at(-10)), ...fans.map((id, i) => s.walk(id, s.at(spread(fans.length, 60)[i] + (i % 2 ? 150 : -150))))]);
      await s.jump('hachiware', 0.6);
      await s.glide('hachiware', s.at(0), s.floor - 18 * s.unit, 300);
      s.face('hachiware', 1);
      stage.lit = true;
      for (const id of fans) {
        s.face(id, s.cx);
        s.item(id, 'lightstick');
      }
      s.item('hachiware', 'guitar');
      await s.talk('hachiware', '하치와레 콘서트~ 시작할게!');
      const notes = s.fx('notes', s.around(0, 140, 200));
      s.pose('hachiware', 'sing');
      s.say('hachiware', '♪ 라라라~ 언제까지나~', 3.5);
      for (const id of fans) s.pose(id, 'cheer');
      await s.wait(3800);
      s.say('hachiware', '♪ 다 같이~!', 2.5);
      for (const id of fans) s.pose(id, 'dance');
      await s.wait(3000);
      notes.stop();
      for (const id of fans) s.pose(id, 'clap');
      s.pose('hachiware', 'wave');
      await s.talk('hachiware', '고마워~!');
      for (const id of fans) s.item(id, null);
      s.item('hachiware', null);
      await s.land('hachiware');
    },
  },

  // ======================================================== 손님이 와요
  {
    id: 'job',
    cat: 'guests',
    emoji: '🪖',
    title: '갑옷씨의 일 의뢰',
    need: 1,
    async play(s) {
      const board = s.prop('board', { x: s.at(-90), papers: ['풀 뽑기', '토벌', '배달'] });
      await s.gather(spread(s.cast.length, 56).map((u) => u + 90));
      const side = away(s);
      await s.visit('yoroi', { side, x: s.at(-20) });
      s.face('yoroi', 1);
      await s.talk('yoroi', '오늘의 일이에요~!');
      for (const id of s.cast) {
        s.face(id, board.x);
        s.pose(id, 'look');
      }
      const C = role(s, 'chiikawa');
      await s.talk(C, by(C, { chiikawa: '…풀 뽑기…!', usagi: '우라!' }, '풀 뽑기 할래요!'));
      board.pick = 0;
      s.item(C, 'paper');
      s.pose(C, 'holdup');
      await s.talk('yoroi', '열심히 해 주세요~ 보수는 이따가!');
      for (const id of s.cast) s.pose(id, 'cheer');
      await s.wait(1600);
      s.item(C, null);
      await s.leave('yoroi', side);
    },
  },
  {
    id: 'weedexam',
    cat: 'guests',
    emoji: '🌱',
    title: '풀 뽑기 검정 시험',
    need: 1,
    prefer: ['chiikawa', 'hachiware'],
    async play(s) {
      const weeds = s.prop('weeds', { x: s.at(40), count: 8, span: 220 });
      const sign = s.prop('sign', { x: s.at(-210), text: '풀 뽑기 검정' });
      void sign;
      await s.gather(spread(s.cast.length, 64).map((u) => u + 40));
      const side = away(s);
      await s.visit('yoroi', { side, x: s.at(side === 'left' ? -150 : 230) });
      s.face('yoroi', side === 'left' ? 1 : -1);
      await s.talk('yoroi', '풀 뽑기 검정, 시작!');
      for (let k = 0; k < 3; k++) {
        for (const id of s.cast) s.pose(id, 'push');
        await s.wait(1100);
        weeds.count = Math.max(0, weeds.count - 3);
        for (const id of s.cast) {
          s.item(id, 'weed');
          s.pose(id, 'holdup');
        }
        await s.wait(700);
        for (const id of s.cast) s.item(id, null);
      }
      await s.talk('yoroi', '결과 발표~!');
      for (const id of s.cast) {
        const pass = id !== 'chiikawa' || Math.random() < 0.5;
        if (pass) {
          s.pose(id, 'cheer');
          s.item(id, 'paper');
          s.say(id, by(id, { chiikawa: '…!! 합격…!!', usagi: '야하!!' }, '합격이다~!'), 2.4);
          s.fx('confetti', { x: s.f(id).x - 30, y: s.floor - 120 * s.unit, w: 60, h: 40 });
        } else {
          s.pose(id, 'sit');
          s.expr(id, 'sad', 'wavy');
          s.say(id, '흐에엥…', 2.4);
        }
        await s.wait(1300);
      }
      if (s.has('chiikawa') && s.f('chiikawa').expr) {
        const friend = s.cast.find((x) => x !== 'chiikawa');
        if (friend) {
          await s.walk(friend, s.f('chiikawa').x + 30 * s.unit);
          s.face(friend, s.f('chiikawa').x);
          await s.talk(friend, by(friend, { usagi: '우라! (토닥토닥)' }, '괜찮아~ 다음엔 꼭 붙을 거야!'));
          s.expr('chiikawa', 'closed', 'w');
          s.emote('chiikawa', 'hearts', 2);
        }
      }
      await s.wait(1500);
      for (const id of s.cast) s.item(id, null);
      await s.leave('yoroi', side);
    },
  },
  {
    id: 'chimera',
    cat: 'guests',
    emoji: '⚔️',
    title: '키메라 토벌',
    need: 1,
    prefer: ['usagi'],
    async play(s) {
      s.fit(-200, 300);
      await s.gather(spread(s.cast.length, 56).map((u) => u - 80));
      const side = 'right';
      for (const id of s.cast) s.face(id, 1);
      await s.visit('chimera', { side, x: s.at(200) });
      s.face('chimera', -1);
      s.say('chimera', '크르르르…', 2);
      for (const id of s.cast) {
        s.pose(id, 'shiver');
        s.emote(id, 'excl', 1.5);
      }
      await s.wait(1800);
      const hero = role(s, 'usagi');
      s.item(hero, 'stick');
      s.pose(hero, 'stand');
      await s.talk(hero, by(hero, { usagi: '우라!!' }, '토벌이다~!'), 1.2);
      await s.walk(hero, s.at(150), { run: true, speed: 2.4 });
      s.pose(hero, 'cheer');
      s.expr('chimera', 'dizzy', 'wavy');
      s.emote('chimera', 'dizzy', 2);
      s.say('chimera', '캬옥…!', 1.5);
      await s.jump(hero, 0.8);
      await s.wait(600);
      s.bg(s.leave('chimera', side, { run: true, speed: 2 }));
      for (const id of s.cast) {
        s.pose(id, 'cheer');
        s.expr(id, 'happy', 'open');
      }
      await s.talk(role(s, 'chiikawa', 1), by(role(s, 'chiikawa', 1), { chiikawa: '해냈다…!', hachiware: '역시 우사기~!' }, '해냈다~!'));
      s.item(hero, null);
      await s.wait(1000);
    },
  },
  {
    id: 'surprise',
    cat: 'guests',
    emoji: '👀',
    title: '깜짝 손님',
    need: 1,
    async play(s) {
      const box = s.prop('box', { x: s.at(110), layer: 'front' });
      await s.gather(spread(s.cast.length, 56).map((u) => u - 80));
      for (const id of s.cast) s.face(id, box.x);
      const f = await s.visit('momonga', { side: 'right' });
      Object.assign(f, { x: box.x, alpha: 0, z: -1 });
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…? 상자…?', usagi: '하아?' }, '어? 웬 상자지?'));
      s.set('momonga', { alpha: 1, z: 2 });
      await s.jump('momonga', 1.1);
      s.pose('momonga', 'cheer');
      s.emote('momonga', 'sparkle', 2);
      await s.talk('momonga', '짠~! 나 귀엽지?!');
      for (const id of s.cast) {
        s.pose(id, 'shiver');
        s.emote(id, 'excl', 1.2);
      }
      await s.wait(1200);
      await s.talk('momonga', '귀엽다고 해!');
      const H = role(s, 'hachiware');
      await s.talk(H, by(H, { hachiware: '귀, 귀여워~', usagi: '…우라?' }, '…귀여워…'));
      s.poseAll('stand');
      s.emote('momonga', 'hearts', 2);
      await s.talk('momonga', '흥, 알면 됐어!');
      await s.leave('momonga', 'right', { run: true });
    },
  },
  {
    id: 'momonga_stage',
    cat: 'guests',
    emoji: '✨',
    title: '모몽가의 무대',
    need: 1,
    async play(s) {
      const stage = s.prop('stage', { x: s.at(0), w: 130 });
      await s.gather(spread(s.cast.length, 62).map((u) => u + (u >= 0 ? 130 : -130)));
      await s.visit('momonga', { side: away(s), x: s.at(0), run: true });
      await s.jump('momonga', 0.6);
      await s.glide('momonga', s.at(0), s.floor - 18 * s.unit, 250);
      stage.lit = true;
      for (const id of s.cast) {
        s.face(id, s.cx);
        s.item(id, 'lightstick');
      }
      await s.talk('momonga', '모몽가의 무대~ 잘 봐!');
      const notes = s.fx('notes', s.around(0, 130, 160));
      s.pose('momonga', 'dance');
      s.emote('momonga', 'sparkle', 6);
      for (const id of s.cast) s.pose(id, 'cheer');
      await s.wait(3500);
      s.pose('momonga', 'sing');
      await s.talk('momonga', '더 크게! 귀엽다고 해~!');
      for (const id of s.cast) s.say(id, by(id, { chiikawa: '귀, 귀여워…!', usagi: '우라!' }, '귀여워~!'), 1.8);
      await s.wait(2000);
      notes.stop();
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'clap');
      }
      await s.land('momonga');
      await s.leave('momonga', away(s));
    },
  },
  {
    id: 'gift',
    cat: 'guests',
    emoji: '🎁',
    title: '랏코의 선물',
    need: 1,
    async play(s) {
      await s.gather(spread(s.cast.length, 56).map((u) => u - 70));
      const side = away(s);
      await s.visit('rakko', { side, x: s.at(110) });
      s.face('rakko', -1);
      for (const id of s.cast) {
        s.face(id, 1);
        s.expr(id, 'wide', 'o');
      }
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…랏코다…!', usagi: '우라!!' }, '랏코다~!'));
      const gift = s.prop('presents', { x: s.at(40) });
      void gift;
      await s.talk('rakko', '…수련 열심히 했다며. 받아.');
      for (const id of s.cast) {
        s.expr(id, 'happy', 'open');
        s.pose(id, 'cheer');
      }
      s.fx('confetti', { x: s.at(40) - 40, y: s.floor - 90 * s.unit, w: 80, h: 40 });
      await s.talk(role(s, 'hachiware'), '고마워요~!');
      s.pose('rakko', 'wave');
      await s.wait(900);
      await s.leave('rakko', side);
    },
  },
  {
    id: 'momonga_rakko',
    cat: 'guests',
    emoji: '💫',
    title: '모몽가와 랏코',
    need: 1,
    async play(s) {
      s.fit(-260, 260);
      await s.gather(spread(s.cast.length, 56).map((u) => u - 170));
      for (const id of s.cast) s.face(id, 1);
      await s.visit('rakko', { side: 'right', x: s.at(220) });
      await s.visit('momonga', { side: 'right', x: s.at(290), run: true });
      s.face('momonga', -1);
      await s.talk('momonga', '랏코~ 나 좀 봐 봐!');
      s.bg(s.walk('rakko', s.at(40), { speed: 0.8 }));
      await s.walk('momonga', s.at(110), { speed: 0.8 });
      await s.talk('rakko', '…');
      s.pose('momonga', 'cheer');
      await s.talk('momonga', '귀엽다고 해!');
      await s.talk('rakko', '…수련하러 간다.');
      s.bg(s.leave('rakko', 'left'));
      s.expr('momonga', 'line', 'frown');
      s.emote('momonga', 'anger', 2);
      await s.talk('momonga', '흥!!');
      const H = role(s, 'hachiware');
      await s.talk(H, by(H, { hachiware: '모몽가… 귀여워~', usagi: '우라!' }, '…귀여워.'));
      s.expr('momonga', 'happy', 'w');
      s.emote('momonga', 'sparkle', 2);
      await s.wait(1200);
      await s.leave('momonga', 'right', { run: true });
    },
  },
  {
    id: 'shisa_ramen',
    cat: 'guests',
    emoji: '🍥',
    title: '시사의 라멘 수행',
    need: 1,
    async play(s) {
      s.fit(-220, 200);
      s.prop('stall', { x: s.at(60), layer: 'front' });
      await s.visit('shisa', { side: away(s), x: s.at(60), run: true });
      s.set('shisa', { z: -1 });
      await s.glide('shisa', s.at(60), s.floor - 26 * s.unit, 300);
      s.face('shisa', -1);
      await s.gather(spread(s.cast.length, 46).map((u) => u - 50));
      await s.talk('shisa', '라멘 수행 중이에요! 맛 좀 봐 주세요!');
      for (const id of s.cast) {
        s.item(id, 'ramen');
        s.pose(id, 'eat');
      }
      await s.wait(1800);
      for (const id of s.cast) {
        s.pose(id, 'stand');
        s.expr(id, 'line', 'wavy');
      }
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '……?', usagi: '하아?' }, '음…?'));
      s.pose('shisa', 'shiver');
      s.emote('shisa', 'sweat', 2);
      await s.talk('shisa', '다, 다시 해 볼게요!');
      s.pose('shisa', 'push');
      await s.wait(2200);
      s.pose('shisa', 'stand');
      for (const id of s.cast) {
        s.pose(id, 'eat');
        s.expr(id, null, null);
      }
      await s.wait(1600);
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'cheer');
        s.expr(id, 'happy', 'open');
      }
      await s.talk(role(s, 'chiikawa'), by(role(s, 'chiikawa'), { chiikawa: '맛있다…!!', usagi: '야하!!' }, '맛있어~!'));
      s.pose('shisa', 'cheer');
      s.emote('shisa', 'sparkle', 2);
      await s.talk('shisa', '해냈다~!');
    },
  },
  {
    id: 'kuri_snack',
    cat: 'guests',
    emoji: '🌰',
    title: '쿠리만쥬의 안주 만들기',
    need: 1,
    async play(s) {
      await s.gather(spread(s.cast.length, 56).map((u) => u + 110));
      await s.visit('kurimanju', { side: away(s), x: s.at(-60) });
      s.face('kurimanju', 1);
      const plate = s.prop('plate', { x: s.at(10), count: 0, food: 'cookie' });
      await s.talk('kurimanju', '안주를 만들어 볼까…');
      for (let i = 1; i <= 4; i++) {
        s.pose('kurimanju', 'push');
        await s.wait(700);
        plate.count = i;
        s.pose('kurimanju', 'stand');
        await s.wait(200);
      }
      s.item('kurimanju', 'beer');
      s.pose('kurimanju', 'eat');
      await s.wait(1200);
      await s.talk('kurimanju', '하아——');
      for (const id of s.cast) {
        s.face(id, plate.x);
        s.expr(id, 'wide', 'o');
      }
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…맛있겠다…', usagi: '우라…!' }, '맛있겠다~'));
      await s.talk('kurimanju', '…같이 먹을래?');
      for (const id of s.cast) {
        s.item(id, 'cookie');
        s.pose(id, 'eat');
        s.expr(id, 'happy', null);
      }
      plate.count = 0;
      await s.wait(2600);
      for (const id of s.cast) s.item(id, null);
    },
  },
  {
    id: 'kuri_moon',
    cat: 'guests',
    emoji: '🌕',
    title: '쿠리만쥬와 달구경',
    need: 1,
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 1 }, 1400));
      const moon = s.prop('moon', { x: s.at(60), y: s.floor - 340 * s.unit, full: true, alpha: 0 });
      s.bg(s.tween(moon, { alpha: 1 }, 1500));
      await s.visit('kurimanju', { side: away(s), x: s.at(-90) });
      await s.gather(spread(s.cast.length, 56).map((u) => u + 40));
      s.poseAll('sit');
      s.pose('kurimanju', 'sit');
      s.item('kurimanju', 'sake');
      for (const id of [...s.cast, 'kurimanju']) s.look(id, [0.4, -1]);
      await s.talk('kurimanju', '달이… 예쁘네…');
      s.pose('kurimanju', 'eat');
      await s.wait(1000);
      await s.talk('kurimanju', '하아——');
      for (const id of s.cast) {
        s.expr(id, 'happy', 'w');
      }
      await s.talk(role(s, 'hachiware'), by(role(s, 'hachiware'), { hachiware: '동그랗다~' }, '…예쁘다…'));
      await s.wait(2000);
      await s.tween(night, { alpha: 0 }, 1500);
    },
  },

  // ======================================================== 바닷가 이야기
  {
    id: 'island',
    cat: 'sea',
    emoji: '⛵',
    title: '섬으로 떠나요',
    need: 1,
    async play(s) {
      s.fit(-200, 220);
      const water = s.prop('waves', { h: 80, rise: 0, layer: 'front' });
      const boat = s.prop('boat', { x: s.at(-40), y: s.floor - 26 * s.unit, layer: 'front' });
      await s.gather(spread(s.cast.length, 52).map((u) => u - 170));
      s.bg(s.tween(water, { rise: 0.75 }, 2000));
      await s.talk(s.cast[0], by(s.cast[0], { usagi: '우라!' }, '배 타고 섬에 가자~!'));
      for (let i = 0; i < s.cast.length; i++) {
        const id = s.cast[i];
        s.set(id, { z: -1 });
        s.pose(id, 'jump');
        await s.glide(id, boat.x + (i - (s.cast.length - 1) / 2) * 24 * s.unit, boat.y - 12 * s.unit, 450, 'out');
        s.pose(id, 'cheer');
      }
      const riders = s.cast.map((id) => [id, s.f(id).x - boat.x]);
      s.say(s.cast[s.cast.length - 1], by(s.cast[s.cast.length - 1], { chiikawa: '와아…!' }, '출발~!'));
      for (const dx of [140, 200]) {
        await Promise.all([s.tween(boat, { x: s.at(dx) }, 2200), ...riders.map(([id, off]) => s.tween(s.f(id), { x: s.at(dx) + off }, 2200))]);
      }
      await s.talk(role(s, 'hachiware'), '섬이 보인다~!');
      await s.tween(water, { rise: 0 }, 1500);
      for (const [id] of riders) s.bg(s.land(id));
      await s.wait(700);
      await cheer(s, 1400);
    },
  },
  {
    id: 'seasong',
    cat: 'sea',
    emoji: '🌊',
    title: '바다의 노래',
    need: 1,
    async play(s) {
      const water = s.prop('waves', { h: 60, rise: 0, layer: 'back' });
      s.bg(s.tween(water, { rise: 0.5 }, 1500));
      await s.gather(spread(s.cast.length, 60));
      s.poseAll('sit');
      for (const id of s.cast) s.look(id, [0, -0.5]);
      const singer = role(s, 'hachiware');
      await s.talk(singer, by(singer, { hachiware: '바다 노래 불러 볼까~?' }, '♪~'));
      const notes = s.fx('notes', s.around(0, 100, 220));
      for (const id of s.cast) s.pose(id, 'sing');
      s.say(singer, '♪ 파도야 철썩~ 철썩~', 3);
      await s.wait(3200);
      if (s.has('usagi')) s.say('usagi', '♪ 우라라~!', 2);
      if (s.has('chiikawa')) s.say('chiikawa', '♪ 와아~', 2);
      await s.wait(2400);
      notes.stop();
      s.poseAll('sit');
      for (const id of s.cast) s.expr(id, 'happy', 'w');
      await s.wait(1500);
      await s.tween(water, { rise: 0 }, 1200);
    },
  },
  {
    id: 'shells',
    cat: 'sea',
    emoji: '🐚',
    title: '조개 줍기',
    need: 1,
    async play(s) {
      const water = s.prop('waves', { h: 50, rise: 0, layer: 'back' });
      s.bg(s.tween(water, { rise: 0.4 }, 1500));
      await s.gather(spread(s.cast.length, 90));
      for (const id of s.cast) s.pose(id, 'push');
      await s.wait(1500);
      for (const id of s.cast) {
        s.item(id, 'shell');
        s.pose(id, 'holdup');
        s.emote(id, 'sparkle', 1.5);
        await s.talk(id, by(id, { chiikawa: '…예쁘다…!', usagi: '야하!', hachiware: '반짝반짝 조개 찾았다~!' }, '찾았다!'), 1.6);
      }
      await s.gather(spread(s.cast.length, 50));
      s.poseAll('cheer');
      await s.wait(1500);
      for (const id of s.cast) s.item(id, null);
      await s.tween(water, { rise: 0 }, 1200);
    },
  },
  {
    id: 'seafireworks',
    cat: 'sea',
    emoji: '🎆',
    title: '바다 불꽃놀이',
    need: 1,
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 1 }, 1400));
      const water = s.prop('waves', { h: 50, rise: 0, layer: 'back' });
      s.bg(s.tween(water, { rise: 0.5 }, 1400));
      await s.gather(spread(s.cast.length, 58));
      s.poseAll('sit');
      for (const id of s.cast) s.look(id, [0, -1]);
      const fw = s.fx('fireworks', { x: s.cx - 300 * s.unit, y: s.floor - 520 * s.unit, w: 600 * s.unit, h: 380 * s.unit });
      await s.wait(1200);
      for (const id of s.cast) s.expr(id, 'wide', 'o');
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '와아…!!', usagi: '우라~!!' }, '예쁘다~!'));
      for (const id of s.cast) s.expr(id, 'happy', 'open');
      await s.wait(4000);
      fw.stop();
      await s.tween(night, { alpha: 0 }, 1500);
    },
  },

  // ======================================================== 파자마 파티
  {
    id: 'pajama',
    cat: 'pajama',
    emoji: '🌙',
    title: '파자마 파티',
    need: 1,
    async play(s) {
      const night = s.tint('night');
      s.bg(s.tween(night, { alpha: 1 }, 1400));
      const lamp = s.prop('lamp', { x: s.at(-170), on: true });
      s.prop('pillows', { x: s.at(40) });
      for (const id of s.cast) s.acc(id, ['nightcap']);
      await s.gather(spread(s.cast.length, 60).map((u) => u + 30));
      await s.talk(s.cast[0], by(s.cast[0], { usagi: '우라!!' }, '파자마 파티다~!'));
      for (const id of s.cast) {
        s.item(id, 'pillow');
        s.pose(id, 'cheer');
      }
      for (let k = 0; k < 4; k++) {
        const id = s.cast[k % s.cast.length];
        s.bg(s.jump(id, 0.7));
        s.say(id, by(id, { usagi: '우라!', chiikawa: '흐엣!' }, pick(['퍽!', '에잇!', '받아라~'])), 1);
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

  // ======================================================== 다른 세계
  {
    id: 'parallel',
    cat: 'world',
    emoji: '🌀',
    title: '패러렐 월드 (데카와레)',
    need: 1,
    async play(s) {
      const side = away(s);
      const dir = side === 'left' ? -1 : 1;
      s.cx = side === 'left' ? s.left + 520 * s.unit : s.right - 520 * s.unit;
      await s.gather(spread(s.cast.length, 58));
      for (const id of s.cast) s.face(id, dir);
      const big = s.guest('giant', { id: 'hachiware', s: 6 * s.unit, x: side === 'left' ? s.left - 220 * s.unit : s.right + 220 * s.unit, y: s.floor + 70 * s.unit, layer: 'front', look: [-dir * 0.6, 0] });
      await s.tween(big, { x: side === 'left' ? s.left + 60 * s.unit : s.right - 60 * s.unit }, 2600, 'out');
      for (const id of s.cast) {
        s.pose(id, 'shiver');
        s.emote(id, 'excl', 1.5);
        s.expr(id, 'wide', 'o');
      }
      await s.wait(1500);
      const H = role(s, 'hachiware');
      await s.talk(H, by(H, { hachiware: '나… 나잖아?!', usagi: '하아?!' }, '…?!'));
      s.sayAt(big.x - dir * 90 * s.unit, s.floor - 310 * s.unit, '안녕~ 이쪽 세계의 나!', 2.6);
      await s.wait(2600);
      big.pose = 'wave';
      for (const id of s.cast) {
        s.pose(id, 'wave');
        s.expr(id, 'happy', 'open');
      }
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…크다…!' }, '데카와레다~!'));
      await s.tween(big, { x: side === 'left' ? s.left - 260 * s.unit : s.right + 260 * s.unit }, 2200, 'in');
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
      await s.gather(spread(s.cast.length, 62).map((u) => (Math.abs(u) < 40 ? u + 80 : u)));
      for (const id of s.cast) s.face(id, s.cx);
      await s.tween(sun, { y: s.floor - 230 * s.unit }, 3500, 'out');
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…해다…!', usagi: '우라!' }, '새해 첫 해다~!'));
      s.poseAll('bow');
      await s.talk(role(s, 'hachiware'), '새해 복 많이 받아~!', 2.4);
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
    need: 1,
    season: { lunar: 'seollal' },
    async play(s) {
      await s.gather(spread(s.cast.length, 62).map((u) => u - 60));
      await s.visit('kurimanju', { side: away(s), x: s.at(140) });
      s.face('kurimanju', -1);
      for (const id of s.cast) {
        s.face(id, 1);
        s.pose(id, 'bow');
      }
      await s.talk(s.cast[0], '새해 복 많이 받으세요~!');
      s.item('kurimanju', 'letter');
      s.pose('kurimanju', 'hold');
      await s.talk('kurimanju', '옛다, 세뱃돈…');
      for (const id of s.cast) {
        s.pose(id, 'cheer');
        s.expr(id, 'happy', 'open');
      }
      await s.wait(1400);
      s.item('kurimanju', null);
      const flyer = s.cast[0];
      s.item(flyer, 'kite');
      s.pose(flyer, 'holdup');
      await s.talk(flyer, by(flyer, { usagi: '우라~!' }, '연 날리자~!'), 2);
      await s.wait(2600);
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
      await s.gather(spread(s.cast.length, 60).map((u) => (Math.abs(u) < 30 ? u + 70 : u)));
      s.poseAll('sit');
      for (const id of s.cast) s.look(id, [0, -1]);
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '와아…' }, '꽃잎이 눈처럼 내려~'));
      const catcher = s.cast[s.cast.length - 1];
      s.pose(catcher, 'stand');
      await s.jump(catcher, 0.9);
      s.item(catcher, 'flower');
      await s.talk(catcher, by(catcher, { usagi: '야하!' }, '꽃잎 잡았다!'));
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
      await s.gather(spread(s.cast.length, 62).map((u) => (Math.abs(u) < 30 ? u + 70 : u)));
      s.poseAll('sit');
      for (const id of s.cast) {
        s.item(id, 'songpyeon');
        s.pose(id, 'eat');
      }
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…맛있다…!', usagi: '야하!' }, '송편 맛있다~'));
      for (const id of s.cast) {
        s.item(id, null);
        s.pose(id, 'sit');
        s.look(id, [-0.4, -1]);
      }
      await s.talk(role(s, 'hachiware'), '보름달처럼 꽉 찬 하루 되기~', 3);
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
      const ghost = s.has('usagi') ? 'usagi' : s.cast[0];
      const others = s.cast.filter((x) => x !== ghost);
      for (const id of others) s.acc(id, ['witch']);
      await Promise.all([s.walk(ghost, s.at(140)), ...others.map((id, i) => s.walk(id, s.at(spread(others.length, 60)[i] - 60)))]);
      for (const id of s.cast) s.face(id, s.cx);
      s.acc(ghost, ['ghost']);
      s.set(ghost, { alpha: 0 });
      await s.talk(others[0], by(others[0], { chiikawa: '…트릭 오어 트릿…!' }, '트릭 오어 트릿~!'));
      await s.tween(s.f(ghost), { alpha: 1 }, 600);
      await s.talk(ghost, '우~~ 사탕 안 주면 장난칠 거야~');
      for (const id of others) s.pose(id, 'shiver');
      await s.talk(others[others.length - 1], by(others[others.length - 1], { chiikawa: '흐에엥…!' }, '으아악! 유령이다!'));
      s.acc(ghost, []);
      await s.talk(ghost, by(ghost, { usagi: '야하!!' }, '헤헤, 나야~!'));
      for (const id of s.cast) {
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
    need: 1,
    season: { from: [12, 1], to: [2, 28] },
    async play(s) {
      const snow = s.fx('snow');
      for (const id of s.cast) s.acc(id, ['scarf']);
      await s.gather(spread(s.cast.length, 58).map((u) => u - 60));
      for (const id of s.cast) s.look(id, [0, -1]);
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…눈…!', usagi: '우라!' }, '눈이다~!'));
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
      await s.talk(role(s, 'hachiware'), '눈사람 완성~!');
      await s.wait(2000);
      snow.stop();
    },
  },
  {
    id: 'xmas',
    cat: 'season',
    emoji: '🎄',
    title: '크리스마스',
    need: 1,
    season: { from: [12, 18], to: [12, 26] },
    async play(s) {
      s.prop('tree', { x: s.at(-20), s: 1.3 * s.unit });
      s.prop('presents', { x: s.at(60) });
      const snow = s.fx('snow');
      for (const id of s.cast) s.acc(id, ['santa']);
      await s.gather(spread(s.cast.length, 60).map((u) => (Math.abs(u) < 60 ? u + (u >= 0 ? 120 : -120) : u)));
      await s.talk(s.cast[0], by(s.cast[0], { usagi: '우라~!' }, '메리 크리스마스~!'));
      const notes = s.fx('notes', s.around(0, 120, 300));
      s.poseAll('sing');
      await s.wait(3500);
      notes.stop();
      s.poseAll('cheer');
      await s.talk(role(s, 'chiikawa'), by(role(s, 'chiikawa'), { chiikawa: '선물…!!' }, '선물 뜯어 보자~!'));
      s.fx('confetti', { x: s.at(60) - 40, y: s.floor - 80 * s.unit, w: 80, h: 40 });
      await s.wait(2200);
      snow.stop();
    },
  },

  // ======================================================== 손님끼리
  {
    id: 'after_work',
    cat: 'pair',
    emoji: '🍺',
    title: '퇴근 후 한 잔 (갑옷씨·쿠리만쥬)',
    need: 1,
    async play(s) {
      s.prop('bench', { x: s.at(0) });
      await s.gather(spread(s.cast.length, 54).map((u) => u + 200));
      const side = away(s);
      await Promise.all([s.visit('kurimanju', { side, x: s.at(-24) }), s.visit('yoroi', { side, x: s.at(28) })]);
      s.pose('kurimanju', 'sit');
      s.pose('yoroi', 'sit');
      s.face('kurimanju', 1);
      s.face('yoroi', -1);
      await s.talk('yoroi', '오늘도 수고하셨습니다~');
      s.item('kurimanju', 'beer');
      s.item('yoroi', 'beer');
      await s.talk('kurimanju', '건배…');
      s.pose('kurimanju', 'eat');
      s.pose('yoroi', 'eat');
      await s.wait(1400);
      await s.talk('kurimanju', '하아——');
      for (const id of s.cast) {
        s.face(id, -1);
        s.expr(id, 'line', 'w');
      }
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…어른이다…', usagi: '…우라.' }, '어른이다…'));
      await s.wait(1200);
      s.item('kurimanju', null);
      s.item('yoroi', null);
      await Promise.all([s.leave('kurimanju', side), s.leave('yoroi', side)]);
    },
  },
  {
    id: 'autograph',
    cat: 'pair',
    emoji: '✍️',
    title: '랏코 사인회 (랏코·시사)',
    need: 1,
    async play(s) {
      s.fit(-120, 360);
      s.prop('table', { x: s.at(-40), layer: 'front' });
      await s.visit('rakko', { side: 'left', x: s.at(-40) });
      s.set('rakko', { z: -1 });
      await s.glide('rakko', s.at(-40), s.floor - 8 * s.unit, 200);
      s.face('rakko', 1);
      await s.visit('shisa', { side: 'right', x: s.at(40), run: true });
      s.face('shisa', -1);
      await Promise.all(s.cast.map((id, i) => s.walk(id, s.at(110 + i * 56))));
      for (const id of s.cast) s.face(id, -1);
      await s.talk('shisa', '패, 팬이에요! 사인 부탁드려요!');
      s.item('rakko', 'shikishi');
      s.pose('rakko', 'hold');
      await s.talk('rakko', '…');
      s.item('rakko', null);
      s.item('shisa', 'shikishi');
      s.pose('shisa', 'cheer');
      s.emote('shisa', 'sparkle', 2);
      await s.talk('shisa', '가보로 삼을게요~!');
      await s.walk('shisa', s.at(320), { run: true });
      for (const id of s.cast) s.pose(id, 'cheer');
      await s.talk(s.cast[0], by(s.cast[0], { chiikawa: '…나, 나도…!', usagi: '우라!!' }, '나도 나도~!'));
      await s.wait(1200);
    },
  },
  {
    id: 'hungry_momonga',
    cat: 'pair',
    emoji: '🍙',
    title: '배고픈 모몽가 (모몽가·쿠리만쥬)',
    need: 1,
    async play(s) {
      await s.gather(spread(s.cast.length, 54).map((u) => u + 170));
      for (const id of s.cast) s.face(id, -1);
      await s.visit('kurimanju', { side: 'left', x: s.at(-40) });
      s.item('kurimanju', 'cookie');
      s.face('kurimanju', 1);
      await s.visit('momonga', { side: 'right', x: s.at(30), run: true });
      s.face('momonga', -1);
      s.pose('momonga', 'shiver');
      await s.talk('momonga', '배고파~ 그거 줘!');
      await s.talk('kurimanju', '…');
      s.pose('momonga', 'cheer');
      await s.talk('momonga', '귀여우니까 줘야 해!');
      s.item('kurimanju', null);
      s.item('momonga', 'cookie');
      s.pose('momonga', 'eat');
      await s.wait(1600);
      s.pose('momonga', 'stand');
      await s.talk('momonga', '흥, 고마워.');
      s.emote('kurimanju', 'hearts', 2);
      await s.talk('kurimanju', '하아——');
      s.item('momonga', null);
      await Promise.all([s.leave('momonga', 'right', { run: true }), s.leave('kurimanju', 'left')]);
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
