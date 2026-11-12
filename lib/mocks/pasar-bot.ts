/**
 * Mock-mode data (NEXT_PUBLIC_USE_MOCK_DATA=true only) for Sentimen & berita, Arus besar and
 * Status bot: intel news/whales, Cek bot live, Kualitas eksekusi and the bot status summary.
 * Lazy-imported by ./index, so none of this reaches a production bundle. Shapes follow the
 * backend contracts; the numbers are illustrative, not real.
 */
import type { BotStatus } from '@/lib/api/types/bot'
import type { IntelNewsResponse, IntelWhalesResponse, NewsItem, WhaleTrade } from '@/lib/api/types/intel'
import type { LiveCheckReport, LiveCheckRow, LiveCheckStatus } from '@/lib/api/types/livecheck'
import type { ShadowCell, ShadowReport, ShadowSignal } from '@/lib/api/types/shadow'

const H4 = 4 * 3600 * 1000
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z')
const lastClose = () => Math.floor(Date.now() / H4) * H4

function news(now: number): IntelNewsResponse {
  const rows: Array<[string, NewsItem['sentiment'], string[], number]> = [
    ['Bitcoin ETF inflows climb for a third straight day as institutions add exposure', 'BULLISH', ['BTC'], 25],
    ['SEC delays decision on two spot altcoin ETF applications', 'BEARISH', ['CRYPTO'], 70],
    ['Ethereum developers set date for the next network upgrade', 'NEUTRAL', ['ETH'], 110],
    ['Exchange hacked: $40M drained from hot wallet, withdrawals paused', 'BEARISH', ['CRYPTO'], 160],
    ['Solana DEX volume hits record high as memecoin trading returns', 'BULLISH', ['SOL'], 230],
    ['Dogecoin slumps 6% as large holders move coins to exchanges', 'BEARISH', ['DOGE'], 300],
    ['Analysts split on whether the bitcoin pullback is over', 'NEUTRAL', ['BTC'], 380],
    ['Stablecoin supply keeps growing, data shows', 'NEUTRAL', ['USDT'], 460],
  ]
  return {
    status: 'live',
    unavailableFields: [],
    fearAndGreed: { value: 38, classification: 'Fear' },
    catalystBias: '-12%',
    catalystBiasBasis: 'net bullish-minus-bearish headline share (keyword heuristic)',
    news: rows.map(([title, sentiment, syms, minAgo], i) => ({
      id: `live-news-mock${i}`,
      title,
      summary: `${title}. Ringkasan contoh untuk mode mock; artikel asli ada di sumbernya.`,
      source: 'CoinTelegraph',
      sourceType: 'tier1',
      timestamp: null,
      publishedAt: iso(now - minAgo * 60_000),
      category: sentiment === 'BULLISH' ? 'Catalyst' : 'Macro',
      sentiment,
      impactScore: 70,
      affectedSymbols: syms,
      readTime: null,
      linkUrl: 'https://cointelegraph.com/',
    })),
    source: 'Alternative.me & CoinTelegraph RSS',
    cachedAt: now / 1000,
  }
}

function whales(now: number): IntelWhalesResponse {
  const ratios = [
    ['BTCUSDT', 56.2],
    ['ETHUSDT', 58.4],
    ['SOLUSDT', 53.1],
    ['DOGEUSDT', 47.9],
  ] as const
  const trades: WhaleTrade[] = Array.from({ length: 10 }, (_, i) => {
    const base = ['BTC', 'ETH', 'SOL'][i % 3]
    const usd = [512_000, 88_000, 64_500, 1_240_000, 73_000, 151_000, 58_000, 96_000, 230_000, 61_000][i]
    const buy = i % 3 !== 1
    return {
      id: `tx-fapi-${base}-${9000 + i}`,
      timestamp: null,
      tradeTime: now - (i * 70 + 15) * 1000,
      symbol: base,
      amount: `${(usd / (base === 'BTC' ? 96_000 : base === 'ETH' ? 3_100 : 210)).toFixed(4)} ${base}`,
      usdValue: `$${usd.toLocaleString('en-US')}`,
      usdValueRaw: usd,
      side: buy ? 'BUY' : 'SELL',
      from: '',
      to: '',
      type: buy ? 'outflow' : 'inflow',
      confidence: 100,
      catalyst: '',
    }
  })
  const buy = trades.filter((t) => t.side === 'BUY').reduce((s, t) => s + (t.usdValueRaw ?? 0), 0)
  const sell = trades.filter((t) => t.side === 'SELL').reduce((s, t) => s + (t.usdValueRaw ?? 0), 0)
  return {
    status: 'live',
    unavailableFields: ['whaleVolume24h', 'whaleVolumeChange', 'exchangeNetFlow'],
    topTraderBias: '53.9% Long',
    smartMoneyStance: 'BALANCED',
    smartMoneyStanceCode: 'neutral',
    topTraderRatios: ratios.map(([symbol, l]) => ({
      symbol,
      longPct: l,
      shortPct: Math.round((100 - l) * 10) / 10,
      lsRatio: Math.round((l / (100 - l)) * 100) / 100,
      updated: 'live',
      timestamp: now - 120_000,
    })),
    whaleTransactions: trades,
    largeTradeBuyUsd: buy,
    largeTradeSellUsd: sell,
    largeTradeNetUsd: buy - sell,
    largeTradeWindowSeconds: 742,
    largeTradeMinUsd: 50_000,
    source: 'Binance Futures FAPI (topLongShortPositionRatio, aggTrades)',
    cachedAt: now / 1000,
  }
}

function liveCheck(bars: number): LiveCheckReport {
  const end = lastClose()
  const start = end - bars * H4
  let id = 0
  const mk = (barsAgo: number, status: LiveCheckStatus, action: 'open' | 'close', side: 'long' | 'short', extra: Partial<LiveCheckRow> = {}): LiveCheckRow => {
    const close = end - barsAgo * H4
    const price = 3100 + barsAgo * 3
    const delivered = !['tidak_terkirim', 'tanpa_log'].includes(status)
    const fill = status === 'harga_beda' ? price * 1.0042 : price * 1.0004
    return {
      id: ++id,
      bar_open_ts: iso(close - H4),
      bar_close_ts: iso(close),
      status,
      perlu_dicek: false,
      causes: [],
      action,
      side,
      reason: status === 'harga_beda' ? 'Fill 42 bps dari harga Lab' : status === 'tidak_terkirim' ? 'Tidak ada kiriman TradingView untuk bar ini' : status === 'menunggu' ? 'Baru diterima; hasil belum ada' : 'Tereksekusi',
      price_diff_bps: status === 'harga_beda' ? 42 : delivered ? 4 : null,
      expected: { action, side, alert: 'close', alert_at: close / 1000 + 2, price, exit_reason: action === 'close' ? 'atr_trailing' : null, variants: ['utama'], step: 1 },
      delivery: delivered
        ? {
            arrival: close / 1000 + 3,
            sources: ['nginx', 'app', 'trade_logs'],
            nginx_status: 202,
            tv: true,
            ip: '52.89.x.x',
            app_status: 202,
            app_ms: 31,
            action,
            side,
            trade_dir: (action === 'open') === (side === 'long') ? 1 : -1,
            executed: status !== 'menunggu',
            pending: status === 'menunggu',
            fill_price: status === 'menunggu' ? null : fill,
            reason: null,
            note: null,
            dup: false,
            trade_logs: [],
          }
        : null,
      computed_at: iso(end + 120_000),
      ...extra,
    }
  }
  const all = [
    mk(0, 'menunggu', 'open', 'short'),
    mk(6, 'harga_beda', 'close', 'long'),
    mk(13, 'cocok', 'open', 'long'),
    mk(20, 'cocok', 'close', 'short'),
    mk(27, 'cocok', 'open', 'short'),
    mk(33, 'cocok', 'close', 'long'),
    mk(40, 'cocok', 'open', 'long'),
    mk(96, 'tidak_terkirim', 'open', 'short', { perlu_dicek: true, causes: ['warmup'] }),
    mk(150, 'gagal', 'open', 'long', { reason: '409: sudah ada posisi ETH yang bukan dari bot (posisi manual)' }),
  ].filter((r) => Date.parse(r.bar_open_ts) >= start)
  const counts = { cocok: 0, harga_beda: 0, gagal: 0, tidak_terkirim: 0, tak_terduga: 0, menunggu: 0, tanpa_log: 0, diabaikan: 0 }
  for (const r of all) counts[r.status]++
  return {
    preset: '4H-ETH-Basic',
    symbol: 'ETHUSDT',
    timeframe: '4h',
    since: '2026-10-01',
    price_bps: 30,
    window: { bars, start: iso(start), end: iso(end) },
    summary: {
      counts,
      perlu_dicek: all.filter((r) => r.perlu_dicek).length,
      rows: all.length,
      expected: all.filter((r) => r.expected).length,
      deliveries: all.filter((r) => r.delivery).length,
    },
    rows: all,
    causes: {
      warmup: 'Sinyal hilang kalau Lab mulai menghitung dari riwayat pendek (warm-up).',
      intrabar: 'Exit SL/TP keras: di TradingView terisi di tengah bar; Lab memakai OHLC bar 4H.',
    },
    last_cycle: {
      started: iso(end + 110_000),
      finished: iso(end + 128_000),
      preset: '4H-ETH-Basic',
      params_source: 'preset 4H-ETH-Basic',
      engine_commit: 'mock',
      data_last_bar: iso(end - H4),
      coverage: [[iso(end - 60 * 86_400_000), iso(end), 'app+nginx']],
    },
  }
}

function shadow(): ShadowReport {
  const end = lastClose()
  const ks = [0.25, 0, -0.1]
  const ttls = [15, 60, 240]
  const grid: ShadowCell[] = ks.flatMap((k) =>
    ttls.map((t) => {
      const fill = k > 0 ? 0.33 + t / 1000 : k === 0 ? 0.67 : 1
      return {
        k, ttl_min: t, n: 3, filled: Math.round(3 * fill), missed: 3 - Math.round(3 * fill), postonly: 0,
        fill_rate: fill, fill_ci: [0.1, 0.95], mean_saving_bps: k > 0 ? 2.1 : k === 0 ? 1.4 : -0.6,
        median_saving_bps: 1.2, mean_saving_filled_bps: 4.2, mean_saving_missed_bps: -3.1, median_time_to_fill_s: 240,
        mean_runaway_missed_bps: 6.5, proxy_ref: 0, klines_only: 0, sample: 'too_few',
      }
    }),
  )
  const sig = (i: number, action: 'open' | 'close', side: 'long' | 'short', slip: number): ShadowSignal => {
    const close = end - (i * 7 + 6) * H4
    return {
      id: i + 1, symbol: 'ETHUSDT', action, side, trade_dir: (action === 'open') === (side === 'long') ? 1 : -1, tf: '4h',
      bar_close_ts: iso(close), arrival_ts: iso(close + 4000), arrival_basis: 'created_at', off_close: 0, n_rows: 1, n_users: 1,
      statuses: ['success'], logs_final: true, fill_price: 3100 * (1 + slip / 10_000), fill_ts: iso(close + 6000), bar_close_px: 3100,
      atr: 38, p0: 3100.5, p0_basis: 'aggtrades', slippage_bps: slip, drift_bps: 0.8, impact_bps: slip - 0.8, latency_s: 4, exec_latency_s: 2,
      status: 'done', error: null, computed_at: iso(end),
      results: ks.flatMap((k) => ttls.map((t) => ({
        k, ttl_min: t, limit_px: 3100 - k * 38, outcome: k <= 0 || t >= 60 ? 'filled' as const : 'missed' as const,
        fill_ts: iso(close + 300_000), time_to_fill_s: 300, price_diff_bps: 2, saving_bps: k > 0 ? 3.2 : 1.1, end_px: 3104,
        runaway_end_bps: 5, runaway_max_bps: 9, ref_px: 3101, ref_basis: 'fill' as const, data_basis: 'aggtrades' as const,
      }))),
    }
  }
  const signals = [sig(0, 'close', 'long', 3.4), sig(1, 'open', 'long', 1.8), sig(2, 'close', 'short', -0.6)]
  return {
    settings: { ks, ttls_min: ttls, taker_bps: 5, maker_bps: 2, fee_diff_bps: 3, tf: '4h', enabled: true },
    thresholds: { min_n_any: 10, min_n_ok: 30 },
    actual: {
      n_signals: 3, n_counted: 3, n_off_close: 0, n_with_fill: 3, n_open: 1, n_close: 2,
      mean_slippage_bps: 1.5, median_slippage_bps: 1.8, mean_impact_bps: 0.7, mean_drift_bps: 0.8,
      mean_latency_s: 4.3, median_latency_s: 4, latency_upper_bound: true, sample: 'too_few',
    },
    grid,
    signals,
    last_cycle: { started: iso(end + 100_000), finished: iso(end + 115_000), trade_log_rows: 3, evaluated: { done: 3 } },
  }
}

function botStatus(now: number): BotStatus {
  const last = { at: iso(lastClose() + 3000), symbol: 'ETHUSDT', action: 'open' as const, side: 'short' as const, status: 'success' }
  return {
    generated_at: iso(now),
    window_days: 7,
    available: true,
    reason: null,
    active_accounts: 1,
    accounts: [
      { label: 'Rosyade', account_active: true, webhook_active: true, webhook_since: '2026-10-13T05:00:00Z', exchanges: ['binance'],
        last_alert: last, alerts_window: 6, failed_window: 0, rejected_window: 0 },
      { label: 'fa•••@bmtm.io', account_active: true, webhook_active: false, webhook_since: null, exchanges: [],
        last_alert: null, alerts_window: 0, failed_window: 0, rejected_window: 0 },
    ],
    last_alert: { ...last, label: 'Rosyade' },
  }
}

/** Returns `{ value }` when this module serves the request, null otherwise. */
export function pasarBotMock(method: string, fullPath: string): { value: unknown } | null {
  if (method !== 'GET') return null
  const [path, query = ''] = fullPath.split('?')
  const now = Date.now()
  if (path === '/api/v1/intel/news') return { value: news(now) }
  if (path === '/api/v1/intel/whales') return { value: whales(now) }
  if (path === '/api/v1/lab/live-check') return { value: liveCheck(Number(new URLSearchParams(query).get('bars') ?? 270)) }
  if (path === '/api/v1/lab/shadow') return { value: shadow() }
  if (path === '/api/v1/lab/bot/status') return { value: botStatus(now) }
  return null
}
