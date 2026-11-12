/**
 * Pure helpers for runtime estimates, per-timeframe defaults, compare,
 * leaderboard and presets. No React, so they are unit-tested directly.
 */
import type { LabEquityPoint, LabMetrics, LabRunDetail } from '@/lib/api/types/lab'
import type { LabBoardRow, LabEstimate, LabRunDefaults } from '@/lib/api/types/lab-insights'
import { formatDate } from '@/lib/utils/time'

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

/** 42 → "<1 mnt", 720 → "±12 mnt", 4800 → "±1 jam 20 mnt", 90000 → "±25 jam". */
export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '—'
  if (sec < 60) return '<1 mnt'
  const m = Math.round(sec / 60)
  if (m < 60) return `±${m} mnt`
  const h = Math.floor(m / 60)
  const rest = m - h * 60
  if (h >= 10 || rest === 0) return `±${Math.round(m / 60)} jam`
  return `±${h} jam ${rest} mnt`
}

// ---------------------------------------------------------------------------
// Per-timeframe defaults (backend /run-defaults is the source of truth;
// this mirror is only used while it loads or on an older backend).
// ---------------------------------------------------------------------------

const FALLBACK: Record<string, { years: number | null; nTrials: number }> = {
  '15m': { years: 2, nTrials: 10 },
  '30m': { years: 3, nTrials: 30 },
  '1h': { years: null, nTrials: 30 },
  '4h': { years: null, nTrials: 30 },
  '1d': { years: null, nTrials: 30 },
}

export interface TfDefault {
  start: string
  nTrials: number
  reason: string | null
}

export function tfDefault(tf: string, defaults?: LabRunDefaults | null, today: Date = new Date()): TfDefault {
  const d = defaults?.timeframes?.[tf]
  if (d) return { start: d.start, nTrials: d.n_trials, reason: d.reason }
  const f = FALLBACK[tf] ?? { years: null, nTrials: 30 }
  if (!f.years) return { start: '2020-01-01', nTrials: f.nTrials, reason: null }
  const s = new Date(Date.UTC(today.getUTCFullYear() - f.years, today.getUTCMonth(), today.getUTCDate()))
  return { start: s.toISOString().slice(0, 10), nTrials: f.nTrials, reason: null }
}

// ---------------------------------------------------------------------------
// Estimate → warning level
// ---------------------------------------------------------------------------

export type EstimateLevel = 'ok' | 'long' | 'danger' | 'over'

export function estimateLevel(e: LabEstimate | null | undefined): EstimateLevel {
  if (!e) return 'ok'
  if (e.exceeds_timeout.length > 0) return 'over'
  if (e.near_timeout) return 'danger'
  if (e.long) return 'long'
  return 'ok'
}

/** Danger / over-timeout needs an explicit "I understand" before queueing. */
export function needsAck(level: EstimateLevel): boolean {
  return level === 'danger' || level === 'over'
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

export const MAX_COMPARE = 4

export function parseCompareIds(raw: string | null | undefined): string[] {
  if (!raw) return []
  const out: string[] = []
  for (const p of raw.split(',')) {
    const v = p.trim()
    if (/^\d+$/.test(v) && !out.includes(v)) out.push(v)
    if (out.length >= MAX_COMPARE) break
  }
  return out
}

export function compareHref(ids: readonly (string | number)[]): string {
  return `/lab/compare?ids=${ids.slice(0, MAX_COMPARE).map((x) => encodeURIComponent(String(x))).join(',')}`
}

export function toggleId(list: readonly string[], id: string, max = MAX_COMPARE): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id)
  if (list.length >= max) return [...list]
  return [...list, id]
}

function num(m: LabMetrics | Record<string, unknown> | null | undefined, k: string): number | null {
  const v = (m as Record<string, unknown> | null | undefined)?.[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Full-range metrics: validate/optimize keep them in metrics.full_range; a backtest's metrics ARE full range. */
export function fullMetrics(run: LabRunDetail): Record<string, unknown> | null {
  const fr = (run.metrics as Record<string, unknown> | undefined)?.full_range
  if (fr && typeof fr === 'object') return fr as Record<string, unknown>
  if (run.mode === 'backtest') return run.metrics as Record<string, unknown>
  return null
}

function costDrag(m: Record<string, unknown> | null | undefined): number | null {
  const c = m?.costs
  return c && typeof c === 'object' ? num(c as Record<string, unknown>, 'cost_drag_pct') : null
}

export interface CompareMetricRow {
  key: string
  label: string
  group: 'full' | 'holdout'
  /** Higher is better (true), lower is better (false), or not rankable (null). */
  higher: boolean | null
  values: (number | null)[]
}

const METRICS: { key: string; label: string; higher: boolean | null }[] = [
  { key: 'net_return_pct', label: 'Net return', higher: true },
  { key: 'profit_factor', label: 'Profit factor', higher: true },
  { key: 'max_dd_pct', label: 'Max drawdown', higher: false },
  { key: 'sharpe', label: 'Sharpe', higher: true },
  { key: 'trades', label: 'Trade', higher: null },
  { key: 'cost_drag_pct', label: 'Beban biaya', higher: false },
]

/** Rows for the compare table: full range first, then holdout. DD is compared by magnitude. */
export function compareRows(runs: LabRunDetail[]): CompareMetricRow[] {
  const rows: CompareMetricRow[] = []
  for (const group of ['full', 'holdout'] as const) {
    for (const m of METRICS) {
      const values = runs.map((r) => {
        const src = group === 'full' ? fullMetrics(r) : (r.oos_metrics as Record<string, unknown> | null)
        if (!src) return null
        if (m.key === 'cost_drag_pct') return group === 'full' && r.mode !== 'backtest' ? null : costDrag(src)
        return num(src, m.key)
      })
      rows.push({ key: `${group}.${m.key}`, label: m.label, group, higher: m.higher, values })
    }
  }
  return rows
}

/** Index of the best value in a row (null when <2 values or not rankable). DD/cost by magnitude. */
export function bestIndex(row: Pick<CompareMetricRow, 'higher' | 'values'>): number | null {
  if (row.higher === null) return null
  const score = (v: number) => (row.higher ? v : -Math.abs(v))
  let best = -1
  let n = 0
  for (let i = 0; i < row.values.length; i++) {
    const v = row.values[i]
    if (v === null) continue
    n++
    if (best === -1 || score(v) > score(row.values[best] as number)) best = i
  }
  return n >= 2 ? best : null
}

export interface NormalisedPoint {
  time: number
  value: number
}

/** Equity → % change since the first point (so runs with different balances overlay). */
export function normaliseEquity(points: LabEquityPoint[]): NormalisedPoint[] {
  const sorted = points
    .map((p) => ({ t: Math.floor(Date.parse(p.t) / 1000), e: p.equity }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.e))
    .sort((a, b) => a.t - b.t)
  const base = sorted.find((p) => p.e > 0)?.e
  if (!base) return []
  const out: NormalisedPoint[] = []
  for (const p of sorted) {
    const v = (p.e / base - 1) * 100
    const last = out[out.length - 1]
    if (last && last.time === p.t) last.value = v
    else out.push({ time: p.t, value: v })
  }
  return out
}

// ---------------------------------------------------------------------------
// Leaderboard / snooping
// ---------------------------------------------------------------------------

export function attemptsLabel(a: LabBoardRow['attempts']): string {
  const parts = [`${a.runs} run`, `${a.timeframes} TF`]
  if (a.trials > 0) parts.push(`${a.trials} percobaan`)
  return parts.join(' · ')
}

/** Warning for the top of the leaderboard: the #1 out of many tries is optimistic. */
export function boardSnoopingWarning(summary: { runs: number; trials: number; combinations: number }): string | null {
  if (summary.runs < 5 && summary.trials < 100) return null
  const t = summary.trials > 0 ? ` dan ${summary.trials.toLocaleString('en-US')} percobaan parameter` : ''
  return `Peringkat ini memilih yang terbaik dari ${summary.runs} run (${summary.combinations} kombinasi koin × TF)${t}. Makin banyak yang dicoba, makin besar peluang juara #1 cuma beruntung — paper trade dulu sebelum percaya.`
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const PRESET_LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9_.]{0,23}$/

export function presetName(timeframe: string, symbol: string, label: string): string {
  const coin = symbol.toUpperCase().replace(/USDT$/, '')
  return `${timeframe.toUpperCase()}-${coin}-${label}`
}

/** Suggest the next free label: Opt1, Opt2… for an optimize run, else Val1… */
export function suggestLabel(mode: string, taken: readonly string[]): string {
  const base = mode === 'optimize' ? 'Opt' : mode === 'validate' ? 'Val' : 'Bt'
  for (let i = 1; i < 1000; i++) if (!taken.includes(`${base}${i}`)) return `${base}${i}`
  return `${base}X`
}

/** Strategy family name shown neutrally (template name from the backend). */
export function familyName(templateName: string | null | undefined): string {
  return templateName?.trim() || 'Rosyade family'
}

// ---------------------------------------------------------------------------
// Paper berjalan hand-off (contract with the W3b arena page)
// ---------------------------------------------------------------------------

/**
 * After "Simpan sebagai preset & mulai paper" the user lands on Paper berjalan with that preset
 * highlighted. Contract: `/lab/arena?highlight=<presetId>` (the arena page reads `highlight` and
 * scrolls to / marks the row of that preset; unknown ids are ignored).
 */
export function arenaHighlightHref(presetId: string | number): string {
  return `/lab/arena?highlight=${encodeURIComponent(String(presetId))}`
}

// ---------------------------------------------------------------------------
// Holdout lock, checked before a run is queued (mirror of backend honesty.resolve_holdout)
// ---------------------------------------------------------------------------

export const HOLDOUT_FRACTION = 0.2
const MIN_DEV_DAYS = 60

/** Start of the last 20 % of [start, end): where a first validation would lock the holdout. */
export function proposedHoldoutStart(start: string, end: string | null | undefined, now: Date = new Date()): string | null {
  const a = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(start) ? `${start}T00:00:00Z` : start)
  const b = end ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(end) ? `${end}T00:00:00Z` : end) : now.getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  return new Date(a + (b - a) * (1 - HOLDOUT_FRACTION)).toISOString().slice(0, 10)
}

/**
 * Indonesian error when the chosen period cannot respect a locked holdout, else null. Same
 * three rules as the backend, so the run does not fail after it was queued.
 */
export function holdoutPeriodError(
  lockStart: string | null | undefined,
  start: string,
  end: string,
): string | null {
  if (!lockStart || !start) return null
  const hs = Date.parse(lockStart)
  const a = Date.parse(`${start}T00:00:00Z`)
  if (!Number.isFinite(hs) || !Number.isFinite(a)) return null
  const day = formatDate(lockStart)
  if (end) {
    const b = Date.parse(`${end}T00:00:00Z`)
    if (Number.isFinite(b) && b <= hs) return `Periode harus lewat dari ${day}, awal data baru yang terkunci.`
  }
  if (a >= hs) return `Periode mulai di dalam data baru yang terkunci (sejak ${day}). Pilih tanggal mulai sebelum itu.`
  if (hs - a < MIN_DEV_DAYS * 86_400_000) return `Data latih sebelum ${day} kurang dari ${MIN_DEV_DAYS} hari. Mulai lebih awal.`
  return null
}
