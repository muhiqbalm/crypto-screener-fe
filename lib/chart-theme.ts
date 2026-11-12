import { formatNumber } from '@/lib/utils/format'

/**
 * Shared colours for lightweight-charts (canvas, so CSS tokens can't be used
 * directly). Keep these in sync with the tokens in app/globals.css.
 */
export interface ChartTheme {
  background: string
  text: string
  grid: string
  border: string
  crosshair: string
  /** Solid background for crosshair axis labels. */
  labelBg: string
  up: string
  down: string
  /** Neutral accent for single-series lines (equity, etc). */
  line: string
  fontFamily: string
  /** Axis label size in px. 13 = the app's smallest body text. */
  fontSize: number
  /** Axis and crosshair numbers in app style: `1,234.56`, minus sign "−". */
  priceFormatter: (v: number) => string
  /** Room above and below the series so the top axis label is not clipped. */
  scaleMargins: { top: number; bottom: number }
}

/**
 * Number on a chart's price axis: 16000 → "16,000.00", 335 → "335.00",
 * small coin prices keep enough decimals (0.01234 → "0.0123").
 * Pass as `localization.priceFormatter` (lightweight-charts 4.2).
 */
export function chartPriceFormatter(v: number): string {
  if (!Number.isFinite(v)) return ''
  const abs = Math.abs(v)
  if (abs >= 1 || abs === 0) return formatNumber(v, { digits: 2 })
  return formatNumber(v, { minDigits: 2, maxDigits: abs >= 0.01 ? 4 : 8 })
}

/** Percent axis for curves normalised to 0%: "+12%", "−3.5%". */
export function chartPercentFormatter(digits = 0): (v: number) => string {
  return (v) => (Number.isFinite(v) ? `${formatNumber(v, { digits, signed: true })}%` : '')
}

export function getChartTheme(isDark: boolean): ChartTheme {
  return {
    // Transparent so the chart sits on whatever card surface hosts it.
    background: 'transparent',
    text: isDark ? '#a1a1aa' : '#52525b',
    grid: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    border: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    crosshair: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)',
    labelBg: isDark ? '#52525b' : '#71717a',
    up: isDark ? '#22c55e' : '#16a34a',
    down: isDark ? '#ef4444' : '#dc2626',
    line: isDark ? '#38bdf8' : '#0284c7',
    fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
    fontSize: 13,
    priceFormatter: chartPriceFormatter,
    scaleMargins: { top: 0.14, bottom: 0.08 },
  }
}
