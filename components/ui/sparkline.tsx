'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils/cn'
import { TONE_VAR, type Tone } from '@/components/ui/tone'

/**
 * Tiny line chart (7 days / 14 candles) for KPI cards. Stretches to its
 * container width. tone 'auto' = green if the last point is above the first,
 * red if below. Fewer than 2 finite points → nothing.
 */
export function Sparkline({
  data,
  tone = 'brand',
  height = 40,
  area = true,
  label,
  className,
}: {
  data: readonly (number | null | undefined)[]
  tone?: Tone | 'auto'
  height?: number
  /** Soft fill under the line. */
  area?: boolean
  /** Accessible description, e.g. "Harga ETH 7 hari, naik 3%". Without it the chart is decorative. */
  label?: string
  className?: string
}) {
  const gid = useId().replace(/:/g, '')
  const pts = data.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null))
  const vals = pts.filter((v): v is number => v !== null)
  if (vals.length < 2) return null
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const W = 100
  const H = height
  const pad = 3
  const x = (i: number) => (i / (pts.length - 1)) * W
  const y = (v: number) => (hi === lo ? H / 2 : pad + ((hi - v) / (hi - lo)) * (H - pad * 2))
  const first = vals[0]
  const last = vals[vals.length - 1]
  const t: Tone = tone === 'auto' ? (last > first ? 'bullish' : last < first ? 'bearish' : 'muted') : tone
  const color = TONE_VAR[t]

  let d = ''
  pts.forEach((v, i) => {
    if (v === null) return
    d += `${d ? 'L' : 'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`
  })
  const lastIdx = pts.length - 1 - [...pts].reverse().findIndex((v) => v !== null)
  const firstIdx = pts.findIndex((v) => v !== null)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('block w-full overflow-visible', className)}
      style={{ height }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={`sp-${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d}L${x(lastIdx).toFixed(2)} ${H}L${x(firstIdx).toFixed(2)} ${H}Z`} fill={`url(#sp-${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
