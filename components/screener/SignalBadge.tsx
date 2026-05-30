'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import type { SignalDirection } from '@/lib/api/types/screener'

interface SignalBadgeProps {
  signal: SignalDirection | null | undefined
}

// Color + text label: color is NOT the only indicator (a11y requirement)
const SIGNAL_STYLES: Record<SignalDirection, string> = {
  BULLISH: 'bg-bullish/20 text-bullish border-bullish/30',
  BEARISH: 'bg-bearish/20 text-bearish border-bearish/30',
  NEUTRAL: 'bg-muted text-muted-foreground border-border',
}

export function SignalBadge({ signal }: SignalBadgeProps) {
  if (!signal) return <span className="text-muted-foreground">—</span>

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold uppercase tracking-wide',
        SIGNAL_STYLES[signal],
      )}
    >
      {signal}
    </Badge>
  )
}
