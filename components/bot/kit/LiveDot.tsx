import { cn } from '@/lib/utils/cn'

const TONE = { ok: 'bg-bullish', warn: 'bg-warn', bad: 'bg-bearish', info: 'bg-info', off: 'bg-muted-foreground/50' } as const
export type LiveTone = keyof typeof TONE

/** Pulsing status dot ("● Live"). The pulse stops for prefers-reduced-motion and when tone is off. */
export function LiveDot({ tone = 'ok', className, label }: { tone?: LiveTone; className?: string; label?: string }) {
  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5 shrink-0', className)} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {tone !== 'off' && <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping', TONE[tone])} />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', TONE[tone])} />
    </span>
  )
}
