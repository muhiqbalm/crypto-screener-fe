'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type CandlestickData,
  type SeriesMarker,
  type Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts'
import type { OverlayMarker, OverlayPriceLine } from '@/lib/lab/overlay'
import { useTheme } from 'next-themes'
import { getChartTheme } from '@/lib/chart-theme'
import { axisPrice, chartTickLabel, chartTimeLabel, toChartTime } from '@/lib/chart/candles'

// ---------------------------------------------------------------------------
// REST: fetch historical klines from Binance
// ---------------------------------------------------------------------------

export interface Kline {
  time: number   // unix seconds
  open: number
  high: number
  low: number
  close: number
}

export type KlineSource = 'perp' | 'lab' | 'spot'

export const KLINE_SOURCE_LABEL: Record<KlineSource, string> = {
  perp: 'Binance Perp (USDⓈ-M)',
  lab: 'Binance Perp via server Lab',
  spot: 'Binance Spot (fallback)',
}

function parseBinanceKlines(raw: unknown[][]): Kline[] {
  return raw.map((k) => ({
    time:  Math.floor(Number(k[0]) / 1000),
    open:  parseFloat(k[1] as string),
    high:  parseFloat(k[2] as string),
    low:   parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
  }))
}

/**
 * Loads historical candles, preferring USD-M perpetual data (what the
 * strategies actually trade):
 *   1. fapi.binance.com (perp, direct)
 *   2. optional `labFallback` — perp klines proxied by the Lab backend
 *      (useful where fapi is blocked; admin only)
 *   3. spot (data-api.binance.vision, then api.binance.com) — labelled as
 *      fallback so the user knows the prices are NOT perp prices.
 */
export async function fetchChartKlines(
  symbol: string,
  interval: string,
  limit = 500,
  labFallback?: () => Promise<Kline[]>,
): Promise<{ klines: Kline[]; source: KlineSource }> {
  const sym = symbol.toUpperCase()
  try {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}&interval=${interval}&limit=${limit}`)
    if (res.ok) {
      const klines = parseBinanceKlines((await res.json()) as unknown[][])
      if (klines.length > 0) return { klines, source: 'perp' }
    }
  } catch {
    // fall through
  }

  if (labFallback) {
    try {
      const klines = await labFallback()
      if (klines.length > 0) return { klines, source: 'lab' }
    } catch {
      // fall through
    }
  }

  const spotEndpoints = [
    `https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
  ]
  let lastError: Error | null = null
  for (const url of spotEndpoints) {
    try {
      const res = await fetch(url)
      if (res.ok) return { klines: parseBinanceKlines((await res.json()) as unknown[][]), source: 'spot' }
    } catch (err) {
      lastError = err as Error
    }
  }

  throw lastError ?? new Error('Gagal mengambil data candle dari Binance (perp maupun spot)')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TradingChartProps {
  symbol: string      // e.g. "BTCUSDT"
  interval: string    // e.g. "4h"
  klines: Kline[]
  /** Called when a new live tick arrives so the parent can update state */
  onTick?: (candle: Kline) => void
  /** Which feed the klines came from; picks the matching websocket. */
  source?: KlineSource
  /** Strategy overlay: entry/exit markers (times snapped to bar opens). */
  markers?: OverlayMarker[]
  /** Strategy overlay: horizontal lines (entry / SL / TP). */
  priceLines?: OverlayPriceLine[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Candles are stored in real UTC seconds. The chart library prints whatever it is given as
 * UTC, so every time handed to it (history, websocket updates, markers) is shifted to WIB
 * with toChartTime(); the axis and crosshair then read as WIB wall-clock time.
 */
export function TradingChart({
  symbol,
  interval,
  klines,
  onTick,
  source = 'spot',
  markers,
  priceLines,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const wsRef        = useRef<WebSocket | null>(null)
  const connectWsRef = useRef<() => void>(() => {})
  const priceLineRefs = useRef<IPriceLine[]>([])
  // Read by the crosshair formatter (daily candles show the date only).
  const dailyRef = useRef(interval === '1d')
  useEffect(() => {
    dailyRef.current = interval === '1d'
  }, [interval])

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  // ── Create / destroy chart ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const colors = getChartTheme(isDark)

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
        fontSize: colors.fontSize,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.labelBg },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.labelBg },
      },
      rightPriceScale: {
        borderColor: colors.border,
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time, tickMarkType: number) => chartTickLabel(Number(time), tickMarkType),
      },
      localization: {
        timeFormatter: (time: Time) => `${chartTimeLabel(Number(time), dailyRef.current)} WIB`,
        // Exchange style on the price axis too: 67,420.50 / 2.3457 / 0.00001234.
        priceFormatter: axisPrice,
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addCandlestickSeries({
      upColor:          colors.up,
      downColor:        colors.down,
      borderUpColor:    colors.up,
      borderDownColor:  colors.down,
      wickUpColor:      colors.up,
      wickDownColor:    colors.down,
    })

    chartRef.current  = chart
    seriesRef.current = series

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      priceLineRefs.current = []
    }
  }, [isDark])   // recreate chart when theme changes

  // ── Load historical data ──
  // (isDark in deps: the chart is recreated on theme change, so data and
  // overlays must be re-applied to the new series; effects run in order.)────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || klines.length === 0) return
    const data: CandlestickData<Time>[] = klines.map((k) => ({
      time:  toChartTime(k.time) as Time,
      open:  k.open,
      high:  k.high,
      low:   k.low,
      close: k.close,
    }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [klines, isDark])

  // ── Strategy overlay: markers ─────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const m: SeriesMarker<Time>[] = (markers ?? []).map((x) => ({
      time: toChartTime(x.time) as Time,
      position: x.position,
      color: x.color,
      shape: x.shape,
      text: x.text,
    }))
    series.setMarkers(m)
  }, [markers, klines, isDark])

  // ── Strategy overlay: price lines ─────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    for (const l of priceLineRefs.current) series.removePriceLine(l)
    priceLineRefs.current = (priceLines ?? [])
      .filter((l) => Number.isFinite(l.price))
      .map((l) =>
        series.createPriceLine({
          price: l.price,
          color: l.color,
          lineWidth: 1,
          lineStyle: l.dashed ? LineStyle.Dashed : LineStyle.Solid,
          axisLabelVisible: true,
          title: l.title,
        }),
      )
  }, [priceLines, isDark])

  // ── WebSocket live feed ───────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const stream = `${symbol.toLowerCase()}@kline_${interval}`
    // Perp candles (direct or via Lab) stream from USD-M futures; spot
    // fallback uses Binance Vision, which works where stream.binance.com is blocked.
    const url =
      source === 'spot'
        ? `wss://data-stream.binance.vision/ws/${stream}`
        : `wss://fstream.binance.com/ws/${stream}`
    const ws = new WebSocket(url)

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          k: {
            t: number; o: string; h: string; l: string; c: string; x: boolean
          }
        }
        const k = msg.k
        const candle: Kline = {
          time:  Math.floor(k.t / 1000),
          open:  parseFloat(k.o),
          high:  parseFloat(k.h),
          low:   parseFloat(k.l),
          close: parseFloat(k.c),
        }
        seriesRef.current?.update({
          time:  toChartTime(candle.time) as Time,
          open:  candle.open,
          high:  candle.high,
          low:   candle.low,
          close: candle.close,
        })
        onTick?.(candle)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onerror = () => ws.close()
    ws.onclose = () => {
      // Auto-reconnect after 3 s if component is still mounted
      setTimeout(() => {
        if (wsRef.current === ws) connectWsRef.current()
      }, 3000)
    }

    wsRef.current = ws
  }, [symbol, interval, onTick, source])

  useEffect(() => {
    connectWsRef.current = connectWs
  }, [connectWs])

  useEffect(() => {
    connectWs()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connectWs])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      aria-label={`${symbol} ${interval} candlestick chart`}
      role="img"
    />
  )
}
