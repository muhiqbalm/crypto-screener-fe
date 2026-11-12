/**
 * Mock data for Beranda + the market ribbon (NEXT_PUBLIC_USE_MOCK_DATA only;
 * lazily imported by lib/mocks/index.ts, never in production bundles).
 * Used as a FALLBACK: a page's own mock (lab.ts …) always answers first.
 * Times are relative to "now" so ages read naturally.
 */

const H = 3_600_000
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString()
/** Last 4H close (UTC-aligned) minus `n` candles. */
const close4h = (n = 0) => new Date(Math.floor(Date.now() / (4 * H)) * 4 * H - n * 4 * H).toISOString()

function outlookRow(o: {
  coin: string
  bias: 'LONG' | 'SHORT' | 'NETRAL'
  keyakinan: 'rendah' | 'sedang' | 'tinggi' | null
  price: number
  fresh?: boolean
  entryCandlesAgo?: number
  sl?: number
  tp?: number
  rr?: number
  summary: string
  peluang?: string
}) {
  const side = o.bias === 'LONG' ? 'long' : o.bias === 'SHORT' ? 'short' : null
  return {
    symbol: `${o.coin}USDT`,
    coin: o.coin,
    computed_at: iso(3 * 60_000),
    last_bar: close4h(1),
    last_bar_close: close4h(0),
    price: o.price,
    price_source: 'close_4h',
    strategy: {
      template_id: 'rosyade_family',
      timeframe: '4h',
      preset: null,
      param_source: 'preset',
      evidence: 'lolos_uji',
      side,
      last_bar: close4h(1),
      last_bar_close: close4h(0),
      entry_time: side ? close4h(o.entryCandlesAgo ?? (o.fresh ? 0 : 6)) : null,
      sl: o.sl ?? null,
      tp: o.tp ?? null,
      fresh: Boolean(o.fresh),
    },
    backtest: {},
    factors: [],
    bias: { bias: o.bias, keyakinan: o.keyakinan, condong: null, support: null, lean: null, max_support: null, reasons: [] },
    market: {},
    explanation: { summary: o.summary, narrator: 'template' },
    projection: { capital: 1000, leverage: 1, sizing: 'notional', risk_pct: null, cost_per_side_pct: 0.1, available: Boolean(side), rr: o.rr ?? null },
    age_hours: 0.1,
    stale: false,
    plan: side
      ? { action: o.fresh ? 'masuk' : 'menyusul', side, text: o.summary, sl: o.sl ?? null, tp: o.tp ?? null, rr: o.rr ?? null, fase: o.fresh ? 'baru' : 'berjalan' }
      : { action: 'tunggu', side: null, text: 'Tunggu sinyal baru.' },
    peluang: side ? { eligible: true, score: null, label: o.peluang ?? 'belum_jelas', reason: '' } : { eligible: false, score: null, label: 'tidak_ada_sinyal', reason: '' },
  }
}

function outlook() {
  const rows = [
    outlookRow({ coin: '1000PEPE', bias: 'SHORT', keyakinan: 'sedang', price: 0.01123, fresh: true, sl: 0.01198, tp: 0.00981, rr: 1.8, summary: 'Sinyal SHORT baru dari preset yang lolos uji; kasus serupa rata-rata untung kecil.', peluang: 'positif' }),
    outlookRow({ coin: 'ETH', bias: 'SHORT', keyakinan: 'rendah', price: 2104.5, entryCandlesAgo: 18, sl: 2274, tp: 1860, rr: 1.4, summary: 'Posisi SHORT sudah berjalan sejak 3 hari; menyusul jarang menambah hasil.', peluang: 'negatif' }),
    outlookRow({ coin: 'SOL', bias: 'LONG', keyakinan: 'sedang', price: 162.31, entryCandlesAgo: 4, sl: 151.2, tp: 188.4, rr: 2.3, summary: 'Strategi LONG sejak kemarin; tren 1 hari ikut naik (konteks, belum terbukti).', peluang: 'belum_jelas' }),
    outlookRow({ coin: 'DOGE', bias: 'LONG', keyakinan: 'rendah', price: 0.1832, entryCandlesAgo: 9, sl: 0.171, tp: 0.214, rr: 2.1, summary: 'Setting bawaan, belum diuji di koin ini.', peluang: 'belum_terukur' }),
    outlookRow({ coin: 'BTC', bias: 'NETRAL', keyakinan: null, price: 87210, summary: 'Strategi tidak memegang posisi.' }),
    outlookRow({ coin: 'XRP', bias: 'NETRAL', keyakinan: null, price: 2.11, summary: 'Strategi tidak memegang posisi.' }),
    outlookRow({ coin: 'BNB', bias: 'NETRAL', keyakinan: null, price: 612.4, summary: 'Strategi tidak memegang posisi.' }),
  ]
  return {
    meta: { computed_at: iso(3 * 60_000), runtime_s: 160, symbols: rows.length, ok: rows.length, errors: {}, last_bar: close4h(0), fear_greed: null, news: { available: true, items: 20, source: 'rss' }, screener_bar: null },
    refresh: null,
    now: new Date().toISOString(),
    inputs: { capital: 1000, leverage: 1, sizing: 'notional', risk_pct: 1 },
    regime: { btc: { label: 'datar', label_text: 'Datar' }, eth: { label: 'turun', label_text: 'Turun' } },
    method: { weights: {}, evidence_mult: {}, evidence_text: {}, text: [] },
    disclaimer: 'Bukan saran investasi.',
    rows,
    schema_version: 2,
    ranking: ['1000PEPEUSDT', 'SOLUSDT', 'ETHUSDT', 'DOGEUSDT'],
  }
}

function regime() {
  return {
    available: true,
    computed_at: iso(2 * H),
    rule: 'EMA 50/200 harian',
    btc: { symbol: 'BTCUSDT', label: 'datar', label_text: 'Datar', days_in_label: 12 },
    eth: { symbol: 'ETHUSDT', label: 'turun', label_text: 'Turun', days_in_label: 5 },
    presets: null,
  }
}

function liveCheck(bars: number) {
  const row = (n: number, status: string, perlu: boolean, action: 'open' | 'close', side: 'long' | 'short') => ({
    id: n,
    bar_open_ts: close4h(n + 1),
    bar_close_ts: close4h(n),
    status,
    perlu_dicek: perlu,
    causes: [],
    action,
    side,
    reason: null,
    price_diff_bps: null,
    expected: null,
    delivery: null,
    computed_at: iso(10 * 60_000),
  })
  const rows = [row(2, 'tidak_terkirim', true, 'close', 'short'), row(9, 'cocok', false, 'open', 'short'), row(20, 'cocok', false, 'close', 'long'), row(27, 'cocok', false, 'open', 'long')]
  return {
    preset: '4H-ETH-Basic',
    symbol: 'ETHUSDT',
    timeframe: '4h',
    since: close4h(bars),
    price_bps: 15,
    window: { bars, start: close4h(bars), end: close4h(0) },
    summary: {
      counts: { cocok: 3, harga_beda: 0, gagal: 0, tidak_terkirim: 1, tak_terduga: 0, menunggu: 0, tanpa_log: 0, diabaikan: 0 },
      perlu_dicek: 1,
      rows: rows.length,
      expected: 4,
      deliveries: 3,
    },
    rows,
    causes: {},
    last_cycle: { finished: iso(10 * 60_000) },
  }
}

function arena() {
  const r = (id: number, name: string, closed: number, drift: 'sesuai' | 'menyimpang' | 'belum_cukup') => ({
    preset: { id, name, label: name, symbol: 'ETHUSDT', coin: 'ETH', timeframe: '4h', template_id: 'rosyade_family', verdict: 'PASS', live_reference: false, family: 'rosyade', family_label: 'Rosyade', base: name },
    account: { id, name: `Paper ${name}`, starting_balance: 10_000, leverage_max: 2, risk_pct: 1, created_at: iso(20 * 24 * H) },
    watch: { id, active: true, autopaper_enabled: true, last_eval_at: iso(H), last_bar: close4h(0), last_signal: null, error: null, strategy_position: null },
    stats: { equity: 10_120, balance: 10_100, upnl: 20, return_pct: 1.2, n_closed: closed, n_closed_manual: 0, n_entries: closed, n_open: 0, wins: Math.round(closed / 2), win_rate_pct: 50, win_rate_ci_pct: null, avg_r: 0.1, avg_trade_ret_pct: 0.2, max_dd_pct: 3.1, sharpe: null, sharpe_days: 0, days_running: 20, progress_pct: (closed / 30) * 100 },
    open_position: null,
    n_open_positions: 0,
    last_action: null,
    backtest: null,
    drift: { status: drift, has_backtest: true, checks: [], summary: '' },
  })
  return {
    generated_at: iso(40 * 60_000),
    review_min_trades: 30,
    method: { confidence: 0.95, min_trades_rate: 0, min_expected_entries: 0, min_sharpe_days: 0, snapshots: '' },
    rows: [r(1, '4H-ETH-v2', 12, 'sesuai'), r(2, '4H-SOL-v1', 7, 'menyimpang'), r(3, '1D-BTC-Donchian', 3, 'belum_cukup')],
  }
}

function weeks() {
  const monday = (wAgo: number) => {
    const d = new Date()
    const day = (d.getUTCDay() + 6) % 7
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - day - 7 * wAgo)
    return d.toISOString()
  }
  return {
    current: 'W0',
    weeks: [
      { week: 'W0', start: monday(0), end: monday(-1), current: true, snapshot: false, generated_at: null },
      { week: 'W1', start: monday(1), end: monday(0), current: false, snapshot: true, generated_at: monday(0) },
      { week: 'W2', start: monday(2), end: monday(1), current: false, snapshot: true, generated_at: monday(1) },
    ],
  }
}

function weekly(week: string) {
  return {
    week,
    start: iso(9 * 24 * H),
    end: iso(2 * 24 * H),
    partial: false,
    generated_at: iso(2 * 24 * H),
    source: 'snapshot',
    snapshot: { generator: 'mock', generated_at: iso(2 * 24 * H) },
    sections: {
      paper: { available: true, best: { preset: '4H-ETH-v2', week_return_pct: 2.14 }, worst: { preset: '4H-SOL-v1', week_return_pct: -1.3 }, trades_week: 5, trades_total: 22 },
      ledger: { available: true, signals_week: 42 },
      execution: { available: false },
      live_bot: { available: true, signals: 6, orders: 6, executed: 6, rejected: 0 },
      lab: { available: false },
      system: { available: false, deploys: { available: false }, backups: { available: false }, processes: null, processes_at: iso(H) },
    },
    hooks: [],
  }
}

let unread = 2
function notifications() {
  return {
    unread,
    items: [
      { id: 3, type: 'paper', title: '4H-SOL-v1 menutup posisi LONG (−0.8%)', body: null, link: '/lab/arena', created_at: iso(50 * 60_000), read: unread < 2 },
      { id: 2, type: 'job', title: 'Uji jujur ETH 4h selesai: Lolos', body: null, link: '/lab/runs/12', created_at: iso(5 * H), read: unread < 1 },
      { id: 1, type: 'report', title: 'Laporan minggu lalu sudah final', body: null, link: '/lab/report', created_at: iso(2 * 24 * H), read: true },
    ],
  }
}

function whales() {
  return {
    status: 'live',
    unavailableFields: [],
    topTraderRatios: [
      { symbol: 'BTCUSDT', longPct: 57.2, shortPct: 42.8, lsRatio: 1.34, updated: 'baru' },
      { symbol: 'ETHUSDT', longPct: 54.9, shortPct: 45.1, lsRatio: 1.22, updated: 'baru' },
    ],
    smartMoneyStanceCode: 'bullish',
    largeTradeBuyUsd: 3_100_000,
    largeTradeSellUsd: 4_350_000,
    largeTradeNetUsd: -1_250_000,
    largeTradeWindowSeconds: 840,
    whaleTransactions: [],
    cachedAt: Math.floor(Date.now() / 1000) - 90,
  }
}

function news() {
  return {
    status: 'live',
    fearAndGreed: { value: 38, classification: 'Fear' },
    catalystBias: '-10%',
    news: [],
    cachedAt: Math.floor(Date.now() / 1000) - 120,
  }
}

/** Returns mock data for a known path, or undefined. */
export function homeMock(method: string, fullPath: string): unknown {
  const [path, query = ''] = fullPath.split('?')
  const qs = new URLSearchParams(query)
  if (method === 'GET') {
    if (path === '/api/v1/lab/outlook') return outlook()
    if (path === '/api/v1/lab/regime') return regime()
    if (path === '/api/v1/lab/live-check') return liveCheck(Number(qs.get('bars') ?? 42))
    if (path === '/api/v1/lab/arena') return arena()
    if (path === '/api/v1/lab/report/weeks') return weeks()
    if (path === '/api/v1/lab/report/weekly') return weekly(qs.get('week') ?? 'W0')
    if (path === '/api/v1/lab/notifications') return notifications()
    if (path === '/api/v1/intel/whales') return whales()
    if (path === '/api/v1/intel/news') return news()
  }
  if (method === 'POST' && path === '/api/v1/lab/notifications/read-all') {
    unread = 0
    return { ok: true, unread }
  }
  if (method === 'POST' && /^\/api\/v1\/lab\/notifications\/\d+\/read$/.test(path)) {
    unread = Math.max(0, unread - 1)
    return { ok: true, unread }
  }
  return undefined
}

/**
 * QA helper: NEXT_PUBLIC_MOCK_ROLE=member makes the mock backend treat the
 * user as a non-admin team member (GET /lab/me → is_admin false, admin-only
 * Lab endpoints → 403). Checked before every other mock.
 */
export function memberOverride(method: string, fullPath: string): { value: unknown } | { error: 403 } | undefined {
  if (process.env.NEXT_PUBLIC_MOCK_ROLE !== 'member') return undefined
  const [path] = fullPath.split('?')
  if (method === 'GET' && path === '/api/v1/lab/me') return { value: { is_admin: false } }
  if (path.startsWith('/api/v1/lab/') && path !== '/api/v1/lab/regime') return { error: 403 }
  return undefined
}
