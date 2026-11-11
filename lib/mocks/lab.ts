/**
 * Strategy Lab mock backend — ONLY reachable when NEXT_PUBLIC_USE_MOCK_DATA=true
 * (lazy-imported from lib/api/client.ts, tree-shaken out of production).
 * the API status pill shows "Mode mock" whenever this is active, so these synthetic numbers
 * are never presented as real results.
 *
 * Shapes mirror the real backend (crypto-screener src/api/lab_routes.py):
 * integer ids, the real rosyade_family schema (lab-template.json is a dump of
 * src/lab/templates/rosyade_family.py), honesty check names/thresholds,
 * metrics = in-sample (+ nested extras), oos_metrics = locked holdout,
 * equity segments is/holdout only, paper accounts with open_positions list.
 * Candles (/klines) are never mocked.
 */
import { ApiError } from '@/lib/api/errors'
import templateJson from './lab-template.json'
import type {
  JournalEntry,
  JournalStats,
  LabCheck,
  LabDataStatus,
  LabEquityPoint,
  LabParamValue,
  LabRunCreateRequest,
  LabRunDetail,
  LabScanCreateRequest,
  LabScanDetail,
  LabSymbol,
  LabTemplate,
  LabTrade,
  LabWatch,
  LabWatchCreateRequest,
  PaperAccount,
  PaperAccountCreateRequest,
  PaperOrderRequest,
  PaperPosition,
} from '@/lib/api/types/lab'

const MOCK_LAB_TEMPLATES: LabTemplate[] = [templateJson as unknown as LabTemplate]
const TPL = MOCK_LAB_TEMPLATES[0]
const DEFAULTS: Record<string, LabParamValue> = Object.fromEntries(TPL.params.map((p) => [p.key, p.default]))

// Same order as the backend screener universe (settings.symbols).
const UNIVERSE = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'SUIUSDT',
  'NEARUSDT', 'APTUSDT', '1000PEPEUSDT', '1000SHIBUSDT', 'WIFUSDT', 'FETUSDT', 'RENDERUSDT', 'ARBUSDT', 'OPUSDT',
  'TIAUSDT', 'INJUSDT', 'DOTUSDT', 'LTCUSDT', 'UNIUSDT', 'AAVEUSDT', 'GALAUSDT', 'SEIUSDT', 'HYPEUSDT', 'ZECUSDT',
]

const MOCK_LAB_SYMBOLS: LabSymbol[] = UNIVERSE.map((symbol, i) => ({
  symbol,
  has_data: i < 12,
  timeframes: i < 4 ? ['15m', '30m', '1h', '4h', '1d'] : i < 12 ? ['1h', '4h', '1d'] : [],
}))

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

const r2 = (v: number) => Math.round(v * 100) / 100

const runs = new Map<number, LabRunDetail>()
const scans = new Map<number, LabScanDetail>()
const watches = new Map<number, LabWatch>()
const paperAccounts = new Map<number, PaperAccount>()
const journal = new Map<number, JournalEntry>()
let nextId = 100

function makeChecks(o: { pf: number; net: number; trades: number; mc: number; stress: number; unstable: number; liq: number }): LabCheck[] {
  const c = (name: string, label: string, value: number, threshold: string, passed: boolean): LabCheck => ({ name, label, value, threshold, passed })
  return [
    c('oos_profit_factor', 'Holdout profit factor', o.pf, '>= 1.2', o.pf >= 1.2),
    c('oos_net_return', 'Holdout net return after costs (%)', o.net, '> 0.0', o.net > 0),
    c('mc_dd_p95', 'Monte Carlo 95th-pct drawdown (%)', o.mc, '> -50.0', o.mc > -50),
    c('min_oos_trades', 'Holdout trades', o.trades, '>= 30', o.trades >= 30),
    c('cost_stress', 'Holdout net at 2x costs (%)', o.stress, '> 0', o.stress > 0),
    c('sensitivity', 'Fragile parameters', o.unstable, '<= 3', o.unstable <= 3),
    c('no_liquidation', 'Liquidations', o.liq, '<= 0', o.liq <= 0),
  ]
}

function metricBlock(rand: () => number, scale = 1) {
  const net = (-25 + rand() * 120) * scale
  return {
    net_return_pct: r2(net),
    profit_factor: r2(0.75 + rand() * 1.3),
    max_dd_pct: r2(8 + rand() * 40),
    max_dd_intrabar_pct: r2(10 + rand() * 45),
    trades: Math.round((40 + rand() * 160) * scale),
    win_rate_pct: r2(30 + rand() * 25),
    sharpe: r2(rand() * 1.8),
    liquidations: 0,
    funding_paid: r2(rand() * 300),
    fees_paid: r2(200 + rand() * 600),
    final_equity: r2(10_000 * (1 + net / 100)),
    longs: Math.round(30 + rand() * 60),
    shorts: Math.round(10 + rand() * 40),
  }
}

function makeRun(id: number, req: LabRunCreateRequest, createdAt: string, forcePass?: boolean): LabRunDetail {
  const rand = seeded(hash(`${id}${req.symbol}${req.timeframe}`))
  const start = req.start ?? '2020-01-01'
  const end = req.end ?? '2026-11-09'
  const hs = new Date(Date.parse(`${start}T00:00:00Z`) + (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) * 0.8)
    .toISOString().slice(0, 10) + 'T00:00:00Z'
  const isM = metricBlock(rand)
  const validated = req.mode !== 'backtest'
  const oosBase = metricBlock(rand, 0.3)
  const pass = forcePass ?? rand() > 0.6
  const o = {
    pf: pass ? r2(1.3 + rand()) : r2(0.7 + rand() * 0.6),
    net: pass ? r2(5 + rand() * 30) : r2(-15 + rand() * 20),
    trades: pass ? 30 + Math.round(rand() * 40) : 12 + Math.round(rand() * 30),
    mc: pass ? r2(-20 - rand() * 25) : r2(-35 - rand() * 40),
    stress: pass ? r2(2 + rand() * 10) : r2(-10 + rand() * 12),
    unstable: pass ? Math.round(rand() * 3) : Math.round(rand() * 6),
    liq: 0,
  }
  const checks = validated ? makeChecks(o) : []
  const verdict = validated ? (checks.every((c) => c.passed) ? 'PASS' : 'FAIL') : null
  const oos = validated
    ? { ...oosBase, net_return_pct: o.net, profit_factor: o.pf, trades: o.trades, start: hs, end: `${end}T00:00:00Z`, stress_net_return_pct: o.stress, stress_multiplier: 2 }
    : null
  const sensKeys = TPL.params.filter((p) => p.tunable).map((p) => p.key)
  const best =
    req.mode === 'optimize'
      ? {
          ...req.params,
          ...Object.fromEntries(
            TPL.params
              .filter((p) => p.tunable && (!req.search || req.search.params.includes(p.key)))
              .map((p) => {
                const lo = p.min ?? 0
                const hi = p.max ?? 1
                const v = lo + rand() * (hi - lo)
                return [p.key, p.type === 'int' ? Math.round(v) : r2(v)]
              }),
          ),
        }
      : null
  return {
    id,
    template_id: req.template_id,
    symbol: req.symbol,
    timeframe: req.timeframe,
    mode: req.mode,
    status: 'done',
    verdict,
    net_return_pct: isM.net_return_pct,
    profit_factor: isM.profit_factor,
    max_dd_pct: isM.max_dd_pct,
    trades: isM.trades,
    created_at: createdAt,
    params: req.params,
    costs: req.costs,
    start,
    end,
    metrics: {
      ...isM,
      segment: 'in_sample',
      start: `${start}T00:00:00Z`,
      end: hs,
      // nested extras exist in the real payload; the UI must ignore them
      full_range: null,
      monte_carlo: null,
    } as LabRunDetail['metrics'],
    oos_metrics: oos as LabRunDetail['oos_metrics'],
    checks,
    holdout_touches: validated ? 1 + Math.floor(rand() * 3) : 0,
    holdout_start: validated ? hs : null,
    honesty_version: validated ? '2026-11.1' : null,
    engine_commit: 'mock000',
    error: null,
    finished_at: createdAt,
    best_params: best,
    job_id: id + 5000,
    ...(req.mode === 'optimize'
      ? {
          n_trials: req.n_trials ?? 30,
          trials_done: req.n_trials ?? 30,
          search: req.search ?? { params: TPL.params.filter((p) => p.tunable).map((p) => p.key), ranges: {} },
          objective: 'net return × PF, penalti drawdown & segmen rugi (walk-forward in-sample)',
          top_trials: Array.from({ length: 5 }, (_, i) => {
            const keys = (req.search?.params ?? TPL.params.filter((p) => p.tunable).map((p) => p.key)).slice(0, 4)
            return {
              rank: i + 1,
              trial: Math.round(rand() * 29),
              score: r2(3 - i * 0.4),
              params: Object.fromEntries(
                keys.map((k) => {
                  const spec = TPL.params.find((p) => p.key === k)!
                  const v = (spec.min ?? 0) + rand() * ((spec.max ?? 1) - (spec.min ?? 0))
                  return [k, spec.type === 'int' ? Math.round(v) : r2(v)]
                }),
              ),
              metrics: { net_return_pct: r2(60 - i * 9), profit_factor: r2(1.6 - i * 0.08), max_dd_pct: r2(18 + i * 3), trades: 120 - i * 7, sharpe: r2(1.2 - i * 0.1), profitable_segments: 4 - (i > 2 ? 1 : 0), segments: 5 },
              error: null,
            }
          }),
        }
      : {}),
    sensitivity: validated
      ? {
          params: sensKeys.slice(0, 8).map((k) => {
            const st = r2(0.3 + rand() * 0.7)
            return { param: k, base: DEFAULTS[k] as number, stability: st, profitable_fraction: r2(rand()), fragile: st <= 0.5 }
          }),
          unstable: o.unstable,
          threshold: 0.5,
          steps: [-0.2, -0.1, 0.1, 0.2],
        }
      : null,
  }
}

function listItem(r: LabRunDetail) {
  const { id, template_id, symbol, timeframe, mode, status, verdict, net_return_pct, profit_factor, max_dd_pct, trades, created_at, job_id } = r
  return { id, template_id, symbol, timeframe, mode, status, verdict, net_return_pct, profit_factor, max_dd_pct, trades, created_at, job_id }
}

const COSTS = { commission_pct: 0.05, slippage_pct: 0.05, funding: true }

function seed() {
  if (runs.size > 0) return
  const now = Date.now()
  const seeds: [string, string, LabRunCreateRequest['mode'], boolean | undefined][] = [
    ['ETHUSDT', '4h', 'validate', true],
    ['ETHUSDT', '4h', 'optimize', false],
    ['BTCUSDT', '4h', 'backtest', undefined],
    ['SOLUSDT', '1h', 'validate', false],
  ]
  seeds.forEach(([symbol, timeframe, mode, pass], i) => {
    const id = i + 1
    runs.set(id, makeRun(id, { template_id: TPL.id, symbol, timeframe, mode, params: DEFAULTS, costs: COSTS }, new Date(now - (i + 1) * 47 * 60_000).toISOString(), pass))
  })
  const running = makeRun(5, { template_id: TPL.id, symbol: 'LINKUSDT', timeframe: '4h', mode: 'validate', params: DEFAULTS, costs: COSTS }, new Date(now - 90_000).toISOString())
  runs.set(5, { ...running, status: 'running', verdict: null, checks: [], net_return_pct: null, profit_factor: null, max_dd_pct: null, trades: null, oos_metrics: null, metrics: {}, sensitivity: null })
  const err = makeRun(6, { template_id: TPL.id, symbol: 'ZECUSDT', timeframe: '1d', mode: 'validate', params: DEFAULTS, costs: COSTS }, new Date(now - 26 * 3_600_000).toISOString())
  runs.set(6, {
    ...err, status: 'error', verdict: null, net_return_pct: null, profit_factor: null, max_dd_pct: null, trades: null,
    metrics: {}, oos_metrics: null, checks: [], holdout_touches: 0, best_params: null, sensitivity: null,
    error: 'HoldoutError: development segment before the holdout is shorter than 60 days',
  })

  // One finished scan for the heatmap
  const scanSyms = UNIVERSE.slice(0, 8)
  const tfs = ['1h', '4h', '1d']
  const rows = scanSyms.flatMap((symbol, si) =>
    tfs.map((timeframe, ti) => {
      const id = 200 + si * 3 + ti
      const run = makeRun(id, { template_id: TPL.id, symbol, timeframe, mode: 'validate', params: DEFAULTS, costs: COSTS }, new Date(now - 3 * 3_600_000).toISOString())
      runs.set(id, run)
      return scanRow(run)
    }),
  )
  scans.set(1, { id: 1, status: 'done', progress: { done: rows.length, total: rows.length }, rows, template_id: TPL.id, mode: 'validate', created_at: new Date(now - 3 * 3_600_000).toISOString() })

  // Paper account + journal history (mock only)
  paperAccounts.set(1, {
    id: 1, name: 'Paper ETH 4H', balance: 10_412.5, equity: 10_412.5, realized_pnl: 412.5, created_at: new Date(now - 20 * 86_400_000).toISOString(),
    risk_pct: 1, leverage_max: 5, starting_balance: 10_000, open_positions: [],
  })
  const rand = seeded(42)
  for (let i = 0; i < 14; i++) {
    const id = 300 + i
    const side = rand() > 0.4 ? 'long' : 'short'
    const r = r2(-1 + rand() * 3.2)
    const entry = r2(2400 + rand() * 900)
    journal.set(id, {
      id, account_id: 1, source: i % 3 === 0 ? 'paper_manual' : i % 3 === 1 ? 'paper_auto' : 'bot', watch_id: null, run_id: null,
      symbol: i % 4 === 0 ? 'BTCUSDT' : 'ETHUSDT', side, entry_time: new Date(now - (20 - i) * 86_400_000).toISOString(), entry_price: entry,
      exit_time: new Date(now - (19 - i) * 86_400_000).toISOString(), exit_price: r2(entry * (1 + (side === 'long' ? 1 : -1) * r * 0.02)),
      qty: 0.4, fees: 1.2, funding: 0.3, sl: r2(entry * 0.97), tp: r2(entry * 1.06), risk_amount: 100, pnl: r2(r * 100), r_multiple: r,
      exit_reason: r > 0 ? 'tp' : 'sl', notes: i === 2 ? 'Entry telat, tunggu close bar' : null, tags: i === 2 ? ['telat'] : [],
    })
  }
}

function scanRow(run: LabRunDetail) {
  const o = run.oos_metrics as Record<string, number> | null
  return {
    symbol: run.symbol, timeframe: run.timeframe, run_id: run.id, status: run.status, verdict: run.verdict,
    oos_net_return_pct: o?.net_return_pct ?? null, oos_profit_factor: o?.profit_factor ?? null, oos_max_dd_pct: o?.max_dd_pct ?? null, trades: o?.trades ?? null,
  }
}

function makeEquity(run: LabRunDetail): LabEquityPoint[] {
  const rand = seeded(hash(String(run.id)))
  const n = 400
  const start = Date.parse(`${run.start}T00:00:00Z`)
  const end = Date.parse(`${run.end}T00:00:00Z`)
  const hs = run.holdout_start ? Date.parse(run.holdout_start) : Infinity
  const step = (end - start) / n
  let eq = 10_000
  const out: LabEquityPoint[] = []
  for (let i = 0; i < n; i++) {
    const t = start + i * step
    eq *= 1 + (rand() - 0.47) * 0.025
    out.push({ t: new Date(t).toISOString(), equity: r2(eq), segment: t >= hs ? 'holdout' : 'is' })
  }
  return out
}

function makeTrades(run: LabRunDetail): LabTrade[] {
  const rand = seeded(hash(`${run.id}t`))
  const start = Date.parse(`${run.start}T00:00:00Z`)
  const out: LabTrade[] = []
  let price = 2000
  for (let i = 0; i < 60; i++) {
    const entry = start + i * 86_400_000 * 35
    const side = rand() > 0.4 ? 'long' : 'short'
    const move = (rand() - 0.45) * 0.1
    const exit = price * (1 + (side === 'long' ? move : -move))
    out.push({
      entry_time: new Date(entry).toISOString(), exit_time: new Date(entry + 86_400_000 * 4).toISOString(), side,
      entry_price: r2(price), exit_price: r2(exit), pnl_pct: r2(move * 100), return_on_equity_pct: r2(move * 100 * 0.6),
      exit_reason: move > 0.03 ? 'tp' : move > 0 ? 'trail' : 'sl',
    })
    price = exit
  }
  return out
}

function makeDataStatus(): LabDataStatus[] {
  return MOCK_LAB_SYMBOLS.filter((s) => s.has_data).flatMap((s) =>
    s.timeframes.map((tf) => ({
      symbol: s.symbol, timeframe: tf, first: '2020-01-01T00:00:00Z', last: '2026-11-09T00:00:00Z',
      rows: tf === '15m' ? 241_824 : tf === '30m' ? 120_912 : tf === '1h' ? 60_456 : tf === '4h' ? 15_114 : 2_519,
    })),
  )
}

function mockStats(accountId?: string): JournalStats {
  const closed = [...journal.values()].filter((j) => j.exit_time && (!accountId || String(j.account_id) === accountId))
  const wins = closed.filter((j) => (j.pnl ?? 0) > 0)
  const gp = closed.reduce((a, j) => a + Math.max(0, j.pnl ?? 0), 0)
  const gl = closed.reduce((a, j) => a + Math.max(0, -(j.pnl ?? 0)), 0)
  const rs = closed.map((j) => j.r_multiple ?? 0)
  const by = (k: 'symbol' | 'source') => {
    const out: Record<string, { trades: number; winrate: number | null; pnl: number; avg_r: number | null }> = {}
    for (const j of closed) {
      const g = (out[j[k]] ??= { trades: 0, winrate: 0, pnl: 0, avg_r: 0 })
      g.trades++
      g.pnl = r2(g.pnl + (j.pnl ?? 0))
    }
    for (const [key, g] of Object.entries(out)) {
      const rows = closed.filter((j) => j[k] === key)
      g.winrate = rows.filter((j) => (j.pnl ?? 0) > 0).length / rows.length
      g.avg_r = r2(rows.reduce((a, j) => a + (j.r_multiple ?? 0), 0) / rows.length)
    }
    return out
  }
  let eq = 10_000
  let peak = eq
  let dd = 0
  const curve = closed.map((j) => {
    eq += j.pnl ?? 0
    peak = Math.max(peak, eq)
    dd = Math.min(dd, ((eq - peak) / peak) * 100)
    return { t: j.exit_time!, equity: r2(eq) }
  })
  return {
    trades: closed.length,
    winrate: closed.length ? wins.length / closed.length : null,
    avg_r: rs.length ? r2(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
    expectancy_r: rs.length ? r2(rs.reduce((a, b) => a + b, 0) / rs.length) : null,
    profit_factor: gl > 0 ? r2(gp / gl) : null,
    net_pnl: r2(gp - gl),
    max_dd_pct: r2(dd),
    equity_curve: curve,
    by_symbol: by('symbol'),
    by_source: by('source'),
  }
}

function notFound(): never {
  throw new ApiError('not_found', 404)
}

function num(id: string | undefined): number {
  const n = Number(id)
  if (!Number.isFinite(n)) notFound()
  return n
}

export async function getLabMock(method: string, fullPath: string, body?: unknown): Promise<unknown> {
  seed()
  // Simulate network latency so loading states are visible in dev.
  await new Promise((r) => setTimeout(r, 250))
  const [pathPart, query = ''] = fullPath.split('?')
  const path = pathPart.replace(/^\/api\/v1\/lab/, '')
  const qs = new URLSearchParams(query)
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent)

  if (method === 'GET' && path === '/me') return { is_admin: true }
  if (method === 'GET' && path === '/templates') return MOCK_LAB_TEMPLATES
  if (method === 'GET' && path === '/symbols') return MOCK_LAB_SYMBOLS
  if (method === 'GET' && path === '/data/status') return makeDataStatus()
  // Candles are never mocked — fall through to real Binance sources.
  if (method === 'GET' && path === '/klines') throw new ApiError('not_found', 404)

  if (seg[0] === 'runs') {
    if (method === 'POST' && seg.length === 1) {
      const req = body as LabRunCreateRequest
      const id = ++nextId
      runs.set(id, makeRun(id, req, new Date().toISOString()))
      return { run_id: id, job_id: id + 5000 }
    }
    if (method === 'GET' && seg.length === 1) {
      return [...runs.values()].filter((r) => Number(r.id) < 200 || Number(r.id) > 300).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(listItem)
    }
    const run = runs.get(num(seg[1]))
    if (!run) notFound()
    if (method === 'GET' && seg.length === 2) return run
    if (method === 'GET' && seg[2] === 'equity') return run.status === 'done' ? makeEquity(run) : []
    if (method === 'GET' && seg[2] === 'trades') return run.status === 'done' ? makeTrades(run) : []
  }

  if (seg[0] === 'scans') {
    if (method === 'POST' && seg.length === 1) {
      const req = body as LabScanCreateRequest
      const id = ++nextId
      const rows = req.symbols.flatMap((symbol) =>
        req.timeframes.map((timeframe) => {
          const runId = ++nextId
          const run = makeRun(runId, { template_id: req.template_id, symbol, timeframe, mode: req.mode, params: req.params ?? DEFAULTS, costs: req.costs }, new Date().toISOString())
          runs.set(runId, run)
          return scanRow(run)
        }),
      )
      scans.set(id, { id, status: 'done', progress: { done: rows.length, total: rows.length }, rows, template_id: req.template_id, mode: req.mode, created_at: new Date().toISOString() })
      return { scan_id: id }
    }
    if (method === 'GET' && seg.length === 1) return [...scans.values()].reverse()
    const scan = scans.get(num(seg[1]))
    if (!scan) notFound()
    return scan
  }

  if (seg[0] === 'watches') {
    if (method === 'POST' && seg.length === 1) {
      const req = body as LabWatchCreateRequest
      const id = ++nextId
      watches.set(id, { id, template_id: req.template_id, symbol: req.symbol, timeframe: req.timeframe, params: req.params, created_at: new Date().toISOString(), autopaper: null })
      return { watch_id: id }
    }
    if (method === 'GET' && seg.length === 1) return [...watches.values()]
    const w = watches.get(num(seg[1]))
    if (!w) notFound()
    if (method === 'DELETE') {
      watches.delete(w.id as number)
      return undefined
    }
    if (method === 'POST' && seg[2] === 'autopaper') {
      const req = body as { account_id: number; enabled: boolean }
      watches.set(w.id as number, { ...w, autopaper: { account_id: req.account_id, enabled: req.enabled } })
      return { ok: true }
    }
    if (method === 'GET' && seg[2] === 'compare') {
      return {
        watch_id: w.id,
        period: { from: w.created_at, to: new Date().toISOString() },
        paper: { trades: 0, open_positions: 0, winrate: null, profit_factor: null, net_pnl: 0, avg_r: null, entries: [] },
        backtest: { trades: 0, winrate: null, net_return_pct: 0, profit_factor: null, position: null, trades_list: [] },
      }
    }
    if (method === 'GET' && seg[2] === 'state') {
      const now = Date.now()
      return { watch_id: w.id, computed_at: new Date(now).toISOString(), last_bar: new Date(now - 3_600_000).toISOString(), position: null, recent_trades: [], last_signal: null }
    }
  }

  if (seg[0] === 'paper') {
    if (seg[1] === 'accounts' && method === 'GET') return [...paperAccounts.values()]
    if (seg[1] === 'accounts' && method === 'POST') {
      const req = body as PaperAccountCreateRequest
      const id = ++nextId
      paperAccounts.set(id, { id, name: req.name, balance: req.starting_balance, equity: req.starting_balance, open_positions: [], realized_pnl: 0, created_at: new Date().toISOString(), risk_pct: req.risk_pct, leverage_max: req.leverage_max, starting_balance: req.starting_balance })
      return { id }
    }
    if (seg[1] === 'orders' && method === 'POST') {
      // Mock cannot know the live price, so it refuses instead of inventing a fill.
      void (body as PaperOrderRequest)
      throw new ApiError('server', 503)
    }
    if (seg[1] === 'positions' && seg[3] === 'close' && method === 'POST') {
      for (const a of paperAccounts.values()) {
        const list = a.open_positions as PaperPosition[]
        a.open_positions = list.filter((p) => String(p.id) !== seg[2])
      }
      return { ok: true }
    }
  }

  if (seg[0] === 'journal') {
    if (method === 'GET' && seg[1] === 'stats') return mockStats(qs.get('account_id') ?? undefined)
    if (method === 'GET' && seg.length === 1) {
      return [...journal.values()]
        .filter(
          (j) =>
            (!qs.get('account_id') || String(j.account_id) === qs.get('account_id')) &&
            (!qs.get('symbol') || j.symbol === qs.get('symbol')) &&
            (!qs.get('source') || j.source === qs.get('source')),
        )
        .reverse()
    }
    if (method === 'PATCH' && seg.length === 2) {
      const j = journal.get(num(seg[1]))
      if (!j) notFound()
      const patch = body as { notes: string; tags: string[] }
      const next = { ...j, notes: patch.notes, tags: patch.tags }
      journal.set(j.id as number, next)
      return next
    }
  }

  if (seg[0] === 'jobs') {
    if (method === 'POST' && seg[2] === 'cancel') return { id: seg[1], status: 'cancelled' }
    return { id: seg[1], status: 'done' }
  }

  throw new Error(`No lab mock for ${method} ${fullPath}`)
}
