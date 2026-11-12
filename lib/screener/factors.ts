/**
 * Plain-Indonesian labels for the screener's "Tabel faktor" (glossary §4.1 of the UX audit):
 * signal direction, tier as a relative third, the score as a position among the coins, and
 * the 5 factors with their weights (mirrors be: src/signals/scorer.py, weights 30/25/20/15/10).
 */
import type { AssetDetail, SignalDirection, TierClass } from '@/lib/api/types/screener'

export type Arah = 'naik' | 'turun' | 'netral'

export const SIGNAL_TEXT: Record<SignalDirection, Arah> = { BULLISH: 'naik', BEARISH: 'turun', NEUTRAL: 'netral' }
export const SIGNAL_TONE: Record<SignalDirection, 'bullish' | 'bearish' | 'muted'> = {
  BULLISH: 'bullish',
  BEARISH: 'bearish',
  NEUTRAL: 'muted',
}

export const TIER_TEXT: Record<TierClass, string> = {
  A: 'Kelompok atas',
  B: 'Kelompok tengah',
  C: 'Kelompok bawah',
}
export const TIER_HINT =
  'Sepertiga koin dengan skor tertinggi (atas), tengah, dan terendah (bawah) — relatif terhadap koin lain, ' +
  'jadi di pasar yang sedang turun kelompok atas pun bisa tetap lemah.'

export const SCORE_HINT =
  'Skor screener: gabungan 5 faktor (momentum 30 hari 30%, funding 25%, OI 20%, rasio long/short 15%, ' +
  'pembalikan 1 hari 10%) dibanding koin lain. Yang penting posisinya di antara koin lain, bukan angkanya.'

export const CONFIDENCE_TEXT: Record<'HIGH' | 'MEDIUM' | 'LOW', string> = {
  HIGH: 'kompak',
  MEDIUM: 'cukup kompak',
  LOW: 'tidak kompak',
}

export interface FactorInfo {
  key: 'momentum' | 'funding' | 'oi' | 'lsr' | 'reversal'
  label: string
  weight: number
  hint: string
}

export const FACTORS: FactorInfo[] = [
  { key: 'momentum', label: 'Momentum 30 hari', weight: 30, hint: 'Arah dan kekuatan gerak harga 30 hari terakhir; diredam bila sudah jauh dari rata-rata 50 hari.' },
  { key: 'funding', label: 'Funding (dibaca terbalik)', weight: 25, hint: 'Funding sangat positif = long ramai (rawan turun); sangat negatif = short ramai (rawan naik).' },
  { key: 'oi', label: 'OI (posisi terbuka pasar)', weight: 20, hint: 'Perubahan total kontrak terbuka (dalam dolar) dibanding arah harga.' },
  { key: 'lsr', label: 'Rasio long/short', weight: 15, hint: 'Perbandingan akun long dan short; di atas 1 berarti lebih banyak long.' },
  { key: 'reversal', label: 'Pembalikan 1 hari', weight: 10, hint: 'Tanda harga sudah naik/turun terlalu jauh dalam sehari dan bisa berbalik.' },
]

export function signalArah(sig: SignalDirection | null | undefined): Arah | null {
  return sig ? SIGNAL_TEXT[sig] : null
}

/** "BUY/SELL/HOLD" of the momentum factor in plain words. */
export function momentumText(sig: 'BUY' | 'SELL' | 'HOLD' | null | undefined): string {
  if (sig === 'BUY') return 'naik'
  if (sig === 'SELL') return 'turun'
  if (sig === 'HOLD') return 'netral'
  return 'tidak tersedia'
}

export function lsrText(lsr: number | null | undefined): string {
  if (lsr === null || lsr === undefined || !Number.isFinite(lsr)) return 'tidak tersedia'
  if (lsr > 1.5) return 'long ramai'
  if (lsr < 0.8) return 'short ramai'
  return 'seimbang'
}

/** Position of a coin by composite score among the coins that have one: { pos: 1-based, n }. */
export function scorePosition(asset: AssetDetail, all: AssetDetail[]): { pos: number; n: number } | null {
  const scored = all.filter((a) => a.composite_score !== null && a.composite_score !== undefined && Number.isFinite(a.composite_score))
  if (asset.composite_score === null || asset.composite_score === undefined) return null
  const sorted = [...scored].sort((a, b) => (b.composite_score as number) - (a.composite_score as number))
  const pos = sorted.findIndex((a) => a.symbol === asset.symbol)
  return pos < 0 ? null : { pos: pos + 1, n: sorted.length }
}

/** 0..1 where 1 = best score among the coins (for a small position bar). */
export function scoreFraction(p: { pos: number; n: number } | null): number | null {
  if (!p || p.n <= 1) return p ? 1 : null
  return 1 - (p.pos - 1) / (p.n - 1)
}

/** Find the screener asset for a symbol ("ETH", "ETHUSDT", "ETH/USDT:USDT"). */
export function findAsset(all: AssetDetail[] | null | undefined, symbol: string): AssetDetail | null {
  if (!all) return null
  const want = symbol.toUpperCase().replace('/USDT:USDT', 'USDT').replace('/', '')
  const full = want.endsWith('USDT') ? want : `${want}USDT`
  return all.find((a) => a.symbol.toUpperCase().replace('/', '') === full) ?? null
}
