/**
 * Client-side session store.
 *
 * Persists access_token, refresh_token, and user profile to localStorage
 * so the session survives page reloads. All writes are wrapped in try/catch
 * so a storage failure (private browsing quota, etc.) never crashes the app.
 *
 * Subscribers are notified synchronously on every mutation so React components
 * can re-render via useSyncExternalStore.
 */

import type { UserProfileResponse } from '@/lib/api/types/auth'

const STORAGE_KEY = 'crypto-screener-session'

export interface Session {
  accessToken: string
  refreshToken: string
  user: UserProfileResponse
}

// ---------------------------------------------------------------------------
// In-memory state (source of truth at runtime)
// ---------------------------------------------------------------------------

let _session: Session | null = null
const _listeners = new Set<() => void>()

// ---------------------------------------------------------------------------
// Hydrate from localStorage on module load (client only)
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      _session = JSON.parse(raw) as Session
    }
  } catch {
    // Corrupt or missing — start fresh
    _session = null
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _persist(session: Session | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Best-effort — storage write failure is non-fatal
  }
}

function _notify(): void {
  for (const listener of _listeners) {
    listener()
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the current session, or null if not logged in. */
export function getSession(): Session | null {
  return _session
}

/** Returns the access token string (empty string when not logged in). */
export function getToken(): string {
  return _session?.accessToken ?? ''
}

/** Returns the current user profile, or null when not logged in. */
export function getUser(): UserProfileResponse | null {
  return _session?.user ?? null
}

/** Returns true when a session exists. */
export function isLoggedIn(): boolean {
  return _session !== null
}

/** Saves a new session (called after login). */
export function setSession(session: Session): void {
  _session = session
  _persist(session)
  _notify()
}

/** Updates only the access token (called after token refresh). */
export function setToken(token: string): void {
  if (!_session) return
  _session = { ..._session, accessToken: token }
  _persist(_session)
  _notify()
}

/** Updates the stored user profile (called after profile PATCH). */
export function setUser(user: UserProfileResponse): void {
  if (!_session) return
  _session = { ..._session, user }
  _persist(_session)
  _notify()
}

/** Clears the session (called on logout). */
export function clearSession(): void {
  _session = null
  _persist(null)
  _notify()
}

// ---------------------------------------------------------------------------
// useSyncExternalStore integration
// ---------------------------------------------------------------------------

export function subscribeToSession(listener: () => void): () => void {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

export function getSessionSnapshot(): Session | null {
  return _session
}

// Server snapshot — always null (no session on the server)
export function getServerSessionSnapshot(): Session | null {
  return null
}
