import { request } from './client'
import type { LedgerFilters, LedgerMeta, LedgerSignalsPage, LedgerSummary } from './types/ledger'

const P = '/api/v1/lab/ledger'

/** Query string from filters; empty values are dropped. */
export function ledgerQuery(params: Record<string, string | number | null | undefined>): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** Signal Ledger endpoints (admin-only, same Bearer JWT as the rest of the Lab). */
export const ledgerApi = {
  getMeta(signal?: AbortSignal): Promise<LedgerMeta> {
    return request<LedgerMeta>('GET', `${P}/meta`, undefined, signal)
  },
  getSummary(f: LedgerFilters, split: 'none' | 'direction', signal?: AbortSignal): Promise<LedgerSummary> {
    return request<LedgerSummary>('GET', `${P}/summary${ledgerQuery({ ...f, split })}`, undefined, signal)
  },
  getSignals(f: LedgerFilters & { direction?: number }, limit: number, offset: number, signal?: AbortSignal): Promise<LedgerSignalsPage> {
    return request<LedgerSignalsPage>('GET', `${P}/signals${ledgerQuery({ ...f, limit, offset })}`, undefined, signal)
  },
}
