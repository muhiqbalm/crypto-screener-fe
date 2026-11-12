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
  if (!enabled) return <p className="py-6 text-center text-sm text-muted-foreground">Daftar transaksi muncul setelah uji selesai.</p>
  if (q.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />
  if (q.error) return <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Daftar transaksi gagal dimuat." />
  const trades = q.data ?? []
  if (trades.length === 0) return <EmptyState title="Tidak ada transaksi di periode ini" description="Coba periode lebih panjang atau longgarkan filter entry." />
  return (
    <div className="-mx-5 max-h-[640px] overflow-auto sm:mx-0 sm:rounded-2xl sm:border sm:border-border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr>
            {['Masuk', 'Keluar', 'Arah', 'Harga masuk', 'Harga keluar', 'Hasil', 'Ke modal', 'Alasan keluar'].map((h, i) => (
              <th key={h} className={cn('h-12 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground', i >= 3 && i <= 6 ? 'text-right' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {trades.map((t, i) => (
            <tr key={`${t.entry_time}-${i}`}>
              <td className="num h-[52px] whitespace-nowrap px-4">{formatTime(t.entry_time, { year: true })}</td>
              <td className="num whitespace-nowrap px-4 text-muted-foreground">{formatTime(t.exit_time, { year: true })}</td>
              <td className={cn('px-4 text-xs font-bold uppercase', t.side.toLowerCase() === 'long' ? 'text-bullish' : 'text-bearish')}>{t.side}</td>
              <td className="num px-4 text-right">{formatPrice(t.entry_price)}</td>
              <td className="num px-4 text-right">{formatPrice(t.exit_price)}</td>
              <td className={cn('num px-4 text-right font-semibold', signClass(t.pnl_pct))}>{formatPct(t.pnl_pct, { digits: 2, signed: true })}</td>
              <td className={cn('num px-4 text-right font-semibold', signClass(t.return_on_equity_pct))}>{formatPct(t.return_on_equity_pct, { digits: 2, signed: true })}</td>
              <td className="px-4">{exitReason(t.exit_reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
