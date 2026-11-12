import { cn } from '@/lib/utils/cn'
import { TONE_VAR, type Tone } from '@/components/ui/tone'

export interface DonutSegment {
  value: number
  tone: Tone
  /** Word for the legend / screen readers, e.g. "cocok". */
  label: string
}

/**
 * Donut for ratios (cocok / gagal / tidak terkirim). The centre shows the
 * main number ("6/6"); `label` describes the whole chart for screen readers.
 * Empty (sum 0) draws only the track.
 */
export function Donut({
  segments,
  size = 120,
  thickness = 14,
  center,
  label,
  className,
}: {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  center?: React.ReactNode
  label: string
  className?: string
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + (Number.isFinite(x.value) && x.value > 0 ? x.value : 0), 0)
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 3 : 0
  const arcs = segments.map((s, i) => {
    const len = total > 0 && s.value > 0 ? (s.value / total) * c : 0
    const before = segments.slice(0, i).reduce((acc, x) => acc + (total > 0 && x.value > 0 ? (x.value / total) * c : 0), 0)
    return { tone: s.tone, len, offset: before }
  })
  return (
    <div className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={thickness} />
        {arcs.map((a, i) =>
          a.len > 0 ? (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={TONE_VAR[a.tone]}
              strokeWidth={thickness}
              strokeLinecap={gap ? 'butt' : 'round'}
              strokeDasharray={`${Math.max(0, a.len - gap)} ${c - Math.max(0, a.len - gap)}`}
              strokeDashoffset={-a.offset}
            />
          ) : null,
        )}
      </svg>
      {center !== undefined && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  )
}
