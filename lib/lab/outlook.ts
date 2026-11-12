/**
 * Pure helpers for the Outlook Koin page (filters, sorting, labels, input parsing).
 * Mirrors the v2 backend (src/lab/outlook/logic.py + calib.py); everything degrades
 * gracefully on rows computed before v2 (no plan / peluang fields).
 */
import { formatTime } from '@/lib/utils/time'
import { termLabel, termValue } from '@/lib/glossary'
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
export const FASE_TEXT: Record<Fase, string> = { baru: 'Posisi baru', berjalan: 'Menyusul' }
export const FASE_HINT: Record<Fase, string> = {
  baru: 'Strategi baru masuk di close 4H terakhir.',
  berjalan: 'Posisi strategi sudah berjalan; masuk sekarang = menyusul (historis jauh lebih lemah).',
}
export const CLASS_TEXT: Record<StrategyClass | 'pool', string> = {
  lolos_uji: 'strategi lolos uji',
  belum_diuji: 'strategi default (belum diuji per koin)',
  gagal_uji: 'strategi gagal uji',
  pool: 'semua strategi di luar data latih',
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

/** "+0.14R" / "−0.05R" (R = multiple of the distance to SL): the app-wide formatter. */
export { formatR } from '@/lib/utils/format'

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

/** "9 Nov 07:00 WIB" (the app-wide WIB formatter; no year so it reads like the backend narrative). */
export function formatWib(iso: string | null | undefined): string {
  return formatTime(iso, { year: false })
}

export function coinLabel(symbol: string): string {
  return symbol.replace(/USDT$/, '')
}

// ── Peluang koin (/koin) helpers ─────────────────────────────────────────

export type KoinView = 'outlook' | 'terkuat' | 'faktor'
export const KOIN_VIEWS: { value: KoinView; label: string }[] = [
  { value: 'outlook', label: 'Outlook' },
  { value: 'terkuat', label: 'Terkuat' },
  { value: 'faktor', label: 'Tabel faktor' },
]

/** ?view= -> tab (anything unknown falls back to the default Outlook view). */
export function parseView(v: string | string[] | undefined | null): KoinView {
  const s = Array.isArray(v) ? v[0] : v
  return s === 'terkuat' || s === 'faktor' ? s : 'outlook'
}

/** ?symbol= of the old /screener link -> text for the Tabel faktor search box ("ethusdt" -> "ETH"). */
export function parseSymbolQuery(v: string | string[] | undefined | null): string {
  const s = (Array.isArray(v) ? v[0] : v) ?? ''
  const clean = s.toUpperCase().replace('/USDT:USDT', 'USDT').replace(/[^A-Z0-9]/g, '').slice(0, 20)
  return coinLabel(clean)
}

/**
 * Screener words inside an Outlook factor ("BULLISH, tier B") in the glossary wording
 * ("naik, kelompok tengah"), so the coin page never shows a second BULLISH/BEARISH verdict.
 */
export function factorValueText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/\b(BULLISH|BEARISH|NEUTRAL)\b/g, (m) => termValue('screener_signal', m))
    .replace(/\btier ([ABC])\b/gi, (_, t: string) => `${termLabel('tier', { short: true }).toLowerCase()} ${termValue('tier', t.toUpperCase())}`)
}

/** Screener-derived factors get the glossary name, so they read as a score, not as a position. */
export function factorLabel(f: Pick<OutlookFactor, 'key' | 'label'>): string {
  return f.key === 'screener' ? termLabel('screener_signal') : f.label
}

export function koinHref(symbol: string): string {
  return `/koin/${encodeURIComponent(coinLabel(symbol.toUpperCase()))}`
}

/** "ETH" / "eth" / "ETHUSDT" -> "ETHUSDT". */
export function symbolFromParam(raw: string): string {
  const s = decodeURIComponent(raw).toUpperCase().replace('/USDT:USDT', 'USDT').replace('/', '')
  return s.endsWith('USDT') ? s : `${s}USDT`
}

/** Which strategy drives the call, in one plain sentence. */
export function driverText(r: OutlookRow): string {
  const st = r.strategy
  const p = st?.preset
  const tf = (st?.timeframe ?? '4h').toUpperCase()
  if (p?.verdict === 'PASS') return `Ikut preset ${p.name} (lolos uji, ${tf}).`
  if (p?.live_reference) return `Ikut ${p.name}: setting yang dipakai bot live, belum diuji ulang di Lab.`
  if (p) return `Ikut preset ${p.name} (${p.verdict === 'FAIL' ? 'gagal uji' : 'belum diuji'}).`
  return 'Setting bawaan Rosyade 4H — belum diuji untuk koin ini.'
}

/** When the live bot runs a different strategy on this coin: "Bot live memakai X (SHORT)". */
export function liveNote(r: OutlookRow): string | null {
  const live = (r.strategies ?? []).find((s) => s.live_reference)
  if (!live || live.primary) return null
  const pos = live.error ? 'tidak terhitung' : live.side ? live.side.toUpperCase() : 'tanpa posisi'
  return `Bot live memakai ${live.name} (${pos}), bukan strategi di atas — arahnya bisa berbeda.`
}

/** Context factors pointing with the call: { k, n } over the available 1D/1H/BTC factors. */
export function kDariN(r: OutlookRow): { k: number; n: number } | null {
  const side = r.strategy?.side
  if (!side) return null
  const sign = side === 'long' ? 1 : -1
  const mtf = (r.factors ?? []).filter((f) => f.group === 'mtf' && f.available)
  return { k: mtf.filter((f) => f.direction * sign > 0).length, n: mtf.length }
}

/** Keyakinan + fase in one short label: "Sedang · sinyal baru". */
export function callLabel(r: OutlookRow): string {
  const k = r.bias?.keyakinan
  const f = faseOf(r)
  return [k ? `Keyakinan ${k}` : null, f ? FASE_TEXT[f].toLowerCase() : null].filter(Boolean).join(' · ')
}

export const INPUTS_KEY = 'bmtm.koin.inputs'

/** Validates a stored JSON string; anything odd falls back to the defaults. */
export function parseInputs(raw: string | null | undefined): OutlookInputs {
  if (!raw) return DEFAULT_INPUTS
  try {
    const v = JSON.parse(raw) as Partial<OutlookInputs>
    const capital = typeof v.capital === 'number' && v.capital >= 1 && v.capital <= 1e9 ? v.capital : DEFAULT_INPUTS.capital
    const leverage = typeof v.leverage === 'number' && v.leverage >= 1 && v.leverage <= 20 ? v.leverage : DEFAULT_INPUTS.leverage
    const sizing = v.sizing === 'risk' ? 'risk' : 'notional'
    const risk_pct = typeof v.risk_pct === 'number' && v.risk_pct > 0 && v.risk_pct <= 10 ? v.risk_pct : DEFAULT_INPUTS.risk_pct
    return { capital, leverage, sizing, risk_pct }
  } catch {
    return DEFAULT_INPUTS
  }
}

/** Capital inputs remembered per viewer (localStorage, never required). */
export function loadInputs(): OutlookInputs {
  try {
    return parseInputs(typeof window !== 'undefined' ? window.localStorage.getItem(INPUTS_KEY) : null)
  } catch {
    return DEFAULT_INPUTS
  }
}

export function saveInputs(i: OutlookInputs): void {
  try {
    window.localStorage.setItem(INPUTS_KEY, JSON.stringify(i))
  } catch {
    // private mode / blocked storage: the default capital still works
  }
}
