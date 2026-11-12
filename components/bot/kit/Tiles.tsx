import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * Local "deck" building blocks for the W2b pages (Status bot, market pages, live pages):
 * big hero card, KPI tile and section title. Temporary until the shared v2 primitives from
 * feat/ui-v2-foundation land; same look, swapped by import when they do.
 */

export const TONE_TEXT = {
  ok: 'text-bullish',
  warn: 'text-warn',
  bad: 'text-bearish',
  info: 'text-info',
  muted: 'text-muted-foreground',
  plain: 'text-foreground',
} as const
export type Tone = keyof typeof TONE_TEXT

const ICON_BG: Record<Tone, string> = {
  ok: 'bg-bullish/12 text-bullish',
  warn: 'bg-warn/12 text-warn',
  bad: 'bg-bearish/12 text-bearish',
  info: 'bg-info/12 text-info',
  muted: 'bg-muted text-muted-foreground',
  plain: 'bg-muted text-foreground',
}

export function IconBadge({ icon: Icon, tone = 'info', className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', ICON_BG[tone], className)}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  )
}

/** Hero card: gradient border, soft glow, more room. One per page section at most. */
export function HeroCard({
  children,
  className,
  glow = 'info',
  as: As = 'section',
  ...rest
}: {
  children: React.ReactNode
  className?: string
  glow?: Tone
  as?: 'section' | 'div'
} & React.HTMLAttributes<HTMLElement>) {
  const glowBg = { ok: 'bg-bullish/20', warn: 'bg-warn/20', bad: 'bg-bearish/20', info: 'bg-info/20', muted: 'bg-muted/40', plain: 'bg-info/15' }[glow]
  return (
    <As
      {...rest}
      className={cn('relative rounded-3xl bg-gradient-to-br from-info/50 via-lab/30 to-brand/30 p-px shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]', className)}
    >
      <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-card/95 p-6 backdrop-blur sm:p-7">
        <div className={cn('pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl', glowBg)} aria-hidden="true" />
        <div className="relative h-full">{children}</div>
      </div>
    </As>
  )
}

/** Big-number tile: icon + short title, the number, one line, optional link. */
export function KpiTile({
  icon,
  title,
  value,
  tone = 'plain',
  hint,
  href,
  hrefLabel = 'Lihat',
  children,
  className,
  iconTone,
}: {
  icon: LucideIcon
  title: React.ReactNode
  value: React.ReactNode
  tone?: Tone
  hint?: React.ReactNode
  href?: string
  hrefLabel?: string
  children?: React.ReactNode
  className?: string
  iconTone?: Tone
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-3xl border border-border/70 bg-card p-6 transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <IconBadge icon={icon} tone={iconTone ?? (tone === 'plain' ? 'info' : tone)} />
        <p className="min-w-0 text-[15px] font-semibold leading-snug text-muted-foreground">{title}</p>
      </div>
      <div className={cn('num text-[32px] font-bold leading-none tracking-tight sm:text-[36px]', TONE_TEXT[tone])}>{value}</div>
      {hint && <p className="text-[14px] leading-snug text-muted-foreground">{hint}</p>}
      {children}
      {href && (
        <Link href={href} className="mt-auto inline-flex items-center gap-1 text-[14px] font-semibold text-info hover:underline">
          {hrefLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

/** Section heading at deck size: icon, 20–22px title, one short line, optional controls. */
export function SectionTitle({
  icon,
  title,
  sub,
  action,
  id,
}: {
  icon: LucideIcon
  title: React.ReactNode
  sub?: React.ReactNode
  action?: React.ReactNode
  id?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <IconBadge icon={icon} />
        <div className="min-w-0">
          <h2 id={id} className="text-[20px] font-bold leading-tight tracking-tight sm:text-[22px]">
            {title}
          </h2>
          {sub && <p className="mt-0.5 text-[14px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

/** Plain content card at deck size (rounded-3xl, 24px padding). */
export function DeckCard({ children, className, ...rest }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('min-w-0 rounded-3xl border border-border/70 bg-card p-6', className)}>
      {children}
    </div>
  )
}

/** Large status pill (13px, roomy, icon + word). */
export function BigPill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const cls = {
    ok: 'border-bullish/35 bg-bullish/12 text-bullish',
    warn: 'border-warn/40 bg-warn/12 text-warn',
    bad: 'border-bearish/40 bg-bearish/12 text-bearish',
    info: 'border-info/35 bg-info/12 text-info',
    muted: 'border-border bg-muted/60 text-muted-foreground',
    plain: 'border-border bg-muted/60 text-foreground',
  }[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-bold [&_svg]:h-4 [&_svg]:w-4', cls, className)}>
      {children}
    </span>
  )
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[14px] font-semibold text-info hover:underline">
      {children} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}
