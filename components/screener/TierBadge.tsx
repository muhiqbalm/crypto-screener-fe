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
  A: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  B: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  C: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
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
