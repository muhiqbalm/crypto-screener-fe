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

/**
 * Human-readable reason from a 4xx JSON body (FastAPI `detail` as a string or
 * a list of `{loc, msg}`), or null when there is none.
 */
export function apiErrorDetail(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null
  const body = err.cause as { detail?: unknown } | undefined
  const d = body && typeof body === 'object' ? body.detail : undefined
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    const parts = d
      .map((x) => {
        if (!x || typeof x !== 'object') return null
        const item = x as { loc?: unknown[]; msg?: string }
        const loc = Array.isArray(item.loc) ? item.loc.filter((l) => l !== 'body').join('.') : ''
        return item.msg ? (loc ? `${loc}: ${item.msg}` : item.msg) : null
      })
      .filter(Boolean)
    return parts.length ? parts.join('; ') : null
  }
  return null
}
