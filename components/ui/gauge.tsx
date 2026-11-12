import { cn } from '@/lib/utils/cn'
import { TONE_VAR, type Tone } from '@/components/ui/tone'

export interface GaugeZone {
  /** Upper bound (inclusive) of this zone on the min..max scale. */
  to: number
  tone: Tone
}

/** Fear & Greed zones (alternative.me bands): no up/down colours, it is context. */
export const FNG_GAUGE_ZONES: GaugeZone[] = [
  { to: 24, tone: 'warn' },
  { to: 44, tone: 'info' },
  { to: 55, tone: 'muted' },
  { to: 75, tone: 'info' },
  { to: 100, tone: 'warn' },
]

/**
 * Half-circle gauge with coloured zones and a needle, e.g. Fear & Greed.
 * The number and its word go in `center` (below the arc), never colour alone.
 */
export function Gauge({
  value,
  min = 0,
  max = 100,
  zones = [{ to: max, tone: 'brand' }],
  size = 140,
  thickness = 12,
  center,
  label,
  className,
}: {
  value: number | null
  min?: number
  max?: number
  zones?: GaugeZone[]
  size?: number
  thickness?: number
  center?: React.ReactNode
  label: string
  className?: string
}) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const span = max - min || 1
  // angle: min → 180° (left), max → 0° (right)
  const pt = (v: number, rad = r) => {
    const a = Math.PI * (1 - (Math.min(max, Math.max(min, v)) - min) / span)
    return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)] as const
  }
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from)
    const [x2, y2] = pt(to)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  const paths = zones.map((z, i) => ({ tone: z.tone, d: arc((i ? zones[i - 1].to : min) + (i ? 1.2 : 0), z.to) }))
  const h = size / 2 + thickness / 2 + 2
  const needle = value !== null && Number.isFinite(value) ? pt(value, r - thickness / 2 - 6) : null
  return (
    <div className={cn('inline-flex flex-col items-center', className)} style={{ width: size }}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} role="img" aria-label={label}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={TONE_VAR[p.tone]} strokeOpacity={0.85} strokeWidth={thickness} strokeLinecap="butt" />
        ))}
        {needle && (
          <>
            <line x1={cx} y1={cy} x2={needle[0]} y2={needle[1]} stroke="var(--color-foreground)" strokeWidth={3} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={5} fill="var(--color-foreground)" />
          </>
        )}
      </svg>
      {center !== undefined && <div className="-mt-1 text-center">{center}</div>}
    </div>
  )
}
