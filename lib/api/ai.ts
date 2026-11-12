import { request } from './client'
import type { AiFactorsResponse, AiStatusResponse } from './types/ai'

const P = '/api/v1/lab/ai'

/** Ringkasan AI: read-only for every logged-in team account (details for admins). */
export const aiApi = {
  getFactors(symbol: string, signal?: AbortSignal): Promise<AiFactorsResponse> {
    return request<AiFactorsResponse>('GET', `${P}/factors?symbol=${encodeURIComponent(symbol)}`, undefined, signal)
  },
  getStatus(signal?: AbortSignal): Promise<AiStatusResponse> {
    return request<AiStatusResponse>('GET', `${P}/status`, undefined, signal)
  },
}
