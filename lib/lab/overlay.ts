/**
 * Pure helpers for drawing Lab strategy data on the live candle chart.
 */

export type OverlayMarkerShape = 'arrowUp' | 'arrowDown' | 'circle' | 'square'

export interface OverlayMarker {
  time: number // unix seconds, snapped to a bar open time
  position: 'aboveBar' | 'belowBar' | 'inBar'
  color: string
  shape: OverlayMarkerShape
  text: string
}

export interface OverlayPriceLine {
  id: string
  price: number
  color: string
  title: string
  dashed?: boolean
}

interface OverlayTrade {
  entry_time: string
  exit_time: string | null
  side: string
  entry_price: number
  exit_price: number | null
  exit_reason: string | null
  pnl_pct?: number | null
}

export const OVERLAY_COLORS = {
  long: '#22c55e',
  short: '#ef4444',
  exitWin: '#22c55e',
  exitLoss: '#ef4444',
  exitFlat: '#a1a1aa',
  entry: '#38bdf8',
  sl: '#ef4444',
  tp: '#22c55e',
  paper: '#f59e0b',
}

export function isLong(side: string | null | undefined): boolean {
  return (side ?? '').toLowerCase() === 'long' || (side ?? '').toLowerCase() === 'buy'
}

/**
 * Snaps a timestamp to the open time of the bar that contains it. Returns
 * null when the time is outside the loaded range (we never invent bars).
 * `barTimes` must be sorted ascending.
 */
export function snapToBar(tsSec: number, barTimes: number[]): number | null {
  if (barTimes.length === 0 || !Number.isFinite(tsSec)) return null
  if (tsSec < barTimes[0]) return null
  const step = barTimes.length > 1 ? barTimes[barTimes.length - 1] - barTimes[barTimes.length - 2] : 0
  if (tsSec > barTimes[barTimes.length - 1] + step) return null
  let lo = 0
  let hi = barTimes.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (barTimes[mid] <= tsSec) lo = mid
    else hi = mid - 1
  }
  return barTimes[lo]
}

function isoToSec(iso: string | null | undefined): number {
  if (!iso) return NaN
  return Math.floor(Date.parse(iso) / 1000)
}

function tradePnlPct(t: OverlayTrade): number | null {
  if (typeof t.pnl_pct === 'number' && Number.isFinite(t.pnl_pct)) return t.pnl_pct
  if (t.exit_price === null || !Number.isFinite(t.entry_price) || t.entry_price === 0) return null
  const raw = ((t.exit_price - t.entry_price) / t.entry_price) * 100
  return isLong(t.side) ? raw : -raw
}

/**
 * Entry/exit markers for trades. Markers outside the loaded candles are
 * dropped and counted so the UI can say how many are off-screen.
 */
export function tradesToMarkers(
  trades: OverlayTrade[],
  barTimes: number[],
): { markers: OverlayMarker[]; dropped: number } {
  const markers: OverlayMarker[] = []
  let dropped = 0
  for (const t of trades) {
    const long = isLong(t.side)
    const entry = snapToBar(isoToSec(t.entry_time), barTimes)
    if (entry === null) dropped++
    else
      markers.push({
        time: entry,
        position: long ? 'belowBar' : 'aboveBar',
        color: long ? OVERLAY_COLORS.long : OVERLAY_COLORS.short,
        shape: long ? 'arrowUp' : 'arrowDown',
        text: long ? 'L' : 'S',
      })
    if (t.exit_time) {
      const exit = snapToBar(isoToSec(t.exit_time), barTimes)
      if (exit !== null) {
        const pnl = tradePnlPct(t)
        markers.push({
          time: exit,
          position: long ? 'aboveBar' : 'belowBar',
          color: pnl === null || pnl === 0 ? OVERLAY_COLORS.exitFlat : pnl > 0 ? OVERLAY_COLORS.exitWin : OVERLAY_COLORS.exitLoss,
          shape: 'circle',
          text: t.exit_reason ? `x ${t.exit_reason}` : 'x',
        })
      }
    }
  }
  markers.sort((a, b) => a.time - b.time)
  return { markers, dropped }
}

/** Unrealised move in % of entry price (no leverage). */
export function unrealisedPct(side: string, entry: number, price: number | null | undefined): number | null {
  if (price === null || price === undefined || !Number.isFinite(price) || !Number.isFinite(entry) || entry === 0) return null
  const raw = ((price - entry) / entry) * 100
  return isLong(side) ? raw : -raw
}

export function positionLines(
  prefix: string,
  pos: { entry_price: number; sl: number | null; tp: number | null; side: string } | null | undefined,
  labelPrefix = '',
): OverlayPriceLine[] {
  if (!pos) return []
  const lines: OverlayPriceLine[] = [
    { id: `${prefix}-entry`, price: pos.entry_price, color: OVERLAY_COLORS.entry, title: `${labelPrefix}Entry ${isLong(pos.side) ? 'L' : 'S'}` },
  ]
  if (pos.sl !== null && Number.isFinite(pos.sl)) lines.push({ id: `${prefix}-sl`, price: pos.sl, color: OVERLAY_COLORS.sl, title: `${labelPrefix}SL`, dashed: true })
  if (pos.tp !== null && Number.isFinite(pos.tp)) lines.push({ id: `${prefix}-tp`, price: pos.tp, color: OVERLAY_COLORS.tp, title: `${labelPrefix}TP`, dashed: true })
  return lines
}
