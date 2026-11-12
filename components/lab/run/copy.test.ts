import { describe, it, expect } from 'vitest'
import { errorCopy, stageLabel, verdictSentence } from './copy'
import type { LabCheck, LabRunDetail } from '@/lib/api/types/lab'

describe('stageLabel (backend progress stages -> Indonesian)', () => {
  it('translates every runner stage, never leaks English', () => {
    expect(stageLabel('walk-forward fold 2/6')).toBe('Uji maju bertahap: bagian 2 dari 6')
    expect(stageLabel('optimise on development segment')).toBe('Mencari setting terbaik di data latih')
    expect(stageLabel('in-sample backtest')).toBe('Menguji di data latih')
    expect(stageLabel('full range + Monte Carlo')).toBe('Uji seluruh periode + uji acak berulang')
    expect(stageLabel('holdout')).toBe('Ujian di data baru (holdout)')
    expect(stageLabel('download ETHUSDT 15m')).toBe('Mengunduh data ETHUSDT 15m')
    expect(stageLabel('data 1h')).toBe('Menyiapkan data timeframe 1h')
    expect(stageLabel('something new')).toBe('Memproses')
    expect(stageLabel(null)).toBe('Memproses')
  })
})

describe('errorCopy (backend errors -> Indonesian + what to do)', () => {
  it('holdout lock errors name the lock date in Indonesian', () => {
    const e = errorCopy('HoldoutError: range starts inside the locked holdout (2025-07-15T00:00:00Z); the optimizer may not see it')
    expect(e.text).toContain('15 Jul 2025')
    expect(e.hint).toMatch(/tanggal mulai sebelum/)
    expect(errorCopy('HoldoutError: development segment before the holdout is shorter than 60 days').text).toMatch(/kurang dari 60 hari/)
  })

  it('timeouts, short data and unknown errors', () => {
    expect(errorCopy('timeout after 10800s (batas waktu job; atur LAB_JOB_TIMEOUTS)').text).toMatch(/batas waktu \(3 jam\)/)
    expect(errorCopy('ValueError: not enough bars (120) for warm-up 300 + 50').text).toBe('Data terlalu sedikit: 120 candle, sedangkan indikator butuh 300 candle pemanasan.')
    const unknown = errorCopy('KeyError: foo')
    expect(unknown.text).toBe('Uji gagal karena error di server Lab.')
    expect(unknown.text).not.toMatch(/KeyError/)
  })
})

const check = (name: string, value: number, passed: boolean, threshold = '>= 1'): LabCheck => ({ name, label: name, value, threshold, passed })

function run(over: Partial<LabRunDetail>): LabRunDetail {
  return {
    id: 1, template_id: 'donchian_breakout', symbol: 'ETHUSDT', timeframe: '4h', mode: 'validate', status: 'done', verdict: null,
    net_return_pct: null, profit_factor: null, max_dd_pct: null, trades: null, created_at: '2026-11-12T00:00:00Z',
    params: {}, costs: { commission_pct: 0.05, slippage_pct: 0.05, funding: true }, start: null, end: null,
    metrics: {}, oos_metrics: null, checks: [], holdout_touches: 1, engine_commit: null, error: null,
    ...over,
  }
}

describe('verdictSentence', () => {
  it('Lolos: one sentence with the data-baru numbers', () => {
    const s = verdictSentence(run({ verdict: 'PASS', oos_metrics: { net_return_pct: 8.4, trades: 51, profit_factor: 1.45 } }))
    expect(s.tone).toBe('pass')
    expect(s.text).toBe('Lolos: untung di data baru (holdout) setelah biaya, +8.4% dari 51 transaksi (PF 1.45).')
  })

  it('Gagal: names the first failed check and counts the rest', () => {
    const s = verdictSentence(run({ verdict: 'FAIL', checks: [check('oos_profit_factor', 1.5, true), check('min_oos_trades', 18, false, '>= 30'), check('cost_stress', -2, false, '> 0')] }))
    expect(s.tone).toBe('fail')
    expect(s.text).toBe('Gagal: 18 transaksi di data baru (minimal 30 supaya hasilnya bermakna) (+1 syarat lain).')
  })

  it('backtest, running and error', () => {
    expect(verdictSentence(run({ mode: 'backtest', metrics: { net_return_pct: -3.26, trades: 40 } })).text).toBe(
      'Uji cepat selesai: −3.3% di seluruh periode dari 40 transaksi. Belum ada rapor, jadi belum bukti.',
    )
    expect(verdictSentence(run({ status: 'running' })).tone).toBe('running')
    const err = verdictSentence(run({ status: 'error', error: 'timeout after 3600s' }))
    expect(err.tone).toBe('error')
    expect(err.text).toMatch(/^Uji gagal dijalankan\. Uji dihentikan karena melewati batas waktu/)
  })
})

describe('verdictHeadline (hero)', () => {
  it('big word + one line, no numbers repeated from the KPIs', async () => {
    const { verdictHeadline } = await import('./copy')
    expect(verdictHeadline(run({ verdict: 'PASS' }))).toEqual({ tone: 'pass', word: 'Lolos', line: 'Untung di data baru setelah biaya, dan semua syarat rapor terpenuhi.' })
    const fail = verdictHeadline(run({ verdict: 'FAIL', checks: [check('min_oos_trades', 18, false, '>= 30'), check('cost_stress', -2, false, '> 0')] }))
    expect(fail.word).toBe('Gagal')
    expect(fail.line).toBe('18 transaksi di data baru (minimal 30 supaya hasilnya bermakna) (+1 syarat lain).')
    expect(verdictHeadline(run({ mode: 'backtest' })).word).toBe('Uji cepat')
    expect(verdictHeadline(run({ status: 'error', error: 'timeout after 3600s' })).line).toMatch(/batas waktu/)
  })
})
