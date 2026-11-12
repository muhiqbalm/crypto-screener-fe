import { cn } from '@/lib/utils/cn'
import { TONE_BG, TONE_TEXT, type Tone } from '@/components/ui/tone'

/**
 * Status dot. `pulse` adds a soft ring for things that are live right now
 * (stops under prefers-reduced-motion). Always pair it with a word: the
 * optional `label` is read by screen readers.
 */
export function LiveDot({
  tone = 'bullish',
  pulse = true,
  size = 'md',
  label,
  className,
}: {
  tone?: Tone
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Screen-reader text, e.g. "live". */
  label?: string
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center', TONE_TEXT[tone], className)}>
      <span
        aria-hidden="true"
        className={cn(
          'rounded-full',
          TONE_BG[tone],
          size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-3 w-3' : 'h-2 w-2',
          pulse && 'animate-live-pulse',
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
