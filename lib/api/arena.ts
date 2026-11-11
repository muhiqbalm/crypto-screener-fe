import { request } from './client'
import type { ArenaCurves, ArenaReport } from './types/arena'

/** Arena Paper, admin-only, same Bearer JWT as the rest of the Lab. Read-only. */
export const arenaApi = {
  getReport(signal?: AbortSignal): Promise<ArenaReport> {
    return request<ArenaReport>('GET', '/api/v1/lab/arena', undefined, signal)
  },
  getCurves(signal?: AbortSignal): Promise<ArenaCurves> {
    return request<ArenaCurves>('GET', '/api/v1/lab/arena/curves', undefined, signal)
  },
}
