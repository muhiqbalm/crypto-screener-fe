'use client'
import { useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import { useTradeLog } from '@/lib/queries/webhook'
import { formatPrice, formatQty } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { TradeStatusIcon, TRADE_STATUS_LABEL } from './TradeStatusIcon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Term } from '@/components/ui/term'
import { EmptyState, ErrorState } from '@/components/shell/states'
import type { TradeLogResponse } from '@/lib/api/types/trades'

const PAGE = 50

/** Rows whose reason is worth opening: anything the bot did not execute. */
function hasReason(row: TradeLogResponse): boolean {
  return row.status === 'failed' || row.status === 'rejected'
}

function StatusCell({ row }: { row: TradeLogResponse }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <TradeStatusIcon status={row.status} />
      <span className="text-xs">{TRADE_STATUS_LABEL[row.status] ?? row.status}</span>
    </span>
  )
}

const COLUMNS: ResponsiveColumn<TradeLogResponse>[] = [
  {
    key: 'waktu',
    header: 'Waktu (WIB)',
    mobile: 'field',
    cell: (r) => (
      <div className="num whitespace-nowrap text-xs">
        {formatTime(r.created_at, { zone: false, seconds: true })}
        <div className="text-3xs text-muted-foreground">{formatAge(r.created_at)}</div>
      </div>
    ),
  },
  { key: 'koin', header: 'Koin', mobile: 'title', cell: (r) => <span className="font-mono text-sm font-semibold">{r.symbol}</span> },
  {
    key: 'aksi',
    header: 'Aksi',
    mobile: 'field',
    cell: (r) => (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{r.action === 'open' ? 'Buka' : 'Tutup'}</span>
        <DirectionBadge direction={r.side} size="xs" />
      </span>
    ),
  },
  { key: 'status', header: 'Status', mobile: 'badge', cell: (r) => <StatusCell row={r} /> },
  {
    key: 'harga',
    header: 'Harga eksekusi',
    align: 'right',
    mobile: 'field',
    cell: (r) => <span className="num text-xs">{formatPrice(r.fill_price)}</span>,
  },
  {
    key: 'jumlah',
    header: 'Jumlah',
    align: 'right',
    mobile: 'hidden',
    cell: (r) => <span className="num text-xs">{r.filled_quantity != null ? formatQty(r.filled_quantity) : '—'}</span>,
  },
]

function Detail({ row, onClose }: { row: TradeLogResponse | null; onClose: () => void }) {
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto p-5">
        {row && (
          <div className="space-y-3 pr-6">
            <SheetTitle className="text-sm font-semibold">
              {row.symbol} · {row.action === 'open' ? 'Buka' : 'Tutup'} {row.side.toUpperCase()}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">{formatTime(row.created_at, { seconds: true })}</SheetDescription>
            <StatusCell row={row} />
            {hasReason(row) && (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                <p className="mb-1 font-semibold">Alasan dari bot</p>
                <p className="break-words text-muted-foreground">{row.error_details ?? 'Bot tidak mencatat alasannya.'}</p>
              </div>
            )}
            <dl className="num grid grid-cols-[110px_1fr] gap-y-1 text-xs">
              <dt className="text-muted-foreground">Exchange</dt>
              <dd className="capitalize">{row.exchange}</dd>
              <dt className="text-muted-foreground">Ukuran</dt>
              <dd>{row.size_value}</dd>
              <dt className="text-muted-foreground">Harga eksekusi</dt>
              <dd>{formatPrice(row.fill_price)}</dd>
            </dl>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** "Log alert": every alert the bot processed for this account. Same query and 15 s polling as before. */
export function SignalLogsTable() {
  const { data, isPending, error, refetch, dataUpdatedAt } = useTradeLog()

  const prevLengthRef = useRef<number | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    if (!data) return
    const currentLength = data.length
    if (prevLengthRef.current !== null && currentLength > prevLengthRef.current && data[0]) {
      notify.info(`Alert baru masuk: ${data[0].symbol}`)
    }
    prevLengthRef.current = currentLength
  }, [data])

  const rows = data ?? []
  const shown = rows.slice(0, limit)
  const open = rows.find((r) => r.id === openId) ?? null

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">
            <Term k="signal_logs" />
          </CardTitle>
          {!isPending && !error && (
            <Badge variant="muted" size="xs">
              {rows.length}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Diperbarui otomatis tiap 15 detik{dataUpdatedAt ? ` · terakhir ${formatAge(dataUpdatedAt, { seconds: true })}` : ''}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {isPending ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState compact error={error} onRetry={() => refetch()} message="Log alert belum bisa dimuat." />
        ) : (
          <>
            <ResponsiveTable
              rows={shown}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              onRowClick={(r) => setOpenId(r.id)}
              rowLabel={(r) => `Detail alert ${r.symbol}`}
              caption="Alert TradingView yang diproses bot, terbaru di atas"
              empty={<EmptyState title="Belum ada alert yang tercatat" description="Alert TradingView yang sampai ke bot akan muncul di sini." />}
            />
            <p className="text-2xs text-muted-foreground">Ketuk baris untuk detail; baris gagal atau ditolak menampilkan alasan dari bot.</p>
            {rows.length > limit && (
              <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
                Tampilkan {Math.min(PAGE, rows.length - limit)} lagi ({rows.length - limit} tersisa)
              </Button>
            )}
          </>
        )}
      </CardContent>
      <Detail row={open} onClose={() => setOpenId(null)} />
    </Card>
  )
}
