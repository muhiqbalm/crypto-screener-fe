/** Pure helpers for the "Kualitas eksekusi" section (no React). */
import type { ShadowCell, ShadowOutcome, ShadowResult, ShadowSignal } from '@/lib/api/types/shadow'

/** Signed basis points, e.g. "+3.2 bps". */
export function bps(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${s}${Math.abs(v).toFixed(digits)} bps`
}

/** Seconds as "7 dtk", "4 mnt 10 dtk", "1 jam 5 mnt". */
export function duration(s: number | null | undefined): string {
  if (s === null || s === undefined || !Number.isFinite(s)) return '—'
  const t = Math.max(0, Math.round(s))
  if (t < 60) return `${t} dtk`
  if (t < 3600) {
    const m = Math.floor(t / 60)
    const r = t % 60
    return r ? `${m} mnt ${r} dtk` : `${m} mnt`
  }
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  return m ? `${h} jam ${m} mnt` : `${h} jam`
}

/** "0.25×ATR" / "close" / "-0.1×ATR". */
export function kLabel(k: number): string {
  if (k === 0) return 'Di close'
  return `${k > 0 ? '+' : '−'}${Math.abs(k)}×ATR`
}

export function ttlLabel(m: number): string {
  return m < 60 ? `${m} mnt` : `${m / 60} jam`
}

export const OUTCOME_COPY: Record<ShadowOutcome, { label: string; tone: 'bullish' | 'muted' | 'warn' }> = {
  filled: { label: 'Terisi', tone: 'bullish' },
  missed: { label: 'Tidak terisi', tone: 'muted' },
  postonly: { label: 'Ditolak post-only', tone: 'warn' },
}

export function actionLabel(s: Pick<ShadowSignal, 'action' | 'side'>): string {
  return `${s.action === 'open' ? 'Open' : 'Close'} ${s.side === 'long' ? 'Long' : 'Short'}`
}

export function pickResult(s: ShadowSignal, k: number, ttl: number): ShadowResult | undefined {
  return s.results.find((r) => r.k === k && r.ttl_min === ttl)
}

export function pickCell(grid: ShadowCell[], k: number, ttl: number): ShadowCell | undefined {
  return grid.find((c) => c.k === k && c.ttl_min === ttl)
}

/** Default selection: k = 0 (limit at the close) when offered, longest time-to-live. */
export function defaultChoice(ks: number[], ttls: number[]): { k: number; ttl: number } {
  return { k: ks.includes(0) ? 0 : ks[0] ?? 0, ttl: ttls[ttls.length - 1] ?? 240 }
}

export const STATUS_COPY: Record<ShadowSignal['status'], string> = {
  pending: 'Menunggu data',
  partial: 'Sebagian (jendela belum lewat)',
  done: 'Selesai',
  no_data: 'Tanpa data',
  error: 'Gagal dinilai',
}
