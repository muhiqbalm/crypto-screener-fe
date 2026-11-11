import { describe, expect, it } from 'vitest'
import { filterRows, formatWib, parseBounded, sortRows } from './outlook'
import { outlookQuery } from '@/lib/api/outlook'
import type { OutlookRow } from '@/lib/api/types/outlook'

function row(symbol: string, o: { side?: 'long' | 'short' | null; fresh?: boolean; verdict?: 'PASS' | 'FAIL' | null; keyakinan?: 'rendah' | 'sedang' | 'tinggi' | null; tp?: number | null; rr?: number | null } = {}): OutlookRow {
  const side = o.side ?? null
  return {
    symbol,
    strategy: {
      side,
      fresh: o.fresh ?? false,
      preset: o.verdict === undefined ? null : { name: `4H-${symbol}`, verdict: o.verdict },
      entry_at: side ? '2026-11-09T00:00:00Z' : null,
    },
    bias: { bias: side ? side.toUpperCase() : 'NETRAL', keyakinan: o.keyakinan ?? null, support: 0, lean: 0 },
    projection: { available: Boolean(side), at_tp: o.tp === undefined || o.tp === null ? null : { net: o.tp }, at_sl: null, rr: o.rr ?? null },
  } as unknown as OutlookRow
}

const ROWS = [
  row('ETHUSDT', { side: 'short', verdict: 'PASS', keyakinan: 'tinggi', tp: 100, rr: 1.0 }),
  row('AAVEUSDT', { side: 'short', fresh: true, keyakinan: 'rendah', tp: 97, rr: 1.6 }),
  row('BTCUSDT', { side: null, verdict: 'FAIL' }),
  row('SOLUSDT', { side: 'long', verdict: 'FAIL', keyakinan: 'rendah', tp: 50 }),
]

describe('outlook filters', () => {
  it('filters by side, fresh and PASS preset (combined with AND)', () => {
    const f = (...a: ('long' | 'short' | 'fresh' | 'pass')[]) => filterRows(ROWS, new Set(a)).map((r) => r.symbol)
    expect(f()).toHaveLength(4)
    expect(f('long')).toEqual(['SOLUSDT'])
    expect(f('short')).toEqual(['ETHUSDT', 'AAVEUSDT'])
    expect(f('long', 'short')).toEqual(['ETHUSDT', 'AAVEUSDT', 'SOLUSDT'])
    expect(f('fresh')).toEqual(['AAVEUSDT'])
    expect(f('pass')).toEqual(['ETHUSDT'])
    expect(f('short', 'pass')).toEqual(['ETHUSDT'])
  })
})

describe('outlook sorting', () => {
  it('sorts by keyakinan desc with nulls last and symbol tiebreak', () => {
    expect(sortRows(ROWS, 'keyakinan', true).map((r) => r.symbol)).toEqual(['ETHUSDT', 'AAVEUSDT', 'SOLUSDT', 'BTCUSDT'])
  })
  it('nulls stay last in both directions', () => {
    expect(sortRows(ROWS, 'rr', true).map((r) => r.symbol).slice(-2)).toEqual(['BTCUSDT', 'SOLUSDT'])
    expect(sortRows(ROWS, 'rr', false).map((r) => r.symbol)[0]).toBe('ETHUSDT')
    expect(sortRows(ROWS, 'profit_tp', true).map((r) => r.symbol)).toEqual(['ETHUSDT', 'AAVEUSDT', 'SOLUSDT', 'BTCUSDT'])
  })
})

describe('outlook helpers', () => {
  it('parses bounded numbers (comma decimal ok)', () => {
    expect(parseBounded('1000', 1, 1e9)).toBe(1000)
    expect(parseBounded('2,5', 1, 20)).toBe(2.5)
    expect(parseBounded('0', 1, 20)).toBeNull()
    expect(parseBounded('abc', 1, 20)).toBeNull()
    expect(parseBounded('50', 1, 20)).toBeNull()
  })
  it('formats WIB like the backend narrative', () => {
    expect(formatWib('2026-11-09T00:00:00Z')).toBe('9 Nov 07:00 WIB')
    expect(formatWib(null)).toBe('—')
  })
  it('builds the projection query', () => {
    expect(outlookQuery({ capital: 1000, leverage: 1, sizing: 'notional', risk_pct: 1 })).toBe(
      '?capital=1000&leverage=1&sizing=notional&risk_pct=1',
    )
  })
})
