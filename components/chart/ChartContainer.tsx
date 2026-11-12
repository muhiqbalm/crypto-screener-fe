'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TrendingUp, TrendingDown, RefreshCw, WifiOff, X, FlaskConical } from 'lucide-react'
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
import { formatPct, formatPrice } from '@/lib/utils/format'
import { CoinAvatar } from '@/components/bot/kit/CoinAvatar'
import { cn } from '@/lib/utils/cn'
import { api } from '@/lib/api/client'
import { sameId } from '@/lib/api/types/lab'
import { useLabMe, useLabRun, useLabRunTrades } from '@/lib/queries/lab'
import { useLabWatches, useLabWatchState } from '@/lib/queries/lab-live'
import { OVERLAY_COLORS, positionLines, tradesToMarkers, type OverlayPriceLine } from '@/lib/lab/overlay'
import { openPaperPositions } from '@/lib/lab/paper'
import { useJournal, usePaperAccounts } from '@/lib/queries/paper'
import { useSession } from '@/lib/utils/use-session'
import { change24h, pctChange, previousClose } from '@/lib/chart/candles'
import {
  CHART_TFS,
  DEFAULT_SYMBOL,
  DEFAULT_TF,
  TF_LABEL,
  TF_SECONDS,
  chartSearch,
  parseSymbol,
  parseTf,
  tfLong,
} from '@/lib/chart/params'

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

const INTERVALS: { value: string; label: string; long: string }[] = CHART_TFS.map((tf) => ({
  value: tf,
  label: TF_LABEL[tf].short,
  long: TF_LABEL[tf].long,
}))

// ---------------------------------------------------------------------------
// Segment button
// ---------------------------------------------------------------------------

function SegBtn({
  active,
  onClick,
  disabled,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  /** Full name for screen readers, e.g. "4 jam". */
  label?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'h-10 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-info text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Price ticker strip
// ---------------------------------------------------------------------------

function ChangeChip({ value, label, title }: { value: number | null; label: string; title: string }) {
  if (value === null) return null
  const up = value > 0
  const down = value < 0
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap" title={title}>
      <span
        className={cn(
          'inline-flex items-center gap-1 num text-[17px] font-semibold',
          up ? 'text-bullish' : down ? 'text-bearish' : 'text-muted-foreground',
        )}
      >
        {up ? <TrendingUp className="h-4 w-4" aria-hidden="true" /> : down ? <TrendingDown className="h-4 w-4" aria-hidden="true" /> : null}
        {formatPct(value, { digits: 2, signed: true })}
      </span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </span>
  )
}

function PriceTicker({
  lastCandle,
  vsPrev,
  vs24h,
  tfText,
}: {
  lastCandle: Kline | null
  vsPrev: number | null
  vs24h: number | null
  tfText: string
}) {
  if (!lastCandle) return <Skeleton className="h-8 w-48" />

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="num text-[34px] font-bold leading-none tracking-tight">
        {formatPrice(lastCandle.close)}
      </span>
      <ChangeChip
        value={vsPrev}
        label={`vs candle ${tfText} sebelumnya`}
        title="Harga sekarang dibanding harga tutup candle sebelumnya"
      />
      <ChangeChip value={vs24h} label="24 jam" title="Harga sekarang dibanding harga tutup candle sekitar 24 jam lalu" />
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
  const runData = runQ.data
  const overlay = useMemo(
    () =>
      watch
        ? { kind: 'watch' as const, symbol: watch.symbol, timeframe: watch.timeframe }
        : runData
          ? { kind: 'run' as const, symbol: runData.symbol, timeframe: runData.timeframe }
          : null,
    [watch, runData],
  )

  // The URL is the state: ?symbol=SOLUSDT (or SOL) and ?tf=4h, both validated. Default BTC 4h,
  // the timeframe the team's strategies run on. A strategy overlay (?watch / ?run) wins.
  const symbolParam = search.get('symbol')
  const tfParam = search.get('tf')
  const pickedSymbol = useMemo(() => parseSymbol(symbolParam) ?? DEFAULT_SYMBOL, [symbolParam])
  const pickedInterval = useMemo<string>(() => parseTf(tfParam) ?? DEFAULT_TF, [tfParam])
  const symbol = overlay?.symbol ?? pickedSymbol
  const interval = overlay?.timeframe ?? pickedInterval

  // Native history updates keep useSearchParams in sync without a navigation (Next.js docs:
  // "Native History API"), so the chart does not remount when you switch coin or timeframe.
  const query = search.toString()
  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      window.history.replaceState(null, '', `${window.location.pathname}${chartSearch(query, patch)}`)
    },
    [query],
  )
  const pickSymbol = (v: string) => setParam({ symbol: v })
  const pickInterval = (v: string) => setParam({ tf: v })

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
  const tfStep = TF_SECONDS[parseTf(interval) ?? DEFAULT_TF]
  const vsPrev = lastCandle ? pctChange(previousClose(klines, lastCandle.time), lastCandle.close) : null
  const vs24h = interval === '1d' ? null : change24h(klines, lastCandle, tfStep)

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
    const lines: OverlayPriceLine[] = watchId ? positionLines('watch', watchStateQ.data?.position, 'Simulasi ') : []
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
    : [...INTERVALS, { value: interval, label: interval, long: tfLong(interval) }]
  const symbolMeta = symbolOptions.find(s => s.value === symbol)
  const overlayLocked = Boolean(overlay)
  const showSidePanel = isAdmin

  return (
    <div className="flex flex-col gap-4">
      {overlay && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-lab/30 bg-lab/10 px-4 py-2 text-[14px] text-lab">
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <Badge variant="lab" size="xs" className="gap-1">
              <FlaskConical aria-hidden="true" /> PAPER
            </Badge>
            <span>
              Simulasi strategi di chart:{' '}
              <span className="font-mono font-bold">
                {overlay.kind === 'watch' ? `pantauan ${watchId}` : `uji ${runId}`} · {overlay.symbol} {tfLong(overlay.timeframe)}
              </span>
              . Koin dan timeframe mengikuti strategi ini. Bukan posisi bot live.
            </span>
          </span>
          <Link href="/chart" className="inline-flex items-center gap-1 font-semibold hover:underline">
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Tutup simulasi
          </Link>
        </div>
      )}
      {(watchId || runId) && !overlay && isAdmin && (watchesQ.isError || runQ.isError || (watchId && watchesQ.isSuccess)) && (
        <div role="alert" className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-2 text-[14px] text-warn">
          {watchId ? `Pantauan ${watchId} tidak ditemukan.` : `Uji ${runId} tidak bisa dimuat.`}{' '}
          <Link href="/chart" className="underline">Kembali ke chart biasa</Link>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Symbol selector */}
        <div role="group" aria-label="Pilih koin" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-muted/40 p-1">
          {symbolOptions.map(s => (
            <SegBtn
              key={s.value}
              active={symbol === s.value}
              disabled={overlayLocked}
              onClick={() => pickSymbol(s.value)}
            >
              {s.label}
            </SegBtn>
          ))}
        </div>

        {/* Interval selector */}
        <div role="group" aria-label="Pilih timeframe" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-muted/40 p-1">
          {intervalOptions.map(i => (
            <SegBtn
              key={i.value}
              active={interval === i.value}
              disabled={overlayLocked}
              label={i.long}
              onClick={() => pickInterval(i.value)}
            >
              {i.label}
            </SegBtn>
          ))}
        </div>
      </div>

      <div className={cn('grid items-start gap-4', showSidePanel && 'lg:grid-cols-[minmax(0,1fr)_340px]')}>
        {/* Chart card */}
        <Card className="overflow-hidden rounded-3xl">
          {/* Card header — price + status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              <div>
                <p className="flex items-center gap-2 text-[17px] font-bold">
                  <CoinAvatar symbol={symbol} size={28} />
                  {symbolMeta?.label ?? symbol}
                  {source && (
                    <span
                      className={cn(
                        'ml-2 rounded px-1.5 py-0.5 font-mono text-[13px]',
                        source === 'spot' ? 'bg-warn/15 text-warn' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {KLINE_SOURCE_LABEL[source]}
                    </span>
                  )}
                </p>
                <PriceTicker
                  lastCandle={lastCandle}
                  vsPrev={vsPrev}
                  vs24h={vs24h}
                  tfText={tfLong(interval)}
                />
              </div>
              {lastCandle && (
                <div className="hidden sm:flex items-center gap-5 text-[15px] text-muted-foreground num">
                  <span>O <span className="text-foreground">{formatPrice(lastCandle.open)}</span></span>
                  <span>H <span className="text-bullish">{formatPrice(lastCandle.high)}</span></span>
                  <span>L <span className="text-bearish">{formatPrice(lastCandle.low)}</span></span>
                  <span>C <span className="text-foreground">{formatPrice(lastCandle.close)}</span></span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Feed state: "Tersambung" only once a websocket tick has actually arrived.
                  Not called "Live": LIVE in this app means real money. */}
              <Badge
                variant="outline"
                className={cn(
                  'gap-1.5 text-[13px] px-2 py-0.5',
                  wsLive
                    ? 'border-info/30 bg-info/10 text-info'
                    : 'text-muted-foreground',
                )}
              >
                {wsLive
                  ? <><span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" aria-hidden="true" />Tersambung</>
                  : <><WifiOff className="h-3 w-3" aria-hidden="true" />{isLoading ? 'Memuat' : 'Menunggu data'}</>
                }
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReload}
                disabled={isLoading}
                className="h-7 gap-1.5 text-[14px] text-muted-foreground hover:text-foreground"
                aria-label="Muat ulang data chart"
              >
                <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Chart area */}
          <CardContent className="p-0">
            <div className="relative h-[400px] w-full sm:h-[560px]">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Memuat chart…</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
                  <div className="flex flex-col items-center gap-3 text-center px-6">
                    <WifiOff className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleReload}>
                      Coba lagi
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
            <p className="border-t border-border px-4 py-1.5 text-[13px] text-muted-foreground">
              Waktu di chart: WIB (UTC+7). Persen dibanding harga tutup candle sebelumnya; &quot;24 jam&quot; dibanding sekitar 24 jam lalu.
            </p>
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
