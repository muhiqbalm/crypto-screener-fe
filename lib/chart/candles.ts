/**
 * Candle maths and WIB display for the live chart (pure).
 *
 * lightweight-charts has no time zones: it prints the timestamps it is given as UTC. To show
 * WIB (UTC+7, no DST) on the axis and the crosshair, every time handed to the chart is shifted
 * by +7h (candles, websocket updates, markers) and formatted with UTC getters. The shift lives
 * only at the chart boundary; everything else keeps real UTC seconds.
 */

export interface Candle {
  /** Open time, unix seconds (UTC). */
  time: number
  open: number
  high: number
  low: number
  close: number
}

export const WIB_SHIFT_S = 7 * 3600
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] as const

export function toChartTime(utcSec: number): number {
  return utcSec + WIB_SHIFT_S
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Crosshair label of a shifted chart time: "12 Nov 08:00" (daily candles: "12 Nov 2026"). */
export function chartTimeLabel(chartSec: number, daily = false): string {
  const d = new Date(chartSec * 1000)
  const date = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
  return daily ? `${date} ${d.getUTCFullYear()}` : `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/**
 * Axis tick of a shifted chart time. `type` is lightweight-charts' TickMarkType:
 * 0 year, 1 month, 2 day of month, 3 time, 4 time with seconds.
 */
export function chartTickLabel(chartSec: number, type: number): string {
  const d = new Date(chartSec * 1000)
  switch (type) {
    case 0:
      return String(d.getUTCFullYear())
    case 1:
      return MONTHS[d.getUTCMonth()]
    case 2:
      return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
    case 4:
      return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    default:
      return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }
}

export function pctChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (from === null || from === undefined || to === null || to === undefined) return null
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null
  return ((to - from) / from) * 100
}

/** Close of the last loaded candle that opened before `openTime` (the previous candle). */
export function previousClose(candles: Candle[], openTime: number): number | null {
  for (let i = candles.length - 1; i >= 0; i--) if (candles[i].time < openTime) return candles[i].close
  return null
}

/**
 * Change over ±24 hours: the current price against the close of the candle that closed 24h
 * before the current candle closes. null when the loaded candles do not reach back that far.
 */
export function change24h(candles: Candle[], current: Candle | null, stepSec: number): number | null {
  if (!current || candles.length === 0 || !(stepSec > 0)) return null
  const target = current.time + stepSec - 86_400
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time + stepSec <= target) return pctChange(candles[i].close, current.close)
  }
  return null
}
