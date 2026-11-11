import { request } from './client'
import type { ShadowReport } from './types/shadow'

/** Shadow execution ("Kualitas eksekusi"), admin-only, same Bearer JWT as the rest of the Lab. */
export const shadowApi = {
  getReport(signal?: AbortSignal): Promise<ShadowReport> {
    return request<ShadowReport>('GET', '/api/v1/lab/shadow', undefined, signal)
  },
}
