'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { SIGNAL_TEXT } from '@/lib/screener/factors'
import { termLabel } from '@/lib/glossary'
import { cn } from '@/lib/utils/cn'
import type { SignalDirection } from '@/lib/api/types/screener'

interface SignalBadgeProps {
  signal: SignalDirection | null | undefined
}

/**
 * Screener score direction as a plain word (naik / turun / netral) + small arrow.
 * Outline chip on purpose: it must never look like the strategy's filled LONG/SHORT pill
 * (audit 2026-11-13 P7). Only the arrow carries colour.
 */
export function SignalBadge({ signal }: SignalBadgeProps) {
  if (!signal) return <span className="text-muted-foreground">—</span>
  const Icon = signal === 'BULLISH' ? ArrowUpRight : signal === 'BEARISH' ? ArrowDownRight : Minus
  return (
    <span
      title={`${termLabel('screener_signal')}: bukan posisi strategi (LONG/SHORT)`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border px-2.5 py-0.5 text-2xs font-medium text-foreground"
    >
      <Icon
        aria-hidden="true"
        className={cn('h-3.5 w-3.5', signal === 'BULLISH' ? 'text-bullish' : signal === 'BEARISH' ? 'text-bearish' : 'text-muted-foreground')}
      />
      {SIGNAL_TEXT[signal]}
    </span>
  )
}
