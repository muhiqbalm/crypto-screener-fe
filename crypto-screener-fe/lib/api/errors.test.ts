/**
 * Unit tests for ApiError class (Task 2.2)
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { describe, it, expect } from 'vitest'
import { ApiError, type ApiErrorKind } from './errors'

describe('ApiError', () => {
  it('is an instance of Error', () => {
    const err = new ApiError('network')
    expect(err).toBeInstanceOf(Error)
  })

  it('has name "ApiError"', () => {
    const err = new ApiError('server', 500)
    expect(err.name).toBe('ApiError')
  })

  it('stores the kind', () => {
    const kinds: ApiErrorKind[] = ['auth', 'not_found', 'server', 'network']
    for (const kind of kinds) {
      const err = new ApiError(kind)
      expect(err.kind).toBe(kind)
    }
  })

  it('stores the status when provided', () => {
    const err = new ApiError('auth', 401)
    expect(err.status).toBe(401)
  })

  it('status is undefined when not provided', () => {
    const err = new ApiError('network')
    expect(err.status).toBeUndefined()
  })

  it('stores the cause when provided', () => {
    const cause = new TypeError('fetch failed')
    const err = new ApiError('network', undefined, cause)
    expect(err.cause).toBe(cause)
  })

  it('message includes the kind', () => {
    const err = new ApiError('not_found', 404)
    expect(err.message).toContain('not_found')
  })

  it('message includes the status when provided', () => {
    const err = new ApiError('server', 503)
    expect(err.message).toContain('503')
  })

  it('supports all four ApiErrorKind values', () => {
    const kinds: ApiErrorKind[] = ['auth', 'not_found', 'server', 'network']
    for (const kind of kinds) {
      expect(() => new ApiError(kind)).not.toThrow()
    }
  })
})
