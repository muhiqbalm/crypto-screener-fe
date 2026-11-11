import { request } from './client'
import type { LiveCheckReport } from './types/livecheck'

/** "Cek bot live vs strategi", admin-only, same Bearer JWT as the rest of the Lab. Read-only. */
export const liveCheckApi = {
  getReport(bars: number, signal?: AbortSignal): Promise<LiveCheckReport> {
    return request<LiveCheckReport>('GET', `/api/v1/lab/live-check?bars=${encodeURIComponent(bars)}`, undefined, signal)
  },
}
