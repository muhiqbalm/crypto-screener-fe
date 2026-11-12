import { describe, expect, it } from 'vitest'
import { GLOSSARY, GLOSSARY_ALL, GLOSSARY_EXTRAS, getTerm, termLabel, termTip, termValue } from './glossary'

/** Every row of 02-audit-ux.md §4 must have a key (one name per concept). */
const AUDIT_KEYS = [
  // 4.1
  'perpetual', 'funding', 'funding_apr_7d', 'open_interest', 'long_short_ratio', 'top_trader', 'whale_trades',
  'net_flow', 'notional', 'screener_score', 'screener_signal', 'tier', 'score_consistency', 'momentum_30d',
  'reversal_1d', 'atr_pct', 'suggested_allocation', 'regime', 'ema', 'fear_greed', 'headline_sentiment',
  'price_change', 'history_min', 'stale_data',
  // 4.2
  'direction', 'keyakinan', 'condong', 'fresh_signal', 'entry', 'sl', 'tp', 'tp1', 'rr', 'money_at_tp_sl',
  'sizing_mode', 'leverage', 'open_pnl', 'contaminated', 'evidence', 'bobot', 'template_default',
  // 4.3
  'strategy', 'preset', 'timeframe', 'backtest', 'validate', 'optimize', 'trials', 'holdout', 'holdout_locked',
  'in_sample', 'walk_forward', 'monte_carlo', 'dd95', 'rapor', 'verdict', 'net_return', 'cagr', 'max_drawdown',
  'profit_factor', 'sharpe', 'win_rate', 'cost_stress', 'cost_drag', 'cost_vs_range', 'fee', 'maker_taker',
  'slippage', 'data_snooping', 'overfitting', 'sensitivity', 'profitable_segments', 'objective', 'param_importance',
  'mtf_filter', 'atr', 'adx_chop', 'swing_pivot', 'cooldown', 'breakeven', 'warmup', 'sizing_rule', 'scan', 'run',
  'watch', 'paper', 'paper_account', 'universal',
  // 4.4
  'ledger', 'hit_rate', 'horizon', 'mean_move', 'vs_btc', 'mfe_mae', 'uncertainty_range', 'terbukti',
  'belum_terbukti', 'negatif', 'belum_cukup_data', 'reconstruction',
  // 4.5
  'webhook', 'webhook_passphrase', 'okx_passphrase', 'alert_payload', 'automation', 'size_type', 'signal_logs',
  'alert_latency', 'slippage_bps', 'limit_sim', 'price_ran', 'livecheck_status', 'balance_parts', 'stablecoin_total',
  'upnl', 'realized_pnl', 'mark_price', 'liq_price', 'qty', 'r_multiple', 'net_pnl', 'equity', 'trade_source',
  // 4.6
  'arena', 'drift', 'fair_range', 'ready_review', 'report_final', 'report_week', 'system_status', 'mock_mode', 'ops',
  // CEO decisions / status pills
  'target_realistis', 'fase', 'live', 'riset', 'arsip',
] as const

describe('glossary', () => {
  it('has every audit §4 key', () => {
    const missing = AUDIT_KEYS.filter((k) => !(k in GLOSSARY))
    expect(missing).toEqual([])
  })

  it('every entry has a label and a valid group; tips are short plain sentences', () => {
    for (const [k, e] of Object.entries(GLOSSARY_ALL)) {
      expect(e.label, k).toBeTruthy()
      expect(['pasar', 'outlook', 'lab', 'rekam_jejak', 'bot', 'laporan', 'status'], k).toContain(e.group)
      if (e.tip) {
        expect(e.tip.trim().endsWith('.'), `${k} tip ends with a period`).toBe(true)
        expect(e.tip.length, `${k} tip length`).toBeLessThanOrEqual(170)
        expect(e.tip, `${k} uses exchange-style numbers`).not.toMatch(/\d\.\d{3}\b|\d,\d{1,2}%/)
      }
    }
  })

  it('extra dictionaries never reuse a key', () => {
    const seen = new Map<string, string>(Object.keys(GLOSSARY).map((k) => [k, 'base']))
    for (const [owner, dict] of Object.entries(GLOSSARY_EXTRAS)) {
      for (const k of Object.keys(dict)) {
        expect(seen.has(k), `"${k}" in ${owner} already defined in ${seen.get(k)}`).toBe(false)
        seen.set(k, owner)
      }
    }
  })

  it('keys are snake_case ascii', () => {
    for (const k of Object.keys(GLOSSARY_ALL)) expect(k).toMatch(/^[a-z][a-z0-9_]*$/)
  })

  it('helpers resolve labels, tips and values', () => {
    expect(termLabel('holdout')).toBe('Data baru (holdout)')
    expect(termLabel('holdout', { short: true })).toBe('Data baru')
    expect(termTip('profit_factor')).toContain('di atas 1')
    expect(termValue('verdict', 'PASS')).toBe('Lolos')
    expect(termValue('verdict', 'FAIL')).toBe('Gagal')
    expect(termValue('verdict', 'X')).toBe('X')
    expect(getTerm('does_not_exist')).toBeUndefined()
    expect(termLabel('does_not_exist')).toBe('does_not_exist')
  })

  it('never calls a day "1h"', () => {
    expect(termValue('price_change', '1d')).toBe('1 hari')
    expect(termValue('horizon', '1d')).toBe('1 hari')
  })
})
