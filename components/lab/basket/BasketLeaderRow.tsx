'use client'

import { ChevronRight, Layers } from 'lucide-react'
import { BigNumber, CoinAvatar, CountUp, DeckCard, Meter, Pill, RankBadge, Spark, signTone } from '@/components/lab/arena/deck'
import { BasketAvatar, OutcomePill } from '@/components/lab/basket/BasketBits'
import { formatCount, formatPct } from '@/lib/utils/format'
import { formatTimeframe } from '@/lib/utils/time'
import { sortCoins } from '@/lib/lab/basket'
import type { BasketRow } from '@/lib/api/types/basket'

const pct2 = (v: number) => formatPct(v, { digits: 2, signed: true })
const CHIPS = 8

/**
 * A basket as ONE entry of the Paper berjalan klasemen: same columns as a preset row (rank, name,
 * result, drawdown, equity sparkline, x/30), plus one strip with the coins that traded or hold a
 * paper position. The whole card opens the basket sheet.
 */
export function BasketLeaderRow({ row, rank, highlighted, onOpen }: { row: BasketRow; rank: number; highlighted?: boolean; onOpen: () => void }) {
  const s = row.stats
  const b = row.basket
  const ret = s?.return_pct ?? null
  const dd = s?.max_dd_pct ?? null
  const bad = row.evaluation.status === 'GAGAL' || row.evaluation.status === 'TIDAK_SAH'
  const active = sortCoins(row.coins).filter((c) => c.open_position || c.trades > 0)
  const pills = (
    <>
      <Pill tone="lab" icon={Layers}>
        Basket
      </Pill>
      <OutcomePill status={row.evaluation.status} />
    </>
  )
  return (
    <DeckCard onClick={onOpen} ariaLabel={`Detail ${b.name}`} outline={bad ? 'warn' : 'lab'} highlighted={highlighted} bodyClassName="p-5 sm:p-6" id={`basket-${b.id}`}>
      <div className="grid items-center gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_140px_minmax(0,1.3fr)_20px]">
        <div className="flex min-w-0 items-center gap-3">
          <RankBadge rank={rank} />
          <BasketAvatar n={b.n_coins} />
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">{b.name}</div>
            <div className="text-[13px] text-muted-foreground">
              {b.template_label} · {formatTimeframe(b.timeframe)} · {formatCount(b.n_coins)} koin
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">{pills}</div>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-4 lg:contents">
          <BigNumber label="Hasil" value={<CountUp value={ret ?? 0} format={pct2} />} tone={signTone(ret)} size="sm" />
          <BigNumber label="Drawdown" value={dd === null ? '—' : formatPct(-Math.abs(dd), { digits: 1 })} tone={dd ? 'bearish' : 'muted'} size="sm" />
          <Spark values={row.spark} width={120} height={44} label={`Kurva modal ${b.name}`} className="lg:w-[140px]" />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Transaksi</span>
            <span className="font-display text-lg font-bold tabular-nums">
              {row.progress.n}
              <span className="text-sm font-medium text-muted-foreground">/{row.progress.of}</span>
            </span>
          </div>
          <Meter value={Math.min(row.progress.n, row.progress.of)} max={row.progress.of} label={`${row.progress.n} dari ${row.progress.of} transaksi basket`} />
          <div className="hidden flex-wrap gap-1.5 lg:flex">{pills}</div>
        </div>
        <ChevronRight className="hidden h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:block" aria-hidden="true" />

        <div className="min-w-0 space-y-2.5 border-t pt-4 lg:col-span-full">
          <p className="text-[14px] text-muted-foreground">
            {formatCount(row.open_positions)} posisi terbuka · {formatCount(row.gate.coins)} koin sudah bertransaksi
            {row.waiting.n > 0 && (
              <>
                {' · '}
                <span className="text-info">{formatCount(row.waiting.n)} koin menunggu sinyal baru (strategi berposisi sejak sebelum paper)</span>
              </>
            )}
          </p>
          {active.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {active.slice(0, CHIPS).map((c) => (
                <span key={c.symbol} className="inline-flex items-center gap-1.5 rounded-full border bg-card py-0.5 pl-0.5 pr-2.5 text-[13px]">
                  <CoinAvatar coin={c.coin} size={28} />
                  <span className="font-semibold">{c.coin}</span>
                  {c.trades > 0 && <span className="tabular-nums text-muted-foreground">{c.trades} transaksi</span>}
                  {c.open_position && (
                    <span className="inline-flex items-center gap-1 text-lab">
                      <span className="h-1.5 w-1.5 rounded-full bg-lab" aria-hidden="true" />
                      posisi
                    </span>
                  )}
                </span>
              ))}
              {active.length > CHIPS && <span className="self-center text-[13px] text-muted-foreground">+{active.length - CHIPS} koin</span>}
            </div>
          )}
        </div>
      </div>
    </DeckCard>
  )
}
