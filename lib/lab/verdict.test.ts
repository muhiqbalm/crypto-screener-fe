import { describe, expect, it } from 'vitest'
import {
  HONEST_VERDICT_COPY,
  HONEST_VERDICT_ORDER,
  honestVerdict,
  normalizeVerdict,
  rekonShare,
  rowVerdict,
  samplePeriod,
  searahPasarText,
  untestedMarket,
} from './verdict'
import { LIVE_HISTORY_NOTE, beforeLiveHistory } from '@/lib/bot/history'

describe('honestVerdict (audit 2026-11-13 P3)', () => {
  it('says terbukti only when the BTC-relative interval is above zero too', () => {
    expect(honestVerdict('terbukti', 'terbukti')).toBe('terbukti')
    expect(honestVerdict('positive', 'positive')).toBe('terbukti')
  })
  it('downgrades a raw edge without a BTC-relative edge to "searah pasar"', () => {
    // the three short signals of 12 Nov: raw CI above zero, BTC-relative CI includes zero
    expect(honestVerdict('terbukti', 'belum_terbukti')).toBe('searah_pasar')
    expect(honestVerdict('positive', 'inconclusive')).toBe('searah_pasar')
    expect(honestVerdict('positive', 'negative')).toBe('searah_pasar')
    expect(honestVerdict('terbukti', 'belum_cukup_data')).toBe('searah_pasar')
    expect(honestVerdict('terbukti', null)).toBe('searah_pasar')
  })
  it('keeps the other verdicts and accepts the backend code', () => {
    expect(honestVerdict('negative', 'inconclusive')).toBe('negatif')
    expect(honestVerdict('belum_terbukti', 'terbukti')).toBe('belum_terbukti')
    expect(honestVerdict('insufficient', 'positive')).toBe('belum_cukup_data')
    expect(honestVerdict('searah_pasar', undefined)).toBe('searah_pasar')
    expect(honestVerdict(undefined, undefined)).toBe('belum_cukup_data')
    expect(honestVerdict('something_new', 'terbukti')).toBe('belum_cukup_data')
  })
  it('reads a weekly-report row: the rule when the BTC-relative verdict is sent, the code as sent otherwise', () => {
    expect(rowVerdict({ verdict: 'searah_pasar', verdict_raw: 'terbukti', verdict_rel_btc: 'belum_terbukti' })).toBe('searah_pasar')
    expect(rowVerdict({ verdict: 'terbukti', verdict_raw: 'terbukti', verdict_rel_btc: 'terbukti' })).toBe('terbukti')
    expect(rowVerdict({ verdict: 'terbukti', verdict_rel_btc: 'belum_terbukti' })).toBe('searah_pasar')
    expect(rowVerdict({ verdict: 'terbukti' })).toBe('terbukti')
    expect(rowVerdict({ verdict: 'belum_cukup_data', verdict_rel_btc: null })).toBe('belum_cukup_data')
    expect(normalizeVerdict('inconclusive')).toBe('belum_terbukti')
  })
  it('has one label and tone per state, strongest claim first', () => {
    expect(HONEST_VERDICT_ORDER).toEqual(['terbukti', 'searah_pasar', 'negatif', 'belum_terbukti', 'belum_cukup_data'])
    expect(HONEST_VERDICT_COPY.searah_pasar).toMatchObject({ label: 'Searah pasar', tone: 'warn' })
    expect(HONEST_VERDICT_COPY.terbukti.hint).toContain('dibanding BTC')
  })
  it('names the market the edge was not tested in', () => {
    expect(untestedMarket(-1)).toBe('belum teruji di pasar naik')
    expect(untestedMarket(1)).toBe('belum teruji di pasar turun')
    expect(untestedMarket(null)).toBe('belum teruji di kondisi pasar lain')
    expect(searahPasarText(-1)).toContain('dibanding BTC rentangnya mencakup nol')
    expect(searahPasarText(-1).endsWith('belum teruji di pasar naik.')).toBe(true)
  })
})

describe('sample facts', () => {
  it('formats the sample period in WIB', () => {
    // 20:00 UTC on 11 Nov is already 12 Nov in WIB
    expect(samplePeriod('2026-10-15T07:00:00Z', '2026-11-11T20:00:00Z')).toMatch(/^15 Okt( 2026)? – 12 Nov( 2026)?$/)
    expect(samplePeriod(null, '2026-11-11T20:00:00Z')).toBeNull()
    expect(samplePeriod('nope', '2026-11-11T20:00:00Z')).toBeNull()
  })
  it('states how much of the sample is reconstructed', () => {
    expect(rekonShare(350, 363)).toBe('96% rekonstruksi')
    expect(rekonShare(0, 13)).toBeNull()
    expect(rekonShare(5, 0)).toBeNull()
    expect(rekonShare(undefined, 10)).toBeNull()
  })
})

describe('live bot history start (audit 2026-11-13 P2)', () => {
  it('flags periods that begin before 6 Nov 2026', () => {
    expect(beforeLiveHistory('2026-11-02T00:00:00Z')).toBe(true)
    expect(beforeLiveHistory('2026-11-09T00:00:00Z')).toBe(false)
    expect(beforeLiveHistory(null)).toBe(false)
    expect(LIVE_HISTORY_NOTE).toContain('mulai 6 Nov 2026')
  })
})
