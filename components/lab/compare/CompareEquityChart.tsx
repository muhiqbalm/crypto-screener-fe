'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { useTheme } from 'next-themes'
import { getChartTheme } from '@/lib/chart-theme'
import { formatPercent } from '@/lib/utils/format'
import type { NormalisedPoint } from '@/lib/lab/planning'

// Categorical slots 1–4 (fixed order, validated: CVD ΔE ≥ 8.4, normal ≥ 19.8 on both
// surfaces; light slots 3–4 are < 3:1 contrast, so the legend + table carry identity).
export const COMPARE_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500'],
}

export interface CompareSeries {
  key: string
  label: string
  points: NormalisedPoint[]
}

/** Overlaid equity curves, each as % change since its own first point. */
export function CompareEquityChart({ series }: { series: CompareSeries[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const colors = isDark ? COMPARE_COLORS.dark : COMPARE_COLORS.light
  const [hover, setHover] = useState<{ time: number; values: (number | null)[] } | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const theme = getChartTheme(isDark)
    const palette = isDark ? COMPARE_COLORS.dark : COMPARE_COLORS.light
    const chart: IChartApi = createChart(ref.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: theme.text, fontFamily: theme.fontFamily, fontSize: 11 },
      grid: { vertLines: { visible: false }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      crosshair: { mode: CrosshairMode.Magnet },
      localization: { priceFormatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%` },
      handleScroll: false,
      handleScale: false,
    })
    const handles: ISeriesApi<'Line'>[] = series.map((s, i) => {
      const line = chart.addLineSeries({ color: palette[i % palette.length], lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: '' })
      line.setData(s.points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      return line
    })
    // 0% baseline
    if (handles[0]) handles[0].createPriceLine({ price: 0, color: theme.grid, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' })
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) return setHover(null)
      const values = handles.map((h) => {
        const d = param.seriesData.get(h) as { value?: number } | undefined
        return typeof d?.value === 'number' ? d.value : null
      })
      setHover({ time: Number(param.time), values })
    })
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [series, isDark])

  const lastOf = (s: CompareSeries) => (s.points.length ? s.points[s.points.length - 1].value : null)
  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground" aria-label="Legenda run">
        {series.map((s, i) => {
          const v = hover ? hover.values[i] : lastOf(s)
          return (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: colors[i % colors.length] }} aria-hidden="true" />
              <span className="num text-foreground">{s.label}</span>
              <span className="num">{v === null ? '—' : formatPercent(v, 1)}</span>
            </li>
          )
        })}
        {hover && <li className="num">{new Date(hover.time * 1000).toISOString().slice(0, 10)}</li>}
      </ul>
      <div ref={ref} className="h-[260px] w-full sm:h-[360px]" role="img" aria-label="Kurva equity dinormalisasi (% sejak awal) untuk run yang dibandingkan" />
    </div>
  )
}
