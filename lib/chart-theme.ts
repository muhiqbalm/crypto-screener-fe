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
  fontSize: number
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
    fontSize: 11,
  }
}
