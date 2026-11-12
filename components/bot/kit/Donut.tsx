import { cn } from '@/lib/utils/cn'

export interface DonutSegment {
  value: number
  /** Tailwind stroke class, e.g. "stroke-bullish". */
  className: string
  label: string
}

/**
 * Ring chart for a few parts of one whole (matched vs problem signals). The centre holds the
 * big number; segments are drawn clockwise from 12 o'clock. An empty whole draws a muted ring.
 */
export function Donut({
  segments,
  size = 168,
  thickness = 18,
  children,
  className,
  label,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  children?: React.ReactNode
  className?: string
  /** Accessible summary, e.g. "5 cocok, 1 bermasalah". */
  label: string
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 3 : 0
  let offset = 0
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-muted/60" />
        {total > 0 &&
          segments.map((s) => {
            if (s.value <= 0) return null
            const len = (s.value / total) * c
            const dash = Math.max(0, len - gap)
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                className={cn('transition-[stroke-dasharray] duration-700 motion-reduce:transition-none', s.className)}
              />
            )
            offset += len
            return el
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
