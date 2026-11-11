/** Pure helpers for the Signal Ledger page (labels, honesty copy, formatting). */
import type {
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
  lab_watch: 'Lab watch',
  universal: 'Universal v0',
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
    label: 'Belum bisa dinilai',
    tone: 'muted',
    hint: 'Butuh minimal 10 sinyal yang sudah dinilai, tersebar di minimal 5 hari berbeda.',
  },
  inconclusive: {
    label: 'Belum terbukti',
    tone: 'warn',
    hint: 'Interval 95% rata-rata return masih mencakup 0: tidak bisa dibedakan dari kebetulan.',
  },
  positive: {
    label: 'Positif',
    tone: 'bullish',
    hint: 'Interval 95% rata-rata return di atas 0 (sebelum biaya). Indikasi, bukan bukti: cek juga vs BTC dan periodenya.',
  },
  negative: {
    label: 'Negatif',
    tone: 'bearish',
    hint: 'Interval 95% rata-rata return di bawah 0: sinyal ini cenderung salah arah (sebelum biaya).',
  },
}

export function pct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${s}${Math.abs(v).toFixed(digits)}%`
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
