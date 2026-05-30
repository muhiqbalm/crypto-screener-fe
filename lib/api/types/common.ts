export interface ResponseMetadata {
  timestamp: string
  data_age_seconds: number | null
  cache_hit: boolean
  stale_data_warning: boolean | null
  symbols_count: number
  errors_count: number
}
