/**
 * Unit tests for QueryClient factory (Task 3.1)
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect } from 'vitest'
import { makeQueryClient } from './queryClient'
import { ApiError } from '@/lib/api/errors'

describe('makeQueryClient', () => {
  it('creates a QueryClient instance', () => {
    const client = makeQueryClient()
    expect(client).toBeDefined()
    expect(typeof client.getQueryCache).toBe('function')
  })

  it('creates a new instance each call', () => {
    const a = makeQueryClient()
    const b = makeQueryClient()
    expect(a).not.toBe(b)
  })

  describe('default query options', () => {
    it('has staleTime of 30_000 ms', () => {
      const client = makeQueryClient()
      const defaults = client.getDefaultOptions()
      expect(defaults.queries?.staleTime).toBe(30_000)
    })

    it('has gcTime of 300_000 ms', () => {
      const client = makeQueryClient()
      const defaults = client.getDefaultOptions()
      expect(defaults.queries?.gcTime).toBe(300_000)
    })

    it('has refetchOnWindowFocus disabled', () => {
      const client = makeQueryClient()
      const defaults = client.getDefaultOptions()
      expect(defaults.queries?.refetchOnWindowFocus).toBe(false)
    })

    describe('retry policy', () => {
      it('does not retry for ApiError with kind "auth"', () => {
        const client = makeQueryClient()
        const retry = client.getDefaultOptions().queries?.retry
        if (typeof retry !== 'function') throw new Error('retry should be a function')

        const authError = new ApiError('auth', 401)
        expect(retry(0, authError)).toBe(false)
        expect(retry(1, authError)).toBe(false)
      })

      it('does not retry for ApiError with kind "not_found"', () => {
        const client = makeQueryClient()
        const retry = client.getDefaultOptions().queries?.retry
        if (typeof retry !== 'function') throw new Error('retry should be a function')

        const notFoundError = new ApiError('not_found', 404)
        expect(retry(0, notFoundError)).toBe(false)
        expect(retry(1, notFoundError)).toBe(false)
      })

      it('retries up to 2 times for server errors', () => {
        const client = makeQueryClient()
        const retry = client.getDefaultOptions().queries?.retry
        if (typeof retry !== 'function') throw new Error('retry should be a function')

        const serverError = new ApiError('server', 500)
        expect(retry(0, serverError)).toBe(true)
        expect(retry(1, serverError)).toBe(true)
        expect(retry(2, serverError)).toBe(false)
      })

      it('retries up to 2 times for network errors', () => {
        const client = makeQueryClient()
        const retry = client.getDefaultOptions().queries?.retry
        if (typeof retry !== 'function') throw new Error('retry should be a function')

        const networkError = new ApiError('network')
        expect(retry(0, networkError)).toBe(true)
        expect(retry(1, networkError)).toBe(true)
        expect(retry(2, networkError)).toBe(false)
      })

      it('retries up to 2 times for generic errors', () => {
        const client = makeQueryClient()
        const retry = client.getDefaultOptions().queries?.retry
        if (typeof retry !== 'function') throw new Error('retry should be a function')

        const genericError = new Error('something went wrong')
        expect(retry(0, genericError)).toBe(true)
        expect(retry(1, genericError)).toBe(true)
        expect(retry(2, genericError)).toBe(false)
      })
    })

    describe('retryDelay', () => {
      it('uses exponential backoff', () => {
        const client = makeQueryClient()
        const retryDelay = client.getDefaultOptions().queries?.retryDelay
        if (typeof retryDelay !== 'function') throw new Error('retryDelay should be a function')

        // attempt 0: min(1000 * 2^0, 30000) = 1000
        expect(retryDelay(0, new Error())).toBe(1_000)
        // attempt 1: min(1000 * 2^1, 30000) = 2000
        expect(retryDelay(1, new Error())).toBe(2_000)
        // attempt 2: min(1000 * 2^2, 30000) = 4000
        expect(retryDelay(2, new Error())).toBe(4_000)
      })

      it('caps at 30_000 ms', () => {
        const client = makeQueryClient()
        const retryDelay = client.getDefaultOptions().queries?.retryDelay
        if (typeof retryDelay !== 'function') throw new Error('retryDelay should be a function')

        // attempt 10: 1000 * 2^10 = 1_024_000, capped at 30_000
        expect(retryDelay(10, new Error())).toBe(30_000)
      })
    })
  })
})
