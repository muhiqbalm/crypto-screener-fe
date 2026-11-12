import { Gauge } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { Term } from '@/components/ui/term'
import { cn } from '@/lib/utils/cn'
import { FNG_ZONES, clampFng, fngZone, type FngTone } from '@/lib/intel/fng'

const ACTIVE: Record<FngTone, string> = {
  warn: 'bg-warn/70',
  info: 'bg-info/60',
  muted: 'bg-muted-foreground/45',
}
const PILL: Record<FngTone, string> = {
  warn: 'border-warn/40 bg-warn/10 text-warn',
  info: 'border-info/35 bg-info/10 text-info',
  muted: 'border-border bg-muted/60 text-muted-foreground',
}

/**
 * Fear & Greed on an honest 5-zone scale. Context, not direction: no up/down colours,
 * the zone is always written out, and the marker shows where the value sits.
 */
export function FearGreedCard({
  value,
  classification,
  className,
}: {
  value: number | null | undefined
  classification?: string | null
  className?: string
}) {
  const zone = fngZone(value, classification)
  const has = value !== null && value !== undefined && Number.isFinite(value)
  const v = has ? Math.round(clampFng(value as number)) : null
  return (
    <Section
      className={className}
      icon={<Gauge className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title={<Term k="fear_greed" />}
      description="Sumber: alternative.me. Hanya konteks, bukan sinyal beli atau jual."
    >
      {v === null || !zone ? (
        <p className="py-4 text-sm text-muted-foreground">Indeks takut–serakah tidak tersedia saat ini.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="num text-3xl font-bold">{v}</span>
            <span className="text-xs text-muted-foreground">dari 100</span>
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', PILL[zone.tone])}>{zone.label}</span>
          </div>
          <div className="relative pt-3" role="img" aria-label={`Skala takut–serakah: ${v} dari 100, zona ${zone.label}`}>
            <span
              className="absolute top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-foreground"
              style={{ left: `${v}%` }}
              aria-hidden="true"
            />
            {/* One continuous scale: the marker is the value, the zone word comes from the source. */}
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <span className={cn('absolute inset-y-0 left-0 rounded-full', ACTIVE[zone.tone])} style={{ width: `${v}%` }} />
              {[25, 50, 75].map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-background/80" style={{ left: `${t}%` }} aria-hidden="true" />
              ))}
            </div>
            <div className="num mt-1 flex justify-between text-3xs text-muted-foreground" aria-hidden="true">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
          <ol className="grid grid-cols-5 gap-1 text-center text-3xs leading-tight text-muted-foreground" aria-label="Lima zona, dari takut ke serakah">
            {FNG_ZONES.map((z) => (
              <li
                key={z.key}
                className={cn('rounded px-0.5 py-0.5', z.key === zone.key && cn('border font-semibold', PILL[z.tone]))}
                aria-current={z.key === zone.key ? 'true' : undefined}
              >
                {z.label}
              </li>
            ))}
          </ol>
          {classification && <p className="text-3xs text-muted-foreground">Label dari sumber: {classification}.</p>}
        </div>
      )}
    </Section>
  )
}
