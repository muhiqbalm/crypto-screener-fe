import { describe, expect, it } from 'vitest'
import type { ShadowReport } from '@/lib/api/types/shadow'
import { executionAnswer, sampleNote } from './execution'

const base: ShadowReport = {
  settings: { ks: [0], ttls_min: [60], taker_bps: 5, maker_bps: 2, fee_diff_bps: 3, tf: '4h', enabled: true },
  thresholds: { min_n_any: 10, min_n_ok: 30 },
  actual: {
    n_signals: 3, n_counted: 3, n_off_close: 0, n_with_fill: 3, n_open: 1, n_close: 2, mean_slippage_bps: 1.54,
    median_slippage_bps: 1.8, mean_impact_bps: 0.7, mean_drift_bps: -0.8, mean_latency_s: 4.3, median_latency_s: 4,
    latency_upper_bound: true, sample: 'too_few',
  },
  grid: [],
  signals: [],
  last_cycle: null,
}

describe('executionAnswer', () => {
  it('leads with slippage and latency, and says how thin the sample is', () => {
    expect(executionAnswer(base)).toBe(
      'Dari 3 sinyal live (masih anekdot, belum bukti): harga eksekusi rata-rata +1.5 bps dari harga close candle (1 bps = 0.01%, + = lebih mahal bagi bot), jeda alert median 4 dtk (batas atas).',
    )
  })

  it('falls back to the market proxy when there is no fill, and to a plain line when there is nothing', () => {
    expect(executionAnswer({ ...base, actual: { ...base.actual, n_with_fill: 0, latency_upper_bound: false } })).toContain(
      'belum ada harga eksekusi; perkiraan dari harga pasar sesudah alert −0.8 bps',
    )
    expect(executionAnswer({ ...base, actual: { ...base.actual, n_counted: 0 } })).toBe(
      'Belum ada sinyal live yang tercatat, jadi kualitas eksekusi belum bisa diukur.',
    )
  })

  it('grades the sample', () => {
    expect(sampleNote(3, 10, 30)).toBe('masih anekdot, belum bukti')
    expect(sampleNote(12, 10, 30)).toBe('sampel kecil')
    expect(sampleNote(40, 10, 30)).toBeNull()
  })
})
