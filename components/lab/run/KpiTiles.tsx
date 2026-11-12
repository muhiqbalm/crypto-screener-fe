'use client'

import { StatTile } from '@/components/ui/stat-tile'
import { signClass } from '@/components/lab/LabBadges'
import { formatNumber, formatPct } from '@/lib/utils/format'
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
  { label: 'Hasil bersih', key: 'net_return_pct', fmt: (v) => formatPct(v, { signed: true }), cls: signClass },
  { label: 'PF', key: 'profit_factor', fmt: fmtPf },
  { label: 'Turun terdalam', key: 'max_dd_pct', fmt: fmtDd, cls: (v) => (v === null ? '' : 'text-bearish') },
  { label: 'Win rate', key: 'win_rate_pct', fmt: (v) => formatPct(v) },
  { label: 'Trade', key: 'trades', fmt: (v) => formatNumber(v, { digits: 0 }) },
  { label: 'Sharpe', key: 'sharpe', fmt: (v) => formatNumber(v) },
]

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

export function KpiTiles({ run }: { run: LabRunDetail }) {
  const oos = run.oos_metrics
  return (
    <div className="space-y-2">
    {oos && (
      <p className="text-2xs text-muted-foreground">
        Data latih ±80% periode awal, data baru ±20% terakhir. Panjangnya beda, jadi angkanya jangan dibandingkan langsung; yang menentukan Lolos/Gagal adalah data baru.
      </p>
    )}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {KPIS.map((k) => {
        const is = num(run.metrics, k.key)
        const ho = oos ? num(oos, k.key) : null
        return (
          <StatTile key={k.key} label={k.label}>
            {oos ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-3xs text-muted-foreground">Data latih</div>
                  <div className={cn('num text-sm', k.cls?.(is))}>{k.fmt(is)}</div>
                </div>
                <div>
                  <div className="text-3xs font-medium text-lab">Data baru</div>
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
    </div>
  )
}
