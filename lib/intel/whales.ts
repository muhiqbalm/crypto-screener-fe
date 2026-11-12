/**
 * "Arus besar (whale)" — summaries of /api/v1/intel/whales (pure, no React).
 *
 * One rule for "condong": the same band the backend uses for the overall stance
 * (src/services/intel_service.py): more than 55% of top-trader positions long = condong long,
 * less than 45% = condong short, otherwise seimbang. Per coin and overall use the same band,
 * so the summary can never say "seimbang" while every coin says otherwise.
 */
import type { IntelWhalesResponse, TopTraderRatio, WhaleTrade } from '@/lib/api/types/intel'
import { formatUsdCompact } from '@/lib/utils/format'

export const LEAN_LONG_ABOVE = 55
export const LEAN_SHORT_BELOW = 45

export type Lean = 'long' | 'short' | 'seimbang'

export const LEAN_LABEL: Record<Lean, string> = {
  long: 'condong long',
  short: 'condong short',
  seimbang: 'seimbang',
}

export function leanOf(longPct: number | null | undefined): Lean | null {
  if (longPct === null || longPct === undefined || !Number.isFinite(longPct)) return null
  if (longPct > LEAN_LONG_ABOVE) return 'long'
  if (longPct < LEAN_SHORT_BELOW) return 'short'
  return 'seimbang'
}

/** Defensive guards against older backend builds that sent placeholder rows. */
export function liveRatios(ratios: TopTraderRatio[] | undefined): TopTraderRatio[] {
  return (ratios ?? []).filter((r) => r.updated !== 'Cached' && Number.isFinite(r.longPct))
}

export function liveTrades(trades: WhaleTrade[] | undefined): WhaleTrade[] {
  return (trades ?? []).filter((t) => t.id.startsWith('tx-fapi-'))
}

/** `side` is authoritative; legacy payloads only had type ("outflow" = taker buy). */
export function isTakerBuy(tx: WhaleTrade): boolean {
  return tx.side ? tx.side === 'BUY' : tx.type === 'outflow'
}

export function averageLong(ratios: TopTraderRatio[]): number | null {
  if (ratios.length === 0) return null
  return ratios.reduce((s, r) => s + r.longPct, 0) / ratios.length
}

/** "±12 menit" / "±45 detik" for the window the large trades cover. */
export function windowPhrase(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return null
  if (seconds < 120) return `±${Math.round(seconds)} detik`
  if (seconds < 7200) return `±${Math.round(seconds / 60)} menit`
  return `±${Math.round(seconds / 3600)} jam`
}

export type FlowSide = 'beli' | 'jual' | 'seimbang'

/** Which side of the large taker trades dominated; "seimbang" within ±10% of the total. */
export function flowSide(buy: number | null | undefined, sell: number | null | undefined): FlowSide | null {
  if (buy === null || buy === undefined || sell === null || sell === undefined) return null
  if (!Number.isFinite(buy) || !Number.isFinite(sell)) return null
  const total = buy + sell
  if (total <= 0) return 'seimbang'
  const net = (buy - sell) / total
  return net > 0.1 ? 'beli' : net < -0.1 ? 'jual' : 'seimbang'
}

export interface WhaleAnswer {
  lean: Lean | null
  /** Average share of top-trader positions that are long, 0–100. */
  avgLong: number | null
  sentence: string
}

/** The answer line at the top of Arus besar. Never invents a number that is missing. */
export function whaleAnswer(intel: IntelWhalesResponse | null | undefined): WhaleAnswer {
  const ratios = liveRatios(intel?.topTraderRatios)
  const avg = averageLong(ratios)
  const lean = leanOf(avg)
  const coins = ratios.map((r) => r.symbol.replace(/USDT$/, ''))
  const parts: string[] = []
  if (lean && avg !== null) {
    const pct = lean === 'short' ? 100 - avg : avg
    const side = lean === 'short' ? 'short' : 'long'
    const coinList = coins.length > 1 ? `${coins.slice(0, -1).join(', ')} dan ${coins[coins.length - 1]}` : coins[0]
    parts.push(
      lean === 'seimbang'
        ? `Trader besar seimbang: rata-rata ${avg.toFixed(0)}% posisi long di ${coinList}.`
        : `Trader besar ${LEAN_LABEL[lean]}: rata-rata ${pct.toFixed(0)}% posisi ${side} di ${coinList}.`,
    )
  } else {
    parts.push('Data posisi trader besar tidak tersedia saat ini.')
  }
  const side = flowSide(intel?.largeTradeBuyUsd, intel?.largeTradeSellUsd)
  const win = windowPhrase(intel?.largeTradeWindowSeconds)
  if (side) {
    const when = win ? ` ${win} terakhir` : ''
    const amounts = `beli ${formatUsdCompact(intel?.largeTradeBuyUsd)}, jual ${formatUsdCompact(intel?.largeTradeSellUsd)}`
    parts.push(
      side === 'seimbang'
        ? `Transaksi besar${when} seimbang (${amounts}).`
        : `Transaksi besar${when} lebih banyak ${side} (${amounts}).`,
    )
  }
  return { lean, avgLong: avg, sentence: parts.join(' ') }
}
