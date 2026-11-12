/**
 * /chart URL state (pure): `?symbol=`, `?tf=`, `?watch=`, `?run=`.
 * The URL is the source of truth so a chart can be linked and reloaded as-is.
 */

export const CHART_TFS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'] as const
export type ChartTf = (typeof CHART_TFS)[number]

/** The team's strategies run on 4H candles. */
export const DEFAULT_TF: ChartTf = '4h'
export const DEFAULT_SYMBOL = 'BTCUSDT'

export const TF_SECONDS: Record<ChartTf, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14_400,
  '1d': 86_400,
}

/** Button text (trader shorthand) and the words used in sentences / screen readers. */
export const TF_LABEL: Record<ChartTf, { short: string; long: string }> = {
  '1m': { short: '1m', long: '1 menit' },
  '5m': { short: '5m', long: '5 menit' },
  '15m': { short: '15m', long: '15 menit' },
  '30m': { short: '30m', long: '30 menit' },
  '1h': { short: '1h', long: '1 jam' },
  '4h': { short: '4h', long: '4 jam' },
  '1d': { short: '1D', long: '1 hari' },
}

/** "4h", "4H", "1D" -> ChartTf; anything else -> null. */
export function parseTf(v: string | null | undefined): ChartTf | null {
  if (!v) return null
  const t = v.trim().toLowerCase()
  return (CHART_TFS as readonly string[]).includes(t) ? (t as ChartTf) : null
}

/** "SOLUSDT", "solusdt", "SOL" -> "SOLUSDT"; invalid -> null. */
export function parseSymbol(v: string | null | undefined): string | null {
  if (!v) return null
  const s = v.trim().toUpperCase()
  if (/^[A-Z0-9]{2,20}USDT$/.test(s)) return s
  if (/^[A-Z0-9]{2,15}$/.test(s)) return `${s}USDT`
  return null
}

/** Long label for any timeframe string (overlay timeframes may be outside CHART_TFS). */
export function tfLong(tf: string): string {
  const t = parseTf(tf)
  return t ? TF_LABEL[t].long : tf
}

/**
 * Query string for the chart after a change, keeping every other parameter.
 * `null` removes a key. Returns "" or "?a=b&…".
 */
export function chartSearch(current: URLSearchParams | string, patch: Record<string, string | null>): string {
  const p = new URLSearchParams(typeof current === 'string' ? current : current.toString())
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '') p.delete(k)
    else p.set(k, v)
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}
