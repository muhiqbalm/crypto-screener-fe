'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { INPUTS_KEY, parseInputs, saveInputs } from '@/lib/lab/outlook'
import type { OutlookInputs } from '@/lib/api/types/outlook'

const listeners = new Set<() => void>()

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

function snapshot(): string {
  try {
    return window.localStorage.getItem(INPUTS_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Capital inputs shared by the Outlook list and the coin page, remembered on this device.
 *  The server render uses the defaults (no hydration mismatch). */
export function useSavedInputs(): [OutlookInputs, (i: OutlookInputs) => void] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '')
  const inputs = useMemo(() => parseInputs(raw), [raw])
  const set = useCallback((i: OutlookInputs) => {
    saveInputs(i)
    listeners.forEach((l) => l())
  }, [])
  return [inputs, set]
}
