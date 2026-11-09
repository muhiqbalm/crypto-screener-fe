'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from 'lightweight-charts'
import { useTheme } from 'next-themes'
import type { LabEquityPoint, LabSegment } from '@/lib/api/types/lab'

// Validated categorical palette (dataviz validator: lightness band, CVD and
// contrast pass on both surfaces). Order is fixed: IS, OOS, holdout.
export const SEGMENT_META: Record<LabSegment, { label: string; light: string; dark: string }> = {
  is: { label: 'In-sample', light: '#0284c7', dark: '#0284c7' },
  oos: { label: 'Out-of-sample', light: '#d97706', dark: '#d97706' },
  holdout: { label: 'Holdout', light: '#7c3aed', dark: '#8b5cf6' },
}
const SEGMENT_ORDER: LabSegment[] = ['is', 'oos', 'holdout']

export interface SegmentSeries {
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

export function EquityChart({ points }: { points: LabEquityPoint[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const present = SEGMENT_ORDER.filter((s) => points.some((p) => p.segment === s))

  useEffect(() => {
    if (!ref.current) return
    const chart: IChartApi = createChart(ref.current, {
      height: 320,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#b3b3b3' : '#555555',
        fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)',
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    })
    for (const seg of splitSegments(points)) {
      const meta = SEGMENT_META[seg.segment]
      const series = chart.addLineSeries({
        color: isDark ? meta.dark : meta.light,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      })
      series.setData(seg.data)
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [points, isDark])

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-4 text-[11px] text-muted-foreground" aria-label="Legenda segmen">
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
      <div ref={ref} className="h-[320px] w-full" role="img" aria-label="Kurva equity per segmen" />
    </div>
  )
}
