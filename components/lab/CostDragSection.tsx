'use client'

import { AlertTriangle, Coins } from 'lucide-react'
import { Panel } from '@/components/lab/run/v2-ui'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { costBurdenLevel, costProfile, snoopingWarning } from '@/lib/lab/timeframes'
import type { LabRunDetail } from '@/lib/api/types/lab'

const BURDEN = {
  high: { label: 'berat', cls: 'text-bearish' },
  medium: { label: 'sedang', cls: 'text-warn' },
  low: { label: 'ringan', cls: 'text-bullish' },
} as const

function Tile({ label, value, valueClassName, hint }: { label: string; value: string; valueClassName?: string; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-muted/30 p-4">
      <div className="eyebrow truncate">{label}</div>
      <div className={cn('num mt-1 truncate text-2xl font-bold tracking-tight', valueClassName)}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-2xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/**
 * What costs eat on this timeframe: the same window re-run without costs, the double-cost
 * stress, and the round-trip cost against the average candle range. Holdout for a validated run,
 * the whole period for a quick test.
 */
export function CostDragSection({ run }: { run: LabRunDetail }) {
  const ho = run.oos_metrics
  const c = costProfile(ho ?? run.metrics)
  const warn = snoopingWarning(run.snooping)
  if (!c && !warn) return null
  const level = costBurdenLevel(c?.cost_to_bar_range ?? null)
  const net = (ho ?? run.metrics)?.net_return_pct
  const stress = ho?.stress_net_return_pct
  const pct = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  return (
    <Panel title={`Beban biaya · ${run.timeframe}`} icon={Coins} aside={<span className="text-2xs">{ho ? 'di data baru' : 'seluruh periode'}</span>}>
      {c && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile
            label="Biaya vs gerak candle"
            value={c.cost_to_bar_range === null ? '—' : `${formatNumber(c.cost_to_bar_range * 100, { digits: 0 })}%`}
            valueClassName={level ? BURDEN[level].cls : undefined}
            hint={level ? `${BURDEN[level].label} · ${formatNumber(c.round_trip_cost_pct)}% per transaksi` : undefined}
          />
          <Tile label="Hasil tanpa biaya" value={formatPct(c.zero_cost_net_return_pct, { signed: true })} valueClassName={signClass(c.zero_cost_net_return_pct)} />
          <Tile
            label="Hasil setelah biaya"
            value={formatPct(pct(net), { signed: true })}
            valueClassName={signClass(pct(net))}
            hint={pct(stress) !== null ? `biaya dobel: ${formatPct(pct(stress), { signed: true })}` : undefined}
          />
          <Tile label="Transaksi per bulan" value={formatNumber(c.trades_per_month, { digits: 1 })} />
        </div>
      )}
      {warn && (
        <p className={cn('flex items-start gap-2 text-2xs text-warn', c && 'mt-4')}>
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="line-clamp-2">{warn}</span>
        </p>
      )}
    </Panel>
  )
}
