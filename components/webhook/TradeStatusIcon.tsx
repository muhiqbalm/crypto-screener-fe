'use client'
import { Check, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TradeStatus } from '@/lib/api/types/trades'

export const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  success: 'Berhasil',
  failed: 'Gagal',
  rejected: 'Ditolak',
  pending: 'Menunggu',
}

interface TradeStatusIconProps {
  status: TradeStatus
  className?: string
}

/** Icon for a bot alert outcome; always shown next to its word (colour is never the only signal). */
export function TradeStatusIcon({ status, className }: TradeStatusIconProps) {
  if (status === 'success') {
    return <Check className={cn('h-4 w-4 text-bullish', className)} aria-hidden="true" />
  }
  if (status === 'failed' || status === 'rejected') {
    return <X className={cn('h-4 w-4 text-bearish', className)} aria-hidden="true" />
  }
  return <Clock className={cn('h-4 w-4 text-warn', className)} aria-hidden="true" />
}
