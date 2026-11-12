/**
 * Pure helpers for the Outlook Koin page (filters, sorting, labels, input parsing).
 * Mirrors the v2 backend (src/lab/outlook/logic.py + calib.py); everything degrades
 * gracefully on rows computed before v2 (no plan / peluang fields).
 */
import type {
  CallStatus,
  EvidenceCode,
  Fase,
  Keyakinan,
  OutlookFactor,
  OutlookInputs,
  OutlookRow,
  PeluangLabel,
  RegimeLabel,
  StrategyClass,
} from '@/lib/api/types/outlook'

export type Arah = 'long' | 'short' | 'netral'
export type PosisiFilter = 'ada' | 'tidak' | null
export interface OutlookFilters {
  arah: Set<Arah>
  keyakinan: Set<Keyakinan>
  posisi: PosisiFilter
  baru: boolean
}
export type OutlookSortKey = 'peluang' | 'symbol' | 'keyakinan' | 'rr' | 'profit_tp' | 'loss_sl' | 'ev'

/** v1 filter names, kept for callers that still use them. */
export type OutlookFilter = 'long' | 'short' | 'fresh' | 'pass'

export const DEFAULT_INPUTS: OutlookInputs = { capital: 1000, leverage: 1, sizing: 'notional', risk_pct: 1 }
export const EMPTY_FILTERS: OutlookFilters = { arah: new Set(), keyakinan: new Set(), posisi: null, baru: false }

export const KEYAKINAN_RANK: Record<Keyakinan, number> = { rendah: 1, sedang: 2, tinggi: 3 }

export type Tone = 'bullish' | 'bearish' | 'warn' | 'info' | 'lab' | 'muted'

export const EVIDENCE_TONE: Record<EvidenceCode, Tone> = {
  lolos_uji: 'bullish',
  terbukti: 'bullish',
  teruji_replay: 'bullish',
  historis: 'info',
  gagal_uji: 'bearish',
  negatif: 'bearish',
  terbalik_replay: 'bearish',
  belum_diuji: 'warn',
  belum_terbukti: 'warn',
  belum_terbukti_replay: 'muted',
  belum_cukup_data: 'muted',
  konteks: 'muted',
  tidak_tersedia: 'muted',
}

export const KEYAKINAN_TONE: Record<Keyakinan, Tone> = { tinggi: 'bullish', sedang: 'info', rendah: 'warn' }
export const FASE_TEXT: Record<Fase, string> = { baru: 'Sinyal baru', berjalan: 'Menyusul' }
export const FASE_HINT: Record<Fase, string> = {
  baru: 'Strategi baru masuk di close 4H terakhir.',
  berjalan: 'Posisi strategi sudah berjalan; masuk sekarang = menyusul (historis jauh lebih lemah).',
}
export const CLASS_TEXT: Record<StrategyClass | 'pool', string> = {
  lolos_uji: 'strategi lolos uji',
  belum_diuji: 'strategi default (belum diuji per koin)',
  gagal_uji: 'strategi gagal uji',
  pool: 'semua strategi out-of-sample',
}
export const PELUANG_TEXT: Record<PeluangLabel, string> = {
  positif: 'Terbukti positif',
  belum_jelas: 'Belum jelas',
  negatif: 'Tanpa keunggulan',
  belum_terukur: 'Belum terukur',
  tidak_ada_sinyal: 'Tidak ada sinyal',
  tidak_valid: 'Tidak valid',
  basi: 'Data basi',
}
export const PELUANG_TONE: Record<PeluangLabel, Tone> = {
  positif: 'bullish',
  belum_jelas: 'muted',
  negatif: 'bearish',
  belum_terukur: 'muted',
  tidak_ada_sinyal: 'muted',
  tidak_valid: 'warn',
  basi: 'warn',
}
export const STATUS_TEXT: Record<CallStatus, string> = {
  none: '—',
  open: 'Berjalan',
  tp: 'TP dulu',
  sl: 'SL dulu',
  batal: 'Dibatalkan',
  expired: 'Habis waktu',
  invalid: 'Tidak valid',
}
export const STATUS_TONE: Record<CallStatus, Tone> = {
  none: 'muted',
  open: 'info',
  tp: 'bullish',
  sl: 'bearish',
  batal: 'muted',
  expired: 'muted',
  invalid: 'warn',
}

export const REGIME_TONE: Record<RegimeLabel, Tone> = { naik: 'bullish', turun: 'bearish', datar: 'muted' }
export const REGIME_TEXT: Record<RegimeLabel, string> = { naik: 'Naik', turun: 'Turun', datar: 'Datar' }

export const FACTOR_SHORT: Record<string, string> = {
  screener: 'Screener',
  tren_1d: 'Tren 1D',
  momentum_1h: 'Mom 1H',
  tren: 'Tren',
  momentum: 'Mom',
  funding: 'Funding',
  oi: 'OI',
  regime: 'BTC',
  berita: 'Berita',
}

export const FACTOR_GROUP_TEXT: Record<'utama' | 'mtf' | 'konteks', string> = {
  utama: 'Strategi (menentukan arah)',
  mtf: 'Konteks multi-timeframe (diuji di simulasi historis)',
  konteks: 'Konteks tambahan (tanpa riwayat untuk diuji)',
}

export function isPass(r: OutlookRow): boolean {
  return r.strategy?.preset?.verdict === 'PASS'
}

export function sideOf(r: OutlookRow): Arah {
  return (r.strategy?.side as Arah | null | undefined) ?? 'netral'
}

export function faseOf(r: OutlookRow): Fase | null {
  if (!r.strategy?.side) return null
  return r.bias?.fase ?? (r.strategy.fresh ? 'baru' : 'berjalan')
}

/** Filters are AND-ed across groups and OR-ed inside a group. */
export function filterRows(rows: OutlookRow[], f: OutlookFilters): OutlookRow[] {
  const any = f.arah.size || f.keyakinan.size || f.posisi || f.baru
  return rows.filter((r) => {
    if (r.unavailable) return !any
    if (f.arah.size && !f.arah.has(sideOf(r))) return false
    if (f.keyakinan.size && !(r.bias?.keyakinan && f.keyakinan.has(r.bias.keyakinan))) return false
    if (f.posisi === 'ada' && !(r.positions && r.positions.length)) return false
    if (f.posisi === 'tidak' && r.positions && r.positions.length) return false
    if (f.baru && !r.strategy?.fresh) return false
    return true
  })
}

/** Rows the "Peluang terbaik" list shows: calls with a measured or pending expected value, best first. */
export function peluangRows(rows: OutlookRow[]): OutlookRow[] {
  return sortRows(rows.filter((r) => !r.unavailable && r.peluang?.eligible), 'peluang', true)
}

function sortValue(r: OutlookRow, key: OutlookSortKey): number | string | null {
  if (r.unavailable) return null
  const p = r.projection
  switch (key) {
    case 'peluang':
      // server rank (1 = best) when present, else expected R
      return r.peluang?.rank ? -r.peluang.rank : r.peluang?.score ?? null
    case 'symbol':
      return r.symbol
    case 'keyakinan':
      return r.bias?.keyakinan ? KEYAKINAN_RANK[r.bias.keyakinan] : null
    case 'rr':
      return r.plan?.rr ?? p?.rr ?? null
    case 'profit_tp':
      return p?.at_tp?.net ?? null
    case 'loss_sl':
      return p?.at_sl?.net ?? null
    case 'ev':
      return r.peluang?.score ?? null
  }
}

/** Nulls always sort last, whatever the direction. */
export function sortRows(rows: OutlookRow[], key: OutlookSortKey, desc: boolean): OutlookRow[] {
  const out = [...rows]
  out.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === null) return vb === null ? a.symbol.localeCompare(b.symbol) : 1
    if (vb === null) return -1
    const c = typeof va === 'string' ? va.localeCompare(String(vb)) : va - (vb as number)
    return (desc ? -c : c) || a.symbol.localeCompare(b.symbol)
  })
  return out
}

export function groupFactors(factors: OutlookFactor[]): Record<'utama' | 'mtf' | 'konteks', OutlookFactor[]> {
  const out: Record<'utama' | 'mtf' | 'konteks', OutlookFactor[]> = { utama: [], mtf: [], konteks: [] }
  for (const f of factors) out[f.group ?? (f.key === 'strategi' ? 'utama' : 'konteks')].push(f)
  return out
}

/** "+0.14R" / "−0.05R" (R = multiple of the distance to SL). */
export function formatR(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = Math.abs(v).toFixed(digits)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${s}R`
}

/** 0.578 -> "58%". */
export function formatProb(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—'
  return `${Math.round(p * 100)}%`
}

/** Parse a user-typed number; returns null when invalid or outside [min, max]. */
export function parseBounded(raw: string, min: number, max: number): number | null {
  const v = Number(String(raw).replace(',', '.').trim())
  if (!Number.isFinite(v) || v < min || v > max) return null
  return v
}

/** "9 Nov 07:00 WIB" from an ISO time (WIB = UTC+7, like the backend narrative). */
export function formatWib(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const d = new Date(t + 7 * 3600_000)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${hh}:${mm} WIB`
}

export function coinLabel(symbol: string): string {
  return symbol.replace(/USDT$/, '')
}
