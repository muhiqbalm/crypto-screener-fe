import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { OutlookKualitas, RekamSkorResponse, ScoreGroup } from '@/lib/api/types/quality'

const state: { data: RekamSkorResponse | undefined; isPending: boolean; error: unknown } = { data: undefined, isPending: false, error: null }
vi.mock('@/lib/queries/outlook', () => ({ useRekamSkor: () => state }))

import { QualityBreakdown } from './QualityBreakdown'
import { QualityPopover } from './QualityPopover'
import { GradeLetter } from './GradeLetter'
import { RekamSkorPanel } from './RekamSkorPanel'

/** Shape and numbers from the production data of 12 Nov (ADA SHORT, posisi baru). */
const A: OutlookKualitas = {
  grade: 'A', label: 'Bukti kuat', rank: 4, base: 'A',
  base_reason: 'Batas bawah +0.08R dari 3,435 posisi: tetap untung walau di ujung pesimis rentangnya.',
  summary: 'A · Bukti kuat: …', why_none: null,
  evidence: { key: 'belum_diuji|short|*|baru', scope: 'strategi_ini', label: 'strategi default (belum diuji per koin), posisi baru',
    n_cases: 3435, n_pos: 3435, p_tp: 0.1421, p_sl: 0.4873, p_batal: 0.368, p_expired: 0.0026, win_rate: 0.33,
    mean_r: 0.14, lo95_r: 0.079, hi95_r: 0.201, half_r: 0.061 },
  outcome_text: 'Dari 3,435 kasus serupa: untung di target 14% · rugi di SL 49% · ditutup strategi 37% · rata-rata +0.14R (rentang ±0.06R).',
  checks: [
    { key: 'momentum_1h', label: 'Momentum 1H', value: 'turun', available: true, agree: 1, proven: true, evidence: 'teruji_replay',
      evidence_text: null, source: 'simulasi historis', effect: 0 },
    { key: 'oi', label: 'Open interest', value: 'OI 24 jam −2.1%', available: true, agree: 1, proven: true, evidence: 'terbukti',
      evidence_text: null, source: 'Catatan Sinyal', effect: 0 },
    { key: 'tren_1d', label: 'Tren 1D', value: 'turun', available: true, agree: 1, proven: false, evidence: 'belum_terbukti_replay',
      evidence_text: null, source: null, effect: 0 },
    { key: 'regime', label: 'Kondisi pasar (BTC)', value: 'Pasar datar / transisi', available: true, agree: 0, proven: false,
      evidence: 'belum_terbukti_replay', evidence_text: null, source: null, effect: 0 },
  ],
  live: { key: 'belum_diuji|short|baru', n_done: 0, n_pos: 0, mean_r: null, lo95_r: null, hi95_r: null, win_rate: null,
    enough: false, need_pos: 20, negative: false },
  adjustments: [], rule_version: 1, basis: 'saat_panggilan',
}

function group(grade: ScoreGroup['grade'], o: Partial<ScoreGroup> = {}): ScoreGroup {
  return { grade, label: grade, n_calls: 0, n_open: 0, n_done: 0, n_pos: 0, mean_r: null, lo95_r: null, hi95_r: null, win_rate: null,
    p_tp: null, p_sl: null, p_batal: null, p_expired: null, sum_r: 0, enough: false, verdict: 'belum_cukup', ...o }
}

function board(o: Partial<RekamSkorResponse> = {}): RekamSkorResponse {
  return {
    rule_version: 1, rule: ['A = batas bawah …'], need_pos: 20, first_graded: '2026-11-12T08:00:00Z', n_calls: 20, n_graded: 20,
    n_no_letter: 0, n_ungraded: 0, n_backfilled: 20, n_done: 1, n_pos_done: 1, enough_any: false,
    by_grade: { A: group('A', { n_calls: 9, n_open: 9 }), B: group('B'), C: group('C', { n_calls: 11, n_open: 10, n_done: 1, n_pos: 1, mean_r: 0.2308, win_rate: 1 }), D: group('D') },
    recent: [{ id: 3, symbol: 'AAVEUSDT', bar: '2026-11-12T08:00:00Z', bar_close: '2026-11-12T12:00:00Z', side: 'short', fase: 'berjalan',
      kualitas: 'C', status: 'tp', r_net: 0.2308, price: 114.2, resolved_at: '2026-11-12T16:00:00Z', basis: 'dihitung_ulang' }],
    simulasi: { split: '2024-07-01T00:00:00Z', computed_at: '2026-11-12T09:18:32Z', groups: [],
      by_grade: { A: { n_cases: 1987, n_pos: 1987, mean_r: 0.1286, lo95_r: 0.0488, hi95_r: 0.2084 },
        B: { n_cases: 1286, n_pos: 1286, mean_r: 0.0985, lo95_r: 0.0564, hi95_r: 0.1406 },
        C: { n_cases: 29138, n_pos: 2923, mean_r: 0.021, lo95_r: -0.0303, hi95_r: 0.0724 } },
      note: 'Simulasi historis, bukan hasil live: …' },
    note: 'Hanya panggilan live yang tersimpan …', ...o,
  }
}

describe('Skor kualitas', () => {
  beforeEach(() => {
    state.data = undefined
    state.isPending = false
    state.error = null
  })

  it('explains a letter in plain Indonesian: similar cases, range, proven vs unproven factors, live count', () => {
    render(<QualityBreakdown q={A} />)
    expect(screen.getByText('Skor A · Bukti kuat')).toBeInTheDocument()
    expect(screen.getByText(A.outcome_text!)).toBeInTheDocument()
    expect(screen.getByText(/\+0\.08R s\/d \+0\.20R/)).toBeInTheDocument()
    expect(screen.getByText('Momentum 1H')).toBeInTheDocument()
    expect(screen.getByText('terbukti (Catatan Sinyal)')).toBeInTheDocument()
    expect(screen.getByText('Belum terbukti, tidak dihitung: Tren 1D searah · Kondisi pasar (BTC) netral.')).toBeInTheDocument()
    expect(screen.getByText(/0 dari 20 posisi selesai — belum dihitung/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rekam jejak skor/ })).toHaveAttribute('href', '/koin#rekam-skor')
  })

  it('shows a step down and the reason, and a dash with the reason when there is no letter', () => {
    const down: OutlookKualitas = { ...A, grade: 'B', base: 'A', adjustments: [{ step: -1, kind: 'faktor',
      text: 'Turun satu tingkat: faktor yang sudah terbukti berlawanan arah — Momentum 1H (simulasi historis).' }] }
    const { rerender } = render(<QualityBreakdown q={down} />)
    expect(screen.getByText(/Turun satu tingkat/)).toBeInTheDocument()
    rerender(<QualityBreakdown q={{ ...A, grade: null, why_none: 'Data strategi basi (lebih dari 9 jam): tidak dinilai.' }} />)
    expect(screen.getByText('Tidak dinilai')).toBeInTheDocument()
    expect(screen.getByText(/Data strategi basi/)).toBeInTheDocument()
  })

  it('the letter is never colour alone and the pill opens the breakdown on click / tap', () => {
    render(<><GradeLetter grade="C" /><QualityPopover q={A} symbol="ADA" /></>)
    expect(screen.getByRole('img', { name: 'Skor C, belum jelas' })).toHaveTextContent('C')
    const btn = screen.getByRole('button', { name: 'Rincian skor ADA: A, bukti kuat' })
    expect(btn).toHaveTextContent('Bukti kuat')
    fireEvent.click(btn)
    expect(screen.getByText(A.outcome_text!)).toBeInTheDocument()
  })

  it('Rekam jejak skor says plainly that live data is too thin, with the count, and keeps the simulation apart', () => {
    state.data = board()
    render(<RekamSkorPanel />)
    expect(screen.getByText(/Belum cukup data live: baru 1 posisi selesai dari 20 panggilan/)).toBeInTheDocument()
    const tiles = screen.getAllByRole('listitem').filter((li) => /Skor [ABCD]/.test(li.textContent ?? ''))
    expect(tiles).toHaveLength(4)
    const c = tiles.find((li) => li.textContent?.includes('Skor C'))!
    expect(within(c).getByText('+0.23R')).toBeInTheDocument()
    expect(within(c).getByText('sementara, belum bermakna')).toBeInTheDocument()
    expect(within(c).queryByText(/untung 100%/)).not.toBeInTheDocument()     // no hit rate from one position
    expect(within(c).getByText('Belum cukup data: 1 dari 20 posisi selesai.')).toBeInTheDocument()
    expect(screen.getByText('SIMULASI · bukan hasil live')).toBeInTheDocument()
    expect(screen.getByText(/20 panggilan lama diberi skor belakangan/)).toBeInTheDocument()
    expect(screen.queryByText(/Terbukti untung di data live/)).not.toBeInTheDocument()
  })

  it('reports live results per letter once there are enough positions', () => {
    state.data = board({ enough_any: true, n_pos_done: 25, by_grade: {
      A: group('A', { n_calls: 60, n_done: 50, n_pos: 25, mean_r: 0.12, lo95_r: 0.02, hi95_r: 0.22, win_rate: 0.4, enough: true, verdict: 'positif' }),
      B: group('B'), C: group('C'), D: group('D') } })
    render(<RekamSkorPanel />)
    expect(screen.getByText('Skor A: +0.12R dari 25 posisi.')).toBeInTheDocument()
    expect(screen.getByText('Terbukti untung di data live.')).toBeInTheDocument()
    expect(screen.getByText('rata-rata live · untung 40%')).toBeInTheDocument()
  })
})
