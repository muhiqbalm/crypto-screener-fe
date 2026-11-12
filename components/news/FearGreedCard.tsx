import { Gauge as GaugeIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FNG_GAUGE_ZONES, Gauge } from '@/components/ui/gauge'
import { HeroCard } from '@/components/ui/hero-card'
import { IconChip } from '@/components/ui/icon-title'
import { Term } from '@/components/ui/term'
import { TONE_SOFT, type Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'
import { FNG_ZONES, clampFng, fngZone, type FngTone } from '@/lib/intel/fng'

/** Context, not direction: extremes are "worth a look" (warn), fear / greed info, neutral muted. */
const ZONE_TONE: Record<FngTone, Tone> = { warn: 'warn', info: 'info', muted: 'muted' }

/**
 * Fear & Greed as the hero of Sentimen & berita: a zoned half gauge with a needle, the number big
 * under it, one short sentence and the five zones (the active one marked, never colour alone).
 */
export function FearGreedCard({
  value,
  classification,
  sentence,
  footer,
  className,
}: {
  value: number | null | undefined
  classification?: string | null
  /** One short answer line next to the gauge. */
  sentence?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  const zone = fngZone(value, classification)
  const has = value !== null && value !== undefined && Number.isFinite(value)
  const v = has ? Math.round(clampFng(value as number)) : null
  return (
    <HeroCard glow={zone ? ZONE_TONE[zone.tone] : 'info'} className={cn('flex flex-col', className)} aria-label="Indeks takut–serakah">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconChip icon={GaugeIcon} tone="info" />
          <h2 className="text-lg font-bold">
            <Term k="fear_greed" />
          </h2>
        </div>
        {zone && (
          <Badge variant={ZONE_TONE[zone.tone]} className="px-3.5 py-1 text-sm">
            {zone.label}
          </Badge>
        )}
      </div>

      {v === null || !zone ? (
        <p className="flex-1 py-10 text-center text-base text-muted-foreground">Indeks takut–serakah tidak tersedia saat ini.</p>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-6 py-4 md:flex-row md:gap-10">
          <Gauge
            value={v}
            zones={FNG_GAUGE_ZONES}
            size={280}
            thickness={20}
            label={`Takut–serakah ${v} dari 100, zona ${zone.label}`}
            center={
              <div className="flex flex-col items-center">
                <span className="num display text-6xl font-extrabold leading-none">{v}</span>
                <span className="mt-1 text-sm text-muted-foreground">dari 100</span>
              </div>
            }
          />
          <div className="min-w-0 flex-1 space-y-4">
            {sentence && <p className="display text-2xl font-bold leading-snug">{sentence}</p>}
            <ol className="flex flex-wrap gap-2" aria-label="Lima zona, dari takut ke serakah">
              {FNG_ZONES.map((z) => (
                <li
                  key={z.key}
                  aria-current={z.key === zone.key ? 'true' : undefined}
                  className={cn(
                    'rounded-full border px-3 py-1 text-2xs',
                    z.key === zone.key ? cn('border-transparent font-bold', TONE_SOFT[ZONE_TONE[z.tone]]) : 'text-muted-foreground',
                  )}
                >
                  {z.label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-2xs text-muted-foreground">
        <span>Sumber alternative.me · hanya konteks{classification ? ` · label sumber: ${classification}` : ''}</span>
        {footer}
      </div>
    </HeroCard>
  )
}
