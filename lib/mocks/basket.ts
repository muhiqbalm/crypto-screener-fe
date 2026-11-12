/**
 * Mock data for basket paper strategies (Paper berjalan klasemen, basket sheet, Preset page).
 * Only used when NEXT_PUBLIC_USE_MOCK_DATA=true (visual QA without production); the trades,
 * positions and equity here are invented and never shipped. The reference numbers (`expect`)
 * are the real frozen ones from docs/research/basket/expectation.json.
 */
import type { BasketCoin, BasketDetail, BasketReport, BasketRow } from '@/lib/api/types/basket'

const NOW = Date.now()
const HOUR = 3_600_000
const DAY = 24 * HOUR
const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const r2 = (v: number) => Math.round(v * 100) / 100

const COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'SUI', 'NEAR', 'APT', '1000PEPE', '1000SHIB', 'WIF', 'FET', 'RENDER', 'ARB', 'OP', 'TIA', 'INJ', 'DOT', 'LTC', 'UNI', 'AAVE', 'GALA', 'SEI', 'HYPE', 'ZEC']

const RULES: BasketReport['rules'] = {
  prereg_id: 'basket-2026-11-12', doc: 'docs/riset-2026-11-12/08-praregistrasi-basket.md',
  json: 'docs/research/basket/prereg-basket-2026-11-12.json', commit: '52dccca', review_min_trades: 30,
  checkpoints: { '1': { min_trades: 30, min_days: 28, min_coins: 8, min_entry_days: 10 }, '2': { min_trades: 60, min_days: 56, min_coins: 0, min_entry_days: 0 } },
  deadline_days: 84, pf_fail: { '1': 1.0, '2': 1.2 }, pf_pass: 1.2, dd_limit_floor_pct: -5, dd_limit_mult: 1.5, kill_dd_pct: 15,
  fidelity_coverage_min: 0.9, fidelity_max_median_abs_diff_pp: 0.3, entry_window_s: [-300, 7200],
}

const nextMonday = (t: number) => {
  const d = new Date(t)
  const m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const add = (7 - new Date(m).getUTCDay() + 1) % 7 || 7
  return m + add * DAY
}

function coins(list: string[], o: { open: number[]; waiting: number[]; trades: number[]; seed: number; started: number }): BasketCoin[] {
  return list.map((c, i) => {
    const symbol = `${c}USDT`
    const open = o.open.includes(i)
    const waiting = o.waiting.includes(i)
    // a coin that traded since the start cannot still hold a position from before paper started
    const trades = waiting ? 0 : o.trades[i % o.trades.length]
    const pnl = trades ? r2(Math.sin(i * 1.9 + o.seed) * 28 * trades) : 0
    const price = c === 'BTC' ? 88_400 : c === 'ETH' ? 3_120 : c.startsWith('1000') ? 0.0123 : 4 + i * 3.1
    return {
      symbol, coin: c, watch_id: 300 + i + o.seed * 40, trades, wins: Math.round(trades * 0.4), pnl,
      status: open ? 'posisi_terbuka' : waiting ? 'menunggu_sinyal_baru' : i === 21 ? 'belum_dihitung' : 'menunggu_sinyal',
      last_exit: trades ? iso(NOW - (i % 5) * DAY - 3 * HOUR) : null,
      open_position: open
        ? { id: 800 + i, side: i % 3 ? 'long' : 'short', entry_price: price, entry_time: iso(NOW - (i + 2) * 7 * HOUR), qty: 1, sl: null, tp: null, mark_price: price * 1.01, mark_time: iso(NOW - 2 * 60_000), source: 'paper_auto', unrealized_pnl: r2(Math.cos(i) * 14) }
        : null,
      strategy_position: waiting
        ? { side: i % 2 ? 'short' : 'long', entry_price: price, entry_time: iso(o.started - (3 + (i % 4)) * DAY - 4 * HOUR), opened_before_paper: true, mirrored: false }
        : open ? { side: i % 3 ? 'long' : 'short', entry_price: price, entry_time: iso(NOW - (i + 3) * 7 * HOUR), opened_before_paper: false, mirrored: true } : null,
      skips: waiting ? 1 : 0, last_eval_at: iso(NOW - 34 * 60_000), last_bar: iso(NOW - 4.6 * HOUR), error: null,
    }
  })
}

function row(o: {
  id: number; name: string; label: string; title: string; template_id: string; template_label: string; list: string[]
  days: number; n: number; equity: number; dd: number; sizing: BasketRow['basket']['sizing']; seed: number
  open: number[]; waiting: number[]; trades: number[]; entryDays: number; coinsTraded: number; expect: BasketRow['expect']
}): BasketRow {
  const started = NOW - o.days * DAY
  const cs = coins(o.list, { open: o.open, waiting: o.waiting, trades: o.trades, seed: o.seed, started })
  const met = o.n >= 30 && o.coinsTraded >= 8 && o.entryDays >= 10
  const due = met ? nextMonday(Math.max(started + 28 * DAY, NOW)) : null
  const spark = Array.from({ length: 40 }, (_, i) => r2(10_000 + (o.equity - 10_000) * (i / 39) + Math.sin(i * 0.9 + o.seed) * 22))
  return {
    basket: {
      id: o.id, name: o.name, label: o.label, title: o.title, template_id: o.template_id, template_label: o.template_label, timeframe: '4h',
      n_coins: o.list.length, coins: o.list, sizing: o.sizing, active: true, created_at: iso(started),
      prereg: { id: 'basket-2026-11-12', doc: RULES.doc, json: RULES.json, commit: '52dccca' },
    },
    account: { id: 40 + o.id, name: `Paper ${o.name}`, starting_balance: 10_000, created_at: iso(started) },
    stats: {
      equity: o.equity, balance: o.equity - 31.4, upnl: 31.4, return_pct: r2((o.equity / 10_000 - 1) * 100), n_closed: o.n, n_closed_manual: 0,
      n_entries: o.n + o.open.length, n_open: o.open.length, wins: Math.round(o.n * 0.38), win_rate_pct: o.n ? 38.2 : null,
      win_rate_ci_pct: o.n ? [24, 55] : null, avg_r: o.n ? 0.21 : null, avg_trade_ret_pct: o.n ? 0.012 : null, max_dd_pct: o.dd,
      sharpe: null, sharpe_days: o.days, days_running: o.days, progress_pct: Math.min(100, (o.n / 30) * 100),
    },
    progress: { n: o.n, of: 30 },
    gate: { trades: o.n, need_trades: 30, coins: o.coinsTraded, need_coins: 8, entry_days: o.entryDays, need_entry_days: 10, days: o.days, need_days: 28 },
    evaluation: {
      status: 'BELUM', deadline: iso(started + 84 * DAY), kill: null, checkpoints: [],
      next: { checkpoint: 1, due: due ? iso(due) : null, earliest: iso(nextMonday(started + 28 * DAY)) },
    },
    coins: cs,
    waiting: { n: o.waiting.length, coins: o.waiting.map((i) => o.list[i]) },
    open_positions: o.open.length,
    fidelity: {
      expected: o.n + o.open.length + 1, matched: o.n + o.open.length, coverage: (o.n + o.open.length) / (o.n + o.open.length + 1), closed_pairs: o.n,
      median_abs_diff_pp: 0.06, engine_closed: o.n, engine_pf: 1.31, engine_pf_infinite: false, extra_paper: 0, coverage_ok: true, diff_ok: true,
    },
    expect: o.expect,
    drift: null,
    last_action: { time: iso(NOW - 3 * HOUR), kind: 'close', side: 'long', price: 152.3, reason: 'strategy_exit:flat', pnl: 8.4, source: 'paper_auto' },
    spark,
  }
}

const ROWS = (): BasketRow[] => [
  row({
    id: 1, name: '4H-BASKET-DonchianDef', label: 'DonchianDef', title: 'Basket Donchian 4 jam', template_id: 'donchian_breakout',
    template_label: 'Donchian breakout', list: COINS, days: 9.4, n: 9, equity: 10_031.6, dd: -0.42, seed: 1,
    sizing: { mode: 'risk', risk_pct: 0.25, slots: null, max_position_notional_x: 0.5, gross_cap_x: 1.5, max_open: 29, min_fill_frac: 0.1, kill_dd_pct: 15 },
    open: [2, 5, 9, 14, 18, 25], waiting: [1, 4, 7, 11, 16, 22, 27], trades: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0],
    entryDays: 6, coinsTraded: 8,
    expect: {
      trades: 851, months: 16.22, trades_per_month: 52.47, win_rate_pct: 36.55, profit_factor: 1.119, net_return_pct: 8.7, per_trade_ret_pct: 0.0098,
      max_dd_pct: -10.39, mc_dd_p95_pct: -7.87, sharpe: 0.51, avg_hold_days: 4.88, max_gross_x: 1.07, gross_cap_binds: 0, coins_traded: 29,
      days_to_30_median: 22.3, days_to_30_p10: 15.5, days_to_30_p90: 31.7, days_to_checkpoint1_median: 29, days_to_checkpoint1_p90: 36,
      start: '2025-07-06T00:00:00Z', end: '2026-11-12T00:00:00Z', sizing_rule: 'risk 0.25% per trade at the strategy stop, one 10k account',
      contaminated: false, source_note: 'Donchian default chosen on data up to 2025-07-06: window is clean',
    },
  }),
  row({
    id: 2, name: '4H-BASKET-RosyadeVT60', label: 'RosyadeVT60', title: 'Basket Rosyade 4 jam VT60', template_id: 'rosyade_family',
    template_label: 'Rosyade', list: COINS.filter((c) => c !== 'ETH'), days: 9.4, n: 31, equity: 10_118.9, dd: -0.91, seed: 2,
    sizing: { mode: 'slot_engine', risk_pct: null, slots: 28, max_position_notional_x: 0.25, gross_cap_x: 2, max_open: 28, min_fill_frac: 0.1, kill_dd_pct: 15 },
    open: [0, 3, 6, 8, 12, 19, 23, 26], waiting: [5, 15], trades: [2, 1, 1, 0, 2, 1, 1, 2, 0, 1, 1, 2, 1, 0, 2, 1, 1, 1, 2, 0, 1, 1, 2, 1, 0, 2, 1, 1],
    entryDays: 10, coinsTraded: 23,
    expect: {
      trades: 1829, months: 16.23, trades_per_month: 112.69, win_rate_pct: 32.48, profit_factor: 1.211, net_return_pct: 26.61, per_trade_ret_pct: 0.0129,
      max_dd_pct: -14.32, mc_dd_p95_pct: -6.61, sharpe: 1.07, avg_hold_days: 1.66, max_gross_x: 0.91, gross_cap_binds: 0, coins_traded: 28,
      days_to_30_median: 9.8, days_to_30_p10: 5.2, days_to_30_p90: 15.5, days_to_checkpoint1_median: 29, days_to_checkpoint1_p90: 29,
      start: '2025-07-06T00:00:00Z', end: '2026-11-12T00:00:00Z', sizing_rule: 'VT60 per coin x balance/28 slots, one 10k account',
      contaminated: true, source_note: 'Rosyade Basic was built on all ETH history and this window was viewed for ETH/BTC/SOL: not clean',
    },
  }),
]

function detail(r: BasketRow): BasketDetail {
  const start = Date.parse(r.basket.created_at)
  const traded = r.coins.filter((c) => c.trades > 0)
  return {
    ...r,
    generated_at: iso(NOW - 60_000),
    curve: r.spark.map((equity, i) => ({ t: iso(start + (i / (r.spark.length - 1)) * (NOW - start)), equity })),
    trades: Array.from({ length: Math.min(12, r.progress.n) }, (_, i) => {
      const c = traded[i % Math.max(1, traded.length)]
      const pnl = r2(Math.sin(i * 2.2 + r.basket.id) * 31)
      return {
        id: 900 + i, symbol: c?.symbol ?? 'BTCUSDT', side: i % 3 ? 'long' : 'short', entry_time: iso(NOW - (i + 1) * 17 * HOUR - 9 * HOUR),
        entry_price: 100 + i, exit_time: iso(NOW - (i + 1) * 17 * HOUR), exit_price: 100 + i + pnl / 10, qty: 3, pnl, r_multiple: r2(pnl / 25),
        exit_reason: i % 4 === 0 ? 'hard_sl' : 'strategy_exit:flat',
      }
    }),
    events: r.waiting.coins.map((c, i) => ({
      id: 70 + i, basket_id: r.basket.id, watch_id: 300 + i, symbol: `${c}USDT`, kind: 'skip' as const, reason: 'sebelum_mulai',
      bar: iso(start - 2 * HOUR), detail: null, created_at: iso(start + 60_000),
    })),
    fidelity: {
      ...r.fidelity,
      missed: [{ symbol: 'GALAUSDT', coin: 'GALA', side: 'long', signal_time: iso(NOW - 2 * DAY), reason: 'paper_error: long SL 0.0151 must be below the fill 0.0150' }],
    },
    rules: RULES,
  }
}

/** GET /api/v1/lab/baskets[/{id}] in mock mode. */
export function basketMock(method: string, seg: string[]): { value: unknown } | null {
  if (method !== 'GET' || seg[0] !== 'baskets') return null
  const rows = ROWS()
  if (seg.length === 1) return { value: { generated_at: iso(NOW - 60_000), rules: RULES, rows } satisfies BasketReport }
  const r = rows.find((x) => String(x.basket.id) === seg[1])
  return r ? { value: detail(r) } : null
}
