/**
 * Laporan Mingguan + in-web notifications — mirrors src/api/report_routes.py,
 * src/lab/weekly/build.py and src/lab/notify.py. Admin-only, read-only (except read state).
 * Every section carries `available`; false = "belum ada data" (never shown as zeros).
 */

/** 'searah_pasar' (audit 2026-11-13 P3): raw edge positive, but not relative to BTC. */
export type LedgerVerdictCode = 'terbukti' | 'searah_pasar' | 'negatif' | 'belum_terbukti' | 'belum_cukup_data'

export interface ReportWeek {
  week: string
  start: string
  end: string
  current: boolean
  snapshot: boolean
  generated_at: string | null
}

export interface ReportWeeksResponse {
  current: string
  weeks: ReportWeek[]
}

export interface SectionBase {
  available: boolean
  error?: string
}

export interface PaperPresetRow {
  preset: string
  preset_id: number
  live_reference: boolean
  watch_id: number
  account_id: number
  started_at: string
  active: boolean
  starting_balance: number
  balance_start: number
  balance_end: number
  week_pnl: number
  week_return_pct: number | null
  total_return_pct: number | null
  trades_week: number
  wins_week: number
  trades_total: number
  wins_total: number
  max_dd_pct: number | null
  week_dd_pct: number | null
  open_positions: number
  unrealized_pnl: number | null
  progress_pct: number
}

export interface PaperSection extends SectionBase {
  presets?: PaperPresetRow[]
  target_trades?: number
  best?: { preset: string; week_return_pct: number | null } | null
  worst?: { preset: string; week_return_pct: number | null } | null
  trades_week?: number
  trades_total?: number
  note?: string
}

export interface LedgerVerdictStats {
  n_signals: number
  n: number
  days: number
  hit_rate: number | null
  mean_pct: number | null
  mean_ci: [number, number] | null
  /** Honest headline: 'terbukti' only when the BTC-relative interval is above zero too. */
  verdict: LedgerVerdictCode
  // since 2026-11-13 (older frozen snapshots lack them)
  verdict_raw?: LedgerVerdictCode | null
  verdict_rel_btc?: LedgerVerdictCode | null
  mean_rel_btc_pct?: number | null
  rel_btc_ci?: [number, number] | null
  /** Signals from the causal reconstruction (not recorded live). */
  n_rekon?: number | null
  first_ts?: string | null
  last_ts?: string | null
}

export interface LedgerGroupRow {
  key: string
  source: string
  signal_type: string
  direction: number
  overall: LedgerVerdictStats
  week: LedgerVerdictStats | null
}

export interface LedgerReportSection extends SectionBase {
  horizon?: string
  groups?: LedgerGroupRow[]
  counts_overall?: Partial<Record<LedgerVerdictCode, number>>
  counts_week?: Partial<Record<LedgerVerdictCode, number>>
  signals_week?: number
  note?: string
}

export interface ExecActual {
  n_signals: number
  n_counted: number
  n_with_fill: number
  mean_slippage_bps: number | null
  median_slippage_bps: number | null
  mean_latency_s: number | null
  median_latency_s: number | null
  latency_upper_bound: boolean
}

export interface ExecCell {
  k: number
  ttl_min: number
  n: number
  filled: number
  missed: number
  fill_rate: number | null
  mean_saving_bps: number | null
}

export interface ExecutionSection extends SectionBase {
  week?: ExecActual
  overall?: ExecActual
  grid_week?: ExecCell[]
  signals?: {
    symbol: string
    action: string
    side: string
    arrival_ts: string
    slippage_bps: number | null
    latency_s: number | null
    off_close: boolean
  }[]
}

export interface LiveAlert {
  ts: string
  symbol: string
  action: string
  side: string
  orders: number
  executed: number
  rejected: number
  other: number
  users: number
}

export interface LiveBotSection extends SectionBase {
  signals?: number
  orders?: number
  executed?: number
  rejected?: number
  by_status?: Record<string, number>
  by_symbol?: Record<string, number>
  alerts?: LiveAlert[]
  note?: string
}

export interface SnoopWarning {
  template_id: string
  symbol: string
  runs: number
  timeframes: number
  trials: number
  holdout_touches: number
}

export interface LabActivitySection extends SectionBase {
  runs?: number
  runs_by_mode?: Record<string, number>
  runs_by_status?: Record<string, number>
  scans?: number
  pass?: number
  fail?: number
  pass_runs?: {
    id: number
    template_id: string
    symbol: string
    timeframe: string
    mode: string
    net_return_pct: number | null
    max_dd_pct: number | null
    trades: number | null
    scan_id: number | null
  }[]
  presets_saved?: {
    id: number
    name: string
    verdict: string | null
    source_run_id: number | null
    archived: boolean
    created_at: string
  }[]
  snooping_warnings?: SnoopWarning[]
  snooping_rule?: { runs: number; timeframes: number; trials: number }
  jobs?: Record<string, Record<string, number>>
}

export interface DeployEvent {
  ts: string
  kind: 'live' | 'failed' | 'dry_run' | 'start' | 'ops'
  message: string
}

export interface SystemSection extends SectionBase {
  deploys: SectionBase & { events?: DeployEvent[]; live?: number; failed?: number; dry_run?: number }
  backups: SectionBase & {
    ok?: number
    failed?: number
    last?: { ts: string; message: string } | null
    events?: { ts: string; ok: boolean; message: string }[]
  }
  processes: { name: string; status: string; restarts: number | null; unstable_restarts: number | null; up_since: string | null }[] | null
  processes_at: string
}

export interface ReportHook {
  id: string
  title: string
  href: string
  note: string
}

export interface WeeklyReport {
  week: string
  start: string
  end: string
  partial: boolean
  generated_at: string
  source: 'live' | 'snapshot'
  snapshot: { generator: string; generated_at: string } | null
  sections: {
    paper: PaperSection
    ledger: LedgerReportSection
    execution: ExecutionSection
    live_bot: LiveBotSection
    lab: LabActivitySection
    system: SystemSection
  }
  hooks: ReportHook[]
}

// ── notifications ────────────────────────────────────────────────────────

export type NotificationType = 'job' | 'paper' | 'ledger' | 'deploy' | 'report' | 'live'

export interface LabNotification {
  id: number
  type: NotificationType | string
  title: string
  body: string | null
  link: string | null
  created_at: string
  /** A sticky notification stays `read: false` until it is acknowledged. */
  read: boolean
  /** Sticky (e.g. a rejected live order): pinned for every admin until one presses "Sudah dicek". */
  sticky?: boolean
  /** When it was acknowledged; null/absent = still open. */
  acked_at?: string | null
}

export interface NotificationList {
  items: LabNotification[]
  /** Open sticky notifications (newest first), shown on top whatever their age. */
  pinned?: LabNotification[]
  unread: number
}

export interface NotificationReadResponse {
  ok: boolean
  unread: number
}
