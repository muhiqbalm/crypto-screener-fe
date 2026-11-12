import { describe, it, expect } from 'vitest'
import { historyEntries } from './RunsTable'
import type { LabScanDetail } from '@/lib/api/types/lab'
import type { LabRunListItem } from '@/lib/api/types/lab-uji'

const run = (id: number, at: string, over: Partial<LabRunListItem> = {}): LabRunListItem => ({
  id, template_id: 'rosyade_family', symbol: 'ETHUSDT', timeframe: '4h', mode: 'validate', status: 'done', verdict: 'PASS',
  net_return_pct: null, profit_factor: null, max_dd_pct: null, trades: null, created_at: at, scan_id: null, ...over,
})

describe('Riwayat', () => {
  it('shows each scan as one row (not one row per cell), drops Universal, newest first', () => {
    const runs = [
      run(1, '2026-11-12T01:00:00Z'),
      run(2, '2026-11-12T03:00:00Z', { scan_id: 7 }),
      run(3, '2026-11-12T03:00:01Z', { scan_id: 7 }),
      run(4, '2026-11-12T02:00:00Z', { template_id: 'universal_v0' }),
    ]
    const scans = [{ id: 7, status: 'done', progress: { done: 2, total: 2 }, rows: [], template_id: 'donchian_breakout', created_at: '2026-11-12T03:00:00Z' }] as LabScanDetail[]
    const out = historyEntries(runs, scans)
    expect(out.map((e) => e.key)).toEqual(['scan-7', 'run-1'])
    expect(out[0].templateId).toBe('donchian_breakout')
  })
})
