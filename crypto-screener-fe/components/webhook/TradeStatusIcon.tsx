'use client'
import { Check, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TradeStatus } from '@/lib/api/types/trades'

interface TradeStatusIconProps {
  status: TradeStatus
  className?: string
}

export function TradeStatusIcon({ status, className }: TradeStatusIconProps) {
  if (status === 'success') {
    return <Check className={cn('h-4 w-4 text-bullish', className)} aria-label="Success" />
  }
  if (status === 'failed' || status === 'rejected') {
    return <X className={cn('h-4 w-4 text-bearish', className)} aria-label="Failed" />
  }
  return <Clock className={cn('h-4 w-4 text-amber-400', className)} aria-label="Pending" />
}
