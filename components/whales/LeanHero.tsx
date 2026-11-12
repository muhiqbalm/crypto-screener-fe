import { ArrowDownRight, ArrowUpRight, Minus, Users } from 'lucide-react'
import { Freshness } from '@/components/ui/freshness'
import { Term } from '@/components/ui/term'
import { formatNumber } from '@/lib/utils/format'
import { LEAN_LABEL, LEAN_LONG_ABOVE, LEAN_SHORT_BELOW, type Lean } from '@/lib/intel/whales'
import { BigPill, HeroCard, IconBadge, type Tone } from '@/components/bot/kit/Tiles'

const LEAN_STYLE: Record<Lean, { tone: Tone; Icon: typeof Minus }> = {
  long: { tone: 'ok', Icon: ArrowUpRight },
  short: { tone: 'bad', Icon: ArrowDownRight },
  seimbang: { tone: 'muted', Icon: Minus },
}

/**
 * Top-trader lean as the hero of Arus besar: long % vs short % on one big meter, with the
 * 45 / 55 band that decides "condong" (same rule for coins and overall).
 */
export function LeanHero({
  avgLong,
  lean,
  coins,
  sentence,
  cachedAt,
  className,
}: {
  avgLong: number | null
  lean: Lean | null
  coins: string[]
  sentence: string
  cachedAt?: number
  className?: string
}) {
  const st = lean ? LEAN_STYLE[lean] : null
  const longPct = avgLong === null ? null : Math.min(100, Math.max(0, avgLong))
  return (
    <HeroCard glow={st?.tone ?? 'info'} className={className} aria-label="Trader besar condong ke mana?">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={Users} />
          <p className="text-[17px] font-semibold">
            <Term k="top_trader" />
          </p>
        </div>
        {st && lean && (
          <BigPill tone={st.tone}>
            <st.Icon aria-hidden="true" />
            {LEAN_LABEL[lean]}
          </BigPill>
        )}
      </div>

      {longPct === null ? (
        <p className="py-10 text-center text-[16px] text-muted-foreground">Data posisi trader besar tidak tersedia saat ini.</p>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="num text-[52px] font-bold leading-none tracking-tight text-bullish">{formatNumber(longPct, { digits: 0 })}%</p>
              <p className="mt-1 text-[15px] font-semibold text-bullish">long</p>
            </div>
            <div className="text-right">
              <p className="num text-[52px] font-bold leading-none tracking-tight text-bearish">{formatNumber(100 - longPct, { digits: 0 })}%</p>
              <p className="mt-1 text-[15px] font-semibold text-bearish">short</p>
            </div>
          </div>
          <div className="relative pt-1" role="img" aria-label={`Rata-rata ${formatNumber(longPct, { digits: 1 })}% posisi long, ${formatNumber(100 - longPct, { digits: 1 })}% short`}>
            <div className="flex h-5 w-full overflow-hidden rounded-full bg-bearish/70">
              <div className="h-full rounded-l-full bg-bullish transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${longPct}%` }} />
            </div>
            {/* the "seimbang" band */}
            <div
              className="pointer-events-none absolute top-0 h-[26px] rounded-md border-2 border-dashed border-foreground/50"
              style={{ left: `${LEAN_SHORT_BELOW}%`, width: `${LEAN_LONG_ABOVE - LEAN_SHORT_BELOW}%` }}
              aria-hidden="true"
            />
            <div className="num mt-2 flex justify-between text-[13px] text-muted-foreground">
              <span>0%</span>
              <span>seimbang {LEAN_SHORT_BELOW}–{LEAN_LONG_ABOVE}%</span>
              <span>100% long</span>
            </div>
          </div>
          <p className="text-[18px] font-semibold leading-snug">{sentence}</p>
          {coins.length > 0 && <p className="text-[14px] text-muted-foreground">Rata-rata {coins.join(', ')}.</p>}
        </div>
      )}
      <div className="mt-5 border-t border-border/60 pt-3">
        <Freshness updatedAt={cachedAt} />
      </div>
    </HeroCard>
  )
}
