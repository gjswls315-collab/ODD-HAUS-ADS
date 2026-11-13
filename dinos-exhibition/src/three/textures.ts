import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import type { UniformEntry } from '../data/content'
import { useStore } from '../store'

const SANS = '"Noto Sans KR", sans-serif'
const SERIF = '"Cormorant Garamond", "Noto Sans KR", serif'
const GOLD = '#b89b69'
const WARM = '#e8e2d6'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}
function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function useCanvasTexture(factory: () => THREE.Texture, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(factory, deps)
  useEffect(() => () => t.dispose(), [t])
  return t
}

/** 교체 가능한 이미지 슬롯: 업로드/콘텐츠 경로가 있으면 실제 이미지, 없으면 플레이스홀더 */
export function useSlotTexture(
  id: string, path: string | undefined, fallback: () => THREE.Texture, deps: unknown[],
  process?: (img: HTMLImageElement) => HTMLCanvasElement,
) {
  const url = useStore((s) => s.images[id]) ?? path
  const placeholder = useCanvasTexture(fallback, deps)
  const [loaded, setLoaded] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) { setLoaded(null); return }
    let alive = true
    let t: THREE.Texture | null = null
    const img = new Image()
    img.onload = () => {
      if (!alive) return
      t = process ? tex(process(img)) : new THREE.Texture(img)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      t.needsUpdate = true
      setLoaded(t)
    }
    img.onerror = () => alive && setLoaded(null)
    img.src = url
    return () => { alive = false; t?.dispose() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
  return loaded ?? placeholder
}

/** 투명 배경 텍스트 (벽면 타이틀 등). 여러 줄 지원: [text, font, color][] */
export function textTexture(
  lines: { t: string; font: string; color?: string; ls?: number }[], w: number, h: number,
  align: CanvasTextAlign = 'left',
) {
  const [c, g] = canvas(w, h)
  const total = lines.length
  g.textBaseline = 'middle'
  g.textAlign = align
  lines.forEach((l, i) => {
    g.font = l.font
    g.fillStyle = l.color ?? WARM
    if ('letterSpacing' in g) (g as unknown as { letterSpacing: string }).letterSpacing = `${l.ls ?? 0}px`
    const x = align === 'center' ? w / 2 : align === 'right' ? w - 8 : 8
    g.fillText(l.t, x, (h / total) * (i + 0.5))
  })
  return tex(c)
}
export const F = {
  serif: (px: number, italic = true, weight = 500) => `${italic ? 'italic ' : ''}${weight} ${px}px ${SERIF}`,
  sans: (px: number, weight = 500) => `${weight} ${px}px ${SANS}`,
}

export function photoPlaceholder(label: string, sub = '사진 교체 슬롯', w = 384, h = 512) {
  const [c, g] = canvas(w, h)
  const grd = g.createLinearGradient(0, 0, w, h)
  grd.addColorStop(0, '#2a3550')
  grd.addColorStop(1, '#161d2e')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  g.strokeStyle = 'rgba(232,226,214,0.06)'
  g.lineWidth = 2
  for (let i = -h; i < w; i += 22) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke()
  }
  g.strokeStyle = 'rgba(184,155,105,0.5)'
  g.setLineDash([8, 8])
  g.strokeRect(14, 14, w - 28, h - 28)
  g.setLineDash([])
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = WARM
  g.font = F.sans(Math.round(w * 0.085), 700)
  g.fillText(label, w / 2, h / 2 - w * 0.06)
  g.fillStyle = 'rgba(232,226,214,0.6)'
  g.font = F.sans(Math.round(w * 0.055), 400)
  g.fillText(sub, w / 2, h / 2 + w * 0.06)
  return tex(c)
}

/** 역사 패널 배경 (연도·제목·본문 자리). 사진은 별도 슬롯 평면으로 얹는다 */
export function historyPanelTexture(year: string, title: string, body: string) {
  const w = 512, h = 720
  const [c, g] = canvas(w, h)
  g.fillStyle = '#131c2e'
  g.fillRect(0, 0, w, h)
  g.strokeStyle = 'rgba(184,155,105,0.55)'
  g.lineWidth = 3
  g.strokeRect(6, 6, w - 12, h - 12)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = WARM
  g.font = F.serif(118, false, 500)
  g.fillText(year, w / 2, 86)
  g.fillStyle = GOLD
  g.font = F.sans(34, 700)
  g.fillText(title, w / 2, 172)
  g.fillStyle = 'rgba(232,226,214,0.5)'
  g.font = F.sans(24, 400)
  body.split('\n').forEach((l, i) => g.fillText(l, w / 2, 590 + i * 36))
  g.fillStyle = 'rgba(184,155,105,0.5)'
  g.fillRect(w / 2 - 40, 214, 80, 2)
  return tex(c)
}

export function jerseyTexture(u: UniformEntry) {
  const w = 576, h = 512
  const [c, g] = canvas(w, h)
  g.fillStyle = u.base
  g.fillRect(0, 0, w, h)
  // 소매 영역
  g.fillStyle = u.sleeve
  g.fillRect(0, 0, w * 0.2, h)
  g.fillRect(w * 0.8, 0, w * 0.2, h)
  g.fillStyle = u.trim
  g.fillRect(0, 0, w * 0.045, h)
  g.fillRect(w * 0.955, 0, w * 0.045, h)
  if (u.pinstripe) {
    g.strokeStyle = u.trim
    g.globalAlpha = 0.45
    g.lineWidth = 2
    for (let x = w * 0.2 + 10; x < w * 0.8; x += 20) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke()
    }
    g.globalAlpha = 1
  }
  // V넥 트림
  g.strokeStyle = u.trim
  g.lineWidth = 16
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(w / 2 - 70, 0); g.lineTo(w / 2, 96); g.lineTo(w / 2 + 70, 0)
  g.stroke()
  // 여밈선 + 단추
  g.lineWidth = 3
  g.globalAlpha = 0.55
  g.beginPath(); g.moveTo(w / 2, 96); g.lineTo(w / 2, h); g.stroke()
  g.globalAlpha = 1
  g.fillStyle = u.trim
  for (let y = 140; y < h - 20; y += 78) {
    g.beginPath(); g.arc(w / 2 + 9, y, 5, 0, Math.PI * 2); g.fill()
  }
  // 워드마크
  g.save()
  g.translate(w / 2, 205)
  g.rotate(-0.06)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = F.serif(104, true, 700)
  g.lineWidth = 9
  g.strokeStyle = u.base
  g.strokeText('Dinos', 0, 0)
  g.fillStyle = u.text
  g.fillText('Dinos', 0, 0)
  g.restore()
  // 밑단
  g.fillStyle = u.trim
  g.fillRect(w * 0.2, h - 10, w * 0.6, 10)
  return tex(c)
}

export function plateTexture(title: string, sub: string) {
  const [c, g] = canvas(256, 160)
  g.fillStyle = '#ece7dc'
  g.fillRect(0, 0, 256, 160)
  g.fillStyle = '#17191f'
  g.font = F.sans(30, 700)
  g.textBaseline = 'middle'
  g.fillText(title, 18, 52)
  g.fillStyle = '#6b6658'
  g.font = F.sans(20, 400)
  g.fillText(sub, 18, 100)
  g.fillStyle = GOLD
  g.fillRect(18, 128, 60, 3)
  return tex(c)
}

/** 바닥·벽에 얹는 부드러운 빛 번짐 (additive) */
export function glowTexture() {
  const [c, g] = canvas(128, 128)
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,214,160,1)')
  grd.addColorStop(0.4, 'rgba(255,200,140,0.45)')
  grd.addColorStop(1, 'rgba(255,190,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return tex(c)
}
/** 벽면 워시(위에서 떨어지는 스포트 스캘럽) */
export function washTexture() {
  const [c, g] = canvas(128, 256)
  const grd = g.createRadialGradient(64, 10, 4, 64, 60, 190)
  grd.addColorStop(0, 'rgba(255,214,165,0.9)')
  grd.addColorStop(0.35, 'rgba(255,205,150,0.32)')
  grd.addColorStop(1, 'rgba(255,190,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 256)
  return tex(c)
}
/** 벽 하단 간접조명이 벽/바닥에 번지는 띠 */
export function stripTexture() {
  const [c, g] = canvas(8, 128)
  const grd = g.createLinearGradient(0, 128, 0, 0)
  grd.addColorStop(0, 'rgba(255,196,130,0.85)')
  grd.addColorStop(0.35, 'rgba(255,190,120,0.25)')
  grd.addColorStop(1, 'rgba(255,190,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 8, 128)
  return tex(c)
}

/** 양의지 선수 사진 플레이스홀더 (원본 수령 전) */
export function heroPhotoPlaceholder() {
  const w = 1024, h = 720
  const [c, g] = canvas(w, h)
  const grd = g.createLinearGradient(0, 0, 0, h)
  grd.addColorStop(0, '#5a6686')
  grd.addColorStop(0.55, '#8a8ea0')
  grd.addColorStop(1, '#3b4258')
  g.fillStyle = grd
  g.fillRect(0, 0, w, h)
  // 관중석 느낌의 점 패턴
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * w, y = Math.random() * h * 0.62
    g.fillStyle = `rgba(${200 + Math.random() * 55},${190 + Math.random() * 50},${170 + Math.random() * 60},${0.15 + Math.random() * 0.35})`
    g.fillRect(x, y, 3 + Math.random() * 4, 3 + Math.random() * 4)
  }
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.setLineDash([14, 12])
  g.lineWidth = 3
  g.strokeRect(30, 30, w - 60, h - 60)
  g.setLineDash([])
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#ffffff'
  g.font = F.sans(46, 700)
  g.fillText('양의지 선수 2020 집행검 세리머니', w / 2, h * 0.2)
  g.font = F.sans(32, 400)
  g.fillText('원본 사진 교체 슬롯', w / 2, h * 0.2 + 62)
  return tex(c)
}

/** 업로드된 사진의 채도를 낮춰 캔버스로 변환 */
export function desaturate(img: HTMLImageElement) {
  const max = 2048
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const [c, g] = canvas(Math.round(img.width * s), Math.round(img.height * s))
  g.filter = 'saturate(35%)'
  g.drawImage(img, 0, 0, c.width, c.height)
  return c
}

export function floorLabelTexture(title: string, sub: string) {
  const [c, g] = canvas(512, 256)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = 'rgba(232,226,214,0.75)'
  g.font = F.sans(64, 700)
  g.fillText(title, 256, 100)
  g.fillStyle = 'rgba(232,226,214,0.5)'
  g.font = F.sans(30, 400)
  g.fillText(sub, 256, 176)
  return tex(c)
}
