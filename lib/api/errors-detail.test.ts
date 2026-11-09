import { describe, it, expect } from 'vitest'
import { ApiError, apiErrorDetail } from './errors'

describe('apiErrorDetail', () => {
  it('reads FastAPI string detail', () => {
    expect(apiErrorDetail(new ApiError('server', 422, { detail: 'unknown search key: foo' }))).toBe('unknown search key: foo')
  })
  it('joins validation error lists without the body prefix', () => {
    const err = new ApiError('server', 422, { detail: [{ loc: ['body', 'n_trials'], msg: 'must be 10, 30 or 60' }] })
    expect(apiErrorDetail(err)).toBe('n_trials: must be 10, 30 or 60')
  })
  it('returns null otherwise', () => {
    expect(apiErrorDetail(new ApiError('network'))).toBeNull()
    expect(apiErrorDetail(new Error('x'))).toBeNull()
  })
})
