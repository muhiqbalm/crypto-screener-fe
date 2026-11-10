import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * Page layout primitives. Every route renders:
 *
 *   <PageContainer>
 *     <PageHeader title=… description=… actions=… />
 *     …sections…
 *   </PageContainer>
 *
 * so width, gutters, vertical rhythm and heading styles are identical
 * everywhere. Server-safe (no hooks): usable from server pages and client
 * views alike. Route tabs live in ./PageTabs (client). See DESIGN.md.
 */

const WIDTHS = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[1600px]',
} as const

export function PageContainer({
  children,
  width = 'default',
  className,
}: {
  children: React.ReactNode
  width?: keyof typeof WIDTHS
  className?: string
}) {
  return (
    <div className={cn('mx-auto w-full space-y-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8', WIDTHS[width], className)}>
      {children}
    </div>
  )
}

type Tone = 'brand' | 'lab' | 'info' | 'warn' | 'bearish'

const EYEBROW_TONE: Record<Tone, string> = {
  brand: 'text-brand',
  lab: 'text-lab',
  info: 'text-info',
  warn: 'text-warn',
  bearish: 'text-bearish',
}

export function PageHeader({
  title,
  description,
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  tone = 'brand',
  actions,
  children,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Small section label above the title, e.g. "Strategy Lab". */
  eyebrow?: string
  eyebrowIcon?: LucideIcon
  tone?: Tone
  /** Right-aligned controls (refresh, badges, primary action). */
  actions?: React.ReactNode
  /** Rendered under the title row — typically <PageTabs>. */
  children?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-4 border-b pb-5', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow && (
            <div className={cn('eyebrow flex items-center gap-1.5', EYEBROW_TONE[tone])}>
              {EyebrowIcon && <EyebrowIcon className="h-3.5 w-3.5" aria-hidden="true" />}
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-9">{title}</h1>
          {description && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

/** h2 + description used to title a group of cards inside a page. */
export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
