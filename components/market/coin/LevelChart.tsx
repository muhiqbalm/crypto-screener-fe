'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate, formatTime } from '@/lib/utils/time'
import { formatPrice } from '@/lib/utils/format'
import type { OutlookDetail } from '@/lib/api/types/outlook'

/**
 * 4H candles with the plan drawn on top (SL, entry, last close, TP, realistic target, entry zone)
 * and price tags on the right, like the team briefing chart. Pure SVG so sub-cent prices keep
 * their digits and the levels are always in view.
 */

type Tone = 'sl' | 'entry' | 'close' | 'tp' | 'typical'
interface Level { key: string; tone: Tone; label: string; price: number; dashed?: boolean; fromX?: number; noTag?: boolean }

const TONE: Record<Tone, { line: string; tag: string; text: string }> = {
  sl: { line: 'stroke-bearish', tag: 'fill-bearish', text: 'fill-white' },
  entry: { line: 'stroke-info', tag: 'fill-info', text: 'fill-background' },
  close: { line: 'stroke-muted-foreground', tag: 'fill-muted', text: 'fill-foreground' },
  tp: { line: 'stroke-bullish', tag: 'fill-bullish', text: 'fill-background' },
  typical: { line: 'stroke-bullish', tag: 'fill-card', text: 'fill-bullish' },
}

const bare = (v: number) => formatPrice(v).replace('$', '')

function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag
}

/** Push tags apart so they never overlap, keeping them inside [top, bottom]. */
function spread(ys: number[], gap: number, top: number, bottom: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const out = order.map((o) => o.y)
  for (let k = 0; k < out.length; k++) out[k] = Math.max(out[k], k ? out[k - 1] + gap : top)
  for (let k = out.length - 1; k >= 0; k--) out[k] = Math.min(out[k], k < out.length - 1 ? out[k + 1] - gap : bottom)
  const res = new Array<number>(ys.length)
  order.forEach((o, k) => { res[o.i] = out[k] })
  return res
}

export function LevelChart({ d, height = 420 }: { d: OutlookDetail; height?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const raw = d.detail.candles
  const st = d.strategy
  const narrow = w > 0 && w < 560
  const H = narrow ? Math.min(height, 340) : height
  // tag width from the longest "Label price" text (13px semibold ≈ 7.6px per character)
  const tagPrices = [st.side ? st.sl : null, st.side ? st.entry_price : null, d.price, st.side ? st.tp : null,
    st.side && !narrow ? d.plan?.target_typical : null].filter((v): v is number => v !== null && v !== undefined)
  const longest = Math.max(8, ...tagPrices.map((v) => bare(v).length))
  const tagW = Math.ceil((longest + (narrow ? 6 : 10)) * 7.6) + 14
  const m = { l: narrow ? 6 : 64, r: tagW + 10, t: 30, b: 28 }
  const plotW = Math.max(60, w - m.l - m.r)
  const plotH = H - m.t - m.b
  const maxBars = Math.max(20, Math.floor(plotW / (narrow ? 4.5 : 6.5)))
  const candles = useMemo(() => (raw ?? []).slice(-maxBars), [raw, maxBars])

  const view = useMemo(() => {
    if (candles.length === 0 || w === 0) return null
    const step = plotW / candles.length
    const xAt = (i: number) => m.l + step * (i + 0.5)
    const entryMs = st.entry_time ? Date.parse(st.entry_time) : NaN
    let entryIdx = -1
    if (Number.isFinite(entryMs)) {
      entryIdx = candles.findIndex(([t]) => t * 1000 >= entryMs)
      if (entryIdx === -1 && entryMs > candles[candles.length - 1][0] * 1000) entryIdx = candles.length - 1
    }
    const levels: Level[] = []
    if (st.side && st.sl != null) levels.push({ key: 'sl', tone: 'sl', label: 'SL', price: st.sl })
    if (st.side && st.entry_price != null) {
      levels.push({ key: 'entry', tone: 'entry', label: 'Entry', price: st.entry_price, fromX: entryIdx >= 0 ? xAt(entryIdx) : m.l })
    }
    if (d.price != null) levels.push({ key: 'close', tone: 'close', label: 'Close', price: d.price })
    if (st.side && st.tp != null) levels.push({ key: 'tp', tone: 'tp', label: 'TP', price: st.tp })
    const typ = d.plan?.target_typical
    if (st.side && typ != null && Math.abs(typ - (d.price ?? typ)) > 0) {
      levels.push({ key: 'typical', tone: 'typical', label: 'Realistis', price: typ, dashed: true, noTag: narrow })
    }

    let lo = Infinity
    let hi = -Infinity
    for (const [, , h, l] of candles) { lo = Math.min(lo, l); hi = Math.max(hi, h) }
    for (const lv of levels) { lo = Math.min(lo, lv.price); hi = Math.max(hi, lv.price) }
    const zone = st.side ? d.plan?.entry_zone : undefined
    if (zone) { lo = Math.min(lo, zone[0]); hi = Math.max(hi, zone[1]) }
    const pad = (hi - lo) * 0.06 || hi * 0.01 || 1
    lo -= pad
    hi += pad
    const y = (p: number) => m.t + ((hi - p) / (hi - lo)) * plotH

    const tStep = niceStep(hi - lo, narrow ? 4 : 6)
    const ticks: number[] = []
    for (let v = Math.ceil(lo / tStep) * tStep; v <= hi; v += tStep) ticks.push(v)

    // x labels at WIB midnights, spaced at least ~70px apart
    const days: { i: number; t: number }[] = []
    candles.forEach(([t], i) => {
      const day = Math.floor((t + 7 * 3600) / 86400)
      const prev = i ? Math.floor((candles[i - 1][0] + 7 * 3600) / 86400) : day
      if (i && day !== prev) days.push({ i, t })
    })
    const every = Math.max(1, Math.ceil(70 / (step * 6)))
    const xLabels = days.filter((_, k) => k % every === 0).filter(({ i }) => xAt(i) > m.l + 22 && xAt(i) < m.l + plotW - 22)

    const tagged = levels.filter((lv) => !lv.noTag)
    const ys = spread(tagged.map((lv) => y(lv.price)), 26, m.t + 11, m.t + plotH - 11)
    const tagYs = levels.map((lv) => (lv.noTag ? null : ys[tagged.indexOf(lv)]))
    return { step, xAt, y, ticks, tStep, xLabels, levels, tagYs, entryIdx, zone }
  }, [candles, w, plotW, plotH, m.l, m.t, narrow, st, d.price, d.plan])
  const entryText = `Masuk ${st.side?.toUpperCase() ?? ''} · ${formatTime(st.entry_at ?? st.entry_time, { year: false, zone: !narrow })}`

  if (!raw?.length) return <p className="text-sm text-muted-foreground">Candle tidak tersedia.</p>
  const side = st.side?.toUpperCase()
  return (
    <div ref={box} className="w-full">
      {view && (
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" className="block select-none"
          aria-label={`Chart ${st.timeframe?.toUpperCase() ?? '4H'} dengan level rencana: ${view.levels.map((l) => `${l.label} ${bare(l.price)}`).join(', ')}`}>
          {view.ticks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={m.l + plotW} y1={view.y(v)} y2={view.y(v)} className="stroke-border" strokeWidth={1} />
              {!narrow && (
                <text x={m.l - 10} y={view.y(v) + 4} textAnchor="end" className="fill-muted-foreground text-3xs tabular-nums">{view.tStep >= 1 ? Math.round(v).toLocaleString('en-US') : bare(v)}</text>
              )}
            </g>
          ))}
          {view.zone && (
            <rect x={m.l} width={plotW} y={view.y(view.zone[1])} height={Math.max(2, view.y(view.zone[0]) - view.y(view.zone[1]))}
              className="fill-info/10" />
          )}
          {candles.map(([t, o, h, l, c], i) => {
            const up = c >= o
            const x = view.xAt(i)
            const bw = Math.max(1.5, view.step * 0.62)
            const top = view.y(Math.max(o, c))
            const bh = Math.max(1, view.y(Math.min(o, c)) - top)
            return (
              <g key={t} className={up ? 'fill-bullish stroke-bullish' : 'fill-bearish stroke-bearish'}>
                <line x1={x} x2={x} y1={view.y(h)} y2={view.y(l)} strokeWidth={1} />
                <rect x={x - bw / 2} y={top} width={bw} height={bh} strokeWidth={0} />
              </g>
            )
          })}
          {view.levels.map((lv, k) => {
            const yy = view.y(lv.price)
            const ty = view.tagYs[k]
            const tone = TONE[lv.tone]
            const x0 = lv.fromX ?? m.l
            return (
              <g key={lv.key}>
                <line x1={x0} x2={m.l + plotW} y1={yy} y2={yy} className={tone.line}
                  strokeWidth={lv.tone === 'close' ? 1.25 : 1.75} strokeDasharray={lv.dashed ? '6 5' : undefined} />
                {ty !== null && Math.abs(ty - yy) > 1 && (
                  <path d={`M${m.l + plotW} ${yy} L${m.l + plotW + 6} ${ty}`} className={tone.line} strokeWidth={1} fill="none" />
                )}
                {ty !== null && (
                  <>
                    <rect x={m.l + plotW + 8} y={ty - 11} width={tagW} height={22} rx={6} className={tone.tag}
                      stroke={lv.tone === 'typical' || lv.tone === 'close' ? 'currentColor' : undefined}
                      strokeOpacity={0.25} strokeDasharray={lv.dashed ? '4 3' : undefined} />
                    <text x={m.l + plotW + 16} y={ty + 4.5} className={`${tone.text} text-2xs font-semibold tabular-nums`}>
                      {lv.label} {bare(lv.price)}
                    </text>
                  </>
                )}
              </g>
            )
          })}
          {view.entryIdx >= 0 && st.entry_price != null && side && (
            <g>
              <line x1={view.xAt(view.entryIdx)} x2={view.xAt(view.entryIdx)} y1={m.t - 6} y2={m.t + plotH}
                className="stroke-info" strokeDasharray="3 4" strokeWidth={1.25} />
              <circle cx={view.xAt(view.entryIdx)} cy={view.y(st.entry_price)} r={6} className="fill-background stroke-info" strokeWidth={2.5} />
              <text x={Math.min(Math.max(view.xAt(view.entryIdx), m.l + entryText.length * 3.9), w - entryText.length * 3.9)} y={m.t - 12}
                textAnchor="middle" className="fill-info text-2xs font-semibold">
                {entryText}
              </text>
            </g>
          )}
          {view.xLabels.map(({ i, t }) => (
            <text key={t} x={view.xAt(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-3xs">
              {formatDate(t * 1000, { year: false })}
            </text>
          ))}
        </svg>
      )}
      {!view && <div style={{ height: H }} />}
    </div>
  )
}
