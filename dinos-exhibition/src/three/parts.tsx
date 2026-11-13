import { useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store'
import { glowTexture, stripTexture, washTexture } from './textures'

export const C = {
  navy: '#141d30',
  navyDeep: '#0e1421',
  char: '#17191f',
  gold: '#b89b69',
  warm: '#e8e2d6',
  light: '#ffd2a1', // ≈3000K
  black: '#0b0c0f',
}

// 공유 텍스처/머티리얼 (모듈 단위 1회 생성)
let _glow: THREE.Texture, _wash: THREE.Texture, _strip: THREE.Texture
export const shared = {
  get glow() { return (_glow ??= glowTexture()) },
  get wash() { return (_wash ??= washTexture()) },
  get strip() { return (_strip ??= stripTexture()) },
}

/** 가산 혼합 빛 번짐 평면 */
export function Glow({ map, size, opacity = 0.5, ...props }: {
  map: THREE.Texture; size: [number, number]; opacity?: number
  position?: [number, number, number]; rotation?: [number, number, number]
}) {
  return (
    <mesh {...props} raycast={() => null} renderOrder={2}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} transparent opacity={opacity} blending={THREE.AdditiveBlending}
        depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/** 클릭 선택 가능한 전시물 래퍼 + 선택 외곽선 */
export function Selectable({ id, size, center = [0, 0, 0], children, ...props }: {
  id: string; size: [number, number, number]; center?: [number, number, number]; children: ReactNode
  position?: [number, number, number]; rotation?: [number, number, number]
}) {
  const selected = useStore((s) => s.selected === id)
  const select = useStore((s) => s.select)
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size[0], size[1], size[2]]) // eslint-disable-line
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5) return
    e.stopPropagation()
    select(id)
  }
  return (
    <group {...props} onClick={onClick}>
      {children}
      {selected && (
        <lineSegments geometry={edges} position={center} raycast={() => null} renderOrder={5}>
          <lineBasicMaterial color="#ffd27a" depthTest={false} transparent />
        </lineSegments>
      )}
    </group>
  )
}

/** 인쇄 그래픽 평면: 조명 반응 + 약한 자체 발광으로 가독성 확보 */
export function Graphic({ map, size, emissive = 0.5, color = '#ffffff', ...props }: {
  map: THREE.Texture; size: [number, number]; emissive?: number; color?: string
  position?: [number, number, number]; rotation?: [number, number, number]
}) {
  return (
    <mesh {...props}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={emissive}
        color={color} roughness={0.85} metalness={0} />
    </mesh>
  )
}
export function TextPlane({ map, size, opacity = 1, ...props }: {
  map: THREE.Texture; size: [number, number]; opacity?: number
  position?: [number, number, number]; rotation?: [number, number, number]
}) {
  return (
    <mesh {...props} raycast={() => null}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/** 유리 쇼케이스: 무광 블랙 받침 + 투명 유리 + 얇은 프레임 */
export function Showcase({ w, d, plinthH, glassH, children, lit = true }: {
  w: number; d: number; plinthH: number; glassH: number; children?: ReactNode; lit?: boolean
}) {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, glassH, d)), [w, d, glassH])
  return (
    <group>
      <mesh position={[0, plinthH / 2, 0]}>
        <boxGeometry args={[w, plinthH, d]} />
        <meshStandardMaterial color={C.black} roughness={0.7} metalness={0.2} />
      </mesh>
      {lit && (
        <mesh position={[0, plinthH + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[w * 0.92, d * 0.92]} />
          <meshBasicMaterial color="#3a2f1f" toneMapped={false} />
        </mesh>
      )}
      <group position={[0, plinthH, 0]}>{children}</group>
      <mesh position={[0, plinthH + glassH / 2, 0]} renderOrder={3}>
        <boxGeometry args={[w, glassH, d]} />
        <meshStandardMaterial color="#cfe0ee" transparent opacity={0.09} roughness={0.05} metalness={0.1}
          depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} position={[0, plinthH + glassH / 2, 0]} raycast={() => null}>
        <lineBasicMaterial color="#c9b388" transparent opacity={0.55} />
      </lineSegments>
    </group>
  )
}

const goldMat = new THREE.MeshStandardMaterial({
  color: '#d7b56a', metalness: 0.95, roughness: 0.28, emissive: '#5a4212', emissiveIntensity: 0.55,
})
const steelMat = new THREE.MeshStandardMaterial({
  color: '#e9e4d6', metalness: 0.95, roughness: 0.2, emissive: '#6b5a36', emissiveIntensity: 0.5,
})
const darkMat = new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.6, metalness: 0.4 })

/** 집행검 (기본 도형 조합, 칼끝이 아래로 향한 세로 전시). 전체 높이 ≈ 1.45m */
export function Sword() {
  const blade = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0); s.lineTo(0.035, 0.1); s.lineTo(0.055, 0.98); s.lineTo(-0.055, 0.98); s.lineTo(-0.035, 0.1)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 1 })
    g.translate(0, 0, -0.007)
    return g
  }, [])
  return (
    <group position={[0, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* 받침 */}
      <mesh position={[0, -0.03, 0]} material={darkMat}><cylinderGeometry args={[0.1, 0.13, 0.06, 24]} /></mesh>
      <mesh geometry={blade} material={steelMat} />
      <mesh position={[0, 0.55, 0]} material={goldMat}><boxGeometry args={[0.012, 0.8, 0.03]} /></mesh>
      {/* 가드 */}
      <mesh position={[0, 1.0, 0]} material={goldMat}><boxGeometry args={[0.36, 0.05, 0.06]} /></mesh>
      <mesh position={[0.2, 1.0, 0]} rotation={[0, 0, -Math.PI / 2]} material={goldMat}><coneGeometry args={[0.035, 0.09, 12]} /></mesh>
      <mesh position={[-0.2, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} material={goldMat}><coneGeometry args={[0.035, 0.09, 12]} /></mesh>
      <mesh position={[0, 1.0, 0]} material={goldMat}><sphereGeometry args={[0.055, 16, 12]} /></mesh>
      {/* 손잡이 */}
      <mesh position={[0, 1.17, 0]} material={darkMat}><cylinderGeometry args={[0.024, 0.028, 0.3, 16]} /></mesh>
      {[1.08, 1.17, 1.26].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={goldMat}><torusGeometry args={[0.028, 0.007, 8, 20]} /></mesh>
      ))}
      <mesh position={[0, 1.35, 0]} material={goldMat}><sphereGeometry args={[0.045, 16, 12]} /></mesh>
    </group>
  )
}

/** 우승 트로피 (회전체) */
export function Trophy() {
  const cup = useMemo(() => {
    const pts = [
      [0.0, 0], [0.11, 0], [0.11, 0.03], [0.05, 0.05], [0.025, 0.1], [0.025, 0.2], [0.05, 0.24],
      [0.11, 0.32], [0.135, 0.42], [0.14, 0.5], [0.125, 0.5], [0.12, 0.42], [0.09, 0.33], [0, 0.3],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 32)
  }, [])
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={darkMat}><boxGeometry args={[0.26, 0.12, 0.26]} /></mesh>
      <mesh geometry={cup} position={[0, 0.12, 0]} material={goldMat} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.16, 0.5, 0]} material={goldMat}>
          <torusGeometry args={[0.055, 0.01, 8, 20, Math.PI * 1.2]} />
        </mesh>
      ))}
    </group>
  )
}

/** 클립형 암 스포트 조명 기구 (벽 상단 고정) */
export function ArmSpot({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
        <cylinderGeometry args={[0.008, 0.008, 0.4, 6]} />
      </mesh>
      <mesh position={[0, -0.03, 0.42]} rotation={[Math.PI / 2.6, 0, 0]} material={darkMat}>
        <cylinderGeometry args={[0.035, 0.045, 0.11, 12]} />
      </mesh>
      <mesh position={[0, -0.065, 0.39]} rotation={[Math.PI / 2.6, 0, 0]} raycast={() => null}>
        <circleGeometry args={[0.03, 12]} />
        <meshBasicMaterial color="#ffe2b8" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
