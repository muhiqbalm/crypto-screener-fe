import { describe, expect, it } from 'vitest'
import { costBurdenLevel, costProfile, hasTimeframeData, lowerTfHint, missingDataCount, snoopingWarning, sortTimeframes } from './timeframes'

const SYMS = [
  { symbol: 'ETHUSDT', has_data: true, timeframes: ['15m', '1h', '4h'] },
  { symbol: 'BTCUSDT', has_data: true, timeframes: ['4h'] },
]

describe('lab timeframes', () => {
  it('sorts lower timeframes first', () => {
    expect(sortTimeframes(['4h', '1d', '15m', '1h', '30m'])).toEqual(['15m', '30m', '1h', '4h', '1d'])
  })
  it('reports data availability per timeframe', () => {
    expect(hasTimeframeData(SYMS[0], '15m')).toBe(true)
    expect(hasTimeframeData(SYMS[0], '30m')).toBe(false)
    expect(hasTimeframeData(null, '15m')).toBeNull()
    expect(missingDataCount(SYMS, ['ETHUSDT', 'BTCUSDT', 'SOLUSDT'], '15m')).toBe(2)
  })
  it('hints only for lower timeframes', () => {
    expect(lowerTfHint(['1h', '4h'])).toBeNull()
    expect(lowerTfHint(['15m', '4h'])).toContain('15m')
  })
  it('parses the cost profile defensively', () => {
    expect(costProfile(null)).toBeNull()
    expect(costProfile({ net_return_pct: 1 })).toBeNull()
    const c = costProfile({ costs: { cost_to_bar_range: 0.5, cost_drag_pct: 'x' } } as never)
    expect(c?.cost_to_bar_range).toBe(0.5)
    expect(c?.cost_drag_pct).toBeNull()
    expect(costBurdenLevel(0.5)).toBe('high')
    expect(costBurdenLevel(0.2)).toBe('medium')
    expect(costBurdenLevel(0.1)).toBe('low')
  })
  it('warns about data-snooping across timeframes', () => {
    expect(snoopingWarning({ timeframes_tested: ['4h'], holdout_touches_all_tf: 1, validated_runs_all_tf: 1, optimizer_trials_all_tf: 0 })).toBeNull()
    const w = snoopingWarning({ timeframes_tested: ['4h', '15m'], holdout_touches_all_tf: 3, validated_runs_all_tf: 3, optimizer_trials_all_tf: 90 })
    expect(w).toContain('2 timeframe (15m, 4h)')
    expect(w).toContain('90 percobaan')
  })
})
