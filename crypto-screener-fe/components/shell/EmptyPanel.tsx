'use client'

import { Button } from '@/components/ui/button'

interface EmptyPanelProps {
  message: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyPanel({ message, ctaLabel, onCta }: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {ctaLabel && onCta && (
        <Button
          variant="outline"
          onClick={onCta}
          className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
