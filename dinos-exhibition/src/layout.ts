import { FRAMES, HISTORY, UNIFORMS } from './data/content'

// 좌표계: +x = 길목 진행 방향(입구 → 메인룸), +z = 기존 벽에서 컨벤션홀 안쪽, y = 높이. 단위 m.
// z=0 : 컨벤션홀 기존 벽면(역사 기록·패밀리데이 부착면) / x = room.x1 : 홀 끝 벽(코너)

export interface Params {
  corridorL: number
  corridorW: number
  roomW: number // x 방향
  roomD: number // z 방향
  wallH: number
  uniformGap: number
}

export const DEFAULT_PARAMS: Params = {
  corridorL: 14,
  corridorW: 3,
  roomW: 7,
  roomD: 6,
  wallH: 2.7,
  uniformGap: 0.58,
}

export interface Rect { x0: number; x1: number; z0: number; z1: number }
export interface Pose { pos: [number, number, number]; target: [number, number, number] }

export const PLINTH_D = 0.42
export const DOOR_W = 1.5
export const WALL_T = 0.1
export const HALL_LEN = 34
export const HALL_DEPTH = 20
export const HALL_H = 6

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function computeLayout(p: Params) {
  const L = p.corridorL
  const W = p.corridorW
  const room: Rect = { x0: L, x1: L + p.roomW, z0: 0, z1: p.roomD }

  // 메인룸 서측면: [루버 가림막] [출입구] [솔리드 가벽]
  const doorZ0 = clamp(W + 0.2, 1.2, p.roomD - DOOR_W - 0.3)
  const door = { z0: doorZ0, z1: doorZ0 + DOOR_W }
  const doorMid = (door.z0 + door.z1) / 2

  // 좌측 벽: 인트로 → 역사 패널 6 → 패밀리데이 액자 8
  const intro = { x0: 0.15, x1: 1.35 }
  const histStart = 1.6
  const histEnd = L * 0.55
  const hGap = 0.1
  const hW = Math.min(1.05, (histEnd - histStart - hGap * (HISTORY.length - 1)) / HISTORY.length)
  const history = HISTORY.map((h, i) => ({
    ...h, w: hW, h: 1.3, cy: 1.6, cx: histStart + hW / 2 + i * (hW + hGap),
  }))
  const histCx = (histStart + histEnd) / 2

  const frStart = L * 0.6
  const frEnd = L - 0.55
  const sumW = FRAMES.reduce((s, f) => s + f.w, 0)
  const fGap = Math.max(0.05, (frEnd - frStart - sumW) / (FRAMES.length - 1))
  let fx = frStart
  const frames = FRAMES.map((f) => {
    const cx = fx + f.w / 2
    fx += f.w + fGap
    return { ...f, cx }
  })
  const framesCx = (frStart + frEnd) / 2

  const plinth: Rect = { x0: histStart - 0.1, x1: histEnd + 0.1, z0: 0, z1: PLINTH_D }

  // 우측: 유니폼 토르소 20 (뒤 가벽 없음, 홀 방향 개방)
  const uStart = 1.2
  const uMax = L - 1.4
  const uniforms = UNIFORMS.map((u, i) => ({ ...u, x: uStart + i * p.uniformGap, z: W }))
  const uEnd = uniforms[uniforms.length - 1].x
  const uniformOverflow = uEnd > uMax + 1e-6
  const clearAisle = W - PLINTH_D - 0.3

  // 메인룸 내부
  const midZ = p.roomD / 2
  const sword = { x: room.x1 - 1.3, z: midZ }
  const tOff = clamp(1.35, 0.9, midZ - 1.0)
  const showcases = [
    { id: 'sc-sword', name: '집행검 쇼케이스', x: sword.x, z: sword.z, w: 0.7, d: 0.7 },
    { id: 'sc-trophy-l', name: '우승 트로피 쇼케이스 (좌)', x: sword.x, z: midZ - tOff, w: 0.6, d: 0.6 },
    { id: 'sc-trophy-r', name: '우승 트로피 쇼케이스 (우)', x: sword.x, z: midZ + tOff, w: 0.6, d: 0.6 },
    { id: 'sc-15th', name: '15주년 기념품 전시대', x: room.x0 + p.roomW * 0.42, z: 0.4, w: 2.6, d: 0.55 },
    { id: 'sc-2020', name: '2020 우승 기념품 전시대', x: room.x0 + p.roomW * 0.42, z: p.roomD - 0.4, w: 2.6, d: 0.55 },
  ]
  const photo = { w: Math.min(3.6, p.roomD - 1.4), h: p.wallH - 0.25, z: midZ }

  // 가벽 (모듈) — 평면 사각형
  const wing: Rect = { x0: L - 1.2, x1: L, z0: door.z1, z1: door.z1 + WALL_T }
  const moduleWalls: Rect[] = [
    { x0: room.x0, x1: room.x1, z0: room.z1, z1: room.z1 + WALL_T }, // 남측(홀 방향)
    { x0: L - WALL_T, x1: L, z0: door.z1, z1: room.z1 + WALL_T }, // 서측 솔리드
    wing, // 출입구 시선 차단 날개벽
  ]
  const louver: Rect = { x0: L - WALL_T, x1: L, z0: 0, z1: door.z0 }

  const hall: Rect = { x0: room.x1 - HALL_LEN, x1: room.x1, z0: 0, z1: HALL_DEPTH }

  const eye = 1.6
  const poses: Record<string, Pose> = {
    entrance: { pos: [-2.6, eye, W / 2 + 0.5], target: [3, 1.5, W / 2 - 0.6] },
    history: { pos: [histCx, eye, W - 0.75], target: [histCx, 1.45, 0] },
    family: { pos: [framesCx, eye, W - 0.75], target: [framesCx, 1.5, 0] },
    uniform: { pos: [L * 0.22, eye, 0.9], target: [L * 0.55, 1.25, W] },
    legacy: { pos: [L - 2.2, eye, W * 0.5], target: [L, 1.4, door.z0 * 0.55] },
    front: { pos: [room.x0 + 1.3, 1.55, midZ], target: [sword.x, 1.4, midZ] },
    hall: { pos: [L * 0.42, 1.7, Math.min(13, HALL_DEPTH - 2)], target: [L * 0.78, 1.3, 0] },
    top: { pos: [room.x1 * 0.5 + 1.5, 27, 15], target: [room.x1 * 0.5 + 1.5, 0, 3.6] },
  }

  const tour: Pose[] = [
    { pos: [-3, eye, W / 2 + 0.5], target: [1, 1.6, 0] },
    { pos: [1.4, eye, W * 0.56], target: [histCx - 1, 1.6, 0] },
    { pos: [histCx, eye, W * 0.56], target: [histEnd + 1, 1.5, 0] },
    { pos: [histEnd + 0.5, eye, W * 0.52], target: [framesCx + 1, 1.5, 0] },
    { pos: [framesCx, eye, W * 0.48], target: [L - 0.5, 1.3, W] },
    { pos: [L - 0.8, eye, W * 0.55], target: [L + 3, 1.4, door.z0 * 0.4] },
    { pos: [L - 0.75, eye, doorMid], target: [L + 3, 1.4, doorMid] },
    { pos: [L + 1.0, eye, doorMid], target: [sword.x, 1.4, midZ] },
    { pos: [room.x0 + 1.6, 1.55, midZ], target: [sword.x, 1.4, midZ] },
  ]

  return {
    p, L, W, room, door, doorMid, intro, history, histCx, histStart, histEnd, frames, framesCx,
    frStart, frEnd, plinth, uniforms, uniformOverflow, uMax, clearAisle, sword, showcases, photo,
    moduleWalls, wing, louver, hall, poses, tour, midZ,
  }
}

export type Layout = ReturnType<typeof computeLayout>
