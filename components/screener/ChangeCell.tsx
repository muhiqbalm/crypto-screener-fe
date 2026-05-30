'use client'

import { formatPercent } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface ChangeCellProps {
  value: number | null | undefined
  fractionDigits?: number
}

export function ChangeCell({ value, fractionDigits = 2 }: ChangeCellProps) {
  const formatted = formatPercent(value, fractionDigits)

  if (formatted === '—') {
    return <span className="text-muted-foreground">—</span>
  }

  const colorClass =
    value! > 0
      ? 'text-bullish'
      : value! < 0
        ? 'text-bearish'
        : ''

  return (
    <span className={cn('font-mono tabular-nums', colorClass)}>
      {formatted}
    </span>
  )
}
