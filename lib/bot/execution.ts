/**
 * "Kualitas eksekusi" answer line (pure): how far live fills land from the signal candle's
 * close, and how long alerts take. Measurement only; nothing here changes how the bot trades.
 */
import type { ShadowReport } from '@/lib/api/types/shadow'
import { formatBps } from '@/lib/utils/format'
import { duration } from '@/lib/lab/shadow'

export function sampleNote(n: number, minAny: number, minOk: number): string | null {
  if (n < minAny) return 'masih anekdot, belum bukti'
  if (n < minOk) return 'sampel kecil'
  return null
}

/** One or two sentences that answer "how good is the live execution?". */
export function executionAnswer(r: ShadowReport): string {
  const a = r.actual
  if (a.n_counted === 0) return 'Belum ada sinyal live yang tercatat, jadi kualitas eksekusi belum bisa diukur.'
  const note = sampleNote(a.n_counted, r.thresholds.min_n_any, r.thresholds.min_n_ok)
  const basis = `Dari ${a.n_counted} sinyal live${note ? ` (${note})` : ''}`
  const latency = a.median_latency_s !== null ? `jeda alert median ${duration(a.median_latency_s)}${a.latency_upper_bound ? ' (batas atas)' : ''}` : null
  if (a.n_with_fill) {
    const slip = `harga eksekusi rata-rata ${formatBps(a.mean_slippage_bps)} dari harga close candle (+ = lebih mahal bagi bot)`
    return `${basis}: ${[slip, latency].filter(Boolean).join(', ')}.`
  }
  const drift = `belum ada harga fill; perkiraan dari harga pasar sesudah alert ${formatBps(a.mean_drift_bps)}`
  return `${basis}: ${[drift, latency].filter(Boolean).join(', ')}.`
}
