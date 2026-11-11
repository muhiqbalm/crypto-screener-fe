import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { SignalTrackRecord } from '@/lib/api/types/ledger'
import type { AssetDetail } from '@/lib/api/types/screener'

const state: { data: SignalTrackRecord | undefined; admin: boolean } = { data: undefined, admin: false }

vi.mock('@/lib/utils/use-session', () => ({ useSession: () => ({ accessToken: 't' }) }))
vi.mock('@/lib/queries/screener', () => ({ useSignalTrackRecord: () => ({ data: state.data }) }))
vi.mock('@/lib/queries/lab', () => ({ useLabMe: () => ({ data: { is_admin: state.admin }, isError: false }) }))

import { TrackRecordProvider } from './TrackRecordHint'
import { ScreenerTable } from './ScreenerTable'

const s1d = {
  n: 349, days: 27, coins: 98, hit_rate: 0.424, hit_ci: [0.36, 0.49] as [number, number], mean_pct: -0.42,
  mean_ci: [-1.29, 0.45] as [number, number], median_pct: -0.3, mean_rel_btc_pct: -0.1, rel_btc_ci: null,
  hit_rel_btc: 0.47, sample: 'ok' as const, verdict: 'belum_terbukti' as const, verdict_rel_btc: 'belum_terbukti' as const,
}
const record: SignalTrackRecord = {
  available: true, headline_horizon: '1d', secondary_horizon: '3d', sources: ['screener', 'screener_rekon'],
  thresholds: { min_n: 10, min_days: 5 }, period: { from: '2026-10-15T07:00:00Z', to: '2026-11-11T06:00:46Z' },
  live_since: null, generated_at: null,
  items: [{
    signal_type: 'tier_a', direction: 1, n_signals: 366, n_live: 2, n_rekon: 364, n_pending: 17, first_ts: null,
    last_ts: null, verdict: 'belum_terbukti', verdict_rel_btc: 'belum_terbukti',
    stats: { '1d': s1d, '3d': { ...s1d, n: 318, hit_rate: 0.264, mean_pct: -2.01, verdict: 'negatif' } },
  }],
}
const asset = {
  symbol: 'BTC/USDT:USDT', rank: 1, composite_score: 0.1, signal: 'NEUTRAL', confidence_pct: 50,
  confidence_tier: 'LOW', price: 1, change_24h: 0, volume_24h: 1, funding_rate: 0, open_interest: 1,
  long_short_ratio: 1, reversal_score: 0, macd_signal: null, volatility: 1, ic_weight: 0, risk_adjusted_score: 0,
  suggested_position_pct: 1, tier: 'A', funding_rate_signal: null, oi_signal: null,
} as AssetDetail

function renderTable(onSelect = vi.fn()) {
  render(
    <TrackRecordProvider>
      <ScreenerTable data={[asset]} filters={{ symbol: '', signal: 'ALL', tier: 'ALL' }} onSelectAsset={onSelect} />
    </TrackRecordProvider>,
  )
  return onSelect
}

describe('TrackRecordHint in the screener table', () => {
  beforeEach(() => {
    state.data = undefined
    state.admin = false
  })

  it('shows one honest indicator next to Tier A and none for a neutral signal', () => {
    state.data = record
    renderTable()
    const icons = screen.getAllByRole('button', { name: /^Rekam jejak:/ })
    expect(icons).toHaveLength(1)
    expect(icons[0]).toHaveAttribute('title', 'Tier A long: 1d hit 42% (n=349, 27 hari) — belum terbukti, vs BTC belum terbukti · 3d: negatif, vs BTC belum terbukti')
  })

  it('clicking the indicator does not open the coin drawer', () => {
    state.data = record
    const onSelect = renderTable()
    fireEvent.click(screen.getByRole('button', { name: /^Rekam jejak:/ }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders nothing when the track record is unavailable', () => {
    state.data = { ...record, available: false }
    renderTable()
    expect(screen.queryByRole('button', { name: /^Rekam jejak:/ })).toBeNull()
  })
})
