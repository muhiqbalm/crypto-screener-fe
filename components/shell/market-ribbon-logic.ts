import type { IntelNewsResponse, IntelWhalesResponse } from '@/lib/api/types/intel'
import type { RegimeBrief, RegimeLabel } from '@/lib/api/types/outlook'
import { formatPct, formatUsdCompact } from '@/lib/utils/format'
import { formatDuration } from '@/lib/utils/time'

/** Pure helpers behind <MarketRibbon> (unit-tested). Words follow the glossary. */

export const REGIME_WORD: Record<RegimeLabel, string> = { naik: 'Naik', turun: 'Turun', datar: 'Datar' }

export function regimeWord(r: Pick<RegimeBrief, 'label'> | null | undefined): string | null {
  return r?.label ? REGIME_WORD[r.label] : null
}

/** Fear & Greed 0–100 → Indonesian zone (alternative.me bands). */
export function fearGreedZone(v: number): string {
  if (v < 25) return 'sangat takut'
  if (v < 45) return 'takut'
  if (v <= 55) return 'netral'
  if (v <= 75) return 'serakah'
  return 'sangat serakah'
}

export interface FearGreed {
  value: number
  zone: string
}

export function fearGreed(news: IntelNewsResponse | undefined): FearGreed | null {
  const v = news?.fearAndGreed?.value
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return { value: Math.round(v), zone: fearGreedZone(v) }
}

export interface TraderStance {
  /** Average long share of the top-trader accounts, 0–100. */
  longPct: number
  /** 'long' | 'short' | 'netral' (backend stance code, else from the share). */
  side: 'long' | 'short' | 'netral'
  /** "condong long 56%" / "condong short 58%" / "seimbang (52% long)". */
  text: string
}

export function traderStance(w: IntelWhalesResponse | undefined): TraderStance | null {
  const ratios = (w?.topTraderRatios ?? []).filter((r) => Number.isFinite(r.longPct))
  if (ratios.length === 0) return null
  const longPct = ratios.reduce((s, r) => s + r.longPct, 0) / ratios.length
  const code = w?.smartMoneyStanceCode
  const side: TraderStance['side'] = code === 'bullish' ? 'long' : code === 'bearish' ? 'short' : 'netral'
  const majority = longPct >= 50 ? `${Math.round(longPct)}% long` : `${Math.round(100 - longPct)}% short`
  const text =
    side === 'long'
      ? `condong long ${Math.round(longPct)}%`
      : side === 'short'
        ? `condong short ${Math.round(100 - longPct)}%`
        : `seimbang (${majority})`
  return { longPct, side, text }
}

export interface LargeFlow {
  net: number
  /** "beli > jual" / "jual > beli" / "seimbang". */
  word: string
  /** "+$1.2M". */
  amount: string
  /** "dalam 12 mnt terakhir" or null. */
  window: string | null
}

export function largeFlow(w: IntelWhalesResponse | undefined): LargeFlow | null {
  const net = w?.largeTradeNetUsd
  if (typeof net !== 'number' || !Number.isFinite(net)) return null
  const word = net > 0 ? 'beli > jual' : net < 0 ? 'jual > beli' : 'seimbang'
  const secs = w?.largeTradeWindowSeconds
  return {
    net,
    word,
    amount: formatUsdCompact(net, { signed: true }),
    window: typeof secs === 'number' && secs > 0 ? `dalam ${formatDuration(secs * 1000)} terakhir` : null,
  }
}

export interface FundingInfo {
  /** Average funding in percent per 8 h. */
  rate: number
  text: string
  /** Who pays: long pays short when positive. */
  payer: string
}

export function fundingInfo(avgFundingPct: number | null | undefined): FundingInfo | null {
  if (typeof avgFundingPct !== 'number' || !Number.isFinite(avgFundingPct)) return null
  const payer = avgFundingPct > 0 ? 'long membayar' : avgFundingPct < 0 ? 'short membayar' : 'seimbang'
  return { rate: avgFundingPct, text: formatPct(avgFundingPct, { digits: 4, signed: true }), payer }
}

/** Newest backend snapshot time (epoch seconds) among the ribbon sources, or null. */
export function newestCachedAt(...ts: (number | null | undefined)[]): number | null {
  const ok = ts.filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0)
  return ok.length ? Math.max(...ok) : null
}

/** Plain-text one-liner of the ribbon (screen readers, assistant summary). */
export function ribbonSentence(p: {
  btc: string | null
  eth: string | null
  fg: FearGreed | null
  stance: TraderStance | null
  flow: LargeFlow | null
}): string {
  const parts: string[] = []
  if (p.btc) parts.push(`BTC ${p.btc.toLowerCase()}`)
  if (p.eth) parts.push(`ETH ${p.eth.toLowerCase()}`)
  if (p.fg) parts.push(`takut–serakah ${p.fg.value} (${p.fg.zone})`)
  if (p.stance) parts.push(`trader besar ${p.stance.text}`)
  if (p.flow) parts.push(`transaksi besar ${p.flow.word}`)
  return parts.length ? `Pasar: ${parts.join(', ')}.` : 'Data kondisi pasar tidak tersedia.'
}

