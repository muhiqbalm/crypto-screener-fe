import { describe, it, expect } from 'vitest'
import { scanCellTone, sortScanTable } from './ScanView'
import type { LabScanRow } from '@/lib/api/types/lab'

const row = (symbol: string, pf: number | null, verdict: LabScanRow['verdict'] = null): LabScanRow => ({
  symbol, timeframe: '4h', run_id: 1, status: 'done', verdict, oos_net_return_pct: null, oos_profit_factor: pf, oos_max_dd_pct: null, trades: null,
})

describe('scan heatmap + table', () => {
  it('colours a cell by its verdict, not by PF', () => {
    expect(scanCellTone({ status: 'done', verdict: 'PASS' })).toBe('pass')
    expect(scanCellTone({ status: 'done', verdict: 'FAIL' })).toBe('fail')   // a FAIL with PF 3 is never green
    expect(scanCellTone({ status: 'running', verdict: null })).toBe('pending')
    expect(scanCellTone({ status: 'done', verdict: null })).toBe('pending')
    expect(scanCellTone({ status: 'error', verdict: null })).toBe('error')
    expect(scanCellTone({ status: 'cancelled', verdict: null })).toBe('error')
  })
  it('default sort = LOLOS first then PF; column sort puts nulls last', () => {
    const rows = [row('A', 2), row('B', 1.3, 'PASS'), row('C', null), row('D', 1.5, 'PASS')]
    expect(sortScanTable(rows, 'default', true).map((r) => r.symbol)).toEqual(['D', 'B', 'A', 'C'])
    expect(sortScanTable(rows, 'pf', true).map((r) => r.symbol)).toEqual(['A', 'D', 'B', 'C'])
    expect(sortScanTable(rows, 'pf', false).map((r) => r.symbol)).toEqual(['B', 'D', 'A', 'C'])
  })
})
