'use client'

import { useMemo } from 'react'
import { TradingChart, type Kline } from '@/components/chart/TradingChart'
import { OVERLAY_COLORS, positionLines, tradesToMarkers, type OverlayPriceLine } from '@/lib/lab/overlay'
import type { OutlookDetail } from '@/lib/api/types/outlook'

/** 4H candles of the strategy with entry, entry zone, SL and TP lines and the last backtest trades. */
export function MiniChart({ d }: { d: OutlookDetail }) {
  const klines: Kline[] = useMemo(
    () => (d.detail.candles ?? []).map(([time, open, high, low, close]) => ({ time, open, high, low, close })),
    [d.detail.candles],
  )
  const lines: OverlayPriceLine[] = useMemo(() => {
    const st = d.strategy
    if (!st.side || st.entry_price === null || st.entry_price === undefined) return []
    const out = positionLines('outlook', { entry_price: st.entry_price, sl: st.sl ?? null, tp: st.tp ?? null, side: st.side })
    if (st.tp1 !== null && st.tp1 !== undefined) {
      out.push({ id: 'outlook-tp1', price: st.tp1, color: OVERLAY_COLORS.tp, title: 'target awal (bersyarat)', dashed: true })
    }
    const z = d.plan?.entry_zone
    if (z) {
      out.push({ id: 'outlook-zone-lo', price: z[0], color: OVERLAY_COLORS.entry, title: 'zona entry', dashed: true })
      out.push({ id: 'outlook-zone-hi', price: z[1], color: OVERLAY_COLORS.entry, title: 'zona entry', dashed: true })
    }
    if (d.plan?.target_typical) {
      out.push({ id: 'outlook-typical', price: d.plan.target_typical, color: OVERLAY_COLORS.tp, title: 'target realistis', dashed: true })
    }
    return out
  }, [d.strategy, d.plan])
  const markers = useMemo(() => {
    const times = klines.map((k) => k.time)
    return tradesToMarkers(d.detail.recent_trades ?? [], times).markers
  }, [klines, d.detail.recent_trades])
  if (klines.length === 0) return <p className="text-xs text-muted-foreground">Candle tidak tersedia.</p>
  return (
    <div className="h-72 overflow-hidden rounded-lg border">
      <TradingChart symbol={d.symbol} interval={d.strategy.timeframe === '1h' ? '1h' : '4h'} klines={klines} source="perp" priceLines={lines} markers={markers} />
    </div>
  )
}
