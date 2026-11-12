/**
 * Pure helpers for PAPER trading and the trading journal. Nothing here talks
 * to an exchange; it only sizes / validates / reshapes data for the UI.
 */
import type {
  BreakdownRow,
  JournalEntry,
  JournalFilters,
  PaperAccount,
  PaperPosition,
  PaperSide,
} from '@/lib/api/types/lab'

export const PAPER_LABEL = 'PAPER — bukan order sungguhan'

interface PaperSize {
  riskAmount: number
  qty: number
  notional: number
  leverage: number
  /** True when the risk-based size had to be cut to respect leverage_max. */
  capped: boolean
}

/**
 * Risk-based position size: risk = equity × risk%; qty = risk / |entry − SL|,
 * capped so notional / equity ≤ leverage_max. Returns null when inputs are
 * missing or nonsensical (never guesses).
 */
export function computePaperSize(args: {
  equity: number | null | undefined
  riskPct: number | null | undefined
  leverageMax: number | null | undefined
  entry: number | null | undefined
  sl: number | null | undefined
}): PaperSize | null {
  const { equity, riskPct, leverageMax, entry, sl } = args
  if (![equity, riskPct, entry, sl].every((v) => typeof v === 'number' && Number.isFinite(v))) return null
  if (equity! <= 0 || riskPct! <= 0 || entry! <= 0 || sl! <= 0) return null
  const dist = Math.abs(entry! - sl!)
  if (dist === 0) return null
  const riskAmount = (equity! * riskPct!) / 100
  let qty = riskAmount / dist
  let capped = false
  if (typeof leverageMax === 'number' && Number.isFinite(leverageMax) && leverageMax > 0) {
    const maxQty = (equity! * leverageMax) / entry!
    if (qty > maxQty) {
      qty = maxQty
      capped = true
    }
  }
  const notional = qty * entry!
  return { riskAmount: capped ? qty * dist : riskAmount, qty, notional, leverage: notional / equity!, capped }
}

export function validatePaperOrder(args: {
  side: PaperSide | null
  price: number | null
  sl: string
  tp: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!args.side) errors.side = 'Pilih Long atau Short'
  const sl = Number(args.sl)
  if (args.sl.trim() === '' || !Number.isFinite(sl) || sl <= 0) errors.sl = 'SL wajib diisi (angka > 0)'
  const tp = args.tp.trim() === '' ? null : Number(args.tp)
  if (tp !== null && (!Number.isFinite(tp) || tp <= 0)) errors.tp = 'TP harus angka > 0'
  if (args.price === null || !Number.isFinite(args.price)) {
    errors.price = 'Harga live belum tersedia'
    return errors
  }
  if (args.side && !errors.sl) {
    if (args.side === 'long' && sl >= args.price) errors.sl = 'SL long harus di bawah harga sekarang'
    if (args.side === 'short' && sl <= args.price) errors.sl = 'SL short harus di atas harga sekarang'
  }
  if (args.side && tp !== null && !errors.tp) {
    if (args.side === 'long' && tp <= args.price) errors.tp = 'TP long harus di atas harga sekarang'
    if (args.side === 'short' && tp >= args.price) errors.tp = 'TP short harus di bawah harga sekarang'
  }
  return errors
}

/**
 * Open paper positions for a symbol. Prefers the account's `open_positions`
 * list when the backend sends one; otherwise uses journal rows without an
 * exit (assumes the journal id is the position id used by /close).
 */
export function openPaperPositions(
  account: PaperAccount | null | undefined,
  journal: JournalEntry[] | null | undefined,
  symbol: string,
): PaperPosition[] {
  if (account && Array.isArray(account.open_positions)) {
    return account.open_positions.filter((p) => p.symbol === symbol)
  }
  return (journal ?? [])
    .filter(
      (j) =>
        j.exit_time === null &&
        j.symbol === symbol &&
        (j.source === 'paper_manual' || j.source === 'paper_auto') &&
        (!account || j.account_id === account.id),
    )
    .map((j) => ({
      id: j.id,
      symbol: j.symbol,
      side: (j.side.toLowerCase() === 'short' ? 'short' : 'long') as PaperSide,
      entry_price: j.entry_price,
      entry_time: j.entry_time,
      qty: j.qty ?? 0,
      sl: j.sl,
      tp: j.tp,
      watch_id: j.watch_id,
    }))
}

export function openPositionCount(account: PaperAccount): number {
  return Array.isArray(account.open_positions) ? account.open_positions.length : account.open_positions
}

/** Unrealised P&L in quote currency (USDT) for a paper position. */
export function unrealisedPnl(pos: { side: string; entry_price: number; qty: number }, price: number | null): number | null {
  if (price === null || !Number.isFinite(price) || !Number.isFinite(pos.qty)) return null
  const dir = pos.side.toLowerCase() === 'short' ? -1 : 1
  return (price - pos.entry_price) * pos.qty * dir
}

/**
 * Win rate as a percentage. The contract field is `winrate` without a unit;
 * values ≤ 1 are treated as a fraction (0.55 → 55%).
 */
export function winratePct(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null
  return v <= 1 ? v * 100 : v
}

export interface NormalizedBreakdown {
  key: string
  trades: number | null
  winrate: number | null
  net_pnl: number | null
  avg_r: number | null
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Accepts a list of rows or a map keyed by name; returns a uniform list. */
export function normalizeBreakdown(
  input: BreakdownRow[] | Record<string, BreakdownRow> | null | undefined,
  keyField: string,
): NormalizedBreakdown[] {
  if (!input) return []
  const rows: [string, BreakdownRow][] = Array.isArray(input)
    ? input.map((r) => [String(r[keyField] ?? r.key ?? r.name ?? '—'), r])
    : Object.entries(input).map(([k, r]) => [k, (r && typeof r === 'object' ? r : { value: r }) as BreakdownRow])
  return rows
    .map(([key, r]) => ({
      key,
      trades: num(r.trades),
      winrate: winratePct(num(r.winrate)),
      net_pnl: num(r.net_pnl ?? r.pnl),
      avg_r: num(r.avg_r),
    }))
    .sort((a, b) => (b.net_pnl ?? -Infinity) - (a.net_pnl ?? -Infinity))
}

/** Parses "a, b ,c" into unique trimmed tags. */
export function parseTags(s: string): string[] {
  return Array.from(new Set(s.split(',').map((t) => t.trim()).filter(Boolean)))
}

interface CompareRow {
  metric: string
  paper: unknown
  backtest: unknown
}

/**
 * Best-effort reshape of GET /watches/{id}/compare. If it has `paper` and
 * `backtest` objects, rows are the union of their keys; otherwise null and
 * the UI renders the raw key/values.
 */
export function compareRows(c: Record<string, unknown> | null | undefined): CompareRow[] | null {
  if (!c) return null
  const paper = c.paper
  const backtest = c.backtest
  if (!paper || !backtest || typeof paper !== 'object' || typeof backtest !== 'object') return null
  const p = paper as Record<string, unknown>
  const b = backtest as Record<string, unknown>
  const scalar = (v: unknown) => v === null || v === undefined || ['number', 'string', 'boolean'].includes(typeof v)
  // Lists/objects (entries, trades_list, position) are detail, not comparable metrics.
  const keys = Array.from(new Set([...Object.keys(p), ...Object.keys(b)])).filter((k) => scalar(p[k]) && scalar(b[k]))
  return keys.map((metric) => ({ metric, paper: p[metric], backtest: b[metric] }))
}

export const COMPARE_LABEL: Record<string, string> = {
  trades: 'Jumlah transaksi',
  open_positions: 'Posisi terbuka',
  winrate: 'Persentase menang',
  profit_factor: 'PF (rasio untung/rugi)',
  net_pnl: 'Hasil bersih (USDT)',
  net_return_pct: 'Hasil bersih (%)',
  avg_r: 'Rata-rata R',
}

// ── Mulai paper: account sizing that mirrors the preset's backtest ──────────

/** Default simulated starting balance for a new paper account (USDT). */
export const PAPER_START_BALANCE = 10_000

/** Name of the account created by "Mulai paper" (same rule as ops/lab_seed_presets.py). */
export function paperAccountName(presetName: string): string {
  return `Paper ${presetName}`.slice(0, 80)
}

export type MirrorSizing =
  | { ok: true; risk_pct: number; leverage_max: number; mode: string; summary: string }
  | { ok: false; reason: string }

const numParam = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * risk_pct / leverage_max for a paper account that sizes trades like the preset's
 * backtest, so "Sesuai uji?" in Paper berjalan compares like with like. Same rule as
 * `paper_sizing` in ops/lab_seed_presets.py (the seed of the existing paper presets):
 *
 *   margin (Rosyade live): notional = leverage × portfolio_risk% of equity → risk 100%, cap = that multiple
 *   risk:                  risk_pct = risk_per_trade_pct, cap = max_notional_mult
 *   vol_target:            risk 100%, cap = max_notional_mult (auto-paper copies the engine's multiple)
 *
 * `params` may be partial: missing keys fall back to `defaults` (the template defaults).
 * The paper engine itself is untouched; this only picks the account settings.
 */
export function mirrorSizing(
  params: Record<string, unknown> | null | undefined,
  defaults: Record<string, unknown> = {},
): MirrorSizing {
  const p = { ...defaults, ...(params ?? {}) }
  const mode = String(p.sizing_mode ?? 'margin')
  if ((numParam(p.dd_derisk_pct) ?? 0) > 0) {
    return { ok: false, reason: 'Preset ini mengecilkan posisi saat drawdown. Cara itu belum bisa ditiru di paper.' }
  }
  let risk: number | null = null
  let cap: number | null = null
  if (mode === 'margin') {
    const lev = numParam(p.leverage)
    const share = numParam(p.portfolio_risk)
    if (lev !== null && share !== null) {
      risk = 100
      cap = Math.round(lev * share * 100) / 10_000
    }
  } else if (mode === 'risk') {
    risk = numParam(p.risk_per_trade_pct)
    cap = numParam(p.max_notional_mult)
  } else if (mode === 'vol_target') {
    risk = 100
    cap = numParam(p.max_notional_mult)
  } else {
    return { ok: false, reason: `Cara menentukan ukuran posisi "${mode}" belum bisa ditiru di paper.` }
  }
  if (risk === null || cap === null || !(risk > 0) || risk > 100) {
    return { ok: false, reason: 'Parameter ukuran posisi preset ini tidak lengkap, jadi paper tidak bisa meniru uji.' }
  }
  if (cap < 1 || cap > 125) {
    return { ok: false, reason: `Ukuran posisi preset ini ${formatMult(cap)} modal. Akun paper hanya mendukung 1× sampai 125×.` }
  }
  const summary =
    mode === 'risk'
      ? `risiko ${formatMult(risk, '%')} per trade, posisi maks. ${formatMult(cap)} modal`
      : mode === 'vol_target'
        ? `ikut gejolak (seperti uji), posisi maks. ${formatMult(cap)} modal`
        : `posisi ${formatMult(cap)} modal (seperti uji)`
  return { ok: true, risk_pct: risk, leverage_max: cap, mode, summary }
}

function formatMult(v: number, unit = '×'): string {
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${s}${unit}`
}

/**
 * Reuse an existing account named like the new one only when it was never used
 * (no trades, no open positions, balance untouched): a retry after a failed start
 * must not leave orphan accounts, but old history must never be mixed in.
 */
export function reusablePaperAccount(accounts: PaperAccount[] | null | undefined, name: string): PaperAccount | null {
  for (const a of accounts ?? []) {
    const start = a.starting_balance ?? null
    const untouched =
      a.name === name &&
      openPositionCount(a) === 0 &&
      Math.abs(a.realized_pnl ?? 0) < 1e-9 &&
      start !== null &&
      Math.abs(a.balance - start) < 1e-9
    if (untouched) return a
  }
  return null
}

// ── Jurnal: paper by default, live-bot trades only on request ────────────────

/** Journal source → one label per concept (glossary "trade_source"). */
export const JOURNAL_SOURCE_LABEL: Record<string, string> = {
  paper_manual: 'Simulasi manual',
  paper_auto: 'Simulasi otomatis',
  bot: 'Bot live (uang asli)',
}

export const isLiveSource = (source: string | null | undefined): boolean => source === 'bot'

/** Exit reasons stored by the paper engine, the live-bot import and Universal. */
const EXIT_LABEL: Record<string, string> = {
  hard_tp: 'Kena target (TP)',
  hard_sl: 'Kena batal jika (SL)',
  tp: 'Kena target (TP)',
  sl: 'Kena batal jika (SL)',
  manual_close: 'Ditutup manual',
  strategy_reverse: 'Strategi berbalik arah',
  universal_rebalance: 'Rebalance Universal',
  bot_close: 'Ditutup bot live',
}

export function exitReasonLabel(reason: string | null | undefined): string {
  if (!reason) return 'tidak tersedia'
  if (EXIT_LABEL[reason]) return EXIT_LABEL[reason]
  if (reason.startsWith('strategy_exit')) {
    const why = reason.split(':')[1]
    return !why || why === 'flat' ? 'Strategi keluar' : `Strategi keluar (${why.replace(/_/g, ' ')})`
  }
  return reason.replace(/_/g, ' ')
}

/** Journal list page size and the backend's hard cap. */
export const JOURNAL_PAGE = 200
export const JOURNAL_MAX = 5000

export interface JournalQuery extends JournalFilters {
  limit?: number
  order?: 'asc' | 'desc'
  exclude_source?: string
}

const compact = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')) as T

/**
 * GET /journal params: newest first. Live-bot trades are left out unless the user
 * switched them on (or picked the live source explicitly).
 */
export function journalListQuery(f: JournalFilters, opts: { includeLive: boolean; limit: number }): JournalQuery {
  const live = opts.includeLive || f.source === 'bot'
  return compact({ ...f, limit: Math.min(Math.max(1, opts.limit), JOURNAL_MAX), order: 'desc' as const, exclude_source: live ? undefined : 'bot' })
}

/**
 * GET /journal/stats params: the same filters as the list, but always one kind of
 * money. Paper statistics never include live-bot trades; picking the live source
 * gives live-only statistics (labelled LIVE in the UI).
 */
export function journalStatsQuery(f: JournalFilters): JournalQuery {
  return compact({ ...f, exclude_source: f.source === 'bot' ? undefined : 'bot' })
}

/** Template defaults as a params object (for mirrorSizing when a preset stores only overrides). */
export function templateDefaults(t: { params: { key: string; default: unknown }[] } | null | undefined): Record<string, unknown> {
  return Object.fromEntries((t?.params ?? []).map((p) => [p.key, p.default]))
}
