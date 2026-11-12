import { cn } from '@/lib/utils/cn'

/**
 * Half-circle gauge 0–100 with a marker. The arc is neutral; only the filled part takes the
 * tone class, so the reading never relies on colour alone (the number and zone word sit below).
 */
export function Gauge({
  value,
  toneClass = 'stroke-info',
  size = 280,
  thickness = 20,
  label,
  children,
}: {
  value: number
  toneClass?: string
  size?: number
  thickness?: number
  label: string
  children?: React.ReactNode
}) {
  const v = Math.min(100, Math.max(0, value))
  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const half = Math.PI * r
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const angle = Math.PI * (1 - v / 100)
  const mx = cx + r * Math.cos(angle)
  const my = cy - r * Math.sin(angle)
  return (
    <div className="relative w-full" style={{ maxWidth: size }} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size / 2 + thickness}`} className="w-full overflow-visible">
        <path d={arc} fill="none" strokeWidth={thickness} strokeLinecap="round" className="stroke-muted/70" />
        <path
          d={arc}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * half} ${half}`}
          className={cn('transition-[stroke-dasharray] duration-700 motion-reduce:transition-none', toneClass)}
        />
        <circle cx={mx} cy={my} r={thickness / 2 + 3} className="fill-background stroke-foreground" strokeWidth={3} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">{children}</div>
    </div>
  )
}
