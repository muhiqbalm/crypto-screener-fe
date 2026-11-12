import { ArrowDownRight, ArrowUpRight, Minus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Freshness } from '@/components/ui/freshness'
import { HeroCard } from '@/components/ui/hero-card'
import { IconChip } from '@/components/ui/icon-title'
import { Term } from '@/components/ui/term'
import type { Tone } from '@/components/ui/tone'
import { formatNumber } from '@/lib/utils/format'
import { LEAN_LABEL, LEAN_LONG_ABOVE, LEAN_SHORT_BELOW, type Lean } from '@/lib/intel/whales'

const LEAN_STYLE: Record<Lean, { tone: Tone; variant: 'bullish' | 'bearish' | 'muted'; Icon: typeof Minus }> = {
  long: { tone: 'bullish', variant: 'bullish', Icon: ArrowUpRight },
  short: { tone: 'bearish', variant: 'bearish', Icon: ArrowDownRight },
  seimbang: { tone: 'muted', variant: 'muted', Icon: Minus },
}

/**
 * Top-trader lean as the hero of Arus besar: long % vs short % on one big meter, with the
 * 45 / 55 band that decides "condong" (same rule for coins and overall).
 */
export function LeanHero({
  avgLong,
  lean,
  sentence,
  cachedAt,
  className,
}: {
  avgLong: number | null
  lean: Lean | null
  sentence: string
  cachedAt?: number
  className?: string
}) {
  const st = lean ? LEAN_STYLE[lean] : null
  const longPct = avgLong === null ? null : Math.min(100, Math.max(0, avgLong))
  return (
    <HeroCard glow={st?.tone ?? 'info'} className={`flex flex-col ${className ?? ''}`} aria-label="Trader besar condong ke mana?">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconChip icon={Users} tone="info" />
          <h2 className="text-lg font-bold">
            <Term k="top_trader" />
          </h2>
        </div>
        {st && lean && (
          <Badge variant={st.variant} className="px-3.5 py-1 text-sm">
            <st.Icon aria-hidden="true" />
            {LEAN_LABEL[lean]}
          </Badge>
        )}
      </div>

      {longPct === null ? (
        <p className="flex-1 py-10 text-center text-base text-muted-foreground">Data posisi trader besar tidak tersedia saat ini.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-5 py-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="num display text-5xl font-extrabold leading-none text-bullish text-glow sm:text-6xl">{formatNumber(longPct, { digits: 0 })}%</p>
              <p className="mt-1.5 text-base font-semibold text-bullish">long</p>
            </div>
            <div className="text-right">
              <p className="num display text-5xl font-extrabold leading-none text-bearish sm:text-6xl">{formatNumber(100 - longPct, { digits: 0 })}%</p>
              <p className="mt-1.5 text-base font-semibold text-bearish">short</p>
            </div>
          </div>
          <div className="relative pt-1" role="img" aria-label={`Rata-rata ${formatNumber(longPct, { digits: 1 })}% posisi long, ${formatNumber(100 - longPct, { digits: 1 })}% short`}>
            <div className="flex h-5 w-full overflow-hidden rounded-full bg-bearish/75">
              <div className="h-full rounded-l-full bg-bullish transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${longPct}%` }} />
            </div>
            {/* the "seimbang" band */}
            <div
              className="pointer-events-none absolute top-0 h-[26px] rounded-md border-2 border-dashed border-foreground/60"
              style={{ left: `${LEAN_SHORT_BELOW}%`, width: `${LEAN_LONG_ABOVE - LEAN_SHORT_BELOW}%` }}
              aria-hidden="true"
            />
            <div className="num mt-2 flex justify-between text-2xs text-muted-foreground">
              <span>0%</span>
              <span>seimbang {LEAN_SHORT_BELOW}–{LEAN_LONG_ABOVE}%</span>
              <span>100% long</span>
            </div>
          </div>
          <p className="display text-xl font-bold leading-snug">{sentence}</p>
        </div>
      )}
      <div className="border-t border-border/60 pt-3">
        <Freshness updatedAt={cachedAt} />
      </div>
    </HeroCard>
  )
}
