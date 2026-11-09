import { describe, it, expect } from 'vitest'
import type { JournalEntry, PaperAccount } from '@/lib/api/types/lab'
import {
  compareRows,
  computePaperSize,
  normalizeBreakdown,
  openPaperPositions,
  parseTags,
  unrealisedPnl,
  validatePaperOrder,
  winratePct,
} from './paper'

describe('computePaperSize', () => {
  it('sizes from risk % and SL distance', () => {
    const s = computePaperSize({ equity: 10_000, riskPct: 1, leverageMax: 10, entry: 100, sl: 95 })!
    expect(s.riskAmount).toBe(100)
    expect(s.qty).toBeCloseTo(20)
    expect(s.notional).toBeCloseTo(2000)
    expect(s.capped).toBe(false)
  })
  it('caps by leverage_max and reports reduced risk', () => {
    const s = computePaperSize({ equity: 1000, riskPct: 2, leverageMax: 2, entry: 100, sl: 99.9 })!
    expect(s.capped).toBe(true)
    expect(s.notional).toBeCloseTo(2000)
    expect(s.riskAmount).toBeCloseTo(2)
  })
  it('returns null for missing inputs', () => {
    expect(computePaperSize({ equity: 1000, riskPct: undefined, leverageMax: 2, entry: 100, sl: 90 })).toBeNull()
    expect(computePaperSize({ equity: 1000, riskPct: 1, leverageMax: 2, entry: 100, sl: 100 })).toBeNull()
  })
})

describe('validatePaperOrder', () => {
  it('requires SL on the correct side', () => {
    expect(validatePaperOrder({ side: 'long', price: 100, sl: '101', tp: '' }).sl).toMatch(/di bawah/)
    expect(validatePaperOrder({ side: 'short', price: 100, sl: '99', tp: '' }).sl).toMatch(/di atas/)
    expect(validatePaperOrder({ side: 'long', price: 100, sl: '95', tp: '99' }).tp).toMatch(/di atas/)
    expect(validatePaperOrder({ side: 'long', price: 100, sl: '95', tp: '110' })).toEqual({})
  })
  it('requires side, SL and a live price', () => {
    const e = validatePaperOrder({ side: null, price: null, sl: '', tp: '' })
    expect(e.side).toBeDefined()
    expect(e.sl).toBeDefined()
    expect(e.price).toBeDefined()
  })
})

const acct = (open: PaperAccount['open_positions']): PaperAccount => ({
  id: 'a1', name: 'A', balance: 1, equity: 1, open_positions: open, realized_pnl: 0, created_at: '2026-01-01T00:00:00Z',
})
const entry = (p: Partial<JournalEntry>): JournalEntry => ({
  id: 'j', account_id: 'a1', source: 'paper_manual', watch_id: null, run_id: null, symbol: 'ETHUSDT', side: 'long',
  entry_time: '2026-01-01T00:00:00Z', entry_price: 100, exit_time: null, exit_price: null, qty: 2, fees: null, funding: null,
  sl: 95, tp: 110, risk_amount: 10, pnl: null, r_multiple: null, exit_reason: null, notes: null, tags: null, ...p,
})

describe('openPaperPositions', () => {
  it('uses account list when present', () => {
    const pos = { id: 'p1', symbol: 'ETHUSDT', side: 'long' as const, entry_price: 1, qty: 1, sl: null, tp: null }
    expect(openPaperPositions(acct([pos, { ...pos, id: 'p2', symbol: 'BTCUSDT' }]), [], 'ETHUSDT')).toEqual([pos])
  })
  it('falls back to open paper journal rows for this account + symbol', () => {
    const rows = [
      entry({ id: 'open' }),
      entry({ id: 'closed', exit_time: '2026-01-02T00:00:00Z' }),
      entry({ id: 'bot', source: 'bot' }),
      entry({ id: 'other', account_id: 'a2' }),
      entry({ id: 'btc', symbol: 'BTCUSDT' }),
    ]
    expect(openPaperPositions(acct(1), rows, 'ETHUSDT').map((p) => p.id)).toEqual(['open'])
  })
})

describe('misc', () => {
  it('unrealised pnl by side', () => {
    expect(unrealisedPnl({ side: 'long', entry_price: 100, qty: 2 }, 110)).toBe(20)
    expect(unrealisedPnl({ side: 'short', entry_price: 100, qty: 2 }, 110)).toBe(-20)
    expect(unrealisedPnl({ side: 'short', entry_price: 100, qty: 2 }, null)).toBeNull()
  })
  it('winrate fraction vs percent', () => {
    expect(winratePct(0.55)).toBeCloseTo(55)
    expect(winratePct(62)).toBe(62)
    expect(winratePct(null)).toBeNull()
  })
  it('normalizes breakdown list or map', () => {
    expect(normalizeBreakdown([{ symbol: 'ETH', trades: 3, net_pnl: 5, winrate: 0.5 }], 'symbol')[0]).toEqual({ key: 'ETH', trades: 3, winrate: 50, net_pnl: 5, avg_r: null })
    expect(normalizeBreakdown({ bot: { trades: 1, pnl: -2 }, paper_auto: { trades: 2, pnl: 4 } }, 'source').map((r) => r.key)).toEqual(['paper_auto', 'bot'])
  })
  it('parses tags', () => {
    expect(parseTags(' fomo, breakout,fomo ,, ')).toEqual(['fomo', 'breakout'])
  })
  it('compare rows only for paper/backtest objects', () => {
    expect(compareRows({ paper: { pf: 1 }, backtest: { pf: 2, trades: 3 } })).toEqual([
      { metric: 'pf', paper: 1, backtest: 2 },
      { metric: 'trades', paper: undefined, backtest: 3 },
    ])
    expect(compareRows({ foo: 1 })).toBeNull()
  })
})
