/**
 * Mock data for the W3b pages (Preset, Paper berjalan, Jurnal, Rekam jejak sinyal,
 * Laporan). Only used when NEXT_PUBLIC_USE_MOCK_DATA=true (visual QA without
 * production); every number here is invented and never shipped.
 *
 * Wired from lib/mocks/lab.ts (getLabMock) before the generic Lab handlers, so these
 * routes answer consistently with each other: preset ids ↔ arena rows ↔ paper accounts
 * ↔ journal entries.
 */
import type { ArenaCurves, ArenaReport, ArenaRow, DriftCheck } from '@/lib/api/types/arena'
import type { JournalEntry, PaperAccount } from '@/lib/api/types/lab'
import type { LabPreset } from '@/lib/api/types/lab-insights'
import type { LedgerGroup, LedgerHorizon, LedgerHorizonStats, LedgerMeta, LedgerSignal, LedgerVerdict } from '@/lib/api/types/ledger'
import type { ReportWeek, ReportWeeksResponse, WeeklyReport } from '@/lib/api/types/report'

const NOW = Date.now()
const HOUR = 3_600_000
const DAY = 24 * HOUR
const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const ago = (ms: number) => iso(NOW - ms)
const r2 = (v: number) => Math.round(v * 100) / 100

// ── presets + paper accounts + arena ────────────────────────────────────────

const COSTS = { commission_pct: 0.05, slippage_pct: 0.05, funding: true }
const preset = (p: Partial<LabPreset> & Pick<LabPreset, 'id' | 'name' | 'symbol' | 'timeframe' | 'template_id'>): LabPreset => ({
  label: p.name.split('-').slice(2).join('-') || 'Basic',
  params: {},
  costs: COSTS,
  notes: null,
  readonly: false,
  live_reference: false,
  source_run_id: null,
  source_mode: null,
  verdict: null,
  holdout: null,
  snooping: null,
  created_at: ago(20 * DAY),
  usage: { runs: 0, watches: 0 },
  ...p,
})

const hold = (net: number, pf: number, dd: number, trades: number, win: number) => ({
  net_return_pct: net, profit_factor: pf, max_dd_pct: dd, sharpe: 1.1, trades, win_rate_pct: win,
  stress_net_return_pct: net * 0.6, cost_drag_pct: 3.1, start: '2025-08-01', end: '2026-10-31',
})

export const MOCK_PRESETS: LabPreset[] = [
  preset({ id: 1, name: '4H-ETH-Basic', symbol: 'ETHUSDT', timeframe: '4h', template_id: 'rosyade_family', readonly: true, live_reference: true, notes: 'Setting live ETH 4H.', usage: { runs: 4, watches: 1 } }),
  preset({ id: 2, name: '4H-ETH-v2', symbol: 'ETHUSDT', timeframe: '4h', template_id: 'rosyade_family', verdict: 'PASS', source_run_id: 41, source_mode: 'validate', holdout: hold(18.4, 1.42, -9.1, 38, 47), snooping: { runs: 6, timeframes: 2, trials: 120, holdout_touches: 3 }, usage: { runs: 2, watches: 1 } }),
  preset({ id: 3, name: '4H-SOL-Opt', symbol: 'SOLUSDT', timeframe: '4h', template_id: 'rosyade_family', verdict: 'PASS', source_run_id: 52, source_mode: 'optimize', holdout: hold(24.9, 1.61, -12.4, 29, 52), snooping: { runs: 3, timeframes: 1, trials: 60, holdout_touches: 1 }, usage: { runs: 1, watches: 1 } }),
  preset({ id: 4, name: '1D-BTC-Donchian', symbol: 'BTCUSDT', timeframe: '1d', template_id: 'donchian_breakout', verdict: 'PASS', source_run_id: 63, source_mode: 'validate', params: { sizing_mode: 'risk', risk_per_trade_pct: 1, max_notional_mult: 2 }, holdout: hold(11.2, 1.35, -7.8, 14, 43), snooping: { runs: 2, timeframes: 1, trials: 0, holdout_touches: 1 }, usage: { runs: 1, watches: 0 } }),
  preset({ id: 5, name: '4H-BNB-MR', symbol: 'BNBUSDT', timeframe: '4h', template_id: 'mean_reversion_range', verdict: 'FAIL', source_run_id: 70, source_mode: 'validate', params: { sizing_mode: 'risk', risk_per_trade_pct: 1, max_notional_mult: 2 }, holdout: hold(-6.3, 0.81, -14.2, 33, 39), snooping: { runs: 4, timeframes: 3, trials: 0, holdout_touches: 2 }, usage: { runs: 1, watches: 0 } }),
  preset({ id: 6, name: '1H-ETH-Opt1', symbol: 'ETHUSDT', timeframe: '1h', template_id: 'rosyade_family', notes: 'Disimpan manual, belum diuji.' }),
  preset({ id: 7, name: '4H-AVAX-v1', symbol: 'AVAXUSDT', timeframe: '4h', template_id: 'rosyade_family', verdict: 'PASS', source_run_id: 81, source_mode: 'validate', holdout: hold(9.7, 1.22, -10.5, 31, 45), snooping: { runs: 2, timeframes: 1, trials: 0, holdout_touches: 1 }, usage: { runs: 1, watches: 1 } }),
]

const account = (id: number, name: string, startedDaysAgo: number, balance: number, lev: number, risk = 100): PaperAccount => ({
  id, name, balance, equity: balance, open_positions: 0, realized_pnl: r2(balance - 10_000), created_at: ago(startedDaysAgo * DAY),
  risk_pct: risk, leverage_max: lev, starting_balance: 10_000,
})

export const MOCK_PAPER_ACCOUNTS: PaperAccount[] = [
  account(1, 'Paper manual', 30, 10_084.2, 5, 1),
  account(11, 'Paper 4H-ETH-Basic', 21, 10_412.5, 2),
  account(12, 'Paper 4H-ETH-v2', 64, 10_936.1, 2),
  account(13, 'Paper 4H-SOL-Opt', 18, 9_412.8, 2),
  account(17, 'Paper 4H-AVAX-v1', 9, 9_980.4, 2),
]

const check = (key: DriftCheck['key'], status: DriftCheck['status'], observed: number | null, expected: number | null, range: [number, number] | null): DriftCheck => ({
  key, label: key, status, observed, expected, range, note: '',
})

function arenaRow(o: {
  presetId: number; accountId: number; days: number; equity: number; closed: number; wins: number; dd: number | null
  drift: ArenaRow['drift']['status']; checks?: DriftCheck[]; open?: boolean; auto?: boolean; family?: string
}): ArenaRow {
  const p = MOCK_PRESETS.find((x) => Number(x.id) === o.presetId)!
  const a = MOCK_PAPER_ACCOUNTS.find((x) => Number(x.id) === o.accountId)!
  const coin = p.symbol.replace(/USDT$/, '')
  const family = o.family ?? '2x'
  return {
    preset: {
      id: o.presetId, name: p.name, label: p.label, symbol: p.symbol, coin, timeframe: p.timeframe, template_id: p.template_id,
      verdict: p.verdict, live_reference: p.live_reference, family,
      family_label: family === '2x' ? 'Ukuran 2× (bawaan)' : family, base: `${coin}-${p.label}`,
    },
    account: { id: o.accountId, name: a.name, starting_balance: 10_000, leverage_max: a.leverage_max ?? 2, risk_pct: a.risk_pct ?? 100, created_at: a.created_at },
    watch: {
      id: 200 + o.presetId, active: true, autopaper_enabled: o.auto ?? true, last_eval_at: ago(25 * 60_000), last_bar: ago(4 * HOUR),
      last_signal: null, error: null, strategy_position: null,
    },
    stats: {
      equity: o.equity, balance: o.equity, upnl: 0, return_pct: r2((o.equity / 10_000 - 1) * 100), n_closed: o.closed, n_closed_manual: 0,
      n_entries: o.closed + (o.open ? 1 : 0), n_open: o.open ? 1 : 0, wins: o.wins,
      win_rate_pct: o.closed ? r2((o.wins / o.closed) * 100) : null, win_rate_ci_pct: o.closed ? [30, 70] : null,
      avg_r: o.closed ? 0.18 : null, avg_trade_ret_pct: o.closed ? 0.4 : null, max_dd_pct: o.dd, sharpe: o.days >= 30 ? 1.04 : null,
      sharpe_days: o.days, days_running: o.days, progress_pct: Math.min(100, (o.closed / 30) * 100),
    },
    open_position: o.open
      ? { id: 900 + o.presetId, side: 'long', entry_price: coin === 'SOL' ? 168.4 : 3_120.5, entry_time: ago(9 * HOUR), qty: 0.6, sl: null, tp: null, mark_price: null, mark_time: null, source: 'paper_auto', unrealized_pnl: 41.2 }
      : null,
    n_open_positions: o.open ? 1 : 0,
    last_action: o.closed ? { time: ago(30 * HOUR), kind: 'close', side: 'long', price: 3_088.1, reason: 'hard_tp', pnl: 62.4, source: 'paper_auto' } : null,
    backtest: p.holdout || p.live_reference
      ? {
          source: p.live_reference ? 'research_doc' : 'preset', source_note: p.live_reference ? 'dokumen riset ETH v2' : 'hasil uji saat preset disimpan',
          contaminated: p.live_reference, start: '2025-08-01T00:00:00Z', end: '2026-10-31T00:00:00Z', months: 15, trades: 38,
          trades_per_month: 2.5, win_rate_pct: 47, max_dd_pct: 9.1, mc_dd_p95_pct: 15.2, net_return_pct: 18.4, profit_factor: 1.42,
          sharpe: 1.1, per_trade_ret_pct: 0.45, sizing_rule: '2x', failed_checks: null,
        }
      : null,
    drift: { status: o.drift, has_backtest: true, checks: o.checks ?? [], summary: '' },
  }
}

const ROWS: ArenaRow[] = [
  arenaRow({
    presetId: 2, accountId: 12, days: 64, equity: 10_936.1, closed: 31, wins: 15, dd: 6.2, drift: 'sesuai',
    checks: [check('frequency', 'sesuai', 33, 31.5, [22, 43]), check('win_rate', 'sesuai', 48.4, 47, [30, 65]), check('trade_return', 'sesuai', 0.29, 0.45, [-0.4, 1.1]), check('drawdown', 'sesuai', 6.2, 9.1, [15.2, 15.2])],
  }),
  arenaRow({
    presetId: 1, accountId: 11, days: 21, equity: 10_412.5, closed: 12, wins: 7, dd: 3.4, drift: 'belum_cukup', open: true,
    checks: [check('frequency', 'sesuai', 13, 10.4, [5, 17]), check('win_rate', 'belum_cukup', 58.3, 47, null)],
  }),
  arenaRow({
    presetId: 3, accountId: 13, days: 18, equity: 9_412.8, closed: 9, wins: 2, dd: 14.9, drift: 'menyimpang',
    checks: [check('frequency', 'sesuai', 10, 8.1, [3, 14]), check('win_rate', 'menyimpang', 22.2, 52, [25, 79]), check('drawdown', 'menyimpang', 14.9, 12.4, [13.8, 13.8])],
  }),
  arenaRow({ presetId: 7, accountId: 17, days: 9, equity: 9_980.4, closed: 2, wins: 1, dd: 1.1, drift: 'belum_cukup', auto: false }),
]

const report = (): ArenaReport => ({
  generated_at: ago(3 * 60_000),
  review_min_trades: 30,
  method: { confidence: 0.95, min_trades_rate: 10, min_expected_entries: 5, min_sharpe_days: 30, snapshots: 'per jam (job arena_snapshot)' },
  rows: ROWS,
})

const curves = (): ArenaCurves => ({
  generated_at: ago(3 * 60_000),
  series: ROWS.map((r) => {
    const n = 24
    const start = Date.parse(r.account.created_at)
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const f = i / n
      const wiggle = Math.sin(i * 1.7 + r.preset.id) * 60
      return { t: iso(start + f * (NOW - start)), equity: r2(10_000 + (r.stats.equity - 10_000) * f + (i && i < n ? wiggle : 0)) }
    })
    return { preset_id: r.preset.id, name: r.preset.name, coin: r.preset.coin, family: r.preset.family, base: r.preset.base, account_id: r.account.id, starting_balance: 10_000, points: pts }
  }),
})

// ── journal (paper by default; live-bot trades only on request) ─────────────

const SYMS = ['ETHUSDT', 'ETHUSDT', 'SOLUSDT', 'ETHUSDT', 'BTCUSDT']
const JOURNAL: JournalEntry[] = Array.from({ length: 22 }, (_, i) => {
  const source = i % 7 === 3 ? 'bot' : i % 5 === 1 ? 'paper_manual' : 'paper_auto'
  const accountId = source === 'bot' ? null : source === 'paper_manual' ? 1 : [11, 12, 13][i % 3]
  const symbol = source === 'bot' ? 'ETHUSDT' : SYMS[i % SYMS.length]
  const side = i % 3 === 1 ? 'short' : 'long'
  const r = r2(Math.sin(i * 2.3) * 1.6 + 0.25)
  const entry = symbol === 'SOLUSDT' ? 160 + i : symbol === 'BTCUSDT' ? 88_000 + i * 40 : 3_000 + i * 12
  const exitT = NOW - (22 - i) * 0.9 * DAY
  return {
    id: 500 + i, account_id: accountId, source, watch_id: source === 'paper_auto' ? 200 + ((i % 3) + 1) : null, run_id: null, symbol, side,
    entry_time: iso(exitT - 14 * HOUR), entry_price: entry, exit_time: iso(exitT),
    exit_price: r2(entry * (1 + (side === 'long' ? 1 : -1) * r * 0.012)), qty: symbol === 'BTCUSDT' ? 0.02 : 0.5,
    fees: 1.6, funding: 0.3, sl: r2(entry * (side === 'long' ? 0.988 : 1.012)), tp: null, risk_amount: source === 'bot' ? null : 100,
    pnl: r2(r * 100), r_multiple: source === 'bot' ? null : r,
    exit_reason: source === 'bot' ? 'bot_close' : r > 0.9 ? 'hard_tp' : r < -0.8 ? 'hard_sl' : 'strategy_exit:flat',
    notes: i === 4 ? 'Entry telat, tunggu close bar' : null, tags: i === 4 ? ['telat'] : [],
  }
})

function journalList(q: URLSearchParams): JournalEntry[] {
  const excl = (q.get('exclude_source') ?? '').split(',').filter(Boolean)
  const from = q.get('from')
  const to = q.get('to')
  const rows = JOURNAL.filter(
    (j) =>
      (!q.get('account_id') || String(j.account_id) === q.get('account_id')) &&
      (!q.get('symbol') || j.symbol === q.get('symbol')) &&
      (!q.get('source') || j.source === q.get('source')) &&
      !excl.includes(j.source) &&
      (!from || (j.exit_time ?? j.entry_time) >= from) &&
      (!to || (j.exit_time ?? j.entry_time) <= `${to}T23:59:59Z`),
  ).sort((a, b) => (b.exit_time ?? '').localeCompare(a.exit_time ?? ''))
  if (q.get('order') === 'asc') rows.reverse()
  return rows.slice(0, Number(q.get('limit') ?? 1000))
}

function journalStats(q: URLSearchParams) {
  const rows = journalList(new URLSearchParams({ ...Object.fromEntries(q), limit: '100000' }))
  const pnls = rows.map((j) => j.pnl ?? 0)
  const rs = rows.map((j) => j.r_multiple).filter((v): v is number => v !== null)
  const gw = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0)
  const gl = -pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0)
  const acct = q.get('account_id')
  let eq = acct ? 10_000 : 0
  let peak = eq
  let dd = 0
  const curve = [...rows].reverse().map((j) => {
    eq += j.pnl ?? 0
    peak = Math.max(peak, eq)
    if (peak > 0) dd = Math.min(dd, ((eq - peak) / peak) * 100)
    return { t: j.exit_time!, equity: r2(eq) }
  })
  const group = (key: 'symbol' | 'source') =>
    Object.entries(
      rows.reduce<Record<string, JournalEntry[]>>((m, j) => ((m[j[key]] ??= []).push(j), m), {}),
    ).map(([k, g]) => ({
      key: k, trades: g.length, winrate: g.filter((j) => (j.pnl ?? 0) > 0).length / g.length,
      pnl: r2(g.reduce((a, j) => a + (j.pnl ?? 0), 0)),
      avg_r: g.some((j) => j.r_multiple !== null) ? r2(g.reduce((a, j) => a + (j.r_multiple ?? 0), 0) / g.length) : null,
    }))
  return {
    trades: rows.length, winrate: rows.length ? pnls.filter((p) => p > 0).length / rows.length : null,
    avg_r: rs.length ? r2(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
    expectancy_r: rs.length ? r2(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
    profit_factor: gl > 0 ? r2(gw / gl) : null, net_pnl: r2(pnls.reduce((a, b) => a + b, 0)),
    max_dd_pct: acct ? r2(dd) : null, equity_curve: curve, by_symbol: group('symbol'), by_source: group('source'),
  }
}

// ── Rekam jejak sinyal ───────────────────────────────────────────────────────

const HZ: LedgerHorizon[] = ['4h', '1d', '3d', '7d']
const hs = (n: number, verdict: LedgerVerdict, mean: number | null, hit: number | null): LedgerHorizonStats => ({
  n, hit_rate: hit, hit_ci: hit === null ? null : [Math.max(0, hit - 0.08), Math.min(1, hit + 0.08)], mean_pct: mean,
  mean_ci: mean === null ? null : [r2(mean - 0.25), r2(mean + 0.25)], median_pct: mean === null ? null : r2(mean * 0.8),
  mean_rel_btc_pct: mean === null ? null : r2(mean - 0.1), rel_btc_ci: mean === null ? null : [r2(mean - 0.4), r2(mean + 0.2)],
  hit_rel_btc: hit, mean_mfe_pct: mean === null ? null : 2.4, mean_mae_pct: mean === null ? null : -1.9, days: Math.min(27, Math.ceil(n / 4)),
  coins: Math.min(29, n), sample: n === 0 ? 'none' : n < 10 ? 'too_few' : n < 30 ? 'small' : 'ok', verdict, verdict_rel_btc: verdict === 'positive' ? 'inconclusive' : verdict,
})
const lg = (source: LedgerGroup['source'], t: string, n: number, v: LedgerVerdict, mean: number | null, hit: number | null): LedgerGroup => ({
  source, signal_type: t, direction: null, n_signals: n + 6, n_pending: 6, n_no_data: 0,
  horizons: Object.fromEntries(HZ.map((h) => [h, hs(n, h === '4h' && v !== 'insufficient' ? 'inconclusive' : v, mean, hit)])) as LedgerGroup['horizons'],
})

const LEDGER_GROUPS: LedgerGroup[] = [
  lg('screener', 'tier_a', 212, 'positive', 0.42, 0.56),
  lg('screener', 'momentum', 168, 'positive', 0.61, 0.58),
  lg('screener', 'funding', 140, 'negative', -0.38, 0.44),
  lg('screener', 'oi', 96, 'inconclusive', 0.08, 0.51),
  lg('screener', 'komposit', 230, 'inconclusive', 0.12, 0.52),
  lg('screener_rekon', 'tier_c', 410, 'negative', -0.22, 0.46),
  lg('webhook', 'tv_open', 6, 'insufficient', 0.9, 0.67),
  lg('lab_watch', 'rosyade_family_4h', 4, 'insufficient', null, null),
]

const ledgerMeta = (): LedgerMeta => ({
  horizons: HZ,
  sources: ['screener', 'screener_rekon', 'lab_watch', 'universal', 'webhook'],
  types: LEDGER_GROUPS.map((g) => ({ source: g.source, signal_type: g.signal_type, n: g.n_signals, pending: g.n_pending, first_ts: ago(27 * DAY), last_ts: ago(HOUR) })),
  symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT'],
  live_since: ago(19 * DAY),
  last_live_snapshot: ago(40 * 60_000),
  last_cycle: { bar: ago(HOUR), started: ago(38 * 60_000), finished: ago(36 * 60_000), screener: null },
  backfill: { status: 'done', days: 27, from: ago(46 * DAY), to: ago(19 * DAY), signals: 4_120 },
  backfill_job: null,
  thresholds: { min_n_any: 10, min_n_ok: 30 },
})

function ledgerSummary(q: URLSearchParams) {
  const groups = LEDGER_GROUPS.filter((g) => (!q.get('source') || g.source === q.get('source')) && (!q.get('signal_type') || g.signal_type === q.get('signal_type')))
  return { groups, horizons: HZ }
}

function ledgerSignals(q: URLSearchParams) {
  const items: LedgerSignal[] = Array.from({ length: 30 }, (_, i) => {
    const g = LEDGER_GROUPS[i % LEDGER_GROUPS.length]
    const t = NOW - (i + 1) * 5 * HOUR
    const done = i > 1
    const dir: 1 | -1 = i % 4 === 1 ? -1 : 1
    return {
      id: 9000 + i, source: g.source, signal_type: g.signal_type, symbol: ['ETHUSDT', 'SOLUSDT', 'BTCUSDT', 'AVAXUSDT'][i % 4], direction: dir,
      ts: iso(t), ref: null, price: 3_000 + i * 7, entry_ts: iso(t + 15 * 60_000), entry_price: 3_000 + i * 7, status: done ? ('done' as const) : ('pending' as const), meta: {},
      outcomes: done
        ? Object.fromEntries(HZ.map((h, k) => {
            const ret = r2(Math.sin(i + k) * 1.4)
            return [h, { exit_ts: null, exit_price: null, ret_pct: ret * dir, dir_ret_pct: ret, btc_ret_pct: 0.2, rel_btc_pct: ret - 0.2, mfe_pct: 2.1, mae_pct: -1.3, hit: ret > 0 ? 1 : 0 }]
          }))
        : {},
    }
  }).filter((s) => !q.get('signal_type') || s.signal_type === q.get('signal_type'))
  const limit = Number(q.get('limit') ?? 50)
  return { items: items.slice(0, limit), total: items.length, limit, offset: 0 }
}

// ── Laporan mingguan ─────────────────────────────────────────────────────────

function isoWeekId(t: number): { id: string; start: number } {
  const d = new Date(t)
  const day = (d.getUTCDay() + 6) % 7
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)
  const thursday = new Date(monday + 3 * DAY)
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  const week = Math.ceil(((thursday.getTime() - yearStart) / DAY + 1) / 7)
  return { id: `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`, start: monday }
}

function reportWeeks(): ReportWeeksResponse {
  const cur = isoWeekId(NOW)
  const weeks: ReportWeek[] = Array.from({ length: 12 }, (_, i) => {
    const start = cur.start - i * 7 * DAY
    return {
      week: isoWeekId(start).id, start: iso(start), end: iso(start + 7 * DAY), current: i === 0, snapshot: i >= 1 && i <= 2,
      generated_at: i >= 1 && i <= 2 ? iso(start + 7 * DAY + 30 * 60_000) : null,
    }
  })
  return { current: cur.id, weeks }
}

function weekly(week: string | null): WeeklyReport {
  const all = reportWeeks().weeks
  const w = all.find((x) => x.week === week) ?? all[0]
  const start = Date.parse(w.start)
  const snapshot = w.snapshot
  return {
    week: w.week, start: w.start, end: w.end, partial: w.current, generated_at: iso(Math.min(NOW, start + 7 * DAY + 30 * 60_000)),
    source: snapshot ? 'snapshot' : 'live', snapshot: snapshot ? { generator: 'worker', generated_at: w.generated_at! } : null,
    sections: {
      paper: {
        available: true, target_trades: 30, trades_week: 7, trades_total: 54,
        best: { preset: '4H-ETH-v2', week_return_pct: 2.8 }, worst: { preset: '4H-SOL-Opt', week_return_pct: -3.4 },
        presets: ROWS.map((r, i) => ({
          preset: r.preset.name, preset_id: r.preset.id, live_reference: r.preset.live_reference, watch_id: r.watch.id, account_id: r.account.id,
          started_at: r.account.created_at, active: r.watch.autopaper_enabled, starting_balance: 10_000, balance_start: 10_000, balance_end: r.stats.equity,
          week_pnl: [280, 120, -340, 0][i], week_return_pct: [2.8, 1.2, -3.4, null][i], total_return_pct: r.stats.return_pct, trades_week: [3, 2, 2, 0][i],
          wins_week: [2, 1, 0, 0][i], trades_total: r.stats.n_closed, wins_total: r.stats.wins, max_dd_pct: r.stats.max_dd_pct, week_dd_pct: 1.2,
          open_positions: r.stats.n_open, unrealized_pnl: w.current && r.stats.n_open ? 41.2 : null, progress_pct: r.stats.progress_pct,
        })),
        note: 'Return dan DD dari trade yang sudah ditutup (ekuitas terealisasi); posisi terbuka dihitung terpisah.',
      },
      ledger: {
        available: true, horizon: '1d', signals_week: 118,
        counts_week: { terbukti: 1, negatif: 1, belum_terbukti: 3, belum_cukup_data: 3 },
        counts_overall: { terbukti: 2, negatif: 2, belum_terbukti: 2, belum_cukup_data: 2 },
        groups: LEDGER_GROUPS.map((g) => {
          const v = g.horizons['1d']
          const code = ({ positive: 'terbukti', negative: 'negatif', inconclusive: 'belum_terbukti', insufficient: 'belum_cukup_data' } as const)[v.verdict]
          const st = { n_signals: g.n_signals, n: v.n, days: v.days, hit_rate: v.hit_rate, mean_pct: v.mean_pct, mean_ci: v.mean_ci, verdict: code }
          return { key: `${g.source}|${g.signal_type}|long`, source: g.source, signal_type: g.signal_type, direction: 1, overall: st, week: { ...st, n: Math.round(v.n / 6) } }
        }),
        note: 'Vonis horizon 1 hari.',
      },
      execution: {
        available: true,
        week: { n_signals: 6, n_counted: 6, n_with_fill: 6, mean_slippage_bps: 3.4, median_slippage_bps: 2.9, mean_latency_s: 4.1, median_latency_s: 3.8, latency_upper_bound: false },
        overall: { n_signals: 41, n_counted: 40, n_with_fill: 39, mean_slippage_bps: 3.9, median_slippage_bps: 3.1, mean_latency_s: 4.4, median_latency_s: 3.9, latency_upper_bound: false },
        grid_week: [
          { k: 0.25, ttl_min: 15, n: 6, filled: 4, missed: 2, fill_rate: 0.67, mean_saving_bps: 4.2 },
          { k: 0.5, ttl_min: 60, n: 6, filled: 3, missed: 3, fill_rate: 0.5, mean_saving_bps: 7.9 },
        ],
      },
      live_bot: {
        available: true, signals: 3, orders: 6, executed: 5, rejected: 1, by_status: { success: 5, rejected: 1 }, by_symbol: { ETHUSDT: 3 },
        alerts: [
          { ts: iso(start + 1 * DAY + 4 * HOUR), symbol: 'ETHUSDT', action: 'open', side: 'long', orders: 2, executed: 2, rejected: 0, other: 0, users: 2 },
          { ts: iso(start + 3 * DAY + 8 * HOUR), symbol: 'ETHUSDT', action: 'close', side: 'long', orders: 2, executed: 1, rejected: 1, other: 0, users: 2 },
          { ts: iso(start + 4 * DAY + 16 * HOUR), symbol: 'ETHUSDT', action: 'open', side: 'short', orders: 2, executed: 2, rejected: 0, other: 0, users: 2 },
        ],
        note: 'Satu sinyal = satu alert TradingView; satu order = satu baris per user.',
      },
      lab: {
        available: true, runs: 14, runs_by_mode: { validate: 9, optimize: 3, backtest: 2 }, runs_by_status: { done: 13, error: 1 }, scans: 1, pass: 4, fail: 5,
        pass_runs: [{ id: 41, template_id: 'rosyade_family', symbol: 'ETHUSDT', timeframe: '4h', mode: 'validate', net_return_pct: 18.4, max_dd_pct: -9.1, trades: 38, scan_id: null }],
        presets_saved: [{ id: 3, name: '4H-SOL-Opt', verdict: 'PASS', source_run_id: 52, archived: false, created_at: iso(start + 2 * DAY) }],
        snooping_warnings: [{ template_id: 'rosyade_family', symbol: 'ETHUSDT', runs: 6, timeframes: 3, trials: 120, holdout_touches: 3 }],
        snooping_rule: { runs: 4, timeframes: 3, trials: 100 },
      },
      system: {
        available: true,
        deploys: { available: true, live: 2, failed: 0, dry_run: 1, events: [{ ts: iso(start + 2 * DAY + 8 * HOUR), kind: 'live', message: 'backend live @ 5ff5181; health 200' }] },
        backups: { available: true, ok: 7, failed: 0, last: { ts: iso(start + 6 * DAY + 20 * HOUR), message: 'ok lab.db 41 MB' }, events: [] },
        processes: [
          { name: 'bmtm-api', status: 'online', restarts: 12, unstable_restarts: 0, up_since: iso(start + 2 * DAY + 8 * HOUR) },
          { name: 'bmtm-web', status: 'online', restarts: 9, unstable_restarts: 0, up_since: iso(start + 2 * DAY + 8 * HOUR) },
          { name: 'bmtm-lab-worker', status: 'online', restarts: 4, unstable_restarts: 0, up_since: iso(start + 2 * DAY + 8 * HOUR) },
        ],
        processes_at: iso(Math.min(NOW, start + 7 * DAY)),
      },
    },
    hooks: [
      { id: 'arena', title: 'Arena Paper', href: '/lab/arena', note: 'Perbandingan preset paper berdampingan.' },
      { id: 'live_check', title: 'Cek Live vs Strategi', href: '/lab/live-check', note: 'Apakah bot live mengikuti strategi acuannya.' },
      { id: 'outlook', title: 'Outlook Koin', href: '/lab/outlook', note: 'Pandangan per koin untuk minggu berikutnya.' },
    ],
  }
}

// ── router ───────────────────────────────────────────────────────────────────

/** Returns `{ value }` when the route belongs to the W3b pages, else null. */
export function labPaperMock(method: string, seg: string[], qs: URLSearchParams, body?: unknown): { value: unknown } | null {
  const ok = (value: unknown) => ({ value })
  if (method === 'GET' && seg[0] === 'arena') return ok(seg[1] === 'curves' ? curves() : report())
  if (method === 'GET' && seg[0] === 'presets' && seg.length === 1) return ok(MOCK_PRESETS)
  if (method === 'GET' && seg[0] === 'paper' && seg[1] === 'accounts' && seg.length === 2) return ok(MOCK_PAPER_ACCOUNTS)
  if (seg[0] === 'journal') {
    if (method === 'GET' && seg[1] === 'stats') return ok(journalStats(qs))
    if (method === 'GET' && seg.length === 1) return ok(journalList(qs))
    if (method === 'PATCH' && seg.length === 2) {
      const j = JOURNAL.find((x) => String(x.id) === seg[1])
      if (!j) return null
      Object.assign(j, body as Partial<JournalEntry>)
      return ok(j)
    }
  }
  if (method === 'GET' && seg[0] === 'ledger') {
    if (seg[1] === 'meta') return ok(ledgerMeta())
    if (seg[1] === 'summary') return ok(ledgerSummary(qs))
    if (seg[1] === 'signals') return ok(ledgerSignals(qs))
  }
  if (method === 'GET' && seg[0] === 'report') {
    if (seg[1] === 'weeks') return ok(reportWeeks())
    if (seg[1] === 'weekly') return ok(weekly(qs.get('week')))
  }
  return null
}
