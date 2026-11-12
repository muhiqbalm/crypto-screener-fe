/**
 * Timeframe helpers for the Strategy Lab (15m / 30m / 1h / 4h / 1d).
 * The backend template is the source of truth for which timeframes exist;
 * these helpers only add ordering, data-availability and cost hints.
 */
import type { LabCostProfile, LabMetrics, LabSnooping, LabSymbol } from '@/lib/api/types/lab'

export type { LabCostProfile, LabSnooping }

export const TF_ORDER = ['15m', '30m', '1h', '4h', '1d', '1w'] as const
/** Timeframes where costs eat a large share of each bar's range. */
export const LOWER_TFS = new Set(['15m', '30m'])

export function sortTimeframes(tfs: readonly string[]): string[] {
  const rank = (tf: string) => {
    const i = (TF_ORDER as readonly string[]).indexOf(tf)
    return i === -1 ? TF_ORDER.length : i
  }
  return [...tfs].sort((a, b) => rank(a) - rank(b))
}

/** true / false when the backend told us, null when the symbol is unknown. */
export function hasTimeframeData(symbol: LabSymbol | null | undefined, tf: string): boolean | null {
  if (!symbol) return null
  return symbol.timeframes.includes(tf)
}

/** How many of the given symbols have no cached data for tf yet. */
export function missingDataCount(symbols: readonly LabSymbol[], selected: readonly string[], tf: string): number {
  const bySym = new Map(symbols.map((s) => [s.symbol, s]))
  return selected.filter((s) => !bySym.get(s)?.timeframes.includes(tf)).length
}

export function lowerTfHint(tfs: readonly string[]): string | null {
  const low = tfs.filter((tf) => LOWER_TFS.has(tf))
  if (low.length === 0) return null
  return `${low.join(' / ')}: biaya memakan porsi besar tiap candle dan ujinya lebih lama. Cek "beban biaya" di hasil.`
}

function n(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Reads metrics.costs / oos_metrics.costs (added by the lower-TF backend). */
export function costProfile(m: LabMetrics | null | undefined): LabCostProfile | null {
  const raw = (m as Record<string, unknown> | null | undefined)?.costs
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  return {
    round_trip_cost_pct: n(c.round_trip_cost_pct),
    avg_bar_range_pct: n(c.avg_bar_range_pct),
    cost_to_bar_range: n(c.cost_to_bar_range),
    zero_cost_net_return_pct: n(c.zero_cost_net_return_pct),
    zero_cost_profit_factor: n(c.zero_cost_profit_factor),
    cost_drag_pct: n(c.cost_drag_pct),
    fees_paid: n(c.fees_paid),
    trades_per_month: n(c.trades_per_month),
  }
}

/** Cost burden level: round-trip cost as a share of the average bar range. */
export function costBurdenLevel(ratio: number | null): 'low' | 'medium' | 'high' | null {
  if (ratio === null) return null
  if (ratio >= 0.3) return 'high'
  if (ratio >= 0.15) return 'medium'
  return 'low'
}

/** Warn when the same coin+strategy has been tried on several timeframes / many runs. */
export function snoopingWarning(s: LabSnooping | null | undefined): string | null {
  if (!s) return null
  const tfs = s.timeframes_tested.length
  if (tfs <= 1 && s.validated_runs_all_tf <= 3) return null
  const parts = [`${tfs} timeframe (${sortTimeframes(s.timeframes_tested).join(', ') || '—'})`,
    `${s.validated_runs_all_tf} run validasi/optimasi`]
  if (s.optimizer_trials_all_tf > 0) parts.push(`${s.optimizer_trials_all_tf} percobaan parameter`)
  return `Koin + strategi ini sudah dicoba di ${parts.join(', ')}. Makin banyak kombinasi yang dicoba, makin besar peluang hasil bagus cuma kebetulan (data-snooping) — anggap hasil terbaik lebih optimis dari kenyataan.`
}
