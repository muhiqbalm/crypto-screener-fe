import { cn } from '@/lib/utils/cn'
import { TONE_VAR, type Tone } from '@/components/ui/tone'

/**
 * Cards v2. Plain `Panel` for normal content; `HeroCard` for the one or two
 * things a page is about: thin gradient border, optional glass and a soft
 * glow behind the key number. Clickable cards lift on hover.
 *
 *   <BentoGrid>
 *     <HeroCard span={2} glow="bullish" interactive>…</HeroCard>
 *     <Panel>…</Panel>
 *   </BentoGrid>
 */

const SPAN: Record<1 | 2 | 3, string> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 xl:col-span-3',
}

const ROW_SPAN: Record<1 | 2, string> = { 1: '', 2: 'xl:row-span-2' }

interface CardBaseProps {
  /** Bento columns this card spans (md+). */
  span?: 1 | 2 | 3
  rowSpan?: 1 | 2
  /** Lift + stronger border on hover (only for whole-card links/buttons). */
  interactive?: boolean
  as?: 'section' | 'div' | 'article'
  className?: string
  children: React.ReactNode
  'aria-label'?: string
  'aria-labelledby'?: string
}

/** Normal content card: rounded-3xl, thin border, 24px padding. */
export function Panel({ span = 1, rowSpan = 1, interactive, as: Tag = 'section', className, children, ...aria }: CardBaseProps) {
  return (
    <Tag
      {...aria}
      className={cn(
        'min-w-0 rounded-3xl border bg-card p-5 text-card-foreground sm:p-6',
        SPAN[span],
        ROW_SPAN[rowSpan],
        interactive && 'lift hover:border-brand/40',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/** Hero card: gradient border, optional glass, optional glow (tone) behind the content. */
export function HeroCard({
  span = 1,
  rowSpan = 1,
  interactive,
  glass = true,
  glow,
  as: Tag = 'section',
  className,
  children,
  ...aria
}: CardBaseProps & {
  /** Semi-transparent blurred background (hero cards only). Default true. */
  glass?: boolean
  /** Soft colour glow in the top-right corner behind the key number. */
  glow?: Tone
}) {
  return (
    <Tag
      {...aria}
      className={cn(
        'ring-gradient min-w-0 overflow-hidden rounded-3xl p-5 text-card-foreground sm:p-6',
        glass ? 'glass' : 'bg-card',
        SPAN[span],
        ROW_SPAN[rowSpan],
        interactive && 'lift',
        className,
      )}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: TONE_VAR[glow] }}
        />
      )}
      {children}
    </Tag>
  )
}

/**
 * Bento grid: 1 column on phones, 2 on tablets, 3 on wide screens; cards
 * choose their `span`. Prefer one big hero + smaller supporting cards over a
 * row of identical cards.
 */
export function BentoGrid({ cols = 3, className, children }: { cols?: 2 | 3; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6', cols === 3 && 'xl:grid-cols-3', className)}>{children}</div>
  )
}
