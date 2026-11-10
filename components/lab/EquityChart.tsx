'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from 'lightweight-charts'
import { useTheme } from 'next-themes'
import { getChartTheme } from '@/lib/chart-theme'
import type { LabEquityPoint, LabSegment } from '@/lib/api/types/lab'

// Validated categorical palette (dataviz validator: lightness band, CVD and
// contrast pass on both surfaces). Order is fixed: IS, OOS, holdout.
const SEGMENT_META: Record<LabSegment, { label: string; light: string; dark: string }> = {
  is: { label: 'In-sample (pengembangan)', light: '#0284c7', dark: '#0284c7' },
  oos: { label: 'Out-of-sample', light: '#d97706', dark: '#d97706' },
  holdout: { label: 'Holdout (ujian terkunci)', light: '#7c3aed', dark: '#8b5cf6' },
}
const SEGMENT_ORDER: LabSegment[] = ['is', 'oos', 'holdout']

interface SegmentSeries {
  segment: LabSegment
  data: { time: UTCTimestamp; value: number }[]
}

/**
 * Splits equity points into one series per contiguous segment. Each series is
 * prefixed with the previous segment's last point so the line is continuous,
 * and duplicate timestamps keep the last value (lightweight-charts requires
 * strictly increasing time).
 */
export function splitSegments(points: LabEquityPoint[]): SegmentSeries[] {
  const sorted = points
    .map((p) => ({ ...p, ts: Math.floor(Date.parse(p.t) / 1000) }))
    .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.equity))
    .sort((a, b) => a.ts - b.ts)

  const out: SegmentSeries[] = []
  let current: SegmentSeries | null = null
  let prev: { time: UTCTimestamp; value: number } | null = null
  for (const p of sorted) {
    const pt = { time: p.ts as UTCTimestamp, value: p.equity }
    if (!current || current.segment !== p.segment) {
      current = { segment: p.segment, data: prev && prev.time < pt.time ? [prev] : [] }
      out.push(current)
    }
    const last = current.data[current.data.length - 1]
    if (last && last.time === pt.time) current.data[current.data.length - 1] = pt
    else current.data.push(pt)
    prev = pt
  }
  return out
}

export function EquityChart({ points, holdoutStart }: { points: LabEquityPoint[]; holdoutStart?: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const present = SEGMENT_ORDER.filter((s) => points.some((p) => p.segment === s))

  useEffect(() => {
    if (!ref.current) return
    const chart: IChartApi = createChart(ref.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: getChartTheme(isDark).text,
        fontFamily: getChartTheme(isDark).fontFamily,
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: getChartTheme(isDark).grid },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      handleScroll: false,
      handleScale: false,
    })
    const hsTs = holdoutStart ? Math.floor(Date.parse(holdoutStart) / 1000) : NaN
    for (const seg of splitSegments(points)) {
      const meta = SEGMENT_META[seg.segment]
      const color = isDark ? meta.dark : meta.light
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      })
      series.setData(seg.data)
      // Mark where the locked holdout begins (first holdout bar).
      if (seg.segment === 'holdout' && seg.data.length > 0) {
        const first = seg.data.find((d) => !Number.isFinite(hsTs) || d.time >= hsTs) ?? seg.data[0]
        series.setMarkers([{ time: first.time, position: 'aboveBar', shape: 'arrowDown', color, text: 'Mulai holdout' }])
      }
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [points, isDark, holdoutStart])

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-4 text-2xs text-muted-foreground" aria-label="Legenda segmen">
        {present.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundColor: isDark ? SEGMENT_META[s].dark : SEGMENT_META[s].light }}
              aria-hidden="true"
            />
            {SEGMENT_META[s].label}
          </li>
        ))}
      </ul>
      <div ref={ref} className="h-[260px] w-full sm:h-[360px]" role="img" aria-label="Kurva equity per segmen" />
    </div>
  )
}
