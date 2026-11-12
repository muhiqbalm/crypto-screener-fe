'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SIGNAL_TEXT, SIGNAL_TONE } from '@/lib/screener/factors'
import type { SignalDirection } from '@/lib/api/types/screener'

interface SignalBadgeProps {
  signal: SignalDirection | null | undefined
}

/** Screener signal as a plain word (naik / turun / netral) + icon: colour is never the only cue. */
export function SignalBadge({ signal }: SignalBadgeProps) {
  if (!signal) return <span className="text-muted-foreground">—</span>
  const Icon = signal === 'BULLISH' ? ArrowUpRight : signal === 'BEARISH' ? ArrowDownRight : Minus
  return (
    <Badge variant={SIGNAL_TONE[signal]} size="sm" title="Sinyal screener: arah skor saat ini, bukan perintah beli/jual">
      <Icon aria-hidden="true" />
      {SIGNAL_TEXT[signal]}
    </Badge>
  )
}
