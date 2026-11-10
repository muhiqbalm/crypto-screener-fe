'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import type { TierClass } from '@/lib/api/types/screener'

interface TierBadgeProps {
  tier: TierClass | null | undefined
}

// Discrete shades distinct from bullish (green) and bearish (red).
// Color + text label: color is NOT the only indicator (a11y requirement).
const TIER_STYLES: Record<TierClass, string> = {
  A: 'bg-info/20 text-info border-info/30',
  B: 'bg-warn/20 text-warn border-warn/30',
  C: 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30',
}

export function TierBadge({ tier }: TierBadgeProps) {
  if (!tier) return <span className="text-muted-foreground">—</span>

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-semibold', TIER_STYLES[tier])}
    >
      Tier {tier}
    </Badge>
  )
}
