'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import { useTheme } from 'next-themes'

// ---------------------------------------------------------------------------
// Theme-aware chart colors
// ---------------------------------------------------------------------------

function getChartColors(isDark: boolean) {
  return {
    background:       isDark ? '#1a1a1a' : '#ffffff',
    text:             isDark ? '#b3b3b3' : '#555555',
    grid:             isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    border:           isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    crosshair:        isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.3)',
    upColor:          '#22c55e',   // green-500 — consistent across modes
    downColor:        '#ef4444',   // red-500
    wickUpColor:      '#22c55e',
    wickDownColor:    '#ef4444',
  }
}

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

export async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  limit = 500,
): Promise<Kline[]> {
  const url =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)

  const raw: unknown[][] = await res.json()
  return raw.map((k) => ({
    time:  Math.floor(Number(k[0]) / 1000),
    open:  parseFloat(k[1] as string),
    high:  parseFloat(k[2] as string),
    low:   parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
  }))
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TradingChartProps {
  symbol: string      // e.g. "BTCUSDT"
  interval: string    // e.g. "1m"
  klines: Kline[]
  /** Called when a new live tick arrives so the parent can update state */
  onTick?: (candle: Kline) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TradingChart({ symbol, interval, klines, onTick }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const wsRef        = useRef<WebSocket | null>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  // ── Create / destroy chart ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const colors = getChartColors(isDark)

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.border },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.border },
      },
      rightPriceScale: {
        borderColor: colors.border,
        textColor: colors.text,
      },
      timeScale: {
        borderColor: colors.border,
        textColor: colors.text,
        timeVisible: true,
        secondsVisible: interval === '1s',
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addCandlestickSeries({
      upColor:          colors.upColor,
      downColor:        colors.downColor,
      borderUpColor:    colors.upColor,
      borderDownColor:  colors.downColor,
      wickUpColor:      colors.wickUpColor,
      wickDownColor:    colors.wickDownColor,
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark])   // recreate chart when theme changes

  // ── Load historical data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || klines.length === 0) return
    const data: CandlestickData<Time>[] = klines.map((k) => ({
      time:  k.time as Time,
      open:  k.open,
      high:  k.high,
      low:   k.low,
      close: k.close,
    }))
    seriesRef.current.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [klines])

  // ── WebSocket live feed ───────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const stream = `${symbol.toLowerCase()}@kline_${interval}`
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`)

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
          time:  candle.time as Time,
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
        if (wsRef.current === ws) connectWs()
      }, 3000)
    }

    wsRef.current = ws
  }, [symbol, interval, onTick])

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
