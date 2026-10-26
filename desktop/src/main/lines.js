'use strict';

// What the desk friend says for each reminder. {n} is filled in by the scheduler.

const LINES = {
  lunch: ['점심 먹으러 가자~ 🍚', '배꼽시계가 울렸어! 점심 시간~', '밥 먹고 하자, 밥!', '오늘 점심은 뭐 먹을까~?'],
  dinner: ['저녁 먹을 시간이야~ 🍲', '저녁은 꼭 챙겨 먹기!', '배고프지? 저녁 먹고 와~'],
  stretch: ['기지개 쭈욱~ 한 번 펴자!', '어깨 한 번 돌려 볼까? 빙글빙글~', '{n}분째 열심히 했어! 잠깐 일어나 보자'],
  water: ['물 한 잔 마시고 오자 💧', '꿀꺽꿀꺽~ 물 마실 시간!', '목 마르지? 물 챙겨 마셔~'],
  praise: ['{n}시간 집중 성공~! 역시 최고야~!', '벌써 {n}시간째 집중! 대단해~', '{n}시간 돌파! 짝짝짝 👏'],
  goal: ['오늘의 목표 {n}시간 달성! 🎉', '목표 달성~! 오늘 정말 잘했어!'],
  endOfDay: ['오늘도 수고했어~ 🌙', '퇴근 시간이야! 오늘도 고생 많았어~', '오늘 하루 끝! 푹 쉬어~'],
  pomodoroDone: ['🍅 집중 끝! {n}분 쉬어 가자~', '🍅 하나 완성! 잠깐 쉬어요~'],
  breakDone: ['쉬는 시간 끝! 다시 힘내 볼까?', '충전 완료! 다시 집중~ 🍅'],
};

function pickLine(type, n, rand = Math.random) {
  const list = LINES[type] || ['…'];
  return list[Math.floor(rand() * list.length)].replace('{n}', String(n ?? ''));
}

module.exports = { LINES, pickLine };
