import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { Layout, Pose, Rect } from '../layout'
import { useStore } from '../store'

/** 미니맵 등 외부에서 읽는 현재 관람자 위치 */
export const rig = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0 }

function aim(pos: number[], target: number[]) {
  const dx = target[0] - pos[0], dy = target[1] - pos[1], dz = target[2] - pos[2]
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }
}
function setPose(p: Pose) {
  const a = aim(p.pos, p.target)
  rig.x = p.pos[0]; rig.y = p.pos[1]; rig.z = p.pos[2]; rig.yaw = a.yaw; rig.pitch = a.pitch
}
const angLerp = (a: number, b: number, t: number) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a))
  return a + d * t
}

function colliders(layout: Layout, showWalls: boolean, offsets: Record<string, { dx: number; dz: number }>): Rect[] {
  const { hall, plinth, room } = layout
  const r: Rect[] = [plinth]
  if (showWalls) r.push(...layout.moduleWalls, layout.louver)
  layout.showcases.forEach((s) => {
    const o = offsets[s.id] ?? { dx: 0, dz: 0 }
    r.push({ x0: s.x + o.dx - s.w / 2, x1: s.x + o.dx + s.w / 2, z0: s.z + o.dz - s.d / 2, z1: s.z + o.dz + s.d / 2 })
  })
  layout.uniforms.forEach((u) => r.push({ x0: u.x - 0.17, x1: u.x + 0.17, z0: u.z - 0.15, z1: u.z + 0.15 }))
  // 홀 외곽
  r.push({ x0: hall.x0 - 1, x1: hall.x1 + 1, z0: -1, z1: 0 })
  r.push({ x0: hall.x0 - 1, x1: hall.x1 + 1, z0: hall.z1, z1: hall.z1 + 1 })
  r.push({ x0: hall.x0 - 1, x1: hall.x0, z0: -1, z1: hall.z1 + 1 })
  r.push({ x0: room.x1, x1: room.x1 + 1, z0: -1, z1: hall.z1 + 1 })
  return r
}
const hit = (x: number, z: number, rects: Rect[], rad = 0.28) =>
  rects.some((r) => x > r.x0 - rad && x < r.x1 + rad && z > r.z0 - rad && z < r.z1 + rad)

export function CameraRig({ layout }: { layout: Layout }) {
  const { camera, gl } = useThree()
  const mode = useStore((s) => s.mode)
  const nav = useStore((s) => s.nav)
  const keys = useRef<Record<string, boolean>>({})
  const tour = useRef({ d: 0 })
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  // 모드 진입 시 포즈 설정
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const l = layoutRef.current
    if (mode === 'top') {
      cam.fov = 40
      cam.position.set(...l.poses.top.pos)
      cam.lookAt(...l.poses.top.target)
    } else {
      cam.fov = 66
      if (mode === 'front') setPose(l.poses.front)
      if (mode === 'hall') setPose(l.poses.hall)
      if (mode === 'tour') { tour.current.d = 0; setPose(l.tour[0]) }
    }
    cam.updateProjectionMatrix()
  }, [mode, camera])

  // 구역 이동 메뉴
  useEffect(() => {
    const p = layoutRef.current.poses[nav.id]
    if (p) setPose(p)
  }, [nav])

  // 치수 변경 시 고정 시점 재정렬
  useEffect(() => {
    const m = useStore.getState().mode
    if (m === 'front') setPose(layout.poses.front)
    if (m === 'hall') setPose(layout.poses.hall)
  }, [layout])

  useEffect(() => {
    const el = gl.domElement
    let drag = false, lx = 0, ly = 0
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY }
    const up = () => { drag = false }
    const move = (e: PointerEvent) => {
      if (!drag) return
      const m = useStore.getState().mode
      if (m === 'top' || m === 'tour') return
      rig.yaw -= (e.clientX - lx) * 0.0032
      rig.pitch = Math.max(-1.2, Math.min(1.2, rig.pitch - (e.clientY - ly) * 0.0032))
      lx = e.clientX; ly = e.clientY
    }
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      keys.current[e.code] = true
    }
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false }
    const blur = () => { keys.current = {} }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointermove', move)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur)
    }
  }, [gl])

  useFrame((_, rawDt) => {
    const st = useStore.getState()
    if (st.mode === 'top') return
    const dt = Math.min(rawDt, 0.25)
    const l = layoutRef.current
    const k = keys.current

    if (st.mode === 'tour') {
      // 폴리라인 경로를 일정 속도로 이동, 시선은 부드럽게 보간
      const pts = l.tour
      const seg: number[] = []
      let total = 0
      for (let i = 0; i < pts.length - 1; i++) {
        const s = Math.hypot(pts[i + 1].pos[0] - pts[i].pos[0], pts[i + 1].pos[2] - pts[i].pos[2])
        seg.push(s); total += s
      }
      tour.current.d = Math.min(total, tour.current.d + dt * 1.25)
      let d = tour.current.d, i = 0
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++ }
      const t = seg[i] > 0 ? Math.min(1, d / seg[i]) : 1
      const e = t * t * (3 - 2 * t)
      const a = pts[i], b = pts[i + 1]
      const px = a.pos[0] + (b.pos[0] - a.pos[0]) * t
      const py = a.pos[1] + (b.pos[1] - a.pos[1]) * t
      const pz = a.pos[2] + (b.pos[2] - a.pos[2]) * t
      const tg = [0, 1, 2].map((j) => a.target[j] + (b.target[j] - a.target[j]) * e)
      const f = 1 - Math.exp(-dt * 5)
      rig.x += (px - rig.x) * f; rig.y += (py - rig.y) * f; rig.z += (pz - rig.z) * f
      const want = aim([rig.x, rig.y, rig.z], tg)
      const fa = 1 - Math.exp(-dt * 2.2)
      rig.yaw = angLerp(rig.yaw, want.yaw, fa)
      rig.pitch += (want.pitch - rig.pitch) * fa
      const prog = tour.current.d / total
      if (Math.abs(prog - st.tourProgress) > 0.004) st.set({ tourProgress: prog })
      if (prog >= 1 && Math.abs(want.yaw - rig.yaw) < 0.02) st.set({ mode: 'front', tourProgress: 0 })
    } else {
      const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0)
      const side = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0)
      const turn = (k.ArrowLeft || k.KeyQ ? 1 : 0) - (k.ArrowRight || k.KeyE ? 1 : 0)
      rig.yaw += turn * dt * 1.6
      if (fwd || side) {
        if (st.mode !== 'walk') st.set({ mode: 'walk' })
        const sp = (k.ShiftLeft || k.ShiftRight ? 4.2 : 2) * dt
        const sin = Math.sin(rig.yaw), cos = Math.cos(rig.yaw)
        const dx = (-sin * fwd + cos * side) * sp
        const dz = (-cos * fwd - sin * side) * sp
        const rects = colliders(l, st.showWalls, st.offsets)
        if (!hit(rig.x + dx, rig.z, rects)) rig.x += dx
        if (!hit(rig.x, rig.z + dz, rects)) rig.z += dz
        rig.y += (1.6 - rig.y) * Math.min(1, dt * 6)
      }
    }
    camera.position.set(rig.x, rig.y, rig.z)
    camera.rotation.set(rig.pitch, rig.yaw, 0, 'YXZ')
  })

  if (mode !== 'top') return null
  return (
    <OrbitControls makeDefault target={layout.poses.top.target} maxPolarAngle={Math.PI / 2.15}
      minDistance={4} maxDistance={45} enableDamping dampingFactor={0.12} />
  )
}
