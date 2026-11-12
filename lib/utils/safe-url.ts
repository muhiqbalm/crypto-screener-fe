/**
 * URL guards for anything that comes from the query string or a 3rd-party
 * feed and ends up in navigation / an href.
 */

/**
 * Validates a post-login `?next=` target. Only same-origin absolute paths are
 * allowed — rejects "//evil.com", "/\\evil.com", "https://…", "javascript:…"
 * and anything containing control characters. Falls back to `fallback`.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/beranda'): string {
  if (!raw) return fallback
  if (raw.length > 512) return fallback
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/register')) return fallback
  try {
    const u = new URL(raw, 'http://local.invalid')
    if (u.origin !== 'http://local.invalid') return fallback
    return `${u.pathname}${u.search}${u.hash}`
  } catch {
    return fallback
  }
}

/** Returns the URL only when it is an absolute http(s) link, else null. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}
