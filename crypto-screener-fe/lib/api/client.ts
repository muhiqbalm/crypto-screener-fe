import { ApiError } from './errors'
import { PATHS } from './paths'
import type { ScreenerResponse } from './types/screener'
import type {
  WebhookConfigResponse,
  WebhookConfigCreateRequest,
  WebhookConfigUpdateRequest,
} from './types/webhook'
import type { TradeLogResponse } from './types/trades'
import { getToken } from '@/lib/utils/auth-store'

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

export function getApiKey(): string {
  return process.env.NEXT_PUBLIC_API_KEY ?? ''
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
}

function isMockDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

export async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  // Mock data path — lazy-import so the mock module tree-shakes out of
  // production bundles when NEXT_PUBLIC_USE_MOCK_DATA !== "true".
  if (isMockDataEnabled()) {
    const { getMock } = await import('@/lib/mocks/index')
    return getMock(method, path) as Promise<T>
  }

  // Build headers
  const headers: Record<string, string> = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (path.startsWith('/api/v1/screener/')) {
    headers['X-API-Key'] = getApiKey()
  }

  if (path.startsWith('/trading/')) {
    headers['Authorization'] = `Bearer ${getToken()}`
  }

  const url = `${getBaseUrl()}${path}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    throw new ApiError('network', undefined, err)
  }

  const { status } = response

  if (status >= 200 && status < 300) {
    // 204 No Content — return undefined cast to T
    if (status === 204) {
      return undefined as unknown as T
    }
    return response.json() as Promise<T>
  }

  if (status === 401 || status === 403) {
    throw new ApiError('auth', status)
  }

  if (status === 404) {
    throw new ApiError('not_found', status)
  }

  if (status >= 500 && status < 600) {
    throw new ApiError('server', status)
  }

  // Other 4xx (422, 400, etc.) — treat as server error
  throw new ApiError('server', status)
}

// ---------------------------------------------------------------------------
// Typed API namespace
// ---------------------------------------------------------------------------

export const api = {
  getScreenerSummary(signal?: AbortSignal): Promise<ScreenerResponse> {
    return request<ScreenerResponse>('GET', PATHS.screenerSummary, undefined, signal)
  },

  getWebhookConfig(signal?: AbortSignal): Promise<WebhookConfigResponse> {
    return request<WebhookConfigResponse>('GET', PATHS.webhookConfig, undefined, signal)
  },

  createWebhookConfig(
    body: WebhookConfigCreateRequest,
    signal?: AbortSignal,
  ): Promise<WebhookConfigResponse> {
    return request<WebhookConfigResponse>('POST', PATHS.webhookConfig, body, signal)
  },

  patchWebhookConfig(
    body: WebhookConfigUpdateRequest,
    signal?: AbortSignal,
  ): Promise<WebhookConfigResponse> {
    return request<WebhookConfigResponse>('PATCH', PATHS.webhookConfig, body, signal)
  },

  deleteWebhookConfig(signal?: AbortSignal): Promise<void> {
    return request<void>('DELETE', PATHS.webhookConfig, undefined, signal)
  },

  getTradeLog(signal?: AbortSignal): Promise<TradeLogResponse[]> {
    return request<TradeLogResponse[]>('GET', PATHS.trades, undefined, signal)
  },
}
