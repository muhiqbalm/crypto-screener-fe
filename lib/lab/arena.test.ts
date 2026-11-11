import { describe, expect, it } from 'vitest'
import { arenaLinks, baseSlots, checkValues, groupRows, groupSeries, lastActionLabel, normaliseCurve, sortRows } from './arena'
import type { ArenaCurveSeries, ArenaRow, DriftCheck } from '@/lib/api/types/arena'

const row = (id: number, name: string, coin: string, family: string, ret: number | null): ArenaRow =>
  ({
    preset: { id, name, coin, family, base: `${coin}-x` },
    account: { id: id + 100 },
    watch: { id: id + 200 },
    stats: { return_pct: ret },
  }) as unknown as ArenaRow

const series = (id: number, coin: string, family: string, base: string, pts: [string, number][]): ArenaCurveSeries => ({
  preset_id: id, name: `p${id}`, coin, family, base, account_id: id, starting_balance: 10000,
  points: pts.map(([t, equity]) => ({ t, equity })),
})

describe('arena helpers', () => {
  it('groups by coin and by sizing family in a fixed family order', () => {
    const rows = [row(1, 'a', 'SOL', 'VT60', 0), row(2, 'b', 'ETH', '1x', 0), row(3, 'c', 'ETH', '2x', 0)]
    expect(groupRows(rows, 'all').map((g) => g.items.length)).toEqual([3])
    expect(groupRows(rows, 'coin').map((g) => g.key)).toEqual(['ETH', 'SOL'])
    expect(groupRows(rows, 'family').map((g) => g.key)).toEqual(['2x', '1x', 'VT60'])
    expect(groupRows(rows, 'family')[0].label).toBe('Sizing 2× (bawaan)')
  })

  it('sorts by return, ties and nulls by name', () => {
    const r = sortRows([row(1, 'b', 'ETH', '2x', 0), row(2, 'a', 'ETH', '2x', 0), row(3, 'c', 'ETH', '2x', 5), row(4, 'd', 'ETH', '2x', null)])
    expect(r.map((x) => x.preset.name)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('keeps colour slots stable per base and never cycles', () => {
    const slots = baseSlots(['SOL-Opt', 'ETH-v2', 'ETH-Basic', 'BTC-Opt', 'ETH-v2', 'XRP-New'])
    expect(slots).toEqual({ 'BTC-Opt': 0, 'ETH-Basic': 1, 'ETH-v2': 2, 'SOL-Opt': 3, 'XRP-New': null })
  })

  it('normalises equity to % of the starting balance, deduped and sorted', () => {
    const s = series(1, 'ETH', '2x', 'ETH-v2', [
      ['2026-11-11T10:00:00Z', 10000],
      ['2026-11-11T12:00:00Z', 9500],
      ['2026-11-11T11:00:00Z', 10200],
      ['2026-11-11T12:00:00Z', 9800],
    ])
    expect(normaliseCurve(s).map((p) => Number(p.value.toFixed(6)))).toEqual([0, 2, -2])
    expect(groupSeries([s], 'coin')[0].key).toBe('ETH')
  })

  it('formats drift checks per unit', () => {
    const c = (key: DriftCheck['key'], observed: number | null, expected: number | null, range: [number, number] | null) =>
      ({ key, label: '', status: 'belum_cukup', observed, expected, range, note: '' }) as DriftCheck
    expect(checkValues(c('frequency', 0, 0.04, [0, 1]))).toEqual({ observed: '0 entry', expected: '0.0 entry', range: '0–1' })
    expect(checkValues(c('win_rate', null, 37.25, null))).toEqual({ observed: '—', expected: '37.3%', range: '—' })
    expect(checkValues(c('trade_return', 1.2, -0.5, [-1, 2])).range).toBe('-1.00% s/d +2.00%')
    expect(checkValues(c('drawdown', -3.2, -31.1, [-37.6, 0])).range).toBe('batas -37.6%')
    expect(checkValues(c('avg_r', 0.5, null, null)).observed).toBe('+0.50R')
  })

  it('labels last action and builds links', () => {
    expect(lastActionLabel(null)).toBe('Belum ada')
    expect(lastActionLabel({ time: 't', kind: 'close', side: 'short', price: 1, reason: 'hard_sl', pnl: -1, source: 'paper_auto' })).toBe('Tutup Short (hard_sl)')
    expect(arenaLinks(row(7, 'x', 'ETH', '2x', 0))).toEqual({
      preset: '/lab/presets#preset-7',
      journal: '/journal?account_id=107',
      watch: '/chart?watch=207',
    })
  })
})
