import type { ArenaCurveSeries, ArenaRow, CheckStatus, DriftCheck } from '@/lib/api/types/arena'
import type { NormalisedPoint } from '@/lib/lab/planning'

export type ArenaGroupMode = 'all' | 'coin' | 'family'

export const STATUS_COPY: Record<CheckStatus, { label: string; variant: 'info' | 'warn' | 'muted' | 'lab' }> = {
  sesuai: { label: 'Sesuai', variant: 'info' },
  menyimpang: { label: 'Menyimpang', variant: 'warn' },
  belum_cukup: { label: 'Belum cukup data', variant: 'muted' },
  info: { label: 'Info', variant: 'lab' },
}

/** Sizing families in a fixed order: 2× (seed mirror), 1×, vol target. Unknown ones go last. */
export const FAMILY_ORDER = ['2x', '1x', 'VT60']
export const FAMILY_LABEL: Record<string, string> = { '2x': 'Sizing 2× (bawaan)', '1x': 'Sizing 1×', VT60: 'Sizing VT60' }

/** Line style per sizing family (lightweight-charts LineStyle: 0 solid, 1 dotted, 2 dashed). */
export const FAMILY_LINE_STYLE: Record<string, 0 | 1 | 2> = { '2x': 0, '1x': 2, VT60: 1 }
/** Same, as an SVG stroke-dasharray for the legend swatch. */
export const FAMILY_DASH: Record<string, string | undefined> = { '2x': undefined, '1x': '6 3', VT60: '1.5 2.5' }

const familyRank = (f: string) => {
  const i = FAMILY_ORDER.indexOf(f)
  return i === -1 ? FAMILY_ORDER.length : i
}

/**
 * Colour slot per base strategy (coin + params, e.g. ETH-v2), stable across filters:
 * bases sorted by name over ALL series, so a toggle never repaints a survivor.
 * More than `slots` bases → null (drawn neutral) instead of cycling hues.
 */
export function baseSlots(bases: string[], slots = 4): Record<string, number | null> {
  const uniq = Array.from(new Set(bases)).sort()
  return Object.fromEntries(uniq.map((b, i) => [b, i < slots ? i : null]))
}

export interface ArenaGroup<T> {
  key: string
  label: string
  items: T[]
}

/** Group leaderboard rows / curve series by coin or sizing family. Order inside a group is kept. */
export function groupBy<T>(items: T[], mode: ArenaGroupMode, coinOf: (t: T) => string, familyOf: (t: T) => string): ArenaGroup<T>[] {
  if (mode === 'all') return [{ key: 'all', label: 'Semua preset', items }]
  const map = new Map<string, T[]>()
  for (const it of items) {
    const k = mode === 'coin' ? coinOf(it) : familyOf(it)
    map.set(k, [...(map.get(k) ?? []), it])
  }
  const keys = Array.from(map.keys()).sort((a, b) =>
    mode === 'family' ? familyRank(a) - familyRank(b) || a.localeCompare(b) : a.localeCompare(b),
  )
  return keys.map((k) => ({ key: k, label: mode === 'coin' ? k : (FAMILY_LABEL[k] ?? k), items: map.get(k) ?? [] }))
}

export const groupRows = (rows: ArenaRow[], mode: ArenaGroupMode) =>
  groupBy(rows, mode, (r) => r.preset.coin, (r) => r.preset.family)

export const groupSeries = (series: ArenaCurveSeries[], mode: ArenaGroupMode) =>
  groupBy(series, mode, (s) => s.coin, (s) => s.family)

/** Leaderboard order: return desc, then name. Equal returns (e.g. day one, all flat) stay by name. */
export function sortRows(rows: ArenaRow[]): ArenaRow[] {
  return [...rows].sort(
    (a, b) => (b.stats.return_pct ?? -Infinity) - (a.stats.return_pct ?? -Infinity) || a.preset.name.localeCompare(b.preset.name),
  )
}

/** Equity → % change vs the account's starting balance, one point per second, ascending. */
export function normaliseCurve(s: ArenaCurveSeries): NormalisedPoint[] {
  const base = s.starting_balance
  if (!(base > 0)) return []
  const out: NormalisedPoint[] = []
  const pts = s.points
    .map((p) => ({ time: Math.floor(Date.parse(p.t) / 1000), e: p.equity }))
    .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.e))
    .sort((a, b) => a.time - b.time)
  for (const p of pts) {
    const v = (p.e / base - 1) * 100
    const last = out[out.length - 1]
    if (last && last.time === p.time) last.value = v
    else out.push({ time: p.time, value: v })
  }
  return out
}

export function fmtR(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}R`
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

/** "Paper vs backtest" values of one drift check, in the check's own unit. */
export function checkValues(c: DriftCheck): { observed: string; expected: string; range: string } {
  const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : `${v.toFixed(d)}%`)
  const signedPct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)
  switch (c.key) {
    case 'frequency':
      return {
        observed: c.observed === null ? '—' : `${c.observed} entry`,
        expected: c.expected === null ? '—' : `${c.expected.toFixed(1)} entry`,
        range: c.range ? `${c.range[0]}–${c.range[1]}` : '—',
      }
    case 'win_rate':
      return { observed: pct(c.observed), expected: pct(c.expected), range: c.range ? `${pct(c.range[0], 0)}–${pct(c.range[1], 0)}` : '—' }
    case 'trade_return':
      return {
        observed: signedPct(c.observed),
        expected: signedPct(c.expected),
        range: c.range ? `${signedPct(c.range[0])} s/d ${signedPct(c.range[1])}` : '—',
      }
    case 'drawdown':
      return { observed: pct(c.observed), expected: pct(c.expected), range: c.range ? `batas ${pct(c.range[0])}` : '—' }
    default:
      return { observed: fmtR(c.observed), expected: '—', range: '—' }
  }
}

export function lastActionLabel(a: ArenaRow['last_action']): string {
  if (!a) return 'Belum ada'
  const side = a.side === 'long' ? 'Long' : a.side === 'short' ? 'Short' : a.side
  return a.kind === 'open' ? `Buka ${side}` : `Tutup ${side}${a.reason ? ` (${a.reason})` : ''}`
}

export const arenaLinks = (r: ArenaRow) => ({
  preset: `/lab/presets#preset-${r.preset.id}`,
  journal: `/journal?account_id=${r.account.id}`,
  watch: `/chart?watch=${r.watch.id}`,
})
