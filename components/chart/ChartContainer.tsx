'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TradingChart, fetchBinanceKlines, type Kline } from './TradingChart'
import { formatPrice } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SYMBOLS = [
  { value: 'BTCUSDT',  label: 'BTC/USDT' },
  { value: 'ETHUSDT',  label: 'ETH/USDT' },
  { value: 'SOLUSDT',  label: 'SOL/USDT' },
  { value: 'BNBUSDT',  label: 'BNB/USDT' },
  { value: 'XRPUSDT',  label: 'XRP/USDT' },
  { value: 'DOGEUSDT', label: 'DOGE/USDT' },
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
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer',
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
  symbol,
  lastCandle,
  prevClose,
}: {
  symbol: string
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

export function ChartContainer() {
  const [symbol,    setSymbol]    = useState('BTCUSDT')
  const [interval,  setInterval]  = useState('1m')
  const [klines,    setKlines]    = useState<Kline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [lastCandle, setLastCandle] = useState<Kline | null>(null)
  const [prevClose,  setPrevClose]  = useState<number | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  // Load historical klines
  const loadKlines = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchBinanceKlines(symbol, interval, 500)
      setKlines(data)
      if (data.length >= 2) {
        setLastCandle(data[data.length - 1])
        setPrevClose(data[data.length - 2].close)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data')
    } finally {
      setIsLoading(false)
    }
  }, [symbol, interval])

  useEffect(() => {
    loadKlines()
  }, [loadKlines])

  // Track WS connection state via a ping interval
  useEffect(() => {
    // We optimistically set connected after data loads; the chart component
    // manages the actual WS. We just show a visual indicator.
    if (!isLoading && !error) {
      setWsConnected(true)
    } else {
      setWsConnected(false)
    }
  }, [isLoading, error])

  const handleTick = useCallback((candle: Kline) => {
    setLastCandle(candle)
  }, [])

  const symbolMeta = SYMBOLS.find(s => s.value === symbol)

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Symbol selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {SYMBOLS.map(s => (
            <SegBtn
              key={s.value}
              active={symbol === s.value}
              onClick={() => setSymbol(s.value)}
            >
              {s.label}
            </SegBtn>
          ))}
        </div>

        {/* Interval selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {INTERVALS.map(i => (
            <SegBtn
              key={i.value}
              active={interval === i.value}
              onClick={() => setInterval(i.value)}
            >
              {i.label}
            </SegBtn>
          ))}
        </div>
      </div>

      {/* Chart card */}
      <Card className="overflow-hidden">
        {/* Card header — price + status */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {symbolMeta?.label ?? symbol}
              </p>
              <PriceTicker
                symbol={symbol}
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
            {/* Live indicator */}
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5 text-[10px] px-2 py-0.5',
                wsConnected
                  ? 'border-bullish/30 bg-bullish/10 text-bullish'
                  : 'text-muted-foreground',
              )}
            >
              {wsConnected
                ? <><span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse" aria-hidden="true" />Live</>
                : <><WifiOff className="h-3 w-3" aria-hidden="true" />Offline</>
              }
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadKlines}
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
          <div className="relative h-[480px] w-full">
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
                  <Button variant="outline" size="sm" onClick={loadKlines}>
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !error && klines.length > 0 && (
              <TradingChart
                symbol={symbol}
                interval={interval}
                klines={klines}
                onTick={handleTick}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
