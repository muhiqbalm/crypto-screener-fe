'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, TrendingDown, RefreshCw, WifiOff, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TradingChart,
  fetchChartKlines,
  KLINE_SOURCE_LABEL,
  type Kline,
  type KlineSource,
} from './TradingChart'
import { StrategyOverlayPanel } from './StrategyOverlayPanel'
import { PaperTradePanel, EMPTY_DRAFT, type PaperDraft } from './PaperTradePanel'
import { formatPrice } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { api } from '@/lib/api/client'
import { sameId } from '@/lib/api/types/lab'
import { useLabMe, useLabRun, useLabRunTrades } from '@/lib/queries/lab'
import { useLabWatches, useLabWatchState } from '@/lib/queries/lab-live'
import { OVERLAY_COLORS, positionLines, tradesToMarkers, type OverlayPriceLine } from '@/lib/lab/overlay'
import { openPaperPositions } from '@/lib/lab/paper'
import { useJournal, usePaperAccounts } from '@/lib/queries/paper'
import { useSession } from '@/lib/utils/use-session'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SYMBOLS = [
  { value: 'BTCUSDT',  label: 'BTC' },
  { value: 'ETHUSDT',  label: 'ETH' },
  { value: 'SOLUSDT',  label: 'SOL' },
  { value: 'ZECUSDT',  label: 'ZEC' },
  { value: 'LINKUSDT', label: 'LINK' },
  { value: 'AAVEUSDT', label: 'AAVE' },
  { value: 'AVAXUSDT', label: 'AVAX' },
  { value: 'DOGEUSDT', label: 'DOGE' },
  { value: 'HYPEUSDT', label: 'HYPE' },
]

const INTERVALS = [
  { value: '1m',  label: '1m' },
  { value: '5m',  label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h',  label: '1h' },
  { value: '4h',  label: '4h' },
  { value: '1d',  label: '1D' },
]

// ---------------------------------------------------------------------------
// Segment button
// ---------------------------------------------------------------------------

function SegBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Price ticker strip
// ---------------------------------------------------------------------------

function PriceTicker({
  lastCandle,
  prevClose,
}: {
  lastCandle: Kline | null
  prevClose: number | null
}) {
  if (!lastCandle) return <Skeleton className="h-8 w-48" />

  const change = prevClose ? lastCandle.close - prevClose : 0
  const changePct = prevClose ? (change / prevClose) * 100 : 0
  const isUp = change >= 0

  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-xl font-bold tabular-nums">
        {formatPrice(lastCandle.close)}
      </span>
      <span
        className={cn(
          'flex items-center gap-0.5 font-mono text-sm tabular-nums',
          isUp ? 'text-bullish' : 'text-bearish',
        )}
      >
        {isUp
          ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
        }
        {isUp ? '+' : ''}{changePct.toFixed(2)}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LoadResult {
  key: string
  klines: Kline[]
  source: KlineSource | null
  error: string | null
}

export function ChartContainer() {
  const search = useSearchParams()
  const watchId = search.get('watch')
  const runId = watchId ? null : search.get('run')

  const session = useSession()
  const { data: labMe } = useLabMe(Boolean(session?.accessToken))
  const isAdmin = labMe?.is_admin === true

  // Strategy overlay sources (admin only; backend enforces it too)
  const watchesQ = useLabWatches(isAdmin)
  const watchStateQ = useLabWatchState(isAdmin ? watchId : null)
  const runQ = useLabRun(isAdmin ? runId : null)
  const runTradesQ = useLabRunTrades(runId ?? '', isAdmin && Boolean(runId) && runQ.data?.status === 'done')

  const watch = watchId ? watchesQ.data?.find((w) => sameId(w.id, watchId)) ?? null : null
  const overlay = watch
    ? { kind: 'watch' as const, symbol: watch.symbol, timeframe: watch.timeframe }
    : runQ.data
      ? { kind: 'run' as const, symbol: runQ.data.symbol, timeframe: runQ.data.timeframe }
      : null

  const [pickedSymbol,   setSymbol]    = useState('BTCUSDT')
  const [pickedInterval, setInterval]  = useState('1m')
  const symbol = overlay?.symbol ?? pickedSymbol
  const interval = overlay?.timeframe ?? pickedInterval

  const [reloadKey, setReloadKey] = useState(0)
  const loadKey = `${symbol}|${interval}|${reloadKey}`
  const [result, setResult] = useState<LoadResult | null>(null)
  const [tick, setTick] = useState<{ key: string; candle: Kline } | null>(null)

  // Lab proxy fallback is only attempted for admins; read through a ref so a
  // late admin check does not trigger a reload.
  const adminRef = useRef(isAdmin)
  useEffect(() => {
    adminRef.current = isAdmin
  }, [isAdmin])

  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  // Load historical klines (perp first, labelled fallbacks)
  useEffect(() => {
    let cancelled = false
    const [sym, tf] = loadKey.split('|')
    const labFallback = adminRef.current
      ? () =>
          api.getLabKlines(sym, tf, 500).then((rows) =>
            rows.map((r) => ({ time: Math.floor(Date.parse(r.t) / 1000), open: r.o, high: r.h, low: r.l, close: r.c })),
          )
      : undefined

    fetchChartKlines(sym, tf, 500, labFallback)
      .then(({ klines, source }) => {
        if (!cancelled) setResult({ key: loadKey, klines, source, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setResult({ key: loadKey, klines: [], source: null, error: err instanceof Error ? err.message : 'Gagal memuat data chart' })
      })

    return () => {
      cancelled = true
    }
  }, [loadKey])

  const isLoading = result?.key !== loadKey
  const klines = useMemo(() => (!isLoading && result ? result.klines : []), [isLoading, result])
  const error = !isLoading ? (result?.error ?? null) : null
  const source = !isLoading ? (result?.source ?? null) : null

  const handleTick = useCallback(
    (candle: Kline) => setTick({ key: loadKey, candle }),
    [loadKey],
  )

  const wsLive = tick?.key === loadKey
  const lastCandle = wsLive ? tick.candle : (klines[klines.length - 1] ?? null)
  const prevClose = klines.length >= 2 ? klines[klines.length - 2].close : null

  // ── Overlay data ─────────────────────────────────────────────────────────
  const barTimes = useMemo(() => klines.map((k) => k.time), [klines])
  const overlayTrades = useMemo(
    () => (watchId ? (watchStateQ.data?.recent_trades ?? []) : runId ? (runTradesQ.data ?? []) : []),
    [watchId, runId, watchStateQ.data, runTradesQ.data],
  )
  const { markers, dropped } = useMemo(() => {
    const base = tradesToMarkers(overlayTrades, barTimes)
    // Open strategy position: add its entry marker too.
    const pos = watchId ? watchStateQ.data?.position : null
    if (pos) {
      const extra = tradesToMarkers([{ ...pos, exit_time: null, exit_price: null, exit_reason: null }], barTimes)
      return { markers: [...base.markers, ...extra.markers].sort((a, b) => a.time - b.time), dropped: base.dropped + extra.dropped }
    }
    return base
  }, [overlayTrades, barTimes, watchId, watchStateQ.data?.position])

  // ── Paper trading (PAPER ONLY) ───────────────────────────────────────────
  const paperAccountsQ = usePaperAccounts(isAdmin)
  const [pickedAccountId, setAccountId] = useState<string | null>(null)
  const paperAccounts = paperAccountsQ.data ?? []
  const paperAccount = paperAccounts.find((a) => sameId(a.id, pickedAccountId)) ?? paperAccounts[0] ?? null
  const needJournal = Boolean(paperAccount) && !Array.isArray(paperAccount?.open_positions)
  const openJournalQ = useJournal(
    { account_id: paperAccount?.id, symbol },
    { enabled: isAdmin && needJournal, poll: 15_000 },
  )
  const paperPositions = useMemo(
    () => openPaperPositions(paperAccount, openJournalQ.data, symbol),
    [paperAccount, openJournalQ.data, symbol],
  )
  // Draft is tied to a symbol so an SL typed for BTC never carries over to ETH.
  const [draftState, setDraftState] = useState<{ symbol: string; draft: PaperDraft }>({ symbol, draft: EMPTY_DRAFT })
  const draft = draftState.symbol === symbol ? draftState.draft : EMPTY_DRAFT

  const priceLines: OverlayPriceLine[] = useMemo(() => {
    const lines: OverlayPriceLine[] = watchId ? positionLines('watch', watchStateQ.data?.position, 'Strategi ') : []
    for (const pos of paperPositions) lines.push(...positionLines(`paper-${pos.id}`, pos, 'PAPER '))
    const sl = Number(draft.sl)
    const tp = Number(draft.tp)
    if (draft.sl.trim() && Number.isFinite(sl) && sl > 0)
      lines.push({ id: 'draft-sl', price: sl, color: OVERLAY_COLORS.paper, title: 'Draft SL', dashed: true })
    if (draft.tp.trim() && Number.isFinite(tp) && tp > 0)
      lines.push({ id: 'draft-tp', price: tp, color: OVERLAY_COLORS.paper, title: 'Draft TP', dashed: true })
    return lines
  }, [watchId, watchStateQ.data?.position, paperPositions, draft.sl, draft.tp])

  const symbolOptions = SYMBOLS.some((s) => s.value === symbol)
    ? SYMBOLS
    : [...SYMBOLS, { value: symbol, label: symbol.replace(/USDT$/, '') }]
  const intervalOptions = INTERVALS.some((i) => i.value === interval)
    ? INTERVALS
    : [...INTERVALS, { value: interval, label: interval }]
  const symbolMeta = symbolOptions.find(s => s.value === symbol)
  const overlayLocked = Boolean(overlay)
  const showSidePanel = isAdmin

  return (
    <div className="flex flex-col gap-4">
      {overlay && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs text-violet-200">
          <span>
            Mode overlay strategi:{' '}
            <span className="font-mono font-bold">
              {overlay.kind === 'watch' ? `watch ${watchId}` : `run ${runId}`} · {overlay.symbol} {overlay.timeframe}
            </span>
            . Symbol &amp; timeframe dikunci ke strategi.
          </span>
          <Link href="/chart" className="inline-flex items-center gap-1 font-semibold hover:underline">
            <X className="h-3.5 w-3.5" /> Tutup overlay
          </Link>
        </div>
      )}
      {(watchId || runId) && !overlay && isAdmin && (watchesQ.isError || runQ.isError || (watchId && watchesQ.isSuccess)) && (
        <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          {watchId ? `Watch ${watchId} tidak ditemukan.` : `Run ${runId} tidak bisa dimuat.`}{' '}
          <Link href="/chart" className="underline">Kembali ke chart biasa</Link>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Symbol selector */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {symbolOptions.map(s => (
            <SegBtn
              key={s.value}
              active={symbol === s.value}
              disabled={overlayLocked}
              onClick={() => setSymbol(s.value)}
            >
              {s.label}
            </SegBtn>
          ))}
        </div>

        {/* Interval selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {intervalOptions.map(i => (
            <SegBtn
              key={i.value}
              active={interval === i.value}
              disabled={overlayLocked}
              onClick={() => setInterval(i.value)}
            >
              {i.label}
            </SegBtn>
          ))}
        </div>
      </div>

      <div className={cn('grid items-start gap-4', showSidePanel && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
        {/* Chart card */}
        <Card className="overflow-hidden">
          {/* Card header — price + status */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {symbolMeta?.label ?? symbol}
                  {source && (
                    <span
                      className={cn(
                        'ml-2 rounded px-1.5 py-0.5 font-mono text-[10px]',
                        source === 'spot' ? 'bg-amber-500/15 text-amber-400' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {KLINE_SOURCE_LABEL[source]}
                    </span>
                  )}
                </p>
                <PriceTicker
                  lastCandle={lastCandle}
                  prevClose={prevClose}
                />
              </div>
              {lastCandle && (
                <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span>O <span className="text-foreground">{formatPrice(lastCandle.open)}</span></span>
                  <span>H <span className="text-bullish">{formatPrice(lastCandle.high)}</span></span>
                  <span>L <span className="text-bearish">{formatPrice(lastCandle.low)}</span></span>
                  <span>C <span className="text-foreground">{formatPrice(lastCandle.close)}</span></span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Live indicator: only "Live" once a websocket tick has actually arrived */}
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 text-[10px] px-2 py-0.5',
                  wsLive
                    ? 'border-bullish/30 bg-bullish/10 text-bullish'
                    : 'text-muted-foreground',
                )}
              >
                {wsLive
                  ? <><span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse" aria-hidden="true" />Live</>
                  : <><WifiOff className="h-3 w-3" aria-hidden="true" />{isLoading ? 'Memuat' : 'Menunggu tick'}</>
                }
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReload}
                disabled={isLoading}
                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Reload chart data"
              >
                <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Chart area */}
          <CardContent className="p-0">
            <div className="relative h-[360px] w-full sm:h-[480px]">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Loading chart…</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <WifiOff className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleReload}>
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {!isLoading && !error && klines.length > 0 && source && (
                <TradingChart
                  symbol={symbol}
                  interval={interval}
                  klines={klines}
                  onTick={handleTick}
                  source={source}
                  markers={markers}
                  priceLines={priceLines}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {showSidePanel && (
          <StrategyOverlayPanel
            watchId={watchId}
            runId={runId}
            watches={watchesQ}
            watchState={watchStateQ}
            run={runQ}
            runTrades={runTradesQ}
            lastPrice={lastCandle?.close ?? null}
            priceSource={source}
            markersOffscreen={dropped}
            markerCount={markers.length}
          >
            <PaperTradePanel
              symbol={symbol}
              lastPrice={lastCandle?.close ?? null}
              accounts={paperAccountsQ}
              account={paperAccount}
              onAccountChange={setAccountId}
              positions={paperPositions}
              positionsLoading={needJournal && openJournalQ.isPending}
              draft={draft}
              onDraftChange={(d) => setDraftState({ symbol, draft: d })}
              watchId={watchId}
              watch={watch}
              strategyPosition={watchId ? (watchStateQ.data?.position ?? null) : null}
            />
          </StrategyOverlayPanel>
        )}
      </div>
    </div>
  )
}
