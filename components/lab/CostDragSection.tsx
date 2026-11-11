'use client'

import { AlertTriangle, Coins } from 'lucide-react'
import { Section } from '@/components/lab/Section'
import { StatTile } from '@/components/ui/stat-tile'
import { signClass } from '@/components/lab/LabBadges'
import { formatPercent, formatScore } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { costBurdenLevel, costProfile, snoopingWarning } from '@/lib/lab/timeframes'
import type { LabRunDetail } from '@/lib/api/types/lab'

const BURDEN = {
  high: { label: 'berat', cls: 'text-bearish' },
  medium: { label: 'sedang', cls: 'text-warn' },
  low: { label: 'ringan', cls: 'text-bullish' },
} as const

/**
 * Fee + slippage drag for this run's timeframe: the same window re-run with
 * zero costs, the 2x stress, and round-trip cost vs the average candle range.
 * Shown for the holdout (validate/optimize) or the full range (backtest).
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
    <Section
      title={`Beban biaya · ${run.timeframe}`}
      icon={<Coins className="h-4 w-4" />}
      description={ho ? 'Dihitung di periode holdout.' : 'Dihitung di seluruh periode backtest.'}
    >
      {c && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Biaya bolak-balik vs range candle"
            value={c.cost_to_bar_range === null ? '—' : `${formatScore(c.cost_to_bar_range * 100, 0)}%`}
            valueClassName={level ? BURDEN[level].cls : undefined}
            hint={
              <>
                {formatScore(c.round_trip_cost_pct, 2)}% per trade vs rata-rata range {formatScore(c.avg_bar_range_pct, 2)}%
                {level && <> · {BURDEN[level].label}</>}
              </>
            }
          />
          <StatTile
            label="Return tanpa biaya"
            value={formatPercent(c.zero_cost_net_return_pct, 1)}
            valueClassName={signClass(c.zero_cost_net_return_pct)}
            hint={<>PF tanpa biaya {c.zero_cost_profit_factor === null ? '—' : formatScore(c.zero_cost_profit_factor)}</>}
          />
          <StatTile
            label="Return setelah biaya"
            value={formatPercent(pct(net), 1)}
            valueClassName={signClass(pct(net))}
            hint={
              <>
                Tergerus {c.cost_drag_pct === null ? '—' : `${formatScore(c.cost_drag_pct, 1)} poin %`}
                {pct(stress) !== null && <> · biaya 2×: {formatPercent(pct(stress), 1)}</>}
              </>
            }
          />
          <StatTile
            label="Trade per bulan"
            value={c.trades_per_month === null ? '—' : formatScore(c.trades_per_month, 1)}
            hint="Makin sering trade, makin besar porsi biaya."
          />
        </div>
      )}
      {warn && (
        <p className={cn('flex items-start gap-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-2xs text-warn', c && 'mt-3')}>
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{warn}</span>
        </p>
      )}
    </Section>
  )
}
