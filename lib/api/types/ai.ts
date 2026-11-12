/** Ringkasan AI (GET /api/v1/lab/ai/*). Written by the Lab worker after each 4H close; read-only here. */

export type AiEffect = 'mendukung' | 'melemahkan' | 'netral'

export type AiFactorKey = 'rezim_btc' | 'funding' | 'open_interest' | 'arus_whale' | 'fear_greed' | 'berita'

export interface AiFactor {
  factor: AiFactorKey
  /** Indonesian display label, e.g. "Open interest". */
  label: string
  /** Short phrase written by the model; every number in it was checked against the data. */
  value: string
  /** Relative to the Outlook direction. */
  effect: AiEffect
  /** Where the fact comes from (set by the backend, not by the model). */
  source: string
}

/** Admin only. */
export interface AiSummaryMeta {
  model: string | null
  effort: string | null
  cost_usd: number | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  dropped_factors: number
  effects_overridden: number
  fallback_model: string | null
}

export interface AiSummary {
  symbol: string
  /** 4H bar open of the Outlook row that was summarised (always the coin's current bar). */
  bar: string
  bar_close: string | null
  created_at: string | null
  /** One Indonesian sentence. */
  sentence: string
  factors: AiFactor[]
  /** Facts that were missing, never guessed. */
  data_gaps: string[]
  meta?: AiSummaryMeta
}

/** Why there is no summary. Only admins receive a reason. */
export type AiReason =
  | 'no_key'
  | 'disabled'
  | 'sdk_missing'
  | 'over_budget'
  | 'pending'
  | 'rejected'
  | 'refused'
  | 'error'

export interface AiFactorsResponse {
  symbol: string
  /** Feature switched on (API key + LAB_AI_ENABLED + SDK). */
  enabled: boolean
  /** "AI · bisa salah · bukan saran investasi" */
  label: string
  summary: AiSummary | null
  reason: AiReason | null
  /** One subtle line for admins (e.g. "AI belum aktif — perlu API key"); always null for other accounts. */
  note: string | null
}

export interface AiStatusResponse {
  enabled: boolean
  active: boolean
  label: string
  reason?: AiReason | null
  reason_text?: string | null
  model?: string
  effort?: string
  budget?: { daily_usd: number; spent_today_usd: number; remaining_usd: number; day_utc: string; resets: string }
}
