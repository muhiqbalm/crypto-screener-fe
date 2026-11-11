'use client'

import { StatTile } from '@/components/ui/stat-tile'
import { signClass } from '@/components/lab/LabBadges'
import { formatPercent, formatScore } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { LabRunDetail } from '@/lib/api/types/lab'
import { fmtDd, fmtPf, num } from './format'

interface Kpi {
  label: string
  key: string
  fmt: (v: number | null) => string
  cls?: (v: number | null) => string
}

const KPIS: Kpi[] = [
  { label: 'Net return', key: 'net_return_pct', fmt: (v) => formatPercent(v, 1), cls: signClass },
  { label: 'Profit factor', key: 'profit_factor', fmt: fmtPf },
  { label: 'Max drawdown', key: 'max_dd_pct', fmt: fmtDd, cls: (v) => (v === null ? '' : 'text-bearish') },
  { label: 'Winrate', key: 'win_rate_pct', fmt: (v) => (v === null ? '—' : `${formatScore(v, 1)}%`) },
  { label: 'Trade', key: 'trades', fmt: (v) => (v === null ? '—' : String(Math.round(v))) },
  { label: 'Sharpe', key: 'sharpe', fmt: (v) => (v === null ? '—' : formatScore(v)) },
]

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

export function KpiTiles({ run }: { run: LabRunDetail }) {
  const oos = run.oos_metrics
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {KPIS.map((k) => {
        const is = num(run.metrics, k.key)
        const ho = oos ? num(oos, k.key) : null
        return (
          <StatTile key={k.key} label={k.label}>
            {oos ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-3xs text-muted-foreground">In-sample</div>
                  <div className={cn('num text-sm', k.cls?.(is))}>{k.fmt(is)}</div>
                </div>
                <div>
                  <div className="text-3xs font-medium text-lab">Holdout</div>
                  <div className={cn('num text-base font-bold', k.cls?.(ho))}>{k.fmt(ho)}</div>
                </div>
              </div>
            ) : (
              <div className={cn('num text-lg font-bold', k.cls?.(is))}>{k.fmt(is)}</div>
            )}
          </StatTile>
        )
      })}
    </div>
  )
}
