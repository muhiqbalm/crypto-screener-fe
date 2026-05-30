/**
 * Unit tests for auth store (Task 2.4)
 * Requirements: 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, setToken } from './auth-store'

describe('auth-store', () => {
  beforeEach(() => {
    // Reset to empty string before each test
    setToken('')
  })

  it('initial token is an empty string', () => {
    setToken('')
    expect(getToken()).toBe('')
  })

  it('setToken stores the token', () => {
    setToken('my-test-token')
    expect(getToken()).toBe('my-test-token')
  })

  it('getToken returns the last set token', () => {
    setToken('first')
    setToken('second')
    expect(getToken()).toBe('second')
  })

  it('setToken accepts empty string (clears token)', () => {
    setToken('some-token')
    setToken('')
    expect(getToken()).toBe('')
  })

  it('returns a string type', () => {
    expect(typeof getToken()).toBe('string')
  })
})
