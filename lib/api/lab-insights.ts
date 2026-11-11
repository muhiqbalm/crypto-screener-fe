import { request } from './client'
import type { LabId } from './types/lab'
import type {
  LabBoardFilters,
  LabEstimate,
  LabEstimateRequest,
  LabLeaderboard,
  LabPreset,
  LabPresetBestCell,
  LabPresetWatchResponse,
  LabQueue,
  LabRunDefaults,
} from './types/lab-insights'

const P = '/api/v1/lab'
const id = (v: LabId) => encodeURIComponent(String(v))

function qs(params: Record<string, string | number | undefined | null>): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.set(k, String(v))
  const s = u.toString()
  return s ? `?${s}` : ''
}

/** Planning (defaults, estimate, queue), leaderboard and presets. Admin-only. */
export const labInsightsApi = {
  getRunDefaults(signal?: AbortSignal): Promise<LabRunDefaults> {
    return request<LabRunDefaults>('GET', `${P}/run-defaults`, undefined, signal)
  },
  estimate(body: LabEstimateRequest, signal?: AbortSignal): Promise<LabEstimate> {
    return request<LabEstimate>('POST', `${P}/estimate`, body, signal)
  },
  getQueue(signal?: AbortSignal): Promise<LabQueue> {
    return request<LabQueue>('GET', `${P}/queue`, undefined, signal)
  },
  cancelScan(scanId: LabId): Promise<{ scan_id: LabId; cancelled: number; cancelling: number }> {
    return request('POST', `${P}/scans/${id(scanId)}/cancel`)
  },
  getLeaderboard(f: LabBoardFilters, signal?: AbortSignal): Promise<LabLeaderboard> {
    return request<LabLeaderboard>('GET', `${P}/leaderboard${qs({ ...f })}`, undefined, signal)
  },
  getPresets(signal?: AbortSignal): Promise<LabPreset[]> {
    return request<LabPreset[]>('GET', `${P}/presets`, undefined, signal)
  },
  getBestPresets(templateId: string, symbols: string[], timeframes: string[], signal?: AbortSignal): Promise<{ cells: Record<string, LabPresetBestCell | null> }> {
    return request('GET', `${P}/presets/best${qs({ template_id: templateId, symbols: symbols.join(','), timeframes: timeframes.join(',') })}`, undefined, signal)
  },
  presetFromRun(runId: LabId, body: { label: string; notes?: string }): Promise<LabPreset> {
    return request<LabPreset>('POST', `${P}/runs/${id(runId)}/preset`, body)
  },
  patchPreset(presetId: LabId, body: { label?: string; notes?: string }): Promise<LabPreset> {
    return request<LabPreset>('PATCH', `${P}/presets/${id(presetId)}`, body)
  },
  deletePreset(presetId: LabId): Promise<{ id: LabId; deleted: boolean }> {
    return request('DELETE', `${P}/presets/${id(presetId)}`)
  },
  watchFromPreset(presetId: LabId, body: { autopaper_account_id?: LabId }): Promise<LabPresetWatchResponse> {
    return request<LabPresetWatchResponse>('POST', `${P}/presets/${id(presetId)}/watch`, body)
  },
}
