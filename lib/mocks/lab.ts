/**
 * Strategy Lab mock backend — ONLY reachable when NEXT_PUBLIC_USE_MOCK_DATA=true
 * (lazy-imported from lib/api/client.ts, tree-shaken out of production).
 * Navbar shows "Mock Mode" whenever this is active, so these synthetic numbers
 * are never presented as real results.
 */
import { ApiError } from '@/lib/api/errors'
import type {
  LabCheck,
  LabDataStatus,
  LabEquityPoint,
  LabRunCreateRequest,
  LabRunDetail,
  LabScanCreateRequest,
  LabScanDetail,
  LabSymbol,
  LabTemplate,
  LabTrade,
  LabWatch,
  LabWatchCreateRequest,
  JournalEntry,
  JournalStats,
  PaperAccount,
  PaperAccountCreateRequest,
  PaperOrderRequest,
} from '@/lib/api/types/lab'

export const MOCK_LAB_TEMPLATES: LabTemplate[] = [
  {
    id: 'rosyade_v1',
    name: 'Rosyade (ETH 4H live)',
    description: 'Logika sama dengan strategi live Rosyade di TradingView. Default = setting live ETH 4H.',
    timeframes: ['15m', '30m', '1h', '2h', '4h', '1d'],
    params: [
      { key: 'ema_fast', label: 'EMA cepat', type: 'int', default: 21, min: 2, max: 200, step: 1, group: 'Trend' },
      { key: 'ema_slow', label: 'EMA lambat', type: 'int', default: 55, min: 5, max: 400, step: 1, group: 'Trend' },
      { key: 'use_htf_filter', label: 'Filter trend HTF', type: 'bool', default: true, group: 'Trend' },
      { key: 'rsi_len', label: 'Panjang RSI', type: 'int', default: 14, min: 2, max: 50, step: 1, group: 'Momentum' },
      { key: 'rsi_ob', label: 'RSI overbought', type: 'float', default: 70, min: 50, max: 95, step: 0.5, group: 'Momentum' },
      { key: 'atr_mult_sl', label: 'SL (x ATR)', type: 'float', default: 1.5, min: 0.5, max: 6, step: 0.1, group: 'Risk' },
      { key: 'rr', label: 'Risk:Reward', type: 'float', default: 2, min: 0.5, max: 6, step: 0.1, group: 'Risk' },
      { key: 'side', label: 'Arah', type: 'choice', default: 'both', choices: ['both', 'long', 'short'], group: 'Risk' },
    ],
  },
]

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT', 'PEPEUSDT']

export const MOCK_LAB_SYMBOLS: LabSymbol[] = SYMBOLS.map((symbol, i) => ({
  symbol,
  has_data: i < 8,
  timeframes: i < 8 ? ['1h', '4h', '1d'] : [],
}))

// Deterministic pseudo-random so the mock is stable between renders.
function seeded(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h) + 1
}

const runs = new Map<string, LabRunDetail>()
const watches = new Map<string, LabWatch>()
const paperAccounts = new Map<string, PaperAccount>()
const journal = new Map<string, JournalEntry>()

// Mock fills use a fixed placeholder price — mock mode only, never real.
const MOCK_FILL_PRICE = 100

function mockStats(accountId?: string): JournalStats {
  const closed = [...journal.values()].filter((j) => j.exit_time && (!accountId || j.account_id === accountId))
  const wins = closed.filter((j) => (j.pnl ?? 0) > 0)
  const gross = (f: (n: number) => boolean) => closed.reduce((a, j) => a + (f(j.pnl ?? 0) ? Math.abs(j.pnl ?? 0) : 0), 0)
  const net = closed.reduce((a, j) => a + (j.pnl ?? 0), 0)
  const avgR = closed.length ? closed.reduce((a, j) => a + (j.r_multiple ?? 0), 0) / closed.length : null
  let eq = 10_000
  return {
    trades: closed.length,
    winrate: closed.length ? wins.length / closed.length : null,
    avg_r: avgR,
    expectancy_r: avgR,
    profit_factor: gross((n) => n < 0) > 0 ? gross((n) => n > 0) / gross((n) => n < 0) : null,
    net_pnl: net,
    max_dd_pct: 0,
    equity_curve: closed.map((j) => ({ t: j.exit_time!, equity: (eq += j.pnl ?? 0) })),
    by_symbol: [],
    by_source: [],
  }
}
const scans = new Map<string, LabScanDetail>()
let counter = 0

function makeChecks(rand: () => number): LabCheck[] {
  const pf = 0.8 + rand() * 1.2
  const trades = Math.round(20 + rand() * 80)
  const dd = 8 + rand() * 30
  return [
    { name: 'oos_pf', label: 'Profit factor OOS', value: Number(pf.toFixed(2)), threshold: 1.2, passed: pf >= 1.2 },
    { name: 'oos_trades', label: 'Jumlah trade OOS', value: trades, threshold: 30, passed: trades >= 30 },
    { name: 'oos_dd', label: 'Max drawdown OOS (%)', value: Number(dd.toFixed(1)), threshold: 25, passed: dd <= 25 },
    { name: 'is_oos_decay', label: 'Penurunan PF IS→OOS (%)', value: Number((rand() * 60).toFixed(1)), threshold: 50, passed: rand() > 0.3 },
  ]
}

function makeRun(id: string, req: LabRunCreateRequest, createdAt: string): LabRunDetail {
  const rand = seeded(hash(id + req.symbol + req.timeframe))
  const validated = req.mode !== 'backtest'
  const checks = validated ? makeChecks(rand) : []
  const verdict = validated ? (checks.every((c) => c.passed) ? 'PASS' : 'FAIL') : null
  const net = -20 + rand() * 90
  const metrics = {
    net_return_pct: Number(net.toFixed(2)),
    profit_factor: Number((0.8 + rand() * 1.4).toFixed(2)),
    max_dd_pct: Number((5 + rand() * 30).toFixed(2)),
    trades: Math.round(40 + rand() * 200),
    win_rate_pct: Number((35 + rand() * 25).toFixed(1)),
    sharpe: Number((rand() * 2).toFixed(2)),
  }
  const oos = validated
    ? {
        net_return_pct: Number((net * (0.2 + rand() * 0.6)).toFixed(2)),
        profit_factor: checks[0].value as number,
        max_dd_pct: checks[2].value as number,
        trades: checks[1].value as number,
        win_rate_pct: Number((30 + rand() * 25).toFixed(1)),
        sharpe: Number((rand() * 1.5).toFixed(2)),
      }
    : null
  const tpl = MOCK_LAB_TEMPLATES[0]
  const best =
    req.mode === 'optimize'
      ? Object.fromEntries(
          tpl.params.map((p) => [
            p.key,
            p.type === 'int'
              ? Math.round(Number(p.default) * (0.8 + rand() * 0.4))
              : p.type === 'float'
                ? Number((Number(p.default) * (0.8 + rand() * 0.4)).toFixed(1))
                : p.default,
          ]),
        )
      : null
  return {
    id,
    template_id: req.template_id,
    symbol: req.symbol,
    timeframe: req.timeframe,
    mode: req.mode,
    status: 'done',
    verdict,
    net_return_pct: oos ? oos.net_return_pct : metrics.net_return_pct,
    profit_factor: oos ? oos.profit_factor : metrics.profit_factor,
    max_dd_pct: oos ? oos.max_dd_pct : metrics.max_dd_pct,
    trades: oos ? oos.trades : metrics.trades,
    created_at: createdAt,
    params: req.params,
    costs: req.costs,
    start: req.start ?? '2021-01-01',
    end: req.end ?? '2026-10-31',
    metrics,
    oos_metrics: oos,
    checks,
    holdout_touches: validated ? 1 + Math.floor(rand() * 3) : 0,
    engine_commit: 'mock000',
    error: null,
    best_params: best,
    job_id: `job-${id}`,
  }
}

function seed() {
  if (runs.size > 0) return
  const base = Date.parse('2026-11-01T00:00:00Z')
  const tpl = MOCK_LAB_TEMPLATES[0]
  const defaults = Object.fromEntries(tpl.params.map((p) => [p.key, p.default]))
  const costs = { commission_pct: 0.05, slippage_pct: 0.05, funding: true }
  const seeds: [string, string, LabRunCreateRequest['mode']][] = [
    ['ETHUSDT', '4h', 'validate'],
    ['BTCUSDT', '4h', 'backtest'],
    ['SOLUSDT', '1h', 'optimize'],
  ]
  seeds.forEach(([symbol, timeframe, mode], i) => {
    const id = `mock-run-${i + 1}`
    runs.set(id, makeRun(id, { template_id: tpl.id, symbol, timeframe, mode, params: defaults, costs }, new Date(base + i * 3_600_000).toISOString()))
  })
  const errId = 'mock-run-err'
  const errRun = makeRun(errId, { template_id: tpl.id, symbol: 'PEPEUSDT', timeframe: '4h', mode: 'validate', params: defaults, costs }, new Date(base + 4 * 3_600_000).toISOString())
  runs.set(errId, {
    ...errRun,
    status: 'error',
    verdict: null,
    net_return_pct: null,
    profit_factor: null,
    max_dd_pct: null,
    trades: null,
    metrics: {},
    oos_metrics: null,
    checks: [],
    holdout_touches: 0,
    best_params: null,
    error: 'Data PEPEUSDT 4h belum tersedia (mock)',
  })
}

function makeEquity(run: LabRunDetail): LabEquityPoint[] {
  const rand = seeded(hash(run.id))
  const n = 300
  const start = Date.parse(`${run.start ?? '2021-01-01'}T00:00:00Z`)
  const end = Date.parse(`${run.end ?? '2026-10-31'}T00:00:00Z`)
  const step = (end - start) / n
  let eq = 10_000
  const out: LabEquityPoint[] = []
  for (let i = 0; i < n; i++) {
    eq *= 1 + (rand() - 0.47) * 0.02
    const segment = run.mode === 'backtest' ? 'is' : i < n * 0.6 ? 'is' : i < n * 0.85 ? 'oos' : 'holdout'
    out.push({ t: new Date(start + i * step).toISOString(), equity: Number(eq.toFixed(2)), segment })
  }
  return out
}

function makeTrades(run: LabRunDetail): LabTrade[] {
  const rand = seeded(hash(run.id + 't'))
  const start = Date.parse(`${run.start ?? '2021-01-01'}T00:00:00Z`)
  const out: LabTrade[] = []
  let price = 2000
  for (let i = 0; i < 40; i++) {
    const entry = start + i * 86_400_000 * 20
    const side = rand() > 0.5 ? 'long' : 'short'
    const move = (rand() - 0.45) * 0.08
    const exit = price * (1 + (side === 'long' ? move : -move))
    out.push({
      entry_time: new Date(entry).toISOString(),
      exit_time: new Date(entry + 86_400_000 * 3).toISOString(),
      side,
      entry_price: Number(price.toFixed(2)),
      exit_price: Number(exit.toFixed(2)),
      pnl_pct: Number((move * 100).toFixed(2)),
      return_on_equity_pct: Number((move * 100 * 0.5).toFixed(2)),
      exit_reason: move > 0 ? 'tp' : 'sl',
    })
    price = exit
  }
  return out
}

function makeDataStatus(): LabDataStatus[] {
  return MOCK_LAB_SYMBOLS.filter((s) => s.has_data).flatMap((s) =>
    s.timeframes.map((tf) => ({
      symbol: s.symbol,
      timeframe: tf,
      first: '2021-01-01T00:00:00Z',
      last: '2026-11-09T00:00:00Z',
      rows: tf === '1h' ? 51_336 : tf === '4h' ? 12_834 : 2_139,
    })),
  )
}

function notFound(): never {
  throw new ApiError('not_found', 404)
}

export async function getLabMock(method: string, fullPath: string, body?: unknown): Promise<unknown> {
  seed()
  const path = fullPath.split('?')[0].replace(/^\/api\/v1\/lab/, '')
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent)

  if (method === 'GET' && path === '/me') return { is_admin: true }
  if (method === 'GET' && path === '/templates') return MOCK_LAB_TEMPLATES
  if (method === 'GET' && path === '/symbols') return MOCK_LAB_SYMBOLS
  if (method === 'GET' && path === '/data/status') return makeDataStatus()

  if (seg[0] === 'runs') {
    if (method === 'POST' && seg.length === 1) {
      const req = body as LabRunCreateRequest
      const id = `mock-run-new-${++counter}`
      runs.set(id, makeRun(id, req, new Date().toISOString()))
      return { run_id: id, job_id: `job-${id}` }
    }
    if (method === 'GET' && seg.length === 1) {
      return [...runs.values()]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, template_id, symbol, timeframe, mode, status, verdict, net_return_pct, profit_factor, max_dd_pct, trades, created_at }) => ({
          id, template_id, symbol, timeframe, mode, status, verdict, net_return_pct, profit_factor, max_dd_pct, trades, created_at,
        }))
    }
    const run = runs.get(seg[1])
    if (!run) notFound()
    if (method === 'GET' && seg.length === 2) return run
    if (method === 'GET' && seg[2] === 'equity') return run.status === 'done' ? makeEquity(run) : []
    if (method === 'GET' && seg[2] === 'trades') return run.status === 'done' ? makeTrades(run) : []
  }

  if (seg[0] === 'scans') {
    if (method === 'POST' && seg.length === 1) {
      const req = body as LabScanCreateRequest
      const id = `mock-scan-${++counter}`
      const rows = req.symbols.flatMap((symbol) =>
        req.timeframes.map((timeframe) => {
          const runId = `${id}-${symbol}-${timeframe}`
          const run = makeRun(runId, { template_id: req.template_id, symbol, timeframe, mode: req.mode, params: req.params ?? {}, costs: req.costs }, new Date().toISOString())
          runs.set(runId, run)
          return {
            symbol,
            timeframe,
            run_id: runId,
            status: run.status,
            verdict: run.verdict,
            oos_net_return_pct: run.oos_metrics?.net_return_pct as number,
            oos_profit_factor: run.oos_metrics?.profit_factor as number,
            oos_max_dd_pct: run.oos_metrics?.max_dd_pct as number,
            trades: run.trades,
          }
        }),
      )
      scans.set(id, { id, status: 'done', progress: { done: rows.length, total: rows.length }, rows, template_id: req.template_id, mode: req.mode, created_at: new Date().toISOString() })
      return { scan_id: id }
    }
    if (method === 'GET' && seg.length === 1) return [...scans.values()].reverse()
    const scan = scans.get(seg[1])
    if (!scan) notFound()
    return scan
  }

  if (method === 'GET' && path === '/klines') {
    // Klines are never mocked: the chart must show real Binance prices or an
    // error. Throwing makes the chart fall through to the next real source.
    throw new ApiError('not_found', 404)
  }

  if (seg[0] === 'watches') {
    if (method === 'POST' && seg.length === 1) {
      const req = body as LabWatchCreateRequest
      const id = `mock-watch-${++counter}`
      watches.set(id, { id, template_id: req.template_id, symbol: req.symbol, timeframe: req.timeframe, params: req.params, created_at: new Date().toISOString(), autopaper: null })
      return { watch_id: id }
    }
    if (method === 'GET' && seg.length === 1) return [...watches.values()]
    const w = watches.get(seg[1])
    if (!w) notFound()
    if (method === 'DELETE') {
      watches.delete(seg[1])
      return undefined
    }
    if (method === 'POST' && seg[2] === 'autopaper') {
      const req = body as { account_id: string; enabled: boolean }
      watches.set(w.id, { ...w, autopaper: { account_id: req.account_id, enabled: req.enabled } })
      return { ok: true }
    }
    if (method === 'GET' && seg[2] === 'compare') {
      return { paper: { trades: 0 }, backtest: { trades: 0 } }
    }
    if (method === 'GET' && seg[2] === 'state') {
      const now = Date.now()
      return {
        watch_id: w.id,
        computed_at: new Date(now).toISOString(),
        last_bar: new Date(now - 3_600_000).toISOString(),
        position: null,
        recent_trades: [],
        last_signal: null,
      }
    }
  }

  if (seg[0] === 'paper') {
    if (seg[1] === 'accounts' && method === 'GET') return [...paperAccounts.values()]
    if (seg[1] === 'accounts' && method === 'POST') {
      const req = body as PaperAccountCreateRequest
      const id = `mock-acct-${++counter}`
      paperAccounts.set(id, { id, name: req.name, balance: req.starting_balance, equity: req.starting_balance, open_positions: 0, realized_pnl: 0, created_at: new Date().toISOString(), risk_pct: req.risk_pct, leverage_max: req.leverage_max, starting_balance: req.starting_balance })
      return { id }
    }
    if (seg[1] === 'orders' && method === 'POST') {
      const req = body as PaperOrderRequest
      const id = `mock-j-${++counter}`
      const dist = Math.abs(MOCK_FILL_PRICE - req.sl) || 1
      journal.set(id, {
        id, account_id: req.account_id, source: 'paper_manual', watch_id: req.watch_id ?? null, run_id: null,
        symbol: req.symbol, side: req.side, entry_time: new Date().toISOString(), entry_price: MOCK_FILL_PRICE,
        exit_time: null, exit_price: null, qty: req.qty ?? 100 / dist, fees: 0, funding: 0, sl: req.sl, tp: req.tp ?? null,
        risk_amount: 100, pnl: null, r_multiple: null, exit_reason: null, notes: req.note ?? null, tags: [],
      })
      return { position_id: id }
    }
    if (seg[1] === 'positions' && seg[3] === 'close' && method === 'POST') {
      const j = journal.get(seg[2])
      if (!j) notFound()
      journal.set(j.id, { ...j, exit_time: new Date().toISOString(), exit_price: j.entry_price, pnl: 0, r_multiple: 0, exit_reason: 'manual' })
      return { ok: true }
    }
  }

  if (seg[0] === 'journal') {
    if (method === 'GET' && seg[1] === 'stats') {
      const qs = new URLSearchParams(fullPath.split('?')[1] ?? '')
      return mockStats(qs.get('account_id') ?? undefined)
    }
    if (method === 'GET' && seg.length === 1) {
      const qs = new URLSearchParams(fullPath.split('?')[1] ?? '')
      return [...journal.values()].filter(
        (j) =>
          (!qs.get('account_id') || j.account_id === qs.get('account_id')) &&
          (!qs.get('symbol') || j.symbol === qs.get('symbol')) &&
          (!qs.get('source') || j.source === qs.get('source')),
      )
    }
    if (method === 'PATCH' && seg.length === 2) {
      const j = journal.get(seg[1])
      if (!j) notFound()
      const patch = body as { notes: string; tags: string[] }
      const next = { ...j, notes: patch.notes, tags: patch.tags }
      journal.set(j.id, next)
      return next
    }
  }

  if (seg[0] === 'jobs') {
    if (method === 'POST' && seg[2] === 'cancel') return { id: seg[1], status: 'cancelled' }
    return { id: seg[1], status: 'done' }
  }

  throw new Error(`No lab mock for ${method} ${fullPath}`)
}
