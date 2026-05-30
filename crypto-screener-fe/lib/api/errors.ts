export type ApiErrorKind = 'auth' | 'not_found' | 'server' | 'network'

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(`ApiError(${kind}${status ? `:${status}` : ''})`)
    this.name = 'ApiError'
  }
}
