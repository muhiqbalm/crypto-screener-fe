'use client'

import { useEffect, useState } from 'react'

/**
 * Current time (epoch ms) that re-renders every `intervalMs` (default 60 s)
 * while the tab is visible. For relative ages ("3 mnt lalu") that must keep
 * moving. Returns null during SSR / the first render to avoid hydration
 * mismatches; callers render a neutral placeholder then.
 */
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') tick()
    }, intervalMs)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [intervalMs])
  return now
}
