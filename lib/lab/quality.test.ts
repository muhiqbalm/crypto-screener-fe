import { describe, expect, it } from 'vitest'
import {
  agreeWord,
  checkStatus,
  evidenceShort,
  gradeOf,
  gradeRank,
  isBestCall,
  qualitySortValue,
  rangeBar,
  rangeText,
  scoreVerdictText,
} from './quality'
import { EMPTY_FILTERS, filterRows, sortRows } from './outlook'
import type { OutlookRow } from '@/lib/api/types/outlook'
import type { OutlookKualitas, QualityCheck, QualityGrade, ScoreGroup } from '@/lib/api/types/quality'

function kualitas(grade: QualityGrade | null): OutlookKualitas {
  return {
    grade, label: grade ? 'x' : 'Tidak dinilai', rank: grade ? { A: 4, B: 3, C: 2, D: 1 }[grade] : 0, base: grade,
    base_reason: 'r', summary: 's', why_none: grade ? null : 'Data strategi basi', evidence: null, outcome_text: null,
    checks: [], live: null, adjustments: [], rule_version: 1, basis: 'saat_panggilan',
  }
}

function row(symbol: string, grade: QualityGrade | null | undefined, rank?: number, label = 'positif'): OutlookRow {
  return {
    symbol,
    strategy: { side: 'short', fresh: true },
    bias: { bias: 'SHORT', keyakinan: 'sedang' },
    peluang: { eligible: true, score: 0.1, label, reason: '', rank },
    ...(grade === undefined ? {} : { kualitas: grade === null ? kualitas(null) : kualitas(grade) }),
  } as unknown as OutlookRow
}

describe('skor kualitas helpers', () => {
  it('reads the letter and orders A > B > C > D > none', () => {
    expect(gradeOf(row('A1', 'A'))).toBe('A')
    expect(gradeOf(row('N', null))).toBeNull()
    expect(gradeOf(row('OLD', undefined))).toBeNull()
    expect(['D', 'A', '-', 'C', 'B', null].map((g) => gradeRank(g as QualityGrade))).toEqual([1, 4, 0, 2, 3, 0])
  })

  it('"Peluang terbaik" = letter A or B; an older backend without letters falls back to the peluang label', () => {
    expect(isBestCall(row('X', 'A'))).toBe(true)
    expect(isBestCall(row('X', 'B'))).toBe(true)
    expect(isBestCall(row('X', 'C'))).toBe(false)
    expect(isBestCall(row('X', null))).toBe(false)              // stale / beyond SL: not a best call
    expect(isBestCall(row('X', undefined, 1, 'positif'))).toBe(true)
    expect(isBestCall(row('X', undefined, 1, 'belum_jelas'))).toBe(false)
  })

  it('filters by letter and sorts by letter, then by the Peluang rank', () => {
    const rows = [row('C1', 'C', 1), row('A2', 'A', 3), row('B1', 'B', 2), row('A1', 'A', 4), row('NONE', null, 5)]
    const only = filterRows(rows, { ...EMPTY_FILTERS, kualitas: new Set<QualityGrade>(['A', 'B']) })
    expect(only.map((r) => r.symbol)).toEqual(['A2', 'B1', 'A1'])
    expect(sortRows(rows, 'kualitas', true).map((r) => r.symbol)).toEqual(['A2', 'A1', 'B1', 'C1', 'NONE'])
    expect(filterRows(rows, EMPTY_FILTERS)).toHaveLength(5)
    expect(qualitySortValue(row('Z', null))).toBeNull()
  })

  it('names agreement and whether a factor counts', () => {
    const c = (o: Partial<QualityCheck>): QualityCheck => ({
      key: 'momentum_1h', label: 'Momentum 1H', value: 'turun', available: true, agree: 1, proven: true,
      evidence: 'teruji_replay', evidence_text: null, source: 'simulasi historis', effect: 0, ...o,
    })
    expect(agreeWord(c({}))).toBe('searah')
    expect(agreeWord(c({ agree: -1 }))).toBe('berlawanan')
    expect(agreeWord(c({ agree: 0 }))).toBe('netral')
    expect(agreeWord(c({ available: false }))).toBe('tidak tersedia')
    expect(checkStatus(c({}))).toEqual({ counted: true, text: 'terbukti (simulasi historis)' })
    expect(checkStatus(c({ agree: -1, effect: -1 })).text).toBe('terbukti (simulasi historis) · menurunkan skor')
    expect(checkStatus(c({ proven: false, source: null }))).toEqual({ counted: false, text: 'belum terbukti · tidak dihitung' })
  })

  it('writes the range and places it on the −0.5R … +0.5R bar', () => {
    const ev = { n_cases: 3435, mean_r: 0.14, lo95_r: 0.079, hi95_r: 0.201, half_r: 0.061 }
    expect(rangeText(ev)).toBe('+0.08R s/d +0.20R')
    expect(evidenceShort(ev as never)).toBe('3,435 kasus serupa · +0.14R ±0.06R')
    const b = rangeBar(ev)!
    expect(b.zero).toBe(50)
    expect(b.lo).toBeCloseTo(57.9)
    expect(b.mean).toBeCloseTo(64)
    expect(rangeBar({ mean_r: 0.9, lo95_r: -2, hi95_r: 3 })).toEqual({ lo: 0, hi: 100, mean: 100, zero: 50 })
    expect(rangeText(null)).toBeNull()
  })

  it('says plainly when a letter has too little live data', () => {
    const g = (o: Partial<ScoreGroup>): ScoreGroup => ({
      grade: 'A', label: 'Bukti kuat', n_calls: 9, n_open: 9, n_done: 0, n_pos: 0, mean_r: null, lo95_r: null, hi95_r: null,
      win_rate: null, p_tp: null, p_sl: null, p_batal: null, p_expired: null, sum_r: 0, enough: false, verdict: 'belum_cukup', ...o,
    })
    expect(scoreVerdictText(g({ n_calls: 0 }), 20)).toBe('Belum ada panggilan dengan skor ini.')
    expect(scoreVerdictText(g({}), 20)).toBe('9 panggilan, belum ada yang selesai.')
    expect(scoreVerdictText(g({ n_done: 3, n_pos: 2 }), 20)).toBe('Belum cukup data: 2 dari 20 posisi selesai.')
    expect(scoreVerdictText(g({ n_done: 40, n_pos: 25, enough: true, verdict: 'positif' }), 20)).toBe('Terbukti untung di data live.')
    expect(scoreVerdictText(g({ n_done: 40, n_pos: 25, enough: true, verdict: 'negatif' }), 20)).toMatch(/perlu ditinjau/)
  })
})
