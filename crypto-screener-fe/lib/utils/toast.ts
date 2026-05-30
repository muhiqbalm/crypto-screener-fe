import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Deduplication store
// ---------------------------------------------------------------------------

const dedupeStore = new Map<string, { message: string; ts: number }>()

/**
 * Returns `true` if the toast should be shown, `false` if it is a duplicate
 * within the deduplication window.
 *
 * A duplicate is defined as the same `key` + `message` pair emitted within
 * `windowMs` milliseconds of the previous emission (Requirement 7.7).
 */
export function dedupeToast(key: string, message: string, windowMs = 2000): boolean {
  const now = Date.now()
  const last = dedupeStore.get(key)
  if (last && last.message === message && now - last.ts < windowMs) {
    return false
  }
  dedupeStore.set(key, { message, ts: now })
  return true
}

// ---------------------------------------------------------------------------
// Notify helpers
// ---------------------------------------------------------------------------

export interface NotifyOptions {
  duration?: number
  description?: string
}

/**
 * Thin wrappers around sonner's `toast.*` functions that apply project-wide
 * defaults (duration, accent border classes) per Requirements 13.3–13.7.
 */
export const notify = {
  /**
   * Success toast — auto-dismisses after 3 000 ms (Req 13.3).
   * Left-border accent uses the `bullish` color token (Req 13.7).
   */
  success(message: string, opts?: NotifyOptions) {
    toast.success(message, {
      duration: opts?.duration ?? 3_000,
      description: opts?.description,
      classNames: { toast: 'border-l-4 border-l-bullish' },
    })
  },

  /**
   * Error toast — auto-dismisses after 6 000 ms (Req 13.4).
   * Left-border accent uses the `bearish` color token (Req 13.7).
   */
  error(message: string, opts?: NotifyOptions) {
    toast.error(message, {
      duration: opts?.duration ?? 6_000,
      description: opts?.description,
      classNames: { toast: 'border-l-4 border-l-bearish' },
    })
  },

  /**
   * Info toast — auto-dismisses after 3 000 ms (same as success per design).
   */
  info(message: string, opts?: NotifyOptions) {
    toast.info(message, {
      duration: opts?.duration ?? 3_000,
      description: opts?.description,
    })
  },
}
