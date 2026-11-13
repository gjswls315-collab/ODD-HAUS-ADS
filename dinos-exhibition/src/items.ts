import type { Layout } from './layout'

export interface Item {
  id: string
  name: string
  group: string
  spec: string
  note?: string
  image?: boolean // 이미지 교체 슬롯
  movable?: boolean // 위치 조절 가능 (쇼케이스)
}

const cm = (m: number) => `${Math.round(m * 100)}`

export function buildItems(l: Layout): Item[] {
  const items: Item[] = []
  l.history.forEach((h) => items.push({
    id: h.id, name: `${h.year} ${h.title}`, group: '① 역사 기록',
    spec: `패널 ${cm(h.w)} × ${cm(h.h)} cm`, note: '연혁 문안·사진은 구단 확인 후 확정', image: true,
  }))
  l.frames.forEach((f) => items.push({
    id: f.id, name: `${f.year} 패밀리데이 액자`, group: '② 패밀리데이',
    spec: `세로형 ${cm(f.w)} × ${cm(f.h)} cm · 중심 높이 ${cm(f.cy)} cm`, note: '실물 액자 실측 후 치수 반영', image: true,
  }))
  l.uniforms.forEach((u) => items.push({
    id: u.id, name: u.name, group: '③ 유니폼',
    spec: '남성 상반신 토르소 · 수직봉 + 원형 받침 · 전면 명패', note: '유니폼 정면 이미지를 올리면 토르소에 매핑됩니다', image: true,
  }))
  l.showcases.forEach((s) => items.push({
    id: s.id, name: s.name, group: '④ 메인룸',
    spec: `평면 ${cm(s.w)} × ${cm(s.d)} cm · 유리 쇼케이스(대여)`, movable: true,
  }))
  items.push({
    id: 'photo-yang', name: '집행검 배경 사진', group: '④ 메인룸',
    spec: `출력 ${cm(l.photo.w)} × ${cm(l.photo.h)} cm`,
    note: '양의지 선수 2020 집행검 세리머니 원본 사진 슬롯. 업로드 시 채도를 낮추고 네이비 오버레이를 적용합니다', image: true,
  })
  for (let i = 1; i <= 3; i++) items.push({ id: `m-15th-${i}`, name: `15주년 이미지 ${i}`, group: '④ 메인룸', spec: '62 × 80 cm', image: true })
  for (let i = 1; i <= 3; i++) items.push({ id: `m-2020-${i}`, name: `2020 우승 사진 ${i}`, group: '④ 메인룸', spec: '62 × 80 cm', image: true })
  items.push({
    id: 'louver', name: '입구 루버 가림막', group: '④ 메인룸',
    spec: `폭 ${cm(l.louver.z1 - l.louver.z0)} × 높이 ${cm(l.p.wallH)} cm`,
    note: '세로 루버 + 반투명 스크림 원단. 모듈 가벽 프레임에 설치',
  })
  return items
}
