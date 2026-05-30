'use client'

import { useSyncExternalStore } from 'react'
import {
  subscribeToSession,
  getSessionSnapshot,
  getServerSessionSnapshot,
} from './auth-store'
import type { Session } from './auth-store'

/**
 * Reactively returns the current session.
 * Re-renders whenever the session changes (login / logout / token refresh).
 */
export function useSession(): Session | null {
  return useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  )
}
