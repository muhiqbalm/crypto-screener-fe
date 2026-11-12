'use client'

/**
 * Skor kualitas sinyal: the letter (A–D) as a rounded tile and the letter + word as a pill.
 * Never colour alone: the letter and the word are always there.
 */
import { GRADE_LABEL, GRADE_TONE, isGrade } from '@/lib/lab/quality'
import { cn } from '@/lib/utils/cn'
import type { OutlookKualitas, StoredGrade } from '@/lib/api/types/quality'

const SIZE = {
  xs: 'h-6 w-6 rounded-md text-xs',
  sm: 'h-7 w-7 rounded-lg text-sm',
  md: 'h-9 w-9 rounded-xl text-lg',
  lg: 'h-12 w-12 rounded-2xl text-2xl',
  xl: 'h-16 w-16 rounded-2xl text-4xl',
} as const

const TONE = {
  bullish: 'border-bullish/40 bg-bullish/15 text-bullish',
  info: 'border-info/40 bg-info/15 text-info',
  warn: 'border-warn/40 bg-warn/15 text-warn',
  bearish: 'border-bearish/40 bg-bearish/15 text-bearish',
} as const

export type GradeSize = keyof typeof SIZE

/** The letter tile. `grade` '-' / null → a muted dash ("tidak dinilai"). */
export function GradeLetter({ grade, size = 'md', className, decorative = false }: {
  grade: StoredGrade | undefined
  size?: GradeSize
  className?: string
  /** true when a visible label next to it already names the grade */
  decorative?: boolean
}) {
  const g = isGrade(grade) ? grade : null
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : g ? `Skor ${g}, ${GRADE_LABEL[g].toLowerCase()}` : 'Tidak dinilai'}
      className={cn(
        'display inline-flex shrink-0 items-center justify-center border font-bold leading-none tabular-nums',
        SIZE[size],
        g ? TONE[GRADE_TONE[g] as keyof typeof TONE] : 'border-border bg-muted/60 text-muted-foreground',
        className,
      )}
    >
      {g ?? '–'}
    </span>
  )
}

/** Letter + word ("A Bukti kuat"), not interactive. */
export function QualityPill({ q, size = 'sm', showLabel = true, className }: {
  q: OutlookKualitas | null | undefined
  size?: GradeSize
  showLabel?: boolean
  className?: string
}) {
  if (q === undefined) return null
  const g = q && isGrade(q.grade) ? q.grade : null
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <GradeLetter grade={g} size={size} decorative={showLabel} />
      {showLabel && (
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-2xs text-muted-foreground">Skor</span>
          <span className="block text-sm font-semibold">{g ? GRADE_LABEL[g] : 'Tidak dinilai'}</span>
        </span>
      )}
    </span>
  )
}
