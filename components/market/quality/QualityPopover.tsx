'use client'

/**
 * The skor pill as a tap/click trigger that opens the breakdown in a popover (works on phones,
 * keyboard and screen readers: a real button, Escape closes, focus returns).
 */
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { QualityPill, type GradeSize } from '@/components/market/quality/GradeLetter'
import { QualityBreakdown } from '@/components/market/quality/QualityBreakdown'
import { GRADE_LABEL, isGrade } from '@/lib/lab/quality'
import { cn } from '@/lib/utils/cn'
import type { OutlookKualitas } from '@/lib/api/types/quality'

/**
 * The pill as a button: click / tap / Enter opens the breakdown in a popover. Put
 * `className="relative z-10"` on it when it sits on a card with a stretched link.
 */
export function QualityPopover({ q, size = 'sm', showLabel = true, align = 'start', className, symbol }: {
  q: OutlookKualitas | null | undefined
  size?: GradeSize
  showLabel?: boolean
  align?: 'start' | 'center' | 'end'
  className?: string
  /** coin label for the accessible name ("Rincian skor ETH") */
  symbol?: string
}) {
  if (!q) return null
  const g = isGrade(q.grade) ? q.grade : null
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={`Rincian skor${symbol ? ` ${symbol}` : ''}: ${g ? `${g}, ${GRADE_LABEL[g].toLowerCase()}` : 'tidak dinilai'}`}
        className={cn(
          'inline-flex min-h-10 cursor-pointer items-center rounded-2xl pr-2 transition-colors hover:bg-muted/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted/50',
          className,
        )}
      >
        <QualityPill q={q} size={size} showLabel={showLabel} />
      </PopoverTrigger>
      <PopoverContent align={align} collisionPadding={12}
        className="max-h-[min(var(--radix-popover-content-available-height),40rem)] w-[23rem] overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-5">
        <QualityBreakdown q={q} />
      </PopoverContent>
    </Popover>
  )
}
