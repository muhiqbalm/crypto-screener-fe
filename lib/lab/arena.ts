import type { ArenaCurveSeries, ArenaReport, ArenaRow, CheckStatus, DriftCheck } from '@/lib/api/types/arena'
import type { LabId } from '@/lib/api/types/lab'
import type { NormalisedPoint } from '@/lib/lab/planning'
import { exitReasonLabel } from '@/lib/lab/paper'

export type ArenaGroupMode = 'all' | 'coin' | 'family'

/** "Sesuai uji?" per preset / per check (glossary "drift"). */
export const STATUS_COPY: Record<CheckStatus, { label: string; variant: 'info' | 'warn' | 'muted' | 'lab' }> = {
  sesuai: { label: 'Sesuai uji', variant: 'info' },
  menyimpang: { label: 'Menyimpang', variant: 'warn' },
  belum_cukup: { label: 'Belum cukup data', variant: 'muted' },
  info: { label: 'Info', variant: 'lab' },
}

/** Sizing families in a fixed order: 2× (seed mirror), 1×, vol target. Unknown ones go last. */
export const FAMILY_ORDER = ['2x', '1x', 'VT60']
export const FAMILY_LABEL: Record<string, string> = { '2x': 'Ukuran 2× (bawaan)', '1x': 'Ukuran 1×', VT60: 'Ikut gejolak (VT60)' }

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
  if (!a) return 'Belum ada transaksi'
  const side = a.side === 'long' ? 'Long' : a.side === 'short' ? 'Short' : a.side
  return a.kind === 'open' ? `Buka ${side}` : `Tutup ${side}${a.reason ? ` · ${exitReasonLabel(a.reason)}` : ''}`
}

export const arenaLinks = (r: ArenaRow) => ({
  preset: `/lab/presets#preset-${r.preset.id}`,
  journal: `/journal?account_id=${r.account.id}`,
  watch: `/chart?watch=${r.watch.id}`,
})

// ── Paper berjalan: one sentence first, method folded ───────────────────────

/** Default review minimum when the report is not loaded yet (backend REVIEW_MIN_TRADES). */
export const REVIEW_MIN_TRADES = 30

/** Paper is really running: the watch is active and auto-paper is on. */
export const isRunning = (r: ArenaRow): boolean => r.watch.active && r.watch.autopaper_enabled

export type AnswerTone = 'baik' | 'perlu_dicek' | 'menunggu' | 'info'

export interface ArenaAnswer {
  tone: AnswerTone
  text: string
  running: number
  closedTotal: number
  maxClosed: number
  drifting: ArenaRow[]
}

const names = (rows: ArenaRow[], max = 3) => {
  const n = rows.map((r) => r.preset.name)
  return n.length > max ? `${n.slice(0, max).join(', ')} dan ${n.length - max} lainnya` : n.join(', ')
}

/**
 * The page's answer: are the paper presets behaving like their tests? Progress is shown
 * toward the review minimum only (no "siap live" verdict: the CEO has not set that rule).
 */
export function arenaAnswer(r: ArenaReport): ArenaAnswer {
  const rows = r.rows
  const n = rows.length
  const reviewN = r.review_min_trades || REVIEW_MIN_TRADES
  const running = rows.filter(isRunning).length
  const closedTotal = rows.reduce((a, x) => a + x.stats.n_closed, 0)
  const maxClosed = rows.reduce((a, x) => Math.max(a, x.stats.n_closed), 0)
  const drifting = rows.filter((x) => x.drift.status === 'menyimpang')
  const reached = rows.filter((x) => x.stats.n_closed >= reviewN)
  const base = { running, closedTotal, maxClosed, drifting }
  if (n === 0) return { ...base, tone: 'info', text: 'Belum ada preset yang berjalan di paper. Mulai dari halaman Preset.' }
  if (drifting.length > 0) {
    return {
      ...base,
      tone: 'perlu_dicek',
      text: `${drifting.length} dari ${n} preset paper menyimpang dari hasil ujinya: ${names(drifting)}. Buka detailnya sebelum menyimpulkan; satu tanda bisa saja kebetulan.`,
    }
  }
  if (reached.length === 0) {
    return {
      ...base,
      tone: 'menunggu',
      text: `${n} preset berjalan di paper dan belum ada yang menyimpang dari hasil uji. Belum ada yang mencapai ${reviewN} transaksi (terbanyak ${maxClosed}/${reviewN}), jadi hasilnya belum bisa dinilai.`,
    }
  }
  const ok = reached.filter((x) => x.drift.status === 'sesuai').length
  return {
    ...base,
    tone: 'baik',
    text: `${reached.length} dari ${n} preset sudah mencapai ${reviewN} transaksi${ok ? ` dan ${ok} di antaranya sesuai hasil uji` : ''}. Belum ada yang menyimpang.`,
  }
}

/** Plain-language name and meaning of every drift check (no statistics jargon). */
export const CHECK_COPY: Record<DriftCheck['key'], { label: string; what: string }> = {
  frequency: { label: 'Jumlah transaksi', what: 'Seberapa sering paper masuk posisi dibanding saat uji.' },
  win_rate: { label: 'Persentase menang', what: 'Persentase transaksi yang untung dibanding saat uji.' },
  trade_return: { label: 'Hasil per transaksi', what: 'Rata-rata untung/rugi per transaksi (% modal) dibanding saat uji.' },
  drawdown: { label: 'Turun terdalam', what: 'Penurunan terdalam modal paper dibanding batas wajar dari uji.' },
  avg_r: { label: 'Rata-rata R', what: 'Hanya informasi: hasil uji tidak menyimpan R per transaksi.' },
}

/** One sentence per preset, written from the checks (the backend summary is for engineers). */
export function driftPlain(row: ArenaRow, reviewN = REVIEW_MIN_TRADES): string {
  const n = row.stats.n_closed
  if (!row.drift.has_backtest) return 'Preset ini tidak menyimpan hasil uji, jadi belum ada pembanding.'
  if (row.drift.status === 'menyimpang') {
    const bad = row.drift.checks.filter((c) => c.status === 'menyimpang').map((c) => CHECK_COPY[c.key]?.label.toLowerCase() ?? c.label)
    return `Menyimpang dari hasil uji di ${bad.join(', ')}. Satu tanda bisa kebetulan (kira-kira 1 dari 20 per cek), jadi lihat juga cek lainnya.`
  }
  if (row.drift.status === 'sesuai') return `${n} transaksi tertutup dan semua cek masih dalam rentang wajar hasil uji.`
  return `${n}/${reviewN} transaksi tertutup. Belum cukup data untuk menilai; sejauh ini tidak ada cek yang keluar dari rentang wajar.`
}

// ── preset status (Preset page) ────────────────────────────────────────────

export type PresetStatusKind = 'belum_diuji' | 'lolos' | 'gagal' | 'paper' | 'menyimpang'

export const PRESET_STATUS_COPY: Record<PresetStatusKind, { label: string; hint: string }> = {
  belum_diuji: { label: 'Belum diuji', hint: 'Disimpan tanpa rapor uji jujur, jadi belum ada bukti.' },
  lolos: { label: 'Lolos', hint: 'Lolos uji jujur saat disimpan: untung di data baru setelah biaya dan memenuhi semua syarat rapor.' },
  gagal: { label: 'Gagal', hint: 'Gagal uji jujur saat disimpan.' },
  paper: { label: 'Paper berjalan', hint: 'Sinyal preset ini sedang dijalankan di akun simulasi.' },
  menyimpang: { label: 'Menyimpang', hint: 'Hasil paper keluar dari rentang wajar hasil uji preset ini.' },
}

export interface PresetStatus {
  kind: PresetStatusKind
  /** Test verdict saved with the preset (independent of paper). */
  verdict: 'lolos' | 'gagal' | 'belum_diuji'
  /** Progress toward the review minimum while paper runs. */
  progress: { n: number; of: number } | null
  /** Paper row of this preset (running or stopped), if any. */
  row: ArenaRow | null
  /** A paper account exists but auto-paper is off or the watch is inactive. */
  paperStopped: boolean
}

export function arenaRowFor(presetId: LabId, rows: readonly ArenaRow[] | null | undefined): ArenaRow | null {
  const id = Number(presetId)
  return (rows ?? []).find((r) => r.preset.id === id) ?? null
}

/** Belum diuji · Lolos · Gagal from the saved verdict; Paper berjalan / Menyimpang while paper runs. */
export function presetStatus(
  p: { id: LabId; verdict: string | null | undefined },
  rows: readonly ArenaRow[] | null | undefined,
  reviewN = REVIEW_MIN_TRADES,
): PresetStatus {
  const verdict = p.verdict === 'PASS' ? 'lolos' : p.verdict === 'FAIL' ? 'gagal' : 'belum_diuji'
  const row = arenaRowFor(p.id, rows)
  if (row && isRunning(row)) {
    return {
      kind: row.drift.status === 'menyimpang' ? 'menyimpang' : 'paper',
      verdict,
      progress: { n: row.stats.n_closed, of: reviewN },
      row,
      paperStopped: false,
    }
  }
  return { kind: verdict, verdict, progress: null, row, paperStopped: Boolean(row) }
}

// ── ?highlight=<presetId> ──────────────────────────────────────────────────

/**
 * `/lab/arena?highlight=<presetId>` scrolls to that preset and marks it. Used by
 * "Mulai paper" (Preset page) and "Simpan sebagai preset & mulai paper" (run detail).
 * Anything but a plain positive integer is ignored.
 */
export const HIGHLIGHT_PARAM = 'highlight'

export function parseHighlight(v: string | null | undefined): number | null {
  return v && /^\d{1,9}$/.test(v) && Number(v) > 0 ? Number(v) : null
}

export const arenaHref = (presetId?: LabId | null) =>
  presetId === undefined || presetId === null ? '/lab/arena' : `/lab/arena?${HIGHLIGHT_PARAM}=${encodeURIComponent(String(presetId))}`
