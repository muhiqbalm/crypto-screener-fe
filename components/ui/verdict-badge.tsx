import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * Global test verdict: Lolos / Gagal / Belum diuji. The ONLY place where the
 * backend's PASS/FAIL (and lolos_uji / gagal_uji / belum_diuji) become words.
 * components/lab/LabBadges re-exports this. Server-safe.
 */
export type Verdict = 'lolos' | 'gagal' | 'belum_diuji'

export type VerdictInput =
  | 'PASS'
  | 'FAIL'
  | 'pass'
  | 'fail'
  | 'lolos'
  | 'gagal'
  | 'LOLOS'
  | 'GAGAL'
  | 'lolos_uji'
  | 'gagal_uji'
  | 'belum_diuji'
  | 'UNTESTED'
  | null
  | undefined

/** PASS/lolos_uji → lolos, FAIL/gagal_uji → gagal, belum_diuji/UNTESTED → belum_diuji, anything else → null. */
export function normalizeVerdict(v: VerdictInput | string): Verdict | null {
  if (!v) return null
  const s = v.toLowerCase()
  if (s === 'pass' || s === 'lolos' || s === 'lolos_uji') return 'lolos'
  if (s === 'fail' || s === 'gagal' || s === 'gagal_uji') return 'gagal'
  if (s === 'belum_diuji' || s === 'untested') return 'belum_diuji'
  return null
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  lolos: 'Lolos',
  gagal: 'Gagal',
  belum_diuji: 'Belum diuji',
}

const STYLE: Record<Verdict, { Icon: typeof CheckCircle2; className: string }> = {
  lolos: { Icon: CheckCircle2, className: 'border-bullish/40 bg-bullish/10 text-bullish' },
  gagal: { Icon: XCircle, className: 'border-bearish/40 bg-bearish/10 text-bearish' },
  belum_diuji: { Icon: CircleDashed, className: 'border-border bg-muted/50 text-muted-foreground' },
}

export interface VerdictBadgeProps {
  verdict: VerdictInput | string
  size?: 'sm' | 'md'
  /** Shown when the verdict is missing/unknown (e.g. a run without a report). Default "—". */
  emptyLabel?: React.ReactNode
  className?: string
}

export function VerdictBadge({ verdict, size = 'sm', emptyLabel = '—', className }: VerdictBadgeProps) {
  const v = normalizeVerdict(verdict)
  if (!v) return <span className={cn('text-xs text-muted-foreground', className)}>{emptyLabel}</span>
  const s = STYLE[v]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-bold leading-4',
        size === 'md' ? 'h-8 px-3.5 text-sm [&_svg]:size-4' : 'h-7 px-3 text-2xs [&_svg]:size-3.5',
        s.className,
        className,
      )}
    >
      <s.Icon aria-hidden="true" />
      {VERDICT_LABEL[v]}
    </span>
  )
}
