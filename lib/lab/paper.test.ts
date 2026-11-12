import { describe, it, expect } from 'vitest'
import type { JournalEntry, PaperAccount } from '@/lib/api/types/lab'
import {
  JOURNAL_SOURCE_LABEL,
  compareRows,
  computePaperSize,
  exitReasonLabel,
  isLiveSource,
  journalListQuery,
  journalStatsQuery,
  mirrorSizing,
  normalizeBreakdown,
  openPaperPositions,
  paperAccountName,
  parseTags,
  reusablePaperAccount,
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

describe('mirrorSizing (same rule as ops/lab_seed_presets.py)', () => {
  it('margin sizing (Rosyade live): risk 100%, cap = leverage × margin%', () => {
    const s = mirrorSizing({}, { sizing_mode: 'margin', leverage: 4, portfolio_risk: 50 })
    expect(s).toMatchObject({ ok: true, risk_pct: 100, leverage_max: 2, mode: 'margin' })
    expect(mirrorSizing({ leverage: 3, portfolio_risk: 50 })).toMatchObject({ ok: true, leverage_max: 1.5 })
  })
  it('risk and vol_target sizing', () => {
    expect(mirrorSizing({ sizing_mode: 'risk', risk_per_trade_pct: 1, max_notional_mult: 2 })).toMatchObject({ ok: true, risk_pct: 1, leverage_max: 2 })
    expect(mirrorSizing({ sizing_mode: 'vol_target', max_notional_mult: 3 })).toMatchObject({ ok: true, risk_pct: 100, leverage_max: 3 })
  })
  it('refuses what the paper engine cannot copy', () => {
    expect(mirrorSizing({ sizing_mode: 'risk', risk_per_trade_pct: 1, max_notional_mult: 2, dd_derisk_pct: 20 }).ok).toBe(false)
    expect(mirrorSizing({ sizing_mode: 'kelly' }).ok).toBe(false)
    expect(mirrorSizing({ leverage: 1, portfolio_risk: 50 }).ok).toBe(false)          // 0.5× < 1×
    expect(mirrorSizing({ sizing_mode: 'risk' }).ok).toBe(false)                       // incomplete
  })
  it('explains the sizing in words', () => {
    const s = mirrorSizing({ sizing_mode: 'risk', risk_per_trade_pct: 0.5, max_notional_mult: 2 })
    expect(s.ok && s.summary).toBe('risiko 0.5% per trade, posisi maks. 2× modal')
  })
})

describe('reusablePaperAccount', () => {
  const acct = (over: Partial<PaperAccount>): PaperAccount => ({
    id: 1, name: 'Paper 4H-ETH-v2', balance: 10_000, equity: 10_000, open_positions: 0, realized_pnl: 0,
    created_at: 't', starting_balance: 10_000, ...over,
  })
  it('reuses only an untouched account with the same name', () => {
    expect(reusablePaperAccount([acct({})], 'Paper 4H-ETH-v2')?.id).toBe(1)
    expect(reusablePaperAccount([acct({ realized_pnl: 5, balance: 10_005 })], 'Paper 4H-ETH-v2')).toBeNull()
    expect(reusablePaperAccount([acct({ open_positions: 1 })], 'Paper 4H-ETH-v2')).toBeNull()
    expect(reusablePaperAccount([acct({ name: 'Paper lain' })], 'Paper 4H-ETH-v2')).toBeNull()
    expect(reusablePaperAccount([acct({ starting_balance: null })], 'Paper 4H-ETH-v2')).toBeNull()
  })
  it('builds the account name like the seed script', () => {
    expect(paperAccountName('4H-ETH-v2')).toBe('Paper 4H-ETH-v2')
  })
})

describe('journal queries: paper by default, live bot only on request', () => {
  it('lists newest first without live-bot trades by default', () => {
    expect(journalListQuery({ account_id: '3', symbol: '' }, { includeLive: false, limit: 200 })).toEqual({
      account_id: '3', limit: 200, order: 'desc', exclude_source: 'bot',
    })
  })
  it('includes live-bot trades only when switched on or picked', () => {
    expect(journalListQuery({}, { includeLive: true, limit: 200 })).toEqual({ limit: 200, order: 'desc' })
    expect(journalListQuery({ source: 'bot' }, { includeLive: false, limit: 9999 })).toEqual({ source: 'bot', limit: 5000, order: 'desc' })
  })
  it('keeps statistics to one kind of money', () => {
    expect(journalStatsQuery({ symbol: 'ETHUSDT', from: '2026-11-01' })).toEqual({ symbol: 'ETHUSDT', from: '2026-11-01', exclude_source: 'bot' })
    expect(journalStatsQuery({ source: 'bot' })).toEqual({ source: 'bot' })
  })
  it('labels sources and exit reasons in plain words', () => {
    expect(JOURNAL_SOURCE_LABEL.bot).toBe('Bot live (uang asli)')
    expect(isLiveSource('bot')).toBe(true)
    expect(isLiveSource('paper_auto')).toBe(false)
    expect(exitReasonLabel('hard_tp')).toBe('Kena target (TP)')
    expect(exitReasonLabel('bot_close')).toBe('Ditutup bot live')
    expect(exitReasonLabel('strategy_exit:flat')).toBe('Strategi keluar')
    expect(exitReasonLabel('strategy_exit:trail_stop')).toBe('Strategi keluar (trail stop)')
    expect(exitReasonLabel(null)).toBe('tidak tersedia')
  })
})
