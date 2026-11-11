'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState } from '@/components/lab/Section'
import { signClass } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { useLabRunTrades } from '@/lib/queries/lab'
import type { LabId } from '@/lib/api/types/lab'

export function TradesTab({ id, enabled }: { id: LabId; enabled: boolean }) {
  const q = useLabRunTrades(id, enabled)
  if (!enabled) return <p className="py-6 text-center text-sm text-muted-foreground">Daftar trade muncul setelah run selesai.</p>
  if (q.isPending) return <Skeleton className="h-48 w-full" />
  if (q.error) return <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat daftar trade." />
  const trades = q.data ?? []
  if (trades.length === 0) return <EmptyState title="Tidak ada trade di periode ini" description="Coba periode lebih panjang atau longgarkan filter entry." />
  return (
    <div className="-mx-4 max-h-[520px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr>
            {['Entry', 'Exit', 'Arah', 'Harga entry', 'Harga exit', 'P&L', 'Return equity', 'Alasan'].map((h, i) => (
              <th key={h} className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', i >= 3 && i <= 6 ? 'text-right' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {trades.map((t, i) => (
            <tr key={`${t.entry_time}-${i}`}>
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs">{formatTimestamp(t.entry_time).slice(0, 16)}</td>
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs text-muted-foreground">{formatTimestamp(t.exit_time).slice(0, 16)}</td>
              <td className={cn('px-3 py-1.5 text-xs font-bold uppercase', t.side.toLowerCase() === 'long' ? 'text-bullish' : 'text-bearish')}>{t.side}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{formatPrice(t.entry_price)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{formatPrice(t.exit_price)}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(t.pnl_pct))}>{formatPercent(t.pnl_pct)}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(t.return_on_equity_pct))}>{formatPercent(t.return_on_equity_pct)}</td>
              <td className="px-3 py-1.5 text-xs">{valueOrDash(t.exit_reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
