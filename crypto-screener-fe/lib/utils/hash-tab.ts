'use client'

import { useSyncExternalStore } from 'react'

export type TabId = 'screener' | 'webhook'

export const HASH_TO_TAB: Record<string, TabId> = {
  '#screener': 'screener',
  '#webhook': 'webhook',
}

export function tabIdFromHash(hash: string): TabId {
  return HASH_TO_TAB[hash] ?? 'screener'
}

export function setTabHash(id: TabId): void {
  if (typeof window !== 'undefined') {
    window.location.hash = id
  }
}

// useSyncExternalStore-based hook for SSR safety
function getSnapshot(): TabId {
  return tabIdFromHash(window.location.hash)
}

function getServerSnapshot(): TabId {
  return 'screener' // default for SSR
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

export function useTabFromHash(): TabId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
