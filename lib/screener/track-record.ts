/**
 * Pure helpers for the screener's "rekam jejak" indicator: which Signal Ledger type a
 * screener label corresponds to, and the honest one-line summary of its record.
 * Mirrors src/lab/ledger/screener.py TYPE_RULES and src/lab/ledger/track_record.py.
 */
import type {
  LedgerDirection,
  SignalTrackRecord,
  TrackHorizon,
  TrackHorizonStats,
  TrackRecordItem,
  TrackVerdict,
} from '@/lib/api/types/ledger'
import type { AssetDetail } from '@/lib/api/types/screener'

export type TrackSignalType = 'komposit' | 'komposit_high' | 'tier_a' | 'tier_c' | 'momentum' | 'funding' | 'oi'

export interface TrackKey {
  type: TrackSignalType
  direction: LedgerDirection
}

const SHORT_LABEL: Record<TrackSignalType, string> = {
  komposit: 'Sinyal komposit',
  komposit_high: 'Komposit keyakinan TINGGI',
  tier_a: 'Tier A',
  tier_c: 'Tier C',
  momentum: 'Momentum 30H',
  funding: 'Funding kontrarian',
  oi: 'OI × harga',
}

export const HORIZON_SHORT: Record<TrackHorizon, string> = { '1d': '1 hari', '3d': '3 hari' }

export const TRACK_VERDICT: Record<TrackVerdict, { label: string; tone: 'bullish' | 'bearish' | 'warn' | 'muted' }> = {
  terbukti: { label: 'Terbukti', tone: 'bullish' },
  negatif: { label: 'Negatif', tone: 'bearish' },
  belum_terbukti: { label: 'Belum terbukti', tone: 'warn' },
  belum_cukup_data: { label: 'Belum cukup data', tone: 'muted' },
}

/** "Tier A long", "Sinyal komposit short". */
export function trackLabel(k: TrackKey): string {
  return `${SHORT_LABEL[k.type]} ${k.direction === 1 ? 'long' : 'short'}`
}

const BULL_BEAR: Record<string, LedgerDirection> = { BULLISH: 1, BEARISH: -1, BUY: 1, SELL: -1 }

function dir(v: string | null | undefined): LedgerDirection | null {
  return v ? (BULL_BEAR[v] ?? null) : null
}

/** Ledger type behind the composite Signal badge (HIGH confidence has its own, more specific record). */
export function compositeKey(a: Pick<AssetDetail, 'signal' | 'confidence_tier'>): TrackKey | null {
  const d = dir(a.signal)
  if (!d) return null
  return { type: a.confidence_tier === 'HIGH' ? 'komposit_high' : 'komposit', direction: d }
}

/** Tier A is recorded as a long signal, Tier C as a short one; Tier B is not a signal. */
export function tierKey(a: Pick<AssetDetail, 'tier'>): TrackKey | null {
  if (a.tier === 'A') return { type: 'tier_a', direction: 1 }
  if (a.tier === 'C') return { type: 'tier_c', direction: -1 }
  return null
}

export function factorKey(type: 'momentum' | 'funding' | 'oi', label: string | null | undefined): TrackKey | null {
  const d = dir(label)
  return d ? { type, direction: d } : null
}

export function findTrack(data: SignalTrackRecord | undefined, k: TrackKey | null): TrackRecordItem | null {
  if (!data?.available || !k) return null
  return data.items.find((i) => i.signal_type === k.type && i.direction === k.direction) ?? null
}

function pct0(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
}

export function signedPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : v < 0 ? '−' : ''
  return `${s}${Math.abs(v).toFixed(digits)}%`
}

export function isEnough(s: TrackHorizonStats | undefined): boolean {
  return !!s && s.verdict !== 'belum_cukup_data'
}

/**
 * One line for the tooltip, e.g.
 * "Tier A long: 1d hit 42% (n=349, 27 hari) — belum terbukti, vs BTC belum terbukti · 3d: negatif, vs BTC belum terbukti".
 */
export function trackLine(k: TrackKey, item: TrackRecordItem | null, h: TrackHorizon = '1d'): string {
  const label = trackLabel(k)
  const s = item?.stats[h]
  if (!item || !s || s.n === 0) return `${label}: belum ada sinyal yang selesai dinilai`
  if (!isEnough(s)) return `${label}: belum cukup data (n=${s.n}, ${s.days} hari; butuh ≥10 sinyal di ≥5 hari)`
  const v = TRACK_VERDICT[s.verdict].label.toLowerCase()
  const vb = TRACK_VERDICT[s.verdict_rel_btc].label.toLowerCase()
  const head = `${label}: ${h} hit ${pct0(s.hit_rate)} (n=${s.n}, ${s.days} hari) — ${v}, vs BTC ${vb}`
  // the secondary horizon only as a verdict; its windows overlap, details live in the panel
  const s3 = h === '1d' ? item.stats['3d'] : undefined
  if (!s3 || !isEnough(s3)) return head
  return `${head} · 3d: ${TRACK_VERDICT[s3.verdict].label.toLowerCase()}, vs BTC ${TRACK_VERDICT[s3.verdict_rel_btc].label.toLowerCase()}`
}

/** Short Indonesian date range, "15 Okt – 11 Nov". */
export function periodLabel(p: { from: string; to: string } | null | undefined): string | null {
  if (!p) return null
  const f = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const a = new Date(p.from)
  const b = new Date(p.to)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return `${f.format(a)} – ${f.format(b)}`
}

/** Screener symbol ("BTC/USDT:USDT", "BTCUSDT") -> ledger symbol ("BTCUSDT"). */
export function ledgerSymbol(sym: string): string {
  return sym.toUpperCase().split(':')[0].replace('/', '')
}

/** /lab/signals pre-filtered to this signal type, long/short split on. */
export function ledgerHref(k: TrackKey, symbol?: string): string {
  const qs = new URLSearchParams({ type: k.type, split: '1' })
  if (symbol) qs.set('symbol', symbol)
  return `/lab/signals?${qs.toString()}`
}
