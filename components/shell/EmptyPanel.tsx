'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shell/states'

/** Back-compat wrapper around <EmptyState>. Prefer EmptyState in new code. */
export function EmptyPanel({ message, ctaLabel, onCta }: { message: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <EmptyState
      title={message}
      className="border-0"
      action={
        ctaLabel && onCta ? (
          <Button variant="outline" size="sm" onClick={onCta}>
            {ctaLabel}
          </Button>
        ) : undefined
      }
    />
  )
}
