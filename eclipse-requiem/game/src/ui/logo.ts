import { G } from '../core/app';
import { C, FONT } from '../core/constants';
import { text } from '../gfx/ui';

// ECLIPSE REQUIEM logo: gothic serif lettering, metal gold with a top highlight and red light leaking from below,
// plus a shine sweep every 6 s (docs/03 §1-3).

export function drawLogo(cx: number, y: number, size: number, t: number, alpha = 1, sub = true) {
  const r = G.r, ctx = r.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  const word = 'ECLIPSE REQUIEM';
  ctx.font = `700 ${size}px ${FONT.display}`;
  const anyCtx = ctx as unknown as { letterSpacing?: string };
  if ('letterSpacing' in ctx) anyCtx.letterSpacing = `${size * 0.06}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const base = y + size;
  // red glow underneath
  ctx.shadowColor = 'rgba(179,38,59,0.9)';
  ctx.shadowBlur = 26 * r.s;
  ctx.fillStyle = '#3A1018';
  ctx.fillText(word, cx, base + 4);
  ctx.shadowBlur = 0;
  // dark outline
  ctx.lineWidth = Math.max(3, size * 0.05);
  ctx.strokeStyle = '#0B0B0F';
  ctx.strokeText(word, cx, base);
  // gold body
  const grd = ctx.createLinearGradient(0, y + size * 0.1, 0, base + size * 0.1);
  grd.addColorStop(0, '#F3E6C4');
  grd.addColorStop(0.35, '#D8B35E');
  grd.addColorStop(0.7, '#9C7A34');
  grd.addColorStop(1, '#5A4420');
  ctx.fillStyle = grd;
  ctx.fillText(word, cx, base);
  // shine sweep every 6 s
  const ph = (t % 6) / 0.6;
  if (ph < 1) {
    const w = ctx.measureText(word).width;
    const sx = cx - w / 2 + (w + 200) * ph - 100;
    const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,250,235,0.85)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = sg;
    ctx.fillText(word, cx, base);
    ctx.globalCompositeOperation = 'source-over';
  }
  // crack with red light
  ctx.strokeStyle = 'rgba(217,76,58,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const cxk = cx + size * 1.2;
  ctx.moveTo(cxk, y + size * 0.2);
  ctx.lineTo(cxk + size * 0.08, y + size * 0.5);
  ctx.lineTo(cxk - size * 0.04, y + size * 0.72);
  ctx.lineTo(cxk + size * 0.05, base);
  ctx.stroke();
  ctx.restore();
  if (sub) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    text(r, '일식의 진혼곡', cx, base + size * 0.28, { size: Math.round(size * 0.37), font: 'serif', weight: 600, align: 'center', spacing: size * 0.18, color: C.ivory, glow: 'rgba(0,0,0,0.8)', glowBlur: 8 });
    ctx.restore();
  }
}
