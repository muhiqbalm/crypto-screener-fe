import { describe, expect, it } from 'vitest'
import { daysBetween, hitCi, hitPct, isThin, pct, retCi, sortGroups, typeLabel } from './ledger'
import { ledgerQuery } from '@/lib/api/ledger'
import type { LedgerGroup, LedgerHorizonStats } from '@/lib/api/types/ledger'

const stats = (n: number): LedgerHorizonStats => ({
  n, hit_rate: null, hit_ci: null, mean_pct: null, mean_ci: null, median_pct: null, mean_rel_btc_pct: null,
  rel_btc_ci: null, hit_rel_btc: null, mean_mfe_pct: null, mean_mae_pct: null, days: 0, coins: 0,
  sample: n === 0 ? 'none' : n < 10 ? 'too_few' : n < 30 ? 'small' : 'ok', verdict: 'insufficient', verdict_rel_btc: 'insufficient',
})
const group = (source: LedgerGroup['source'], t: string, n: number): LedgerGroup => ({
  source, signal_type: t, direction: null, n_signals: n, n_pending: 0, n_no_data: 0,
  horizons: { '4h': stats(n), '1d': stats(n), '3d': stats(n), '7d': stats(n) },
})

describe('ledger labels', () => {
  it('labels known and template types', () => {
    expect(typeLabel('tier_a')).toBe('Masuk Tier A → Long')
    expect(typeLabel('rosyade_family_4h')).toBe('Rosyade family 4H')
    expect(typeLabel('something_new')).toBe('Something new')
  })
})

describe('ledger formatting', () => {
  it('formats signed percents and hit rates', () => {
    expect(pct(1.234)).toBe('+1.23%')
    expect(pct(-0.5, 1)).toBe('-0.5%')
    expect(pct(null)).toBe('—')
    expect(hitPct(0.546)).toBe('55%')
    expect(hitCi([0.41, 0.6])).toBe('41–60%')
    expect(retCi([-0.2, 0.9])).toBe('-0.20% … +0.90%')
    expect(retCi(null)).toBe('')
  })
  it('flags thin samples', () => {
    expect(isThin(stats(3))).toBe(true)
    expect(isThin(stats(12))).toBe(false)
    expect(isThin(undefined)).toBe(true)
  })
  it('counts whole days', () => {
    expect(daysBetween('2026-11-01T00:00:00Z', Date.parse('2026-11-03T12:00:00Z'))).toBe(2)
    expect(daysBetween(null)).toBeNull()
  })
})

describe('sortGroups', () => {
  it('puts groups with >= 10 scored signals first', () => {
    const out = sortGroups([group('webhook', 'tv_open', 1), group('screener_rekon', 'oi', 50), group('lab_watch', 'x', 2)], '1d')
    expect(out.map((g) => g.signal_type)).toEqual(['oi', 'x', 'tv_open'])
  })
})

describe('ledgerQuery', () => {
  it('drops empty values', () => {
    expect(ledgerQuery({ source: '', symbol: 'ETHUSDT', limit: 50, since: undefined })).toBe('?symbol=ETHUSDT&limit=50')
    expect(ledgerQuery({})).toBe('')
  })
})
