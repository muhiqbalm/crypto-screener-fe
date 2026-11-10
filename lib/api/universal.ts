import { request } from './client'
import type { LabId, LabRunCreateResponse } from './types/lab'
import type {
  StrengthResponse,
  UniversalContrib,
  UniversalRebalance,
  UniversalRunCreateRequest,
  UniversalSchema,
  UniversalWatch,
  UniversalWatchCreateRequest,
  UniversalWatchPatch,
} from './types/universal'

const P = '/api/v1/lab'
const id = (v: LabId) => encodeURIComponent(String(v))

/** Universal v0 + Koin Terkuat endpoints (admin-only, same Bearer JWT as the rest of the Lab). */
export const universalApi = {
  getSchema(signal?: AbortSignal): Promise<UniversalSchema> {
    return request<UniversalSchema>('GET', `${P}/universal/schema`, undefined, signal)
  },
  createRun(body: UniversalRunCreateRequest): Promise<LabRunCreateResponse> {
    return request<LabRunCreateResponse>('POST', `${P}/universal/runs`, body)
  },
  getContrib(runId: LabId, signal?: AbortSignal): Promise<UniversalContrib> {
    return request<UniversalContrib>('GET', `${P}/universal/runs/${id(runId)}/contrib`, undefined, signal)
  },
  getStrength(signal?: AbortSignal): Promise<StrengthResponse> {
    return request<StrengthResponse>('GET', `${P}/strength`, undefined, signal)
  },
  refreshStrength(): Promise<{ job_id: LabId }> {
    return request<{ job_id: LabId }>('POST', `${P}/strength/refresh`)
  },
  getWatches(signal?: AbortSignal): Promise<UniversalWatch[]> {
    return request<UniversalWatch[]>('GET', `${P}/universal/watches`, undefined, signal)
  },
  createWatch(body: UniversalWatchCreateRequest): Promise<{ watch_id: LabId; account_id: LabId | null }> {
    return request('POST', `${P}/universal/watches`, body)
  },
  patchWatch(watchId: LabId, body: UniversalWatchPatch): Promise<UniversalWatch> {
    return request<UniversalWatch>('PATCH', `${P}/universal/watches/${id(watchId)}`, body)
  },
  deleteWatch(watchId: LabId): Promise<{ id: LabId; active: boolean }> {
    return request('DELETE', `${P}/universal/watches/${id(watchId)}`)
  },
  getRebalances(watchId: LabId, signal?: AbortSignal): Promise<UniversalRebalance[]> {
    return request<UniversalRebalance[]>('GET', `${P}/universal/watches/${id(watchId)}/rebalances`, undefined, signal)
  },
}
