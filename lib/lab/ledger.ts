/** Pure helpers for the Signal Ledger page (labels, honesty copy, formatting). */
import { formatPct } from '@/lib/utils/format'
import type {
  LedgerFilters,
  LedgerGroup,
  LedgerHorizon,
  LedgerHorizonStats,
  LedgerSample,
  LedgerSource,
  LedgerVerdict,
} from '@/lib/api/types/ledger'

export const HORIZON_LABEL: Record<LedgerHorizon, string> = {
  '4h': '4 jam',
  '1d': '1 hari',
  '3d': '3 hari',
  '7d': '7 hari',
}

export const SOURCE_LABEL: Record<LedgerSource, string> = {
  screener: 'Screener (live)',
  screener_rekon: 'Screener (rekonstruksi)',
  lab_watch: 'Pantau Lab',
  universal: 'Universal (arsip)',
  webhook: 'Webhook TradingView',
}

const TYPE_LABEL: Record<string, string> = {
  komposit: 'Sinyal komposit (Bullish/Bearish)',
  komposit_high: 'Komposit + keyakinan TINGGI',
  tier_a: 'Masuk Tier A → Long',
  tier_c: 'Masuk Tier C → Short',
  momentum: 'Momentum 30 hari (BUY/SELL)',
  funding: 'Funding kontrarian',
  oi: 'OI × harga',
  tv_open: 'Alert open',
  universal_v0: 'Masuk / balik posisi',
}

/** "rosyade_family_4h" → "Rosyade family 4H"; known keys get their Indonesian label. */
export function typeLabel(t: string): string {
  if (TYPE_LABEL[t]) return TYPE_LABEL[t]
  const m = /^(.*)_(\d+[mhd])$/.exec(t)
  const base = (m ? m[1] : t).replace(/_/g, ' ')
  const pretty = base.charAt(0).toUpperCase() + base.slice(1)
  return m ? `${pretty} ${m[2].toUpperCase()}` : pretty
}

export const SAMPLE_COPY: Record<LedgerSample, { label: string; tone: 'muted' | 'bearish' | 'warn' | 'info' }> = {
  none: { label: 'Belum ada hasil', tone: 'muted' },
  too_few: { label: 'Terlalu sedikit', tone: 'bearish' },
  small: { label: 'Sampel kecil', tone: 'warn' },
  ok: { label: 'Sampel cukup', tone: 'info' },
}

export const VERDICT_COPY: Record<LedgerVerdict, { label: string; tone: 'muted' | 'bullish' | 'bearish' | 'warn'; hint: string }> = {
  insufficient: {
    label: 'Belum cukup data',
    tone: 'muted',
    hint: 'Butuh minimal 10 sinyal yang sudah dinilai, tersebar di minimal 5 hari berbeda.',
  },
  inconclusive: {
    label: 'Belum terbukti',
    tone: 'warn',
    hint: 'Rentang ketidakpastian masih mencakup nol: belum bisa dibedakan dari kebetulan.',
  },
  positive: {
    label: 'Terbukti',
    tone: 'bullish',
    hint: 'Rentang ketidakpastian seluruhnya di atas nol, sebelum biaya. Petunjuk, bukan jaminan: cek juga "dibanding BTC" dan periodenya.',
  },
  negative: {
    label: 'Negatif',
    tone: 'bearish',
    hint: 'Rentang ketidakpastian seluruhnya di bawah nol: sinyal ini cenderung salah arah (sebelum biaya).',
  },
}

export function pct(v: number | null | undefined, digits = 2): string {
  // Shared formatter: real minus sign "−", same as every other page (audit 2026-11-13 K15).
  return formatPct(v, { digits, signed: true })
}

/** Hit rate as "54%" (fraction in, whole percent out). */
export function hitPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${Math.round(v * 100)}%`
}

export function hitCi(ci: [number, number] | null | undefined): string {
  if (!ci) return ''
  return `${Math.round(ci[0] * 100)}–${Math.round(ci[1] * 100)}%`
}

export function retCi(ci: [number, number] | null | undefined): string {
  if (!ci) return ''
  return `${pct(ci[0])} … ${pct(ci[1])}`
}

/** A group is "thin" when the selected horizon has fewer than 10 scored signals. */
export function isThin(s: LedgerHorizonStats | undefined): boolean {
  return !s || s.sample === 'none' || s.sample === 'too_few'
}

/** Sort: groups with data first (by n desc), then by source/type. */
export function sortGroups(groups: LedgerGroup[], h: LedgerHorizon): LedgerGroup[] {
  return [...groups].sort((a, b) => {
    const na = a.horizons[h]?.n ?? 0
    const nb = b.horizons[h]?.n ?? 0
    if ((na >= 10) !== (nb >= 10)) return na >= 10 ? -1 : 1
    if (a.source !== b.source) return a.source.localeCompare(b.source)
    if (a.signal_type !== b.signal_type) return a.signal_type.localeCompare(b.signal_type)
    return (b.direction ?? 0) - (a.direction ?? 0)
  })
}

/** Days between two ISO timestamps, rounded down (for "dicatat sejak N hari"). */
export function daysBetween(fromIso: string | null | undefined, now: number = Date.now()): number | null {
  if (!fromIso) return null
  const t = Date.parse(fromIso)
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((now - t) / 86_400_000))
}

// ── URL filters (/lab/signals?source=&type=&symbol=&since=&until=&split=1&h=) ──

export interface LedgerFilterState extends LedgerFilters {
  split: boolean
}

const SOURCES = Object.keys(SOURCE_LABEL) as LedgerSource[]
const HORIZONS = Object.keys(HORIZON_LABEL) as LedgerHorizon[]
const DAY = /^\d{4}-\d{2}-\d{2}$/

interface ParamsLike {
  get(name: string): string | null
}

/** Parse filters from the URL. Unknown/invalid values are dropped; `type` and `signal_type` both work. */
export function filtersFromParams(p: ParamsLike): { filters: LedgerFilterState; horizon: LedgerHorizon } {
  const src = p.get('source') ?? ''
  const day = (k: string) => {
    const v = p.get(k) ?? ''
    return DAY.test(v) ? v : ''
  }
  const h = p.get('h') ?? ''
  const symbol = (p.get('symbol') ?? '').toUpperCase().split(':')[0].replace('/', '')
  return {
    filters: {
      source: (SOURCES as string[]).includes(src) ? (src as LedgerSource) : '',
      signal_type: (p.get('type') ?? p.get('signal_type') ?? '').trim(),
      symbol,
      since: day('since'),
      until: day('until'),
      split: p.get('split') === '1' || p.get('split') === 'direction',
    },
    horizon: (HORIZONS as string[]).includes(h) ? (h as LedgerHorizon) : '1d',
  }
}

/** Inverse of filtersFromParams; empty values and the default horizon are left out. */
export function filtersToParams(f: LedgerFilterState, horizon: LedgerHorizon): string {
  const qs = new URLSearchParams()
  if (f.source) qs.set('source', f.source)
  if (f.signal_type) qs.set('type', f.signal_type)
  if (f.symbol) qs.set('symbol', f.symbol)
  if (f.since) qs.set('since', f.since)
  if (f.until) qs.set('until', f.until)
  if (f.split) qs.set('split', '1')
  if (horizon !== '1d') qs.set('h', horizon)
  return qs.toString()
}

// ── answer first: which signals work, which are noise ───────────────────────

export interface LedgerAnswer {
  tone: 'baik' | 'perlu_dicek' | 'menunggu' | 'info'
  text: string
  /** "Terbukti" at the horizon, best average move first. */
  proven: LedgerGroup[]
  /** "Negatif": tends to point the wrong way. */
  negative: LedgerGroup[]
  /** "Belum terbukti": cannot be told apart from chance yet. */
  inconclusive: LedgerGroup[]
  /** "Belum cukup data". */
  insufficient: LedgerGroup[]
}

/** "Tier A long (Screener (live))" — one name per signal group. */
export function groupName(g: Pick<LedgerGroup, 'source' | 'signal_type' | 'direction'>): string {
  const label = typeLabel(g.signal_type)
  // labels like "Masuk Tier A → Long" already carry the direction
  const dir = label.includes('→') ? '' : g.direction === 1 ? ' long' : g.direction === -1 ? ' short' : ''
  return `${label}${dir} · ${SOURCE_LABEL[g.source] ?? g.source}`
}

const listNames = (gs: LedgerGroup[], max = 3) => {
  const n = gs.map(groupName)
  return n.length > max ? `${n.slice(0, max).join('; ')}; dan ${n.length - max} lainnya` : n.join('; ')
}

/** Split groups by their verdict at `h` and write the one-sentence answer for the page. */
export function ledgerAnswer(groups: LedgerGroup[], h: LedgerHorizon): LedgerAnswer {
  const at = (g: LedgerGroup) => g.horizons[h]
  const by = (v: LedgerVerdict) => groups.filter((g) => (at(g)?.verdict ?? 'insufficient') === v)
  const proven = by('positive').sort((a, b) => (at(b)?.mean_pct ?? -Infinity) - (at(a)?.mean_pct ?? -Infinity))
  const negative = by('negative').sort((a, b) => (at(a)?.mean_pct ?? Infinity) - (at(b)?.mean_pct ?? Infinity))
  const inconclusive = by('inconclusive')
  const insufficient = by('insufficient')
  const base = { proven, negative, inconclusive, insufficient }
  const when = `setelah ${HORIZON_LABEL[h]}`
  if (groups.length === 0) return { ...base, tone: 'info', text: 'Belum ada sinyal yang tercatat untuk filter ini.' }
  const parts: string[] = []
  parts.push(
    proven.length
      ? `${proven.length} jenis sinyal terbukti benar arahnya ${when}: ${listNames(proven)}.`
      : `Belum ada jenis sinyal yang terbukti ${when}.`,
  )
  if (negative.length) parts.push(`${negative.length} cenderung salah arah: ${listNames(negative)}.`)
  const rest = inconclusive.length + insufficient.length
  if (rest) {
    parts.push(
      `${rest} lainnya belum bisa dibedakan dari kebetulan${insufficient.length ? ` (${insufficient.length} masih menunggu cukup data)` : ''}.`,
    )
  }
  const tone = proven.length ? 'baik' : negative.length ? 'perlu_dicek' : 'menunggu'
  return { ...base, tone, text: parts.join(' ') }
}
