/**
 * Pure helpers for the Outlook Koin page (filters, sorting, labels, input parsing).
 */
import type {
  EvidenceCode,
  Keyakinan,
  OutlookInputs,
  OutlookRow,
  RegimeLabel,
} from '@/lib/api/types/outlook'

export type OutlookFilter = 'long' | 'short' | 'fresh' | 'pass'
export type OutlookSortKey = 'symbol' | 'bias' | 'keyakinan' | 'since' | 'profit_tp' | 'loss_sl' | 'rr' | 'support'

export const DEFAULT_INPUTS: OutlookInputs = { capital: 1000, leverage: 1, sizing: 'notional', risk_pct: 1 }

export const KEYAKINAN_RANK: Record<Keyakinan, number> = { rendah: 1, sedang: 2, tinggi: 3 }

export type Tone = 'bullish' | 'bearish' | 'warn' | 'info' | 'lab' | 'muted'

export const EVIDENCE_TONE: Record<EvidenceCode, Tone> = {
  lolos_uji: 'bullish',
  terbukti: 'bullish',
  historis: 'info',
  gagal_uji: 'bearish',
  negatif: 'bearish',
  belum_diuji: 'warn',
  belum_terbukti: 'warn',
  belum_cukup_data: 'muted',
  konteks: 'muted',
  tidak_tersedia: 'muted',
}

export const REGIME_TONE: Record<RegimeLabel, Tone> = { naik: 'bullish', turun: 'bearish', datar: 'muted' }
export const REGIME_TEXT: Record<RegimeLabel, string> = { naik: 'Naik', turun: 'Turun', datar: 'Datar' }

export const FACTOR_SHORT: Record<string, string> = {
  screener: 'Screener',
  tren: 'Tren',
  momentum: 'Mom',
  funding: 'Funding',
  oi: 'OI',
  regime: 'BTC',
  berita: 'Berita',
}

export function isPass(r: OutlookRow): boolean {
  return r.strategy?.preset?.verdict === 'PASS'
}

export function filterRows(rows: OutlookRow[], active: Set<OutlookFilter>): OutlookRow[] {
  return rows.filter((r) => {
    if (r.unavailable) return active.size === 0
    const side = r.strategy?.side
    if (active.has('long') && !active.has('short') && side !== 'long') return false
    if (active.has('short') && !active.has('long') && side !== 'short') return false
    if (active.has('long') && active.has('short') && !side) return false
    if (active.has('fresh') && !r.strategy?.fresh) return false
    if (active.has('pass') && !isPass(r)) return false
    return true
  })
}

function sortValue(r: OutlookRow, key: OutlookSortKey): number | string | null {
  if (r.unavailable) return null
  const p = r.projection
  switch (key) {
    case 'symbol':
      return r.symbol
    case 'bias':
      return r.bias.bias === 'NETRAL' ? 0 : r.bias.bias === 'LONG' ? 2 : 1
    case 'keyakinan':
      return r.bias.keyakinan ? KEYAKINAN_RANK[r.bias.keyakinan] : null
    case 'since':
      return r.strategy.entry_at ?? null
    case 'profit_tp':
      return p?.at_tp?.net ?? null
    case 'loss_sl':
      return p?.at_sl?.net ?? null
    case 'rr':
      return p?.rr ?? null
    case 'support':
      return r.bias.support ?? r.bias.lean ?? null
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
