import { describe, it, expect } from 'vitest'
import type { LabScanRow, LabTemplate } from '@/lib/api/types/lab'
import {
  DEFAULT_COSTS,
  buildRunRequest,
  buildScanRequest,
  combinationCount,
  groupParams,
  holdoutWarning,
  initialParamValues,
  isLargeScan,
  isLiveDefault,
  sortScanRows,
  toParamsPayload,
  top30Available,
  validateParams,
  validateRunForm,
  verdictCopy,
} from './form'

const TEMPLATE: LabTemplate = {
  id: 'rosyade_v1',
  name: 'Rosyade',
  description: '',
  timeframes: ['1h', '4h'],
  params: [
    { key: 'ema_fast', label: 'EMA cepat', type: 'int', default: 21, min: 2, max: 200, step: 1, group: 'Trend' },
    { key: 'use_htf', label: 'HTF', type: 'bool', default: true, group: 'Trend' },
    { key: 'atr_mult', label: 'ATR', type: 'float', default: 1.5, min: 0.5, max: 6, step: 0.1, group: 'Risk' },
    { key: 'side', label: 'Arah', type: 'choice', default: 'both', choices: ['both', 'long', 'short'], group: 'Risk' },
    { key: 'rsi_len', label: 'RSI', type: 'int', default: 14, min: 2, max: 50, group: 'Momentum' },
  ],
}

describe('param form generation', () => {
  it('groups params by group in first-seen order', () => {
    const g = groupParams(TEMPLATE.params)
    expect(g.map((x) => x.group)).toEqual(['Trend', 'Risk', 'Momentum'])
    expect(g[0].params.map((p) => p.key)).toEqual(['ema_fast', 'use_htf'])
  })

  it('falls back to "Lainnya" for empty group', () => {
    const g = groupParams([{ ...TEMPLATE.params[0], group: '' }])
    expect(g[0].group).toBe('Lainnya')
  })

  it('initial values equal template (live) defaults', () => {
    const v = initialParamValues(TEMPLATE)
    expect(v).toEqual({ ema_fast: '21', use_htf: true, atr_mult: '1.5', side: 'both', rsi_len: '14' })
    expect(isLiveDefault(TEMPLATE, v)).toBe(true)
  })

  it('applies overrides and ignores unknown keys', () => {
    const v = initialParamValues(TEMPLATE, { ema_fast: 34, use_htf: false, bogus: 1 })
    expect(v.ema_fast).toBe('34')
    expect(v.use_htf).toBe(false)
    expect('bogus' in v).toBe(false)
    expect(isLiveDefault(TEMPLATE, v)).toBe(false)
  })

  it('treats "21.0" as equal to default 21', () => {
    expect(isLiveDefault(TEMPLATE, { ...initialParamValues(TEMPLATE), ema_fast: '21.0' })).toBe(true)
  })

  it('validates int / range / choice', () => {
    const v = { ...initialParamValues(TEMPLATE), ema_fast: '2.5', atr_mult: '10', side: 'sideways', rsi_len: '' }
    const e = validateParams(TEMPLATE, v)
    expect(e.ema_fast).toBe('Harus bilangan bulat')
    expect(e.atr_mult).toBe('Maksimal 6')
    expect(e.side).toBe('Pilihan tidak valid')
    expect(e.rsi_len).toBe('Wajib diisi')
  })
})

describe('form → payload mapping', () => {
  it('coerces types', () => {
    const p = toParamsPayload(TEMPLATE, { ema_fast: '34', use_htf: false, atr_mult: '2.25', side: 'long', rsi_len: '9' })
    expect(p).toEqual({ ema_fast: 34, use_htf: false, atr_mult: 2.25, side: 'long', rsi_len: 9 })
  })

  it('builds a run request and omits empty dates', () => {
    const req = buildRunRequest(
      { template: TEMPLATE, symbol: 'SOLUSDT', timeframe: '1h', start: '', end: '', params: initialParamValues(TEMPLATE), costs: DEFAULT_COSTS },
      'validate',
    )
    expect(req).toEqual({
      template_id: 'rosyade_v1',
      symbol: 'SOLUSDT',
      timeframe: '1h',
      params: { ema_fast: 21, use_htf: true, atr_mult: 1.5, side: 'both', rsi_len: 14 },
      costs: { commission_pct: 0.05, slippage_pct: 0.05, funding: true },
      mode: 'validate',
    })
    expect('start' in req).toBe(false)
  })

  it('includes dates when set and rejects reversed ranges', () => {
    const f = { template: TEMPLATE, symbol: 'ETHUSDT', timeframe: '4h', start: '2023-01-01', end: '2022-01-01', params: initialParamValues(TEMPLATE), costs: DEFAULT_COSTS }
    expect(validateRunForm(f).end).toBeDefined()
    const ok = { ...f, end: '2024-01-01' }
    expect(validateRunForm(ok)).toEqual({})
    const req = buildRunRequest(ok, 'backtest')
    expect(req.start).toBe('2023-01-01')
    expect(req.end).toBe('2024-01-01')
  })

  it('rejects negative costs', () => {
    const f = { template: TEMPLATE, symbol: 'ETHUSDT', timeframe: '4h', start: '', end: '', params: initialParamValues(TEMPLATE), costs: { ...DEFAULT_COSTS, slippage_pct: '-1' } }
    expect(validateRunForm(f).slippage_pct).toBe('Tidak boleh negatif')
  })

  it('builds a scan request, params optional', () => {
    const req = buildScanRequest({ template: TEMPLATE, symbols: ['BTCUSDT'], timeframes: ['4h'], params: null, costs: DEFAULT_COSTS, mode: 'optimize' })
    expect(req).toEqual({ template_id: 'rosyade_v1', symbols: ['BTCUSDT'], timeframes: ['4h'], costs: { commission_pct: 0.05, slippage_pct: 0.05, funding: true }, mode: 'optimize' })
  })
})

describe('scan helpers', () => {
  it('counts combinations and flags large scans', () => {
    expect(combinationCount(30, 3)).toBe(90)
    expect(isLargeScan(90, 'validate')).toBe(true)
    expect(isLargeScan(10, 'optimize')).toBe(false)
    expect(isLargeScan(11, 'optimize')).toBe(true)
  })

  it('top30 only returns symbols the backend has', () => {
    expect(top30Available(['ETHUSDT', 'FOOUSDT', 'BTCUSDT'])).toEqual(['BTCUSDT', 'ETHUSDT'])
  })

  it('sorts PASS first then OOS PF desc, nulls last', () => {
    const row = (symbol: string, verdict: LabScanRow['verdict'], pf: number | null): LabScanRow => ({
      symbol, timeframe: '4h', run_id: symbol, status: 'done', verdict,
      oos_net_return_pct: null, oos_profit_factor: pf, oos_max_dd_pct: null, trades: null,
    })
    const sorted = sortScanRows([row('A', 'FAIL', 3), row('B', null, 5), row('C', 'PASS', 1.3), row('D', 'PASS', null), row('E', 'PASS', 2)])
    expect(sorted.map((r) => r.symbol)).toEqual(['E', 'C', 'D', 'A', 'B'])
  })
})

describe('verdict / holdout copy', () => {
  it('holdout warning only when touches > 1', () => {
    expect(holdoutWarning(0)).toBeNull()
    expect(holdoutWarning(1)).toBeNull()
    expect(holdoutWarning(3)).toContain('3 kali')
    expect(holdoutWarning(null)).toBeNull()
  })

  it('verdict tones', () => {
    expect(verdictCopy('PASS', 'validate', 'done').tone).toBe('pass')
    expect(verdictCopy('FAIL', 'validate', 'done').tone).toBe('fail')
    expect(verdictCopy(null, 'backtest', 'done').title).toMatch(/belum divalidasi/i)
    expect(verdictCopy('PASS', 'validate', 'running').tone).toBe('none')
  })
})
