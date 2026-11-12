'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { useTheme } from 'next-themes'
import { chartPercentFormatter, getChartTheme } from '@/lib/chart-theme'
import { formatPercent } from '@/lib/utils/format'
import { COMPARE_COLORS } from '@/components/lab/compare/CompareEquityChart'
import { FAMILY_DASH, FAMILY_LINE_STYLE, normaliseCurve } from '@/lib/lab/arena'
import type { ArenaCurveSeries } from '@/lib/api/types/arena'

const NEUTRAL = { light: '#8a8f98', dark: '#7b818c' }

/**
 * Overlaid paper equity curves, each as % change vs its own 10k start.
 * Colour = base strategy (coin + params), fixed per base via `slots`;
 * line style = sizing family (solid 2×, dashed 1×, dotted VT60). The legend
 * carries both, so identity never depends on colour alone.
 */
export function ArenaEquityChart({
  series,
  slots,
  height = 'h-[240px] sm:h-[320px]',
}: {
  series: ArenaCurveSeries[]
  slots: Record<string, number | null>
  height?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'
  const [hover, setHover] = useState<{ time: number; values: (number | null)[] } | null>(null)
  const data = useMemo(() => series.map((s) => ({ s, points: normaliseCurve(s) })), [series])
  const colorOf = (base: string, dark: boolean) => {
    const slot = slots[base]
    const pal = dark ? COMPARE_COLORS.dark : COMPARE_COLORS.light
    return slot === null || slot === undefined ? (dark ? NEUTRAL.dark : NEUTRAL.light) : pal[slot]
  }

  useEffect(() => {
    if (!ref.current) return
    const theme = getChartTheme(isDark)
    const chart: IChartApi = createChart(ref.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: theme.text, fontFamily: theme.fontFamily, fontSize: theme.fontSize },
      grid: { vertLines: { visible: false }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: theme.scaleMargins },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Magnet },
      localization: { priceFormatter: chartPercentFormatter(1) },
      handleScroll: false,
      handleScale: false,
    })
    const handles: ISeriesApi<'Line'>[] = data.map(({ s, points }) => {
      const line = chart.addLineSeries({
        color: colorOf(s.base, isDark),
        lineWidth: 2,
        lineStyle: FAMILY_LINE_STYLE[s.family] ?? 0,
        priceLineVisible: false,
        lastValueVisible: false,
        title: '',
      })
      line.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      return line
    })
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
    // colorOf only depends on slots + isDark
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isDark, slots])

  const lastOf = (pts: { value: number }[]) => (pts.length ? pts[pts.length - 1].value : null)
  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground" aria-label="Legenda preset">
        {data.map(({ s, points }, i) => {
          const v = hover ? hover.values[i] : lastOf(points)
          return (
            <li key={s.preset_id} className="flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden="true" className="shrink-0">
                <line x1="1" y1="3" x2="17" y2="3" stroke={colorOf(s.base, isDark)} strokeWidth="2" strokeLinecap="round" strokeDasharray={FAMILY_DASH[s.family]} />
              </svg>
              <span className="num text-foreground">{s.name}</span>
              <span className="num">{v === null ? '—' : formatPercent(v, 2)}</span>
            </li>
          )
        })}
        {hover && <li className="num">{new Date(hover.time * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC</li>}
      </ul>
      <div ref={ref} className={`${height} w-full`} role="img" aria-label="Kurva modal paper (% sejak saldo awal) per preset" />
    </div>
  )
}
