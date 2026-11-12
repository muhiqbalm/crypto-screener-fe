'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState } from '@/components/lab/Section'
import { signClass } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatPct, formatPrice } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { useLabRunTrades } from '@/lib/queries/lab'
import type { LabId } from '@/lib/api/types/lab'

const EXIT_REASON: Record<string, string> = {
  tp: 'Target (TP)', tp1: 'Target 1', tp2: 'Target 2', sl: 'Stop loss', trail: 'Stop ikut gerak', trailing: 'Stop ikut gerak',
  atr_trail: 'Stop ikut gerak', ema_exit: 'EMA keluar', structure: 'Struktur patah', time: 'Batas waktu', time_stop: 'Batas waktu',
  liquidation: 'Likuidasi', end: 'Akhir data', end_of_data: 'Akhir data', be: 'Kunci impas', breakeven: 'Kunci impas',
  channel: 'Channel lawan', mean: 'Target garis tengah', rsi_exit: 'RSI ekstrem',
}

function exitReason(r: string | null | undefined): string {
  if (!r) return '—'
  return EXIT_REASON[r.toLowerCase()] ?? r.replace(/_/g, ' ')
}

export function TradesTab({ id, enabled }: { id: LabId; enabled: boolean }) {
  const q = useLabRunTrades(id, enabled)
  if (!enabled) return <p className="py-6 text-center text-sm text-muted-foreground">Daftar trade muncul setelah uji selesai.</p>
  if (q.isPending) return <Skeleton className="h-48 w-full" />
  if (q.error) return <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Daftar trade gagal dimuat." />
  const trades = q.data ?? []
  if (trades.length === 0) return <EmptyState title="Tidak ada trade di periode ini" description="Coba periode lebih panjang atau longgarkan filter entry." />
  return (
    <div className="-mx-4 max-h-[520px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr>
            {['Masuk', 'Keluar', 'Arah', 'Harga masuk', 'Harga keluar', 'Hasil', 'Ke modal', 'Alasan keluar'].map((h, i) => (
              <th key={h} className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', i >= 3 && i <= 6 ? 'text-right' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {trades.map((t, i) => (
            <tr key={`${t.entry_time}-${i}`}>
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs">{formatTime(t.entry_time, { year: true })}</td>
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-2xs text-muted-foreground">{formatTime(t.exit_time, { year: true })}</td>
              <td className={cn('px-3 py-1.5 text-xs font-bold uppercase', t.side.toLowerCase() === 'long' ? 'text-bullish' : 'text-bearish')}>{t.side}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{formatPrice(t.entry_price)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{formatPrice(t.exit_price)}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(t.pnl_pct))}>{formatPct(t.pnl_pct, { digits: 2, signed: true })}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(t.return_on_equity_pct))}>{formatPct(t.return_on_equity_pct, { digits: 2, signed: true })}</td>
              <td className="px-3 py-1.5 text-xs">{exitReason(t.exit_reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
