import { describe, expect, it } from 'vitest'
import { barCells, epochIso, exitReasonLabel, filterRows, httpLabel, signalLabel } from './livecheck'
import type { LiveCheckRow } from '@/lib/api/types/livecheck'

const row = (o: Partial<LiveCheckRow>): LiveCheckRow => ({
  id: 1,
  bar_open_ts: '2026-11-04T12:00:00Z',
  bar_close_ts: '2026-11-04T16:00:00Z',
  status: 'cocok',
  perlu_dicek: false,
  causes: [],
  action: 'open',
  side: 'long',
  reason: null,
  price_diff_bps: null,
  expected: null,
  delivery: null,
  computed_at: '2026-11-11T00:00:00Z',
  ...o,
})

describe('live check helpers', () => {
  it('filters by status groups', () => {
    const rows = [
      row({ id: 1 }),
      row({ id: 2, status: 'gagal' }),
      row({ id: 3, status: 'tak_terduga', perlu_dicek: true }),
      row({ id: 4, status: 'tanpa_log' }),
    ]
    expect(filterRows(rows, 'semua')).toHaveLength(4)
    expect(filterRows(rows, 'masalah').map((r) => r.id)).toEqual([2, 3])
    expect(filterRows(rows, 'perlu_dicek').map((r) => r.id)).toEqual([3])
    expect(filterRows(rows, 'tanpa_log').map((r) => r.id)).toEqual([4])
  })

  it('builds one cell per 4H bar with the worst status', () => {
    const rows = [
      row({ id: 1, bar_open_ts: '2026-11-04T12:00:00Z', status: 'cocok' }),
      row({ id: 2, bar_open_ts: '2026-11-04T12:00:00Z', status: 'gagal', perlu_dicek: true }),
      row({ id: 3, bar_open_ts: '2026-11-04T20:00:00Z', status: 'tanpa_log' }),
    ]
    const cells = barCells(rows, '2026-11-04T08:00:00Z', '2026-11-05T00:00:00Z')
    expect(cells.map((c) => c.status)).toEqual([null, 'gagal', null, 'tanpa_log'])
    expect(cells[1]).toMatchObject({ open: '2026-11-04T12:00:00.000Z', perlu: true, n: 2 })
    expect(barCells(rows, 'x', 'y')).toEqual([])
  })

  it('labels signals, http answers and exit reasons', () => {
    expect(signalLabel('close', 'short')).toBe('Close Short')
    expect(signalLabel(null, 'short')).toBe('—')
    expect(httpLabel(499, 500, 11293.5)).toBe('nginx 499 · app 500 (11.3 dtk)')
    expect(httpLabel(202, 202, 30)).toBe('202 (30 ms)')
    expect(httpLabel(null, 400)).toBe('400')
    expect(httpLabel(null, null)).toBe('—')
    expect(exitReasonLabel('atr_trailing')).toBe('ATR trailing')
    expect(exitReasonLabel('weird_reason')).toBe('weird reason')
    expect(epochIso(1762272000)).toBe('2025-11-04T16:00:00.000Z')
    expect(epochIso(null)).toBeNull()
  })
})
