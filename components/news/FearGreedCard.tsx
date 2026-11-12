import { Gauge as GaugeIcon } from 'lucide-react'
import { Term } from '@/components/ui/term'
import { cn } from '@/lib/utils/cn'
import { FNG_ZONES, clampFng, fngZone, type FngTone } from '@/lib/intel/fng'
import { Gauge } from '@/components/bot/kit/Gauge'
import { BigPill, HeroCard, IconBadge, type Tone } from '@/components/bot/kit/Tiles'

/** Context, not direction: extremes are "worth a look" (warn), fear / greed info, neutral muted. */
const ARC: Record<FngTone, string> = { warn: 'stroke-warn', info: 'stroke-info', muted: 'stroke-muted-foreground/60' }
const PILL: Record<FngTone, Tone> = { warn: 'warn', info: 'info', muted: 'muted' }

/**
 * Fear & Greed as the hero of Sentimen & berita: a half gauge with the number big in the
 * middle, the zone word from the source, and the five zones listed (the active one marked).
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
  /** One short answer line under the gauge. */
  sentence?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  const zone = fngZone(value, classification)
  const has = value !== null && value !== undefined && Number.isFinite(value)
  const v = has ? Math.round(clampFng(value as number)) : null
  return (
    <HeroCard glow={zone ? PILL[zone.tone] : 'info'} className={className} aria-label="Indeks takut–serakah">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={GaugeIcon} />
          <p className="text-[17px] font-semibold">
            <Term k="fear_greed" />
          </p>
        </div>
        {zone && <BigPill tone={PILL[zone.tone]}>{zone.label}</BigPill>}
      </div>

      {v === null || !zone ? (
        <p className="py-10 text-center text-[16px] text-muted-foreground">Indeks takut–serakah tidak tersedia saat ini.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 lg:flex-row lg:items-end lg:gap-8">
          <Gauge value={v} toneClass={ARC[zone.tone]} size={300} label={`Takut–serakah ${v} dari 100, zona ${zone.label}`}>
            <span className="num text-[56px] font-bold leading-none tracking-tight">{v}</span>
            <span className="text-[13px] text-muted-foreground">dari 100</span>
          </Gauge>
          <div className="min-w-0 flex-1 space-y-4">
            {sentence && <p className="text-[20px] font-semibold leading-snug sm:text-[22px]">{sentence}</p>}
            <ol className="flex flex-wrap gap-2" aria-label="Lima zona, dari takut ke serakah">
              {FNG_ZONES.map((z) => (
                <li
                  key={z.key}
                  aria-current={z.key === zone.key ? 'true' : undefined}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[13px]',
                    z.key === zone.key ? cn('font-bold', { warn: 'border-warn/50 bg-warn/12 text-warn', info: 'border-info/45 bg-info/12 text-info', muted: 'border-border bg-muted text-foreground' }[z.tone]) : 'border-border/60 text-muted-foreground',
                  )}
                >
                  {z.label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[13px] text-muted-foreground">
        <span>Sumber alternative.me · hanya konteks{classification ? ` · label sumber: ${classification}` : ''}</span>
        {footer}
      </div>
    </HeroCard>
  )
}
