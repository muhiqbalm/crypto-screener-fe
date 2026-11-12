'use client'

import { Badge } from '@/components/ui/badge'
import { TIER_HINT, TIER_TEXT } from '@/lib/screener/factors'
import type { TierClass } from '@/lib/api/types/screener'

interface TierBadgeProps {
  tier: TierClass | null | undefined
}

const TONE: Record<TierClass, 'info' | 'muted' | 'warn'> = { A: 'info', B: 'muted', C: 'warn' }

/** Tier = which third of the coins by score (relative). Text label, never colour alone. */
export function TierBadge({ tier }: TierBadgeProps) {
  if (!tier) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant={TONE[tier]} size="sm" title={TIER_HINT}>
      {TIER_TEXT[tier].replace('Kelompok ', '')}
    </Badge>
  )
}
