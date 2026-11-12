'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UseQueryResult } from '@tanstack/react-query'
import { Activity, Eye, FlaskConical, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusBadge, VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { formatPercent, formatPrice } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { isLong, unrealisedPct } from '@/lib/lab/overlay'
import { chartTimeLabel, toChartTime } from '@/lib/chart/candles'
import { tfLong } from '@/lib/chart/params'
import { useDeleteLabWatch, WATCH_STATE_POLL_MS } from '@/lib/queries/lab-live'
import type { LabRunDetail, LabTrade, LabWatch, LabWatchState } from '@/lib/api/types/lab'
import type { KlineSource } from './TradingChart'

/** "12 Nov 08:00 WIB" for strategy times (ISO, UTC). */
function wib(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isFinite(t) ? `${chartTimeLabel(toChartTime(t / 1000))} WIB` : '—'
}

/** "Buka LONG" / "Tutup SHORT" / "NETRAL". */
function signalText(action: string | null | undefined, side: string | null | undefined): string {
  const a = (action ?? '').toLowerCase()
  const verb = a === 'open' || a === 'entry' ? 'Buka' : a === 'close' || a === 'exit' ? 'Tutup' : a || '—'
  return side ? `${verb} ${side.toUpperCase()}` : verb
}

export function SimBadge() {
  return (
    <Badge variant="lab" size="xs" className="gap-1" title="Simulasi Lab, bukan bot live dan bukan uang asli">
      <FlaskConical aria-hidden="true" /> PAPER
    </Badge>
  )
}

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const list = watches.data ?? []
  const current = watchId ? list.find((w) => String(w.id) === String(watchId)) ?? null : null

  const remove = () => {
    if (!watchId) return
    del.mutate(watchId, {
      onSuccess: () => {
        notify.info('Pantauan dihapus')
        setConfirmOpen(false)
        router.push('/chart')
      },
      onError: () => notify.error('Gagal menghapus pantauan'),
    })
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight">
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-lab" aria-hidden="true" />
            Pantau sinyal (simulasi)
          </span>
          <SimBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {watches.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : watches.isError ? (
          <p className="text-xs text-bearish">
            Gagal memuat daftar pantauan.{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => watches.refetch()}>
              Coba lagi
            </button>
          </p>
        ) : list.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Belum ada strategi yang dipantau. Buka hasil uji yang sudah selesai di Lab, lalu pilih &quot;Tampilkan di Chart&quot;.
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/lab">Buka Lab</Link>
            </Button>
          </div>
        ) : (
          <>
            <label htmlFor="watch-select" className="sr-only">Pilih pantauan</label>
            <select
              id="watch-select"
              value={watchId ?? ''}
              onChange={(e) => router.push(e.target.value ? `/chart?watch=${encodeURIComponent(e.target.value)}` : '/chart')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-xs shadow-sm"
            >
              <option value="" className="bg-popover">— tanpa simulasi —</option>
              {list.map((w) => (
                <option key={w.id} value={w.id} className="bg-popover">
                  {w.symbol} {tfLong(w.timeframe)} · {w.template_id}
                </option>
              ))}
            </select>
            {watchId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-bearish"
                disabled={del.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Hapus pantauan ini
              </Button>
            )}
            <AlertDialog open={confirmOpen} onOpenChange={(o) => !del.isPending && setConfirmOpen(o)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus pantauan ini?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        Lab berhenti menghitung sinyal
                        {current ? ` ${current.symbol} ${tfLong(current.timeframe)} (${current.template_id})` : ''} dan paper
                        otomatis yang terhubung ikut berhenti. Pantauan yang dihapus tidak bisa dikembalikan; buat lagi dari
                        Preset atau hasil uji kalau perlu.
                      </p>
                      <p>Riwayat di Jurnal tetap ada. Ini simulasi (PAPER): tidak ada order sungguhan yang dibatalkan.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={del.isPending}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={del.isPending}
                    onClick={(e) => {
                      e.preventDefault()
                      remove()
                    }}
                  >
                    {del.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Ya, hapus pantauan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
          <Activity className="h-4 w-4 text-lab" aria-hidden="true" />
          Sinyal strategi (simulasi)
        </CardTitle>
        <span className="flex items-center gap-2">
          {state.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="memuat" />}
          <SimBadge />
        </span>
      </CardHeader>
      <CardContent>
        {state.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : state.isError || !s ? (
          <p className="text-xs text-bearish">
            Gagal memuat status pantauan.{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => state.refetch()}>
              Coba lagi
            </button>
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            <div className="pb-2">
              {pos ? (
                <Row label="Posisi simulasi" className={cn('font-bold uppercase', isLong(pos.side) ? 'text-bullish' : 'text-bearish')}>
                  {isLong(pos.side) ? 'LONG' : 'SHORT'}
                </Row>
              ) : (
                <Row label="Posisi simulasi">NETRAL (tidak ada posisi)</Row>
              )}
              {pos && (
                <>
                  <Row label="Entry">{formatPrice(pos.entry_price)}</Row>
                  <Row label="Waktu entry">{wib(pos.entry_time)}</Row>
                  <Row label="Batal jika (SL)">{formatPrice(pos.sl)}</Row>
                  <Row label="Target (TP)">{formatPrice(pos.tp)}</Row>
                  <Row label="Untung/rugi berjalan (tanpa leverage)" className={signClass(upnl)}>{formatPercent(upnl)}</Row>
                  {priceSource === 'spot' && (
                    <p className="pt-1 text-3xs text-warn">Untung/rugi berjalan dihitung dari harga spot (data perpetual tidak tersedia).</p>
                  )}
                </>
              )}
            </div>
            <div className="py-2">
              <Row label="Sinyal terakhir">
                {s.last_signal ? signalText(s.last_signal.action, s.last_signal.side) : '—'}
              </Row>
              {s.last_signal && (
                <>
                  <Row label="Harga sinyal">{formatPrice(s.last_signal.price)}</Row>
                  <Row label="Waktu sinyal">{wib(s.last_signal.time)}</Row>
                </>
              )}
            </div>
            <div className="pt-2">
              <Row label="Candle terakhir">{wib(s.last_bar)}</Row>
              <Row label="Dihitung">{wib(s.computed_at)}</Row>
              <p className="pt-1 text-3xs text-muted-foreground">
                Diperbarui tiap {WATCH_STATE_POLL_MS / 1000} detik. Sinyal dihitung saat candle tutup. Ini simulasi Lab, bukan bot live.
                {markersOffscreen > 0 && ` ${markersOffscreen} penanda di luar rentang candle yang dimuat.`}
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
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight">
          Hasil uji di chart (simulasi)
          <SimBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {run.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : run.isError || !r ? (
          <p className="text-xs text-bearish">Hasil uji tidak bisa dimuat.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 pb-1">
              <StatusBadge status={r.status} />
              <VerdictBadge verdict={r.verdict} />
            </div>
            <Row label="Uji">
              <Link href={`/lab/runs/${encodeURIComponent(r.id)}`} className="text-info hover:underline">{r.id}</Link>
            </Row>
            <Row label="Transaksi hasil uji">
              {r.status !== 'done' ? 'uji belum selesai' : trades.isPending ? '…' : trades.isError ? 'gagal dimuat' : (trades.data?.length ?? 0)}
            </Row>
            <Row label="Penanda di chart">{markerCount}</Row>
            {markersOffscreen > 0 && (
              <p className="text-3xs text-muted-foreground">
                {markersOffscreen} transaksi di luar 500 candle terakhir, jadi tidak tampil di chart.
              </p>
            )}
            <p className="pt-1 text-3xs text-muted-foreground">Ini transaksi hasil uji historis (simulasi), bukan posisi bot live.</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
