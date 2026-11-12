import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * One direction badge for the whole app: LONG / SHORT / NETRAL. Replaces
 * SignalBadge (BULLISH/BEARISH), BiasBadge and direction-only SideBadge uses.
 * Arrow icon + word, so colour is never the only signal. Server-safe.
 */
export type Direction = 'long' | 'short' | 'netral'

export type DirectionInput =
  | Direction
  | 'LONG'
  | 'SHORT'
  | 'NETRAL'
  | 'FLAT'
  | 'flat'
  | 'BULLISH'
  | 'BEARISH'
  | 'NEUTRAL'
  | 'buy'
  | 'sell'
  | 'BUY'
  | 'SELL'
  | 1
  | -1
  | 0
  | null
  | undefined

/** Maps every backend spelling to long / short / netral. */
export function normalizeDirection(v: DirectionInput | string | number): Direction {
  if (v === 1) return 'long'
  if (v === -1) return 'short'
  if (typeof v !== 'string') return 'netral'
  const s = v.toLowerCase()
  if (s === 'long' || s === 'bullish' || s === 'buy' || s === 'naik') return 'long'
  if (s === 'short' || s === 'bearish' || s === 'sell' || s === 'turun') return 'short'
  return 'netral'
}

const STYLE: Record<Direction, { label: string; Icon: typeof Minus; className: string }> = {
  long: { label: 'LONG', Icon: ArrowUpRight, className: 'border-bullish/35 bg-bullish/10 text-bullish' },
  short: { label: 'SHORT', Icon: ArrowDownRight, className: 'border-bearish/35 bg-bearish/10 text-bearish' },
  netral: { label: 'NETRAL', Icon: Minus, className: 'border-border bg-muted/50 text-muted-foreground' },
}

export interface DirectionBadgeProps {
  direction: DirectionInput | string | number
  /** Override the word (e.g. "condong long"); arrow and colour stay. */
  label?: React.ReactNode
  size?: 'xs' | 'sm' | 'md'
  /** Text only, no border/background (inside dense tables). */
  plain?: boolean
  className?: string
}

export function DirectionBadge({ direction, label, size = 'sm', plain, className }: DirectionBadgeProps) {
  const d = normalizeDirection(direction)
  const s = STYLE[d]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap font-mono font-bold tracking-wide',
        !plain && 'rounded-md border',
        size === 'xs' && 'text-3xs [&_svg]:size-2.5',
        size === 'xs' && !plain && 'px-1 py-px',
        size === 'sm' && 'text-2xs [&_svg]:size-3',
        size === 'sm' && !plain && 'px-1.5 py-0.5',
        size === 'md' && 'text-xs [&_svg]:size-3.5',
        size === 'md' && !plain && 'px-2 py-1',
        plain ? s.className.split(' ').filter((c) => c.startsWith('text-')).join(' ') : s.className,
        className,
      )}
    >
      <s.Icon aria-hidden="true" />
      {label ?? s.label}
    </span>
  )
}
