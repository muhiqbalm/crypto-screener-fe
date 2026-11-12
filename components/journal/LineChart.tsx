'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, type UTCTimestamp } from 'lightweight-charts'
import { useTheme } from 'next-themes'
import { getChartTheme } from '@/lib/chart-theme'

/** Single-series equity line (title names the series, so no legend box). */
export function SimpleLineChart({ points, label, className = 'h-[260px]' }: { points: { t: string; equity: number }[]; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  useEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: getChartTheme(isDark).text,
        fontFamily: getChartTheme(isDark).fontFamily,
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: getChartTheme(isDark).grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
    })
    const series = chart.addLineSeries({ color: getChartTheme(isDark).line, lineWidth: 2, priceLineVisible: false })
    const seen = new Map<number, number>()
    for (const p of points) {
      const ts = Math.floor(Date.parse(p.t) / 1000)
      if (Number.isFinite(ts) && Number.isFinite(p.equity)) seen.set(ts, p.equity)
    }
    series.setData(
      [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([time, value]) => ({ time: time as UTCTimestamp, value })),
    )
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [points, isDark])

  return <div ref={ref} className={`${className} w-full`} role="img" aria-label={label} />
}
