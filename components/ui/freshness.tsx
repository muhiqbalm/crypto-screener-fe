'use client'

import { Clock, TriangleAlert } from 'lucide-react'
import { useNow } from '@/components/ui/use-now'
import { formatAge, formatTime, nextCandleClose, toDate, type TimeInput } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'

export interface FreshnessProps {
  /** Time of the data itself, e.g. the 4H candle close the numbers are based on. */
  dataAt?: TimeInput
  /** Label before `dataAt`. Default "Data". Example: "Data close 4H". */
  dataLabel?: string
  /** When the backend (or the page) last refreshed. Shown as "diperbarui 3 mnt lalu". */
  updatedAt?: TimeInput
  /** When the next update is expected. Overrides `timeframe`. */
  nextAt?: TimeInput
  /**
   * Candle timeframe ("4h"): computes the next close + `nextDelayMin` when
   * `nextAt` is not given. "berikutnya ±12:02 WIB".
   */
  timeframe?: string
  /** Minutes after the candle close the job usually finishes. Default 2. */
  nextDelayMin?: number
  /** Mark the data as late (warn icon + "terlambat"). */
  stale?: boolean
  className?: string
}

/**
 * One line that says how fresh the numbers are:
 * "Data close 4H 12 Nov 08:00 WIB · diperbarui 3 mnt lalu · berikutnya ±12:02 WIB".
 * Ages tick every minute. Missing parts are left out; nothing at all → nothing rendered.
 */
export function Freshness({
  dataAt,
  dataLabel = 'Data',
  updatedAt,
  nextAt,
  timeframe,
  nextDelayMin = 2,
  stale,
  className,
}: FreshnessProps) {
  const now = useNow(30_000)
  const parts: string[] = []
  if (toDate(dataAt)) parts.push(`${dataLabel} ${formatTime(dataAt, { now: now ?? undefined })}`)
  if (toDate(updatedAt) && now !== null) parts.push(`diperbarui ${formatAge(updatedAt, { now })}`)

  let next: Date | null = toDate(nextAt)
  if (!next && timeframe && now !== null) {
    const close = nextCandleClose(timeframe, now)
    next = close ? new Date(close.getTime() + nextDelayMin * 60_000) : null
  }
  if (next) parts.push(`berikutnya ±${formatTime(next, { date: false })}`)

  if (parts.length === 0) return null
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-2xs text-muted-foreground', stale && 'text-warn', className)}>
      {stale ? <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden="true" /> : <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {stale && <span className="font-semibold">Data terlambat ·</span>}
      <span className="num">{parts.join(' · ')}</span>
    </p>
  )
}
