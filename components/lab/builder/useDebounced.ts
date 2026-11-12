'use client'

import { useEffect, useState } from 'react'

/**
 * `value` after it stopped changing for `ms`. Objects are compared by JSON so a re-render that
 * builds an equal object does not restart the timer (one estimate request per real change).
 */
export function useDebounced<T>(value: T, ms = 600): T {
  const key = JSON.stringify(value)
  const [state, setState] = useState<{ key: string; value: T }>({ key, value })
  useEffect(() => {
    if (key === state.key) return
    const t = setTimeout(() => setState({ key, value }), ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms])
  return state.value
}
