import { describe, expect, it } from 'vitest'
import {
  MAX_COMPARE,
  attemptsLabel,
  bestIndex,
  boardSnoopingWarning,
  compareHref,
  compareRows,
  estimateLevel,
  formatDuration,
  fullMetrics,
  needsAck,
  normaliseEquity,
  parseCompareIds,
  presetName,
  suggestLabel,
  tfDefault,
  toggleId,
} from './planning'
import type { LabRunDetail } from '@/lib/api/types/lab'
import type { LabEstimate, LabRunDefaults } from '@/lib/api/types/lab-insights'

describe('formatDuration', () => {
  it('formats minutes and hours in Indonesian', () => {
    expect(formatDuration(42)).toBe('<1 mnt')
    expect(formatDuration(720)).toBe('±12 mnt')
    expect(formatDuration(4800)).toBe('±1 jam 20 mnt')
    expect(formatDuration(7200)).toBe('±2 jam')
    expect(formatDuration(90000)).toBe('±25 jam')
    expect(formatDuration(null)).toBe('—')
  })
})

describe('tfDefault', () => {
  const today = new Date(Date.UTC(2026, 10, 11))
  it('falls back to shorter history + fewer trials for low TFs', () => {
    expect(tfDefault('15m', null, today)).toEqual({ start: '2024-11-11', nTrials: 10, reason: null })
    expect(tfDefault('30m', null, today).start).toBe('2023-11-11')
    expect(tfDefault('4h', null, today)).toEqual({ start: '2020-01-01', nTrials: 30, reason: null })
  })
  it('prefers the backend defaults', () => {
    const d = { timeframes: { '15m': { start: '2025-01-01', n_trials: 10, reason: 'x' } } } as unknown as LabRunDefaults
    expect(tfDefault('15m', d, today)).toEqual({ start: '2025-01-01', nTrials: 10, reason: 'x' })
  })
})

describe('estimateLevel', () => {
  const base = { exceeds_timeout: [], near_timeout: false, long: false } as unknown as LabEstimate
  it('maps the estimate flags to a level and ack requirement', () => {
    expect(estimateLevel(null)).toBe('ok')
    expect(estimateLevel(base)).toBe('ok')
    expect(estimateLevel({ ...base, long: true })).toBe('long')
    expect(estimateLevel({ ...base, long: true, near_timeout: true })).toBe('danger')
    expect(estimateLevel({ ...base, exceeds_timeout: ['ETHUSDT 15m'] })).toBe('over')
    expect(needsAck('long')).toBe(false)
    expect(needsAck('danger')).toBe(true)
    expect(needsAck('over')).toBe(true)
  })
})

describe('compare ids', () => {
  it('parses, dedupes and caps at 4', () => {
    expect(parseCompareIds('3,1,3,x,2,9,8')).toEqual(['3', '1', '2', '9'])
    expect(parseCompareIds(null)).toEqual([])
    expect(compareHref(['1', '2'])).toBe('/lab/compare?ids=1,2')
  })
  it('toggles up to the max', () => {
    expect(toggleId(['1'], '1')).toEqual([])
    expect(toggleId(['1'], '2')).toEqual(['1', '2'])
    const full = ['1', '2', '3', '4']
    expect(full.length).toBe(MAX_COMPARE)
    expect(toggleId(full, '5')).toEqual(full)
  })
})

const run = (over: Partial<LabRunDetail>): LabRunDetail =>
  ({ id: 1, mode: 'validate', metrics: {}, oos_metrics: null, verdict: 'PASS', checks: [], ...over }) as LabRunDetail

describe('compareRows / bestIndex', () => {
  const a = run({
    id: 1,
    metrics: { full_range: { net_return_pct: 50, profit_factor: 1.4, max_dd_pct: -20, sharpe: 1.1, trades: 100 } } as never,
    oos_metrics: { net_return_pct: 10, profit_factor: 1.3, max_dd_pct: -8, sharpe: 0.9, trades: 40, costs: { cost_drag_pct: 5 } } as never,
  })
  const b = run({
    id: 2,
    mode: 'backtest',
    verdict: null,
    metrics: { net_return_pct: 80, profit_factor: 1.6, max_dd_pct: -35, sharpe: 1.5, trades: 90, costs: { cost_drag_pct: 9 } } as never,
  })
  it('uses full_range for validate and metrics for backtest', () => {
    expect(fullMetrics(a)?.net_return_pct).toBe(50)
    expect(fullMetrics(b)?.net_return_pct).toBe(80)
    expect(fullMetrics(run({ metrics: { net_return_pct: 1 } as never }))).toBeNull()
  })
  it('builds full + holdout rows', () => {
    const rows = compareRows([a, b])
    const get = (k: string) => rows.find((r) => r.key === k)!.values
    expect(get('full.net_return_pct')).toEqual([50, 80])
    expect(get('full.cost_drag_pct')).toEqual([null, 9])
    expect(get('holdout.profit_factor')).toEqual([1.3, null])
    expect(get('holdout.cost_drag_pct')).toEqual([5, null])
  })
  it('picks best by direction; DD by magnitude; needs two values', () => {
    expect(bestIndex({ higher: true, values: [1.2, 1.5, null] })).toBe(1)
    expect(bestIndex({ higher: false, values: [-30, -10] })).toBe(1)
    expect(bestIndex({ higher: true, values: [1.2, null] })).toBeNull()
    expect(bestIndex({ higher: null, values: [1, 2] })).toBeNull()
  })
})

describe('normaliseEquity', () => {
  it('rebases to % since the first point and dedupes timestamps', () => {
    const pts = normaliseEquity([
      { t: '2024-01-02T00:00:00Z', equity: 1100, segment: 'is' },
      { t: '2024-01-01T00:00:00Z', equity: 1000, segment: 'is' },
      { t: '2024-01-02T00:00:00Z', equity: 1200, segment: 'holdout' },
    ])
    expect(pts.map((p) => Math.round(p.value))).toEqual([0, 20])
    expect(normaliseEquity([])).toEqual([])
  })
})

describe('leaderboard + preset copy', () => {
  it('warns only when many things were tried', () => {
    expect(boardSnoopingWarning({ runs: 3, trials: 0, combinations: 3 })).toBeNull()
    expect(boardSnoopingWarning({ runs: 12, trials: 400, combinations: 9 })).toMatch(/terbaik dari 12 run/)
    expect(attemptsLabel({ runs: 5, timeframes: 3, trials: 90, runs_this_tf: 2, holdout_touches: 4 })).toBe('5 run · 3 TF · 90 percobaan')
  })
  it('names presets {TF}-{COIN}-{Label} and suggests free labels', () => {
    expect(presetName('4h', 'ETHUSDT', 'Basic')).toBe('4H-ETH-Basic')
    expect(presetName('1h', 'BTCUSDT', 'Opt1')).toBe('1H-BTC-Opt1')
    expect(suggestLabel('optimize', ['Opt1', 'Opt2'])).toBe('Opt3')
    expect(suggestLabel('validate', [])).toBe('Val1')
  })
})
