'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UseQueryResult } from '@tanstack/react-query'
import { Activity, Eye, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge, VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { formatPercent, formatPrice, formatTimestamp } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { isLong, unrealisedPct } from '@/lib/lab/overlay'
import { useDeleteLabWatch, WATCH_STATE_POLL_MS } from '@/lib/queries/lab-live'
import type { LabRunDetail, LabTrade, LabWatch, LabWatchState } from '@/lib/api/types/lab'
import type { KlineSource } from './TradingChart'

interface Props {
  watchId: string | null
  runId: string | null
  watches: UseQueryResult<LabWatch[]>
  watchState: UseQueryResult<LabWatchState>
  run: UseQueryResult<LabRunDetail>
  runTrades: UseQueryResult<LabTrade[]>
  lastPrice: number | null
  priceSource: KlineSource | null
  markersOffscreen: number
  markerCount: number
  children?: React.ReactNode
}

export function StrategyOverlayPanel(p: Props) {
  return (
    <div className="flex flex-col gap-4">
      <WatchSelector watchId={p.watchId} watches={p.watches} />
      {p.watchId && (
        <LiveSignalCard
          state={p.watchState}
          lastPrice={p.lastPrice}
          priceSource={p.priceSource}
          markersOffscreen={p.markersOffscreen}
        />
      )}
      {p.runId && (
        <RunOverlayCard run={p.run} trades={p.runTrades} markerCount={p.markerCount} markersOffscreen={p.markersOffscreen} />
      )}
      {p.children}
    </div>
  )
}

function WatchSelector({ watchId, watches }: { watchId: string | null; watches: UseQueryResult<LabWatch[]> }) {
  const router = useRouter()
  const del = useDeleteLabWatch()
  const list = watches.data ?? []

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Eye className="h-4 w-4 text-lab" />
          Watch strategi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {watches.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : watches.isError ? (
          <p className="text-xs text-bearish">
            Gagal memuat daftar watch.{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => watches.refetch()}>
              Coba lagi
            </button>
          </p>
        ) : list.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Belum ada strategi yang dipantau. Buka run yang sudah selesai di Lab, lalu klik &quot;Tampilkan di Chart&quot;.
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/lab">Buka Lab</Link>
            </Button>
          </div>
        ) : (
          <>
            <label htmlFor="watch-select" className="sr-only">Pilih watch</label>
            <select
              id="watch-select"
              value={watchId ?? ''}
              onChange={(e) => router.push(e.target.value ? `/chart?watch=${encodeURIComponent(e.target.value)}` : '/chart')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-xs shadow-sm"
            >
              <option value="" className="bg-popover">— tanpa overlay —</option>
              {list.map((w) => (
                <option key={w.id} value={w.id} className="bg-popover">
                  {w.symbol} {w.timeframe} · {w.template_id}
                </option>
              ))}
            </select>
            {watchId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-bearish"
                disabled={del.isPending}
                onClick={() =>
                  del.mutate(watchId, {
                    onSuccess: () => {
                      notify.info('Watch dihapus')
                      router.push('/chart')
                    },
                    onError: () => notify.error('Gagal menghapus watch'),
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus watch ini
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-mono tabular-nums', className)}>{children}</span>
    </div>
  )
}

function LiveSignalCard({
  state,
  lastPrice,
  priceSource,
  markersOffscreen,
}: {
  state: UseQueryResult<LabWatchState>
  lastPrice: number | null
  priceSource: KlineSource | null
  markersOffscreen: number
}) {
  const s = state.data
  const pos = s?.position ?? null
  const upnl = pos ? unrealisedPct(pos.side, pos.entry_price, lastPrice) : null

  return (
    <Card className="border-border">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Activity className="h-4 w-4 text-bullish" />
          Status Sinyal Live
        </CardTitle>
        {state.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="memuat" />}
      </CardHeader>
      <CardContent>
        {state.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : state.isError || !s ? (
          <p className="text-xs text-bearish">
            Gagal memuat status watch.{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => state.refetch()}>
              Coba lagi
            </button>
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            <div className="pb-2">
              {pos ? (
                <Row label="Posisi" className={cn('font-bold uppercase', isLong(pos.side) ? 'text-bullish' : 'text-bearish')}>
                  {pos.side}
                </Row>
              ) : (
                <Row label="Posisi">Flat (tidak ada posisi)</Row>
              )}
              {pos && (
                <>
                  <Row label="Entry">{formatPrice(pos.entry_price)}</Row>
                  <Row label="Waktu entry">{formatTimestamp(pos.entry_time)}</Row>
                  <Row label="Stop loss" className="text-bearish">{formatPrice(pos.sl)}</Row>
                  <Row label="Take profit" className="text-bullish">{formatPrice(pos.tp)}</Row>
                  <Row label="Unrealised (tanpa leverage)" className={signClass(upnl)}>{formatPercent(upnl)}</Row>
                  {priceSource === 'spot' && (
                    <p className="pt-1 text-3xs text-warn">Unrealised dihitung dari harga spot (feed perp tidak tersedia).</p>
                  )}
                </>
              )}
            </div>
            <div className="py-2">
              <Row label="Sinyal terakhir">
                {s.last_signal ? `${s.last_signal.action}${s.last_signal.side ? ` ${s.last_signal.side}` : ''}` : '—'}
              </Row>
              {s.last_signal && (
                <>
                  <Row label="Harga sinyal">{formatPrice(s.last_signal.price)}</Row>
                  <Row label="Waktu sinyal">{formatTimestamp(s.last_signal.time)}</Row>
                </>
              )}
            </div>
            <div className="pt-2">
              <Row label="Bar terakhir">{formatTimestamp(s.last_bar)}</Row>
              <Row label="Dihitung">{formatTimestamp(s.computed_at)}</Row>
              <p className="pt-1 text-3xs text-muted-foreground">
                Update tiap {WATCH_STATE_POLL_MS / 1000} detik. Sinyal dihitung di bar yang sudah close.
                {markersOffscreen > 0 && ` ${markersOffscreen} marker di luar rentang candle yang dimuat.`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RunOverlayCard({
  run,
  trades,
  markerCount,
  markersOffscreen,
}: {
  run: UseQueryResult<LabRunDetail>
  trades: UseQueryResult<LabTrade[]>
  markerCount: number
  markersOffscreen: number
}) {
  const r = run.data
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">Overlay trade backtest</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {run.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : run.isError || !r ? (
          <p className="text-xs text-bearish">Run tidak bisa dimuat.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 pb-1">
              <StatusBadge status={r.status} />
              <VerdictBadge verdict={r.verdict} />
            </div>
            <Row label="Run">
              <Link href={`/lab/runs/${encodeURIComponent(r.id)}`} className="text-info hover:underline">{r.id}</Link>
            </Row>
            <Row label="Trade backtest">
              {r.status !== 'done' ? 'run belum selesai' : trades.isPending ? '…' : trades.isError ? 'gagal dimuat' : (trades.data?.length ?? 0)}
            </Row>
            <Row label="Marker di chart">{markerCount}</Row>
            {markersOffscreen > 0 && (
              <p className="text-3xs text-muted-foreground">
                {markersOffscreen} trade di luar 500 candle terakhir — tidak tampil di chart.
              </p>
            )}
            <p className="pt-1 text-3xs text-muted-foreground">Ini trade hasil backtest, bukan posisi live.</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
