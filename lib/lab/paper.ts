/**
 * Pure helpers for PAPER trading and the trading journal. Nothing here talks
 * to an exchange; it only sizes / validates / reshapes data for the UI.
 */
import type {
  BreakdownRow,
  JournalEntry,
  PaperAccount,
  PaperPosition,
  PaperSide,
} from '@/lib/api/types/lab'

export const PAPER_LABEL = 'PAPER — bukan order sungguhan'

export interface PaperSize {
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

export interface CompareRow {
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
  const keys = Array.from(new Set([...Object.keys(p), ...Object.keys(b)]))
  return keys.map((metric) => ({ metric, paper: p[metric], backtest: b[metric] }))
}
