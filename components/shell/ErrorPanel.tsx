'use client'

import { ErrorState } from '@/components/shell/states'
import type { ApiErrorKind } from '@/lib/api/errors'

/** Back-compat wrapper around <ErrorState>. Prefer ErrorState in new code. */
export function ErrorPanel({
  kind,
  onRetry,
  messageOverride,
}: {
  kind: ApiErrorKind
  onRetry: () => void
  messageOverride?: string
}) {
  return <ErrorState kind={kind} onRetry={onRetry} message={messageOverride} />
}
