import { request } from './client'
import type { BasketDetail, BasketReport } from './types/basket'

/** Basket paper strategies, admin-only, same Bearer JWT as the rest of the Lab. Read-only. */
export const basketApi = {
  getReport(signal?: AbortSignal): Promise<BasketReport> {
    return request<BasketReport>('GET', '/api/v1/lab/baskets', undefined, signal)
  },
  getDetail(id: number, signal?: AbortSignal): Promise<BasketDetail> {
    return request<BasketDetail>('GET', `/api/v1/lab/baskets/${encodeURIComponent(String(id))}`, undefined, signal)
  },
}
