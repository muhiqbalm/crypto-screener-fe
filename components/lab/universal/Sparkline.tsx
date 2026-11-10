import { cn } from '@/lib/utils/cn'

/** Builds the SVG points string; exported for tests. Nulls are skipped. */
export function sparkPoints(values: (number | null)[], width: number, height: number, pad = 1): string {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => typeof p[1] === 'number' && Number.isFinite(p[1]))
  if (pts.length < 2) return ''
  const ys = pts.map((p) => p[1])
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  const span = hi - lo || 1
  const n = Math.max(1, values.length - 1)
  return pts
    .map(([i, v]) => {
      const x = pad + (i / n) * (width - 2 * pad)
      const y = pad + (1 - (v - lo) / span) * (height - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

/** Tiny 30-day price line; green when the last close is above the first, red otherwise. */
export function Sparkline({ values, width = 96, height = 28, className }: { values: (number | null)[]; width?: number; height?: number; className?: string }) {
  const pts = sparkPoints(values, width, height)
  const nums = values.filter((v): v is number => typeof v === 'number')
  const up = nums.length >= 2 && nums[nums.length - 1] >= nums[0]
  if (!pts) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('overflow-visible', className)} role="img" aria-label={up ? 'naik 30 hari' : 'turun 30 hari'}>
      <polyline points={pts} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className={up ? 'stroke-bullish' : 'stroke-bearish'} />
    </svg>
  )
}
