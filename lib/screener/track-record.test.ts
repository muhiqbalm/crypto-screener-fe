import { describe, expect, it } from 'vitest'
import {
  compositeKey,
  factorKey,
  findTrack,
  ledgerHref,
  ledgerSymbol,
  periodLabel,
  tierKey,
  trackLine,
} from './track-record'
import { filtersFromParams, filtersToParams } from '@/lib/lab/ledger'
import type { SignalTrackRecord, TrackHorizonStats, TrackRecordItem } from '@/lib/api/types/ledger'

const st = (over: Partial<TrackHorizonStats>): TrackHorizonStats => ({
  n: 349, days: 27, coins: 98, hit_rate: 0.424, hit_ci: [0.36, 0.49], mean_pct: -0.42, mean_ci: [-1.29, 0.45],
  median_pct: -0.3, mean_rel_btc_pct: -0.1, rel_btc_ci: [-0.6, 0.4], hit_rel_btc: 0.47, sample: 'ok',
  verdict: 'belum_terbukti', verdict_rel_btc: 'belum_terbukti', ...over,
})
const item = (over: Partial<TrackRecordItem>): TrackRecordItem => ({
  signal_type: 'tier_a', direction: 1, n_signals: 366, n_live: 2, n_rekon: 364, n_pending: 17,
  first_ts: '2026-10-15T07:00:00Z', last_ts: '2026-11-11T06:00:46Z', verdict: 'belum_terbukti',
  verdict_rel_btc: 'belum_terbukti', stats: { '1d': st({}), '3d': st({ verdict: 'negatif' }) }, ...over,
})
const data = (items: TrackRecordItem[], available = true): SignalTrackRecord => ({
  available, headline_horizon: '1d', secondary_horizon: '3d', sources: ['screener', 'screener_rekon'],
  thresholds: { min_n: 10, min_days: 5 }, period: { from: '2026-10-15T07:00:00Z', to: '2026-11-11T06:00:46Z' },
  live_since: null, generated_at: null, items,
})

describe('screener label -> ledger type', () => {
  it('maps composite, tier and factor labels like the backend TYPE_RULES', () => {
    expect(compositeKey({ signal: 'BULLISH', confidence_tier: 'HIGH' })).toEqual({ type: 'komposit_high', direction: 1 })
    expect(compositeKey({ signal: 'BEARISH', confidence_tier: 'LOW' })).toEqual({ type: 'komposit', direction: -1 })
    expect(compositeKey({ signal: 'NEUTRAL', confidence_tier: 'HIGH' })).toBeNull()
    expect(tierKey({ tier: 'A' })).toEqual({ type: 'tier_a', direction: 1 })
    expect(tierKey({ tier: 'C' })).toEqual({ type: 'tier_c', direction: -1 })
    expect(tierKey({ tier: 'B' })).toBeNull()
    expect(factorKey('momentum', 'SELL')).toEqual({ type: 'momentum', direction: -1 })
    expect(factorKey('oi', 'BULLISH')).toEqual({ type: 'oi', direction: 1 })
    expect(factorKey('funding', 'HOLD')).toBeNull()
  })

  it('finds the record by type + direction, nothing when unavailable', () => {
    const d = data([item({}), item({ signal_type: 'tier_c', direction: -1 })])
    expect(findTrack(d, { type: 'tier_c', direction: -1 })?.signal_type).toBe('tier_c')
    expect(findTrack(d, { type: 'tier_c', direction: 1 })).toBeNull()
    expect(findTrack(data([item({})], false), { type: 'tier_a', direction: 1 })).toBeNull()
    expect(findTrack(undefined, { type: 'tier_a', direction: 1 })).toBeNull()
  })
})

describe('tooltip line', () => {
  const k = { type: 'tier_a', direction: 1 } as const
  it('states hit rate, sample and both verdicts', () => {
    expect(trackLine(k, item({}))).toBe('Tier A long: 1d hit 42% (n=349, 27 hari) — belum terbukti, vs BTC belum terbukti · 3d: negatif, vs BTC belum terbukti')
  })
  it('says belum cukup data when the sample is too small', () => {
    const thin = item({ stats: { '1d': st({ n: 6, days: 3, verdict: 'belum_cukup_data' }), '3d': st({}) } })
    expect(trackLine(k, thin)).toBe('Tier A long: belum cukup data (n=6, 3 hari; butuh ≥10 sinyal di ≥5 hari)')
    expect(trackLine(k, null)).toBe('Tier A long: belum ada sinyal yang selesai dinilai')
  })
})

describe('links', () => {
  it('builds a filtered /lab/signals link that the page parses back', () => {
    const href = ledgerHref({ type: 'tier_c', direction: -1 }, ledgerSymbol('BTC/USDT:USDT'))
    expect(href).toBe('/lab/signals?type=tier_c&split=1&symbol=BTCUSDT')
    const { filters, horizon } = filtersFromParams(new URLSearchParams(href.split('?')[1]))
    expect(filters).toEqual({ source: '', signal_type: 'tier_c', symbol: 'BTCUSDT', since: '', until: '', split: true })
    expect(horizon).toBe('1d')
  })
  it('drops invalid params and round-trips valid ones', () => {
    const p = new URLSearchParams('source=nope&since=yesterday&until=2026-11-10&h=3d&signal_type=oi')
    const { filters, horizon } = filtersFromParams(p)
    expect(filters.source).toBe('')
    expect(filters.since).toBe('')
    expect(filters.signal_type).toBe('oi')
    expect(horizon).toBe('3d')
    expect(filtersToParams(filters, horizon)).toBe('type=oi&until=2026-11-10&h=3d')
    expect(filtersToParams({ ...filters, source: 'screener_rekon', signal_type: '', until: '' }, '1d')).toBe('source=screener_rekon')
  })
  it('formats the period in Indonesian', () => {
    expect(periodLabel({ from: '2026-10-15T07:00:00Z', to: '2026-11-11T06:00:46Z' })).toBe('15 Okt – 11 Nov')
    expect(periodLabel(null)).toBeNull()
  })
})
