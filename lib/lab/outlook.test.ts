import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTERS,
  filterRows,
  formatProb,
  formatR,
  formatWib,
  groupFactors,
  parseBounded,
  peluangRows,
  sortRows,
  type OutlookFilters,
} from './outlook'
import { outlookQuery } from '@/lib/api/outlook'
import type { OutlookFactor, OutlookRow } from '@/lib/api/types/outlook'

function row(
  symbol: string,
  o: {
    side?: 'long' | 'short' | null
    fresh?: boolean
    verdict?: 'PASS' | 'FAIL' | null
    keyakinan?: 'rendah' | 'sedang' | 'tinggi' | null
    tp?: number | null
    rr?: number | null
    score?: number | null
    rank?: number
    eligible?: boolean
    label?: string
    positions?: number
  } = {},
): OutlookRow {
  const side = o.side ?? null
  return {
    symbol,
    strategy: {
      side,
      fresh: o.fresh ?? false,
      preset: o.verdict === undefined ? null : { name: `4H-${symbol}`, verdict: o.verdict },
      entry_at: side ? '2026-11-09T00:00:00Z' : null,
    },
    bias: { bias: side ? side.toUpperCase() : 'NETRAL', keyakinan: o.keyakinan ?? null, support: 0, lean: 0, fase: o.fresh ? 'baru' : 'berjalan' },
    projection: { available: Boolean(side), at_tp: o.tp === undefined || o.tp === null ? null : { net: o.tp }, at_sl: null, rr: o.rr ?? null },
    plan: side ? { rr: o.rr ?? null } : { action: 'tunggu' },
    peluang: {
      eligible: o.eligible ?? Boolean(side),
      score: o.score ?? null,
      label: o.label ?? (side ? 'belum_jelas' : 'tidak_ada_sinyal'),
      reason: '',
      ...(o.rank ? { rank: o.rank } : {}),
    },
    positions: Array.from({ length: o.positions ?? 0 }, () => ({ source: 'paper', side: 'short', entry_price: 1, entry_time: null })),
  } as unknown as OutlookRow
}

const ROWS = [
  row('ETHUSDT', { side: 'short', verdict: 'PASS', keyakinan: 'rendah', tp: 100, rr: 0.9, score: -0.02, rank: 3, positions: 1 }),
  row('PEPEUSDT', { side: 'short', fresh: true, keyakinan: 'sedang', tp: 97, rr: 4.2, score: 0.14, rank: 1, label: 'positif' }),
  row('BTCUSDT', { side: null, verdict: 'FAIL' }),
  row('SOLUSDT', { side: 'long', verdict: 'FAIL', keyakinan: 'rendah', tp: 50, score: 0.03, rank: 2 }),
]

const F = (o: Partial<OutlookFilters>): OutlookFilters => ({ ...EMPTY_FILTERS, ...o })

describe('outlook filters', () => {
  it('filters by arah, keyakinan, posisi and fresh signals (AND across groups, OR inside)', () => {
    const f = (o: Partial<OutlookFilters>) => filterRows(ROWS, F(o)).map((r) => r.symbol)
    expect(f({})).toHaveLength(4)
    expect(f({ arah: new Set(['long']) })).toEqual(['SOLUSDT'])
    expect(f({ arah: new Set(['short']) })).toEqual(['ETHUSDT', 'PEPEUSDT'])
    expect(f({ arah: new Set(['netral']) })).toEqual(['BTCUSDT'])
    expect(f({ arah: new Set(['long', 'short']) })).toEqual(['ETHUSDT', 'PEPEUSDT', 'SOLUSDT'])
    expect(f({ keyakinan: new Set(['sedang']) })).toEqual(['PEPEUSDT'])
    expect(f({ posisi: 'ada' })).toEqual(['ETHUSDT'])
    expect(f({ posisi: 'tidak' })).toEqual(['PEPEUSDT', 'BTCUSDT', 'SOLUSDT'])
    expect(f({ baru: true, arah: new Set(['short']) })).toEqual(['PEPEUSDT'])
  })
})

describe('outlook ordering', () => {
  it('Peluang order follows the server rank, FLAT rows last', () => {
    expect(sortRows(ROWS, 'peluang', true).map((r) => r.symbol)).toEqual(['PEPEUSDT', 'SOLUSDT', 'ETHUSDT', 'BTCUSDT'])
    expect(peluangRows(ROWS).map((r) => r.symbol)).toEqual(['PEPEUSDT', 'SOLUSDT', 'ETHUSDT'])
  })
  it('sorts by keyakinan / ev with nulls last in both directions', () => {
    expect(sortRows(ROWS, 'keyakinan', true).map((r) => r.symbol)).toEqual(['PEPEUSDT', 'ETHUSDT', 'SOLUSDT', 'BTCUSDT'])
    expect(sortRows(ROWS, 'ev', false).map((r) => r.symbol)).toEqual(['ETHUSDT', 'SOLUSDT', 'PEPEUSDT', 'BTCUSDT'])
    expect(sortRows(ROWS, 'rr', true).map((r) => r.symbol).slice(-2)).toEqual(['BTCUSDT', 'SOLUSDT'])
    expect(sortRows(ROWS, 'symbol', false).map((r) => r.symbol)[0]).toBe('BTCUSDT')
  })
})

describe('outlook helpers', () => {
  it('formats R and probabilities', () => {
    expect(formatR(0.1392)).toBe('+0.14R')
    expect(formatR(-0.05)).toBe('−0.05R')
    expect(formatR(null)).toBe('—')
    expect(formatProb(0.578)).toBe('58%')
    expect(formatProb(undefined)).toBe('—')
  })
  it('groups factors (v1 rows without a group fall back sensibly)', () => {
    const fs = [
      { key: 'strategi', group: 'utama' },
      { key: 'tren_1d', group: 'mtf' },
      { key: 'screener', group: 'konteks' },
      { key: 'momentum' },
    ] as unknown as OutlookFactor[]
    const g = groupFactors(fs)
    expect(g.utama).toHaveLength(1)
    expect(g.mtf).toHaveLength(1)
    expect(g.konteks.map((f) => f.key)).toEqual(['screener', 'momentum'])
  })
  it('parses bounded numbers (comma decimal ok)', () => {
    expect(parseBounded('1000', 1, 1e9)).toBe(1000)
    expect(parseBounded('2,5', 1, 20)).toBe(2.5)
    expect(parseBounded('0', 1, 20)).toBeNull()
    expect(parseBounded('abc', 1, 20)).toBeNull()
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

describe('peluang koin helpers', () => {
  it('parses the view and the coin route param', async () => {
    const { parseView, symbolFromParam, koinHref } = await import('./outlook')
    expect(parseView(undefined)).toBe('outlook')
    expect(parseView('terkuat')).toBe('terkuat')
    expect(parseView(['faktor'])).toBe('faktor')
    expect(parseView('x')).toBe('outlook')
    expect(symbolFromParam('eth')).toBe('ETHUSDT')
    expect(symbolFromParam('1000PEPEUSDT')).toBe('1000PEPEUSDT')
    expect(koinHref('ETHUSDT')).toBe('/koin/ETH')
  })

  it('names the preset that drives the call and the live-bot difference', async () => {
    const { driverText, liveNote, kDariN } = await import('./outlook')
    const pass = { strategy: { side: 'short', timeframe: '4h', preset: { name: '4H-ETH-v2_1x', verdict: 'PASS' } } } as unknown as OutlookRow
    expect(driverText(pass)).toBe('Ikut preset 4H-ETH-v2_1x (lolos uji, 4H).')
    const def = { strategy: { side: null, preset: null } } as unknown as OutlookRow
    expect(driverText(def)).toContain('Setting bawaan Rosyade 4H')
    const live = { strategy: { preset: { name: '4H-ETH-Basic', verdict: null, live_reference: true } } } as unknown as OutlookRow
    expect(driverText(live)).toContain('dipakai bot live')
    const withLive = {
      strategies: [
        { name: '4H-ETH-v2_1x', primary: true, side: 'short' },
        { name: '4H-ETH-Basic', primary: false, live_reference: true, side: null },
      ],
    } as unknown as OutlookRow
    expect(liveNote(withLive)).toBe('Bot live memakai 4H-ETH-Basic (tanpa posisi), bukan strategi di atas — arahnya bisa berbeda.')
    expect(liveNote({ strategies: [{ name: 'x', primary: true, live_reference: true }] } as unknown as OutlookRow)).toBeNull()
    const factors = [
      { group: 'mtf', available: true, direction: -1 },
      { group: 'mtf', available: true, direction: 1 },
      { group: 'mtf', available: false, direction: 0 },
      { group: 'konteks', available: true, direction: -1 },
    ]
    expect(kDariN({ strategy: { side: 'short' }, factors } as unknown as OutlookRow)).toEqual({ k: 1, n: 2 })
    expect(kDariN({ strategy: { side: null }, factors } as unknown as OutlookRow)).toBeNull()
  })

  it('remembers capital inputs and rejects garbage', async () => {
    const { loadInputs, saveInputs, DEFAULT_INPUTS } = await import('./outlook')
    window.localStorage.removeItem('bmtm.koin.inputs')
    expect(loadInputs()).toEqual(DEFAULT_INPUTS)
    saveInputs({ capital: 2500, leverage: 2, sizing: 'risk', risk_pct: 0.5 })
    expect(loadInputs()).toEqual({ capital: 2500, leverage: 2, sizing: 'risk', risk_pct: 0.5 })
    window.localStorage.setItem('bmtm.koin.inputs', '{"capital": -1, "leverage": 99}')
    expect(loadInputs()).toEqual(DEFAULT_INPUTS)
    window.localStorage.setItem('bmtm.koin.inputs', 'not json')
    expect(loadInputs()).toEqual(DEFAULT_INPUTS)
  })
})
