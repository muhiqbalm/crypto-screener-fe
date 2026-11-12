import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/errors'

const getWebhookConfig = vi.fn()
vi.mock('@/lib/api/client', () => ({ api: { getWebhookConfig: (...a: unknown[]) => getWebhookConfig(...a) } }))

import { isNoAccess, useHomeWebhookState } from './home'

function wrapper(qc: QueryClient) {
  return function W({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useHomeWebhookState', () => {
  it('keeps only on/off: the passphrase never reaches the cache', async () => {
    getWebhookConfig.mockResolvedValueOnce({ id: 'x', passphrase: 'SECRET-PASS', is_active: true, created_at: '' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useHomeWebhookState(), { wrapper: wrapper(qc) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ state: 'aktif' })
    expect(JSON.stringify(qc.getQueryCache().getAll().map((q) => q.state.data))).not.toContain('SECRET-PASS')
  })

  it('reads 404 (paused or missing) as "tidak aktif"', async () => {
    getWebhookConfig.mockRejectedValueOnce(new ApiError('not_found', 404))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useHomeWebhookState(), { wrapper: wrapper(qc) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ state: 'tidak_aktif' })
  })
})

describe('isNoAccess', () => {
  it('is true only for 403', () => {
    expect(isNoAccess(new ApiError('auth', 403))).toBe(true)
    expect(isNoAccess(new ApiError('auth', 401))).toBe(false)
    expect(isNoAccess(new ApiError('server', 500))).toBe(false)
    expect(isNoAccess(new Error('x'))).toBe(false)
  })
})
