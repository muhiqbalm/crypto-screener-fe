import { ApiError } from './errors'
import { PATHS } from './paths'
import type { ScreenerResponse } from './types/screener'
import type {
  WebhookConfigResponse,
  WebhookConfigCreateRequest,
  WebhookConfigUpdateRequest,
} from './types/webhook'
import type { TradeLogResponse } from './types/trades'
import type {
  AccessTokenResponse,
  LoginRequest,
  ProfileUpdateRequest,
  RegisterRequest,
  TokenResponse,
  UserProfileResponse,
} from './types/auth'
import type {
  CredentialUpsertRequest,
  CredentialSummaryResponse,
  BalanceResponse,
  OpenPositionResponse,
  ClosedPositionResponse,
} from './types/credentials'
import {
  getToken,
  getSession,
  setToken,
  clearSession,
  isTokenExpired,
} from '@/lib/utils/auth-store'

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
// Token refresh — singleton in-flight promise (prevents refresh storm)
// ---------------------------------------------------------------------------

let _refreshPromise: Promise<string> | null = null

/**
 * Calls POST /trading/auth/refresh with the stored refresh token.
 * Returns the new access token on success.
 * Clears the session and redirects to /login on failure.
 *
 * Uses a singleton promise so concurrent requests that all hit a 401
 * share a single refresh call instead of hammering the endpoint.
 */
async function _doRefresh(): Promise<string> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const session = getSession()
    if (!session?.refreshToken) {
      _handleAuthFailure()
      throw new ApiError('auth', 401)
    }

    try {
      const url = `${getBaseUrl()}${PATHS.authRefresh}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      })

      if (!res.ok) {
        _handleAuthFailure()
        throw new ApiError('auth', res.status)
      }

      const data = (await res.json()) as AccessTokenResponse
      setToken(data.access_token, data.expires_in)
      return data.access_token
    } finally {
      _refreshPromise = null
    }
  })()

  return _refreshPromise
}

function _handleAuthFailure(): void {
  clearSession()
  // Redirect to login — works in both browser and during SSR guard
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * Makes an authenticated HTTP request.
 *
 * Token refresh flow:
 * 1. If the stored access token is within 60 s of expiry → proactively refresh
 *    before sending the request.
 * 2. If the server returns 401 → attempt one reactive refresh, then retry.
 * 3. If the refresh itself fails → clear session and redirect to /login.
 */
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

  const isTradingPath = path.startsWith('/trading/')

  // Proactive refresh: if token is about to expire, refresh before the request
  if (isTradingPath && isTokenExpired()) {
    try {
      await _doRefresh()
    } catch {
      // _doRefresh already called _handleAuthFailure — just rethrow
      throw new ApiError('auth', 401)
    }
  }

  const result = await _executeRequest<T>(method, path, body, signal)
  return result
}

async function _executeRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  signal?: AbortSignal,
  isRetry = false,
): Promise<T> {
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
    if (status === 204) return undefined as unknown as T
    return response.json() as Promise<T>
  }

  // Reactive refresh: on 401, try to refresh once then retry the original request
  if ((status === 401 || status === 403) && !isRetry && path.startsWith('/trading/')) {
    // Skip refresh attempt for auth endpoints themselves (login, refresh, logout)
    const isAuthEndpoint =
      path === PATHS.authLogin ||
      path === PATHS.authRefresh ||
      path === PATHS.authLogout ||
      path === PATHS.authRegister

    if (!isAuthEndpoint) {
      try {
        await _doRefresh()
        // Retry the original request once with the new token
        return _executeRequest<T>(method, path, body, signal, true)
      } catch {
        throw new ApiError('auth', status)
      }
    }
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

  reactivateWebhookConfig(signal?: AbortSignal): Promise<WebhookConfigResponse> {
    return request<WebhookConfigResponse>('POST', PATHS.webhookConfigReactivate, undefined, signal)
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

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  login(body: LoginRequest): Promise<TokenResponse> {
    return request<TokenResponse>('POST', PATHS.authLogin, body)
  },

  refreshToken(body: { refresh_token: string }): Promise<AccessTokenResponse> {
    return request<AccessTokenResponse>('POST', PATHS.authRefresh, body)
  },

  register(body: RegisterRequest): Promise<UserProfileResponse> {
    return request<UserProfileResponse>('POST', PATHS.authRegister, body)
  },

  logout(): Promise<void> {
    return request<void>('POST', PATHS.authLogout)
  },

  getMe(signal?: AbortSignal): Promise<UserProfileResponse> {
    return request<UserProfileResponse>('GET', PATHS.userMe, undefined, signal)
  },

  patchMe(body: ProfileUpdateRequest): Promise<UserProfileResponse> {
    return request<UserProfileResponse>('PATCH', PATHS.userMe, body)
  },

  // ---------------------------------------------------------------------------
  // Exchange credentials
  // ---------------------------------------------------------------------------

  listCredentials(signal?: AbortSignal): Promise<CredentialSummaryResponse[]> {
    return request<CredentialSummaryResponse[]>('GET', PATHS.credentials, undefined, signal)
  },

  upsertCredential(body: CredentialUpsertRequest): Promise<CredentialSummaryResponse> {
    return request<CredentialSummaryResponse>('POST', PATHS.credentials, body)
  },

  deleteCredential(exchange: string): Promise<{ message: string }> {
    return request<{ message: string }>('DELETE', PATHS.credentialByExchange(exchange))
  },

  getBalance(signal?: AbortSignal): Promise<BalanceResponse> {
    return request<BalanceResponse>('GET', PATHS.balance, undefined, signal)
  },

  getPositions(signal?: AbortSignal): Promise<OpenPositionResponse[]> {
    return request<OpenPositionResponse[]>('GET', PATHS.positions, undefined, signal)
  },

  getPositionsHistory(signal?: AbortSignal): Promise<ClosedPositionResponse[]> {
    return request<ClosedPositionResponse[]>('GET', PATHS.positionsHistory, undefined, signal)
  },
}
