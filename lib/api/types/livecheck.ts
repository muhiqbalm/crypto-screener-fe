/**
 * "Cek bot live vs strategi" — mirrors src/api/livecheck_routes.py / src/lab/livecheck/report.py.
 * Read-only reconciliation of the live 4H-ETH-Basic bot against the Lab's own computation.
 * Times: ISO strings (bar_*_ts) or epoch seconds (arrival, alert_at, trade_logs[].ts), all UTC.
 */

export type LiveCheckStatus =
  | 'cocok'
  | 'harga_beda'
  | 'gagal'
  | 'tidak_terkirim'
  | 'tak_terduga'
  | 'menunggu'
  | 'tanpa_log'
  | 'diabaikan'

export type LiveCheckCause =
  | 'warmup'
  | 'biaya'
  | 'intrabar'
  | 'beda_bar'
  | 'beda_waktu_exit'
  | 'varian_lain'
  | 'data_belum'
  | 'tengah_bar'

export interface LiveCheckExpected {
  action: 'open' | 'close'
  side: 'long' | 'short'
  /** close = alert right after the 4H close; intrabar = hard SL/TP inside the bar */
  alert: 'close' | 'intrabar'
  alert_at: number | null
  price: number | null
  exit_reason: string | null
  variants: string[] | null
  step: number
}

export interface LiveCheckTradeLog {
  ts: number
  action: string | null
  side: string | null
  status: string | null
  fill_price: number | null
  reason: string | null
}

export interface LiveCheckDelivery {
  arrival: number
  sources: Array<'nginx' | 'app' | 'trade_logs'>
  nginx_status: number | null
  /** true = TradingView user agent, false = other client, null = unknown (no nginx line) */
  tv: boolean | null
  /** masked, e.g. "52.89.x.x" */
  ip: string | null
  app_status: number | null
  app_ms: number | null
  action: string | null
  side: string | null
  trade_dir: 1 | -1 | null
  executed: boolean
  pending: boolean
  fill_price: number | null
  reason: string | null
  note: string | null
  dup: boolean
  trade_logs: LiveCheckTradeLog[]
}

export interface LiveCheckRow {
  id: number
  bar_open_ts: string
  bar_close_ts: string
  status: LiveCheckStatus
  perlu_dicek: boolean
  causes: LiveCheckCause[]
  action: 'open' | 'close' | null
  side: 'long' | 'short' | null
  reason: string | null
  price_diff_bps: number | null
  expected: LiveCheckExpected | null
  delivery: LiveCheckDelivery | null
  computed_at: string
}

export interface LiveCheckCycle {
  started?: string
  finished?: string
  error?: string
  preset?: string
  params_source?: string
  engine_commit?: string | null
  data_first_bar?: string | null
  data_last_bar?: string | null
  expected?: Record<string, number>
  deliveries?: number
  counts?: Record<string, number>
  /** [start, end, source] intervals the logs cover */
  coverage?: Array<[string, string, string]>
  logs?: { files: number; facts: number; new: number; errors: string[] }
}

export interface LiveCheckReport {
  preset: string
  symbol: string
  timeframe: string
  since: string
  price_bps: number
  window: { bars: number; start: string; end: string }
  summary: {
    counts: Record<LiveCheckStatus, number>
    perlu_dicek: number
    rows: number
    expected: number
    deliveries: number
  }
  rows: LiveCheckRow[]
  causes: Record<string, string>
  last_cycle: LiveCheckCycle | null
}
