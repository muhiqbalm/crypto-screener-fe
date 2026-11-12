'use client'

import { Scale } from 'lucide-react'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { LabRunDetail } from '@/lib/api/types/lab'
import { fmtDd, fmtPf, num } from './format'
import { Panel } from './v2-ui'

interface Kpi {
  label: string
  key: string
  fmt: (v: number | null) => string
  cls?: (v: number | null) => string
}

const KPIS: Kpi[] = [
  { label: 'Hasil bersih', key: 'net_return_pct', fmt: (v) => formatPct(v, { signed: true }), cls: signClass },
  { label: 'PF', key: 'profit_factor', fmt: fmtPf },
  { label: 'Turun maks', key: 'max_dd_pct', fmt: fmtDd, cls: (v) => (v === null ? '' : 'text-bearish') },
  { label: 'Win rate', key: 'win_rate_pct', fmt: (v) => formatPct(v) },
  { label: 'Trade', key: 'trades', fmt: (v) => formatNumber(v, { digits: 0 }) },
  { label: 'Sharpe', key: 'sharpe', fmt: (v) => formatNumber(v) },
]

/**
 * Training vs new data side by side (one panel, one message). A backtest has only one column.
 * The periods differ in length, so the note says which column decides Lolos / Gagal.
 */
export function KpiTiles({ run, className }: { run: LabRunDetail; className?: string }) {
  const oos = run.oos_metrics
  return (
    <Panel className={className} title={oos ? 'Data latih vs data baru' : 'Angka seluruh periode'} icon={Scale} tone="lab">
      <div className="overflow-hidden rounded-2xl border border-border/70">
        <div className={cn('grid gap-x-3 bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground', oos ? 'grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]')}>
          <span>Angka</span>
          {oos && <span className="text-right">Latih</span>}
          <span className={cn('text-right', oos && 'text-lab')}>{oos ? 'Baru' : 'Nilai'}</span>
        </div>
        {KPIS.map((k) => {
          const is = num(run.metrics, k.key)
          const ho = oos ? num(oos, k.key) : null
          return (
            <div key={k.key} className={cn('grid min-h-[52px] items-center gap-x-3 border-t border-border/60 px-4 text-sm', oos ? 'grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]')}>
              <span className="text-muted-foreground">{k.label}</span>
              {oos && <span className={cn('num text-right', k.cls?.(is))}>{k.fmt(is)}</span>}
              <span className={cn('num text-right text-lg font-bold', k.cls?.(oos ? ho : is))}>{k.fmt(oos ? ho : is)}</span>
            </div>
          )
        })}
      </div>
      {oos && <p className="mt-3 text-2xs text-muted-foreground">Data latih ±80% awal, data baru ±20% terakhir. Yang menentukan Lolos/Gagal: data baru.</p>}
    </Panel>
  )
}
