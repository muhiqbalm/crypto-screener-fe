import { describe, expect, it } from 'vitest'
import { sparkPoints } from './Sparkline'
import { sortStrength } from './StrengthTable'
import { parseUniversalForm, toForm } from './UniversalBuilder'
import type { StrengthRow, UniversalParamSpec } from '@/lib/api/types/universal'

const row = (symbol: string, rank: number | null, r7: number | null): StrengthRow => ({
  symbol, rank, price: 1, score: null, ret_1d_pct: null, ret_7d_pct: r7, ret_30d_pct: null, ret_90d_pct: null,
  vol_ann_pct: null, trend: null, ema_dist_pct: null, donchian_pos: null, funding_7d_apr_pct: null, eligible: rank !== null,
  target_weight_pct: null, in_portfolio: false, spark: [], last_bar: null,
})

describe('sortStrength', () => {
  const rows = [row('A', 2, 5), row('B', null, 9), row('C', 1, null)]
  it('sorts by rank asc with nulls last', () => {
    expect(sortStrength(rows, 'rank', false).map((r) => r.symbol)).toEqual(['C', 'A', 'B'])
  })
  it('keeps nulls last when descending', () => {
    expect(sortStrength(rows, 'ret_7d_pct', true).map((r) => r.symbol)).toEqual(['B', 'A', 'C'])
    expect(sortStrength(rows, 'rank', true).map((r) => r.symbol)).toEqual(['A', 'C', 'B'])
  })
})

describe('sparkPoints', () => {
  it('needs two finite points', () => {
    expect(sparkPoints([1], 10, 10)).toBe('')
    expect(sparkPoints([null, 1], 10, 10)).toBe('')
  })
  it('maps min to bottom and max to top', () => {
    const pts = sparkPoints([0, 10], 10, 10, 0).split(' ')
    expect(pts).toEqual(['0.0,10.0', '10.0,0.0'])
  })
})

const SPECS: UniversalParamSpec[] = [
  { key: 'top_n', label: 'n', type: 'int', default: 5, min: 1, max: 15, group: 'g' },
  { key: 'allow_short', label: 's', type: 'bool', default: false, group: 'g' },
  { key: 'rebalance', label: 'r', type: 'choice', default: '1d', choices: ['1d', '4h'], group: 'g' },
  { key: 'mom_short_days', label: 'a', type: 'int', default: 7, min: 2, max: 30, group: 'g' },
  { key: 'mom_mid_days', label: 'b', type: 'int', default: 30, min: 10, max: 90, group: 'g' },
  { key: 'mom_long_days', label: 'c', type: 'int', default: 90, min: 30, max: 365, group: 'g' },
]

describe('parseUniversalForm', () => {
  it('round-trips defaults', () => {
    const f = toForm(SPECS, {})
    const { params, errors } = parseUniversalForm(SPECS, f)
    expect(errors).toEqual({})
    expect(params).toEqual({ top_n: 5, allow_short: false, rebalance: '1d', mom_short_days: 7, mom_mid_days: 30, mom_long_days: 90 })
  })
  it('flags range, integer and horizon-order errors', () => {
    const f = { ...toForm(SPECS, {}), top_n: '2.5', mom_mid_days: '95' }
    expect(parseUniversalForm(SPECS, f).errors).toMatchObject({ top_n: 'Harus bilangan bulat', mom_mid_days: 'Maksimal 90' })
    const g = { ...toForm(SPECS, {}), mom_mid_days: '80', mom_long_days: '60' }
    expect(parseUniversalForm(SPECS, g).errors.mom_mid_days).toMatch(/pendek < menengah/)
  })
})
