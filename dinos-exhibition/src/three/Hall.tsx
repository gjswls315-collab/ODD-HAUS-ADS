import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { HALL_H, type Layout } from '../layout'
import { useStore } from '../store'
import { TextPlane } from './parts'
import { floorLabelTexture, useCanvasTexture } from './textures'

function Zone({ cx, cz, w, d, title }: { cx: number; cz: number; w: number; d: number; title: string }) {
  const tex = useCanvasTexture(() => floorLabelTexture(title, '운영 구역 (임시 배치)'), [title])
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, d)), [w, d])
  return (
    <group position={[cx, 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <lineSegments geometry={geo}><lineBasicMaterial color="#8d8a80" transparent opacity={0.6} /></lineSegments>
      <TextPlane map={tex} size={[4, 2]} opacity={0.55} />
    </group>
  )
}

/** NC R&D센터 B1 컨벤션홀 (공간감 확인용 단순화 모델) */
export function Hall({ layout }: { layout: Layout }) {
  const { hall, room, L, W } = layout
  const hallLight = useStore((s) => s.hallLight)
  const mode = useStore((s) => s.mode)
  const w = hall.x1 - hall.x0, d = hall.z1 - hall.z0
  const cx = (hall.x0 + hall.x1) / 2, cz = d / 2
  const lights = useRef<THREE.InstancedMesh>(null)
  const nx = 9, nz = 5
  useEffect(() => {
    const m = new THREE.Matrix4()
    let i = 0
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      m.makeRotationX(Math.PI / 2)
      m.setPosition(hall.x0 + (a + 0.5) * (w / nx), HALL_H - 0.05, (b + 0.5) * (d / nz))
      lights.current?.setMatrixAt(i++, m)
    }
    if (lights.current) lights.current.instanceMatrix.needsUpdate = true
  }, [hall.x0, w, d, mode])
  const k = 0.15 + hallLight * 1.6
  const wallMat = <meshStandardMaterial color="#8f8064" roughness={0.9} />
  const exW = L + 1.2
  return (
    <group>
      <ambientLight intensity={0.1 + hallLight * 1.3} color="#fff1dc" />
      <hemisphereLight intensity={hallLight * 0.9} color="#fff4e2" groundColor="#3a3630" />
      <directionalLight position={[cx, 12, cz + 4]} intensity={hallLight * 1.1} color="#fff1dc" />

      {/* 바닥: 홀 카펫 + 전시 구간 다크 카펫 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#55585e" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(L - 1.2) / 2, 0.006, (W + 0.7) / 2]}>
        <planeGeometry args={[exW, W + 0.7]} />
        <meshStandardMaterial color="#15171c" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(room.x0 + room.x1) / 2, 0.006, room.z1 / 2]}>
        <planeGeometry args={[room.x1 - room.x0, room.z1]} />
        <meshStandardMaterial color="#111318" roughness={0.85} />
      </mesh>

      {/* 벽 4면 */}
      <mesh position={[cx, HALL_H / 2, -0.12]}><planeGeometry args={[w, HALL_H]} />{wallMat}</mesh>
      <mesh position={[hall.x1 + 0.12, HALL_H / 2, cz]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[d, HALL_H]} />{wallMat}</mesh>
      <mesh position={[hall.x0, HALL_H / 2, cz]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[d, HALL_H]} />{wallMat}</mesh>
      <mesh position={[cx, HALL_H / 2, d]} rotation={[0, Math.PI, 0]}><planeGeometry args={[w, HALL_H]} />{wallMat}</mesh>

      {/* 천장 + 매입 조명 패널 (조감도에서는 숨김) */}
      {mode !== 'top' && (
        <>
          <mesh position={[cx, HALL_H, cz]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, d]} />
            <meshStandardMaterial color="#1b1e24" roughness={1} />
          </mesh>
          <instancedMesh ref={lights} args={[undefined, undefined, nx * nz]}>
            <planeGeometry args={[2.4, 2.4]} />
            <meshBasicMaterial color={new THREE.Color(0.62 * k, 0.7 * k, 0.8 * k)} toneMapped={false} />
          </instancedMesh>
        </>
      )}

      <Zone cx={L * 0.3} cz={11.5} w={11} d={7} title="OX 퀴즈" />
      <Zone cx={room.x1 - 4.5} cz={13.5} w={7} d={4} title="팬사인회" />
    </group>
  )
}
