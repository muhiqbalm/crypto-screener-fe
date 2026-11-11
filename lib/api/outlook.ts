import { request } from './client'
import type { LabId } from './types/lab'
import type { OutlookDetail, OutlookInputs, OutlookResponse, RegimeResponse } from './types/outlook'

const P = '/api/v1/lab'

export function outlookQuery(i: OutlookInputs): string {
  const qs = new URLSearchParams({
    capital: String(i.capital),
    leverage: String(i.leverage),
    sizing: i.sizing,
    risk_pct: String(i.risk_pct),
  })
  return `?${qs.toString()}`
}

/** Outlook Koin (admin) + market regime (any logged-in user). */
export const outlookApi = {
  getOutlook(i: OutlookInputs, signal?: AbortSignal): Promise<OutlookResponse> {
    return request<OutlookResponse>('GET', `${P}/outlook${outlookQuery(i)}`, undefined, signal)
  },
  getDetail(symbol: string, i: OutlookInputs, signal?: AbortSignal): Promise<OutlookDetail> {
    return request<OutlookDetail>('GET', `${P}/outlook/${encodeURIComponent(symbol)}${outlookQuery(i)}`, undefined, signal)
  },
  refresh(): Promise<{ job_id: LabId; already: boolean }> {
    return request('POST', `${P}/outlook/refresh`)
  },
  getRegime(signal?: AbortSignal): Promise<RegimeResponse> {
    return request<RegimeResponse>('GET', `${P}/regime`, undefined, signal)
  },
}
