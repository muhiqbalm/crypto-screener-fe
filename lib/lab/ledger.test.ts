import { describe, expect, it } from 'vitest'
import { VERDICT_COPY, daysBetween, groupName, groupSample, groupVerdict, hitCi, hitPct, isThin, ledgerAnswer, pct, retCi, sortGroups, typeLabel } from './ledger'
import { ledgerQuery } from '@/lib/api/ledger'
import type { LedgerGroup, LedgerHorizonStats, LedgerVerdict } from '@/lib/api/types/ledger'

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
    expect(pct(-0.5, 1)).toBe('−0.5%')
    expect(pct(null)).toBe('—')
    expect(hitPct(0.546)).toBe('55%')
    expect(hitCi([0.41, 0.6])).toBe('41–60%')
    expect(retCi([-0.2, 0.9])).toBe('−0.20% … +0.90%')
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

const judged = (
  source: LedgerGroup['source'],
  t: string,
  verdict: LedgerVerdict,
  mean: number | null,
  direction: LedgerGroup['direction'] = null,
  relBtc: LedgerVerdict = verdict,
): LedgerGroup => {
  const g = group(source, t, 40)
  g.direction = direction
  g.horizons['1d'] = { ...stats(40), verdict, verdict_rel_btc: relBtc, mean_pct: mean }
  return g
}

describe('ledgerAnswer (answer first)', () => {
  it('lists what works and what is noise in one sentence', () => {
    const a = ledgerAnswer(
      [
        judged('screener', 'tier_a', 'positive', 0.3),
        judged('screener', 'momentum', 'positive', 0.8),
        judged('screener', 'funding', 'negative', -0.4),
        judged('screener', 'oi', 'inconclusive', 0.1),
        judged('webhook', 'tv_open', 'insufficient', null),
      ],
      '1d',
    )
    expect(a.tone).toBe('baik')
    expect(a.proven.map((g) => g.signal_type)).toEqual(['momentum', 'tier_a'])          // best average first
    expect(a.negative.map((g) => g.signal_type)).toEqual(['funding'])
    expect(a.text).toContain('2 jenis sinyal terbukti benar arahnya setelah 1 hari')
    expect(a.text).toContain('1 cenderung salah arah')
    expect(a.text).toContain('2 lainnya belum bisa dibedakan dari kebetulan (1 masih menunggu cukup data)')
  })
  it('never calls a raw edge without a BTC-relative edge "terbukti" (audit 2026-11-13 P3)', () => {
    // 12 Nov: Funding short +1.20% raw (CI above zero), +0.55% vs BTC (CI includes zero)
    const funding = judged('screener_rekon', 'funding', 'positive', 1.2, -1, 'inconclusive')
    const a = ledgerAnswer([funding, judged('screener', 'momentum', 'positive', 0.8, 1, 'positive')], '1d')
    expect(groupVerdict(funding, '1d')).toBe('searah_pasar')
    expect(a.proven.map((g) => g.signal_type)).toEqual(['momentum'])
    expect(a.market.map((g) => g.signal_type)).toEqual(['funding'])
    expect(a.text).toContain('1 searah pasar (untung searah sinyal, tapi dibanding BTC belum terbukti)')
    const only = ledgerAnswer([funding], '1d')
    expect(only.proven).toEqual([])
    expect(only.tone).toBe('perlu_dicek')
    expect(only.text).toContain('Belum ada jenis sinyal yang terbukti setelah 1 hari')
  })
  it('says where a group\'s sample comes from', () => {
    const meta = { live_since: '2026-11-11T09:00:00Z', backfill: { status: 'done' as const, from: '2026-10-15T00:00:00Z', to: '2026-11-11T08:00:00Z' } }
    expect(groupSample({ source: 'screener_rekon' }, meta)).toMatch(/^100% rekonstruksi · 15 Okt( 2026)? – 11 Nov( 2026)?$/)
    expect(groupSample({ source: 'screener' }, meta)).toMatch(/^dicatat live sejak 11 Nov( 2026)?$/)
    expect(groupSample({ source: 'lab_watch' }, meta)).toBeNull()
    expect(groupSample({ source: 'screener_rekon' }, undefined)).toBe('100% rekonstruksi')
  })
  it('says nothing is proven yet without inventing a winner', () => {
    const a = ledgerAnswer([judged('screener', 'oi', 'inconclusive', 0.1)], '7d')
    expect(a.tone).toBe('menunggu')
    expect(a.text).toContain('Belum ada jenis sinyal yang terbukti setelah 7 hari')
    expect(ledgerAnswer([], '1d').tone).toBe('info')
  })
  it('uses one name per verdict (glossary) and one name per group', () => {
    expect(VERDICT_COPY.positive.label).toBe('Terbukti')
    expect(VERDICT_COPY.insufficient.label).toBe('Belum cukup data')
    expect(groupName(judged('screener', 'tier_a', 'positive', 1, 1))).toBe('Masuk Tier A → Long · Screener (live)')
    expect(groupName(judged('lab_watch', 'rosyade_family_4h', 'positive', 1, -1))).toBe('Rosyade family 4H short · Pantau Lab')
  })
})
