'use client'

import * as React from 'react'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'

export interface InfoTipProps {
  /** The explanation (one or two plain sentences). */
  children: React.ReactNode
  /** Bold first line inside the popover, usually the term's label. */
  title?: React.ReactNode
  /**
   * Accessible name of the trigger button, e.g. "Apa itu holdout?".
   * Default: "Penjelasan" (+ title when it is a string).
   */
  label?: string
  /** Custom trigger content (text, badge…) instead of the (i) icon. Rendered inside a button. */
  trigger?: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
  /** Classes for the popover panel. */
  contentClassName?: string
}

/**
 * Tap/click explanation. Replaces `title=` for anything a user needs to read:
 * `title` only shows on hover, so it never works on phones.
 *
 *   <InfoTip title="Data baru (holdout)">±20% data paling baru yang dikunci…</InfoTip>
 *
 * The trigger is a real <button> (keyboard + screen reader). The icon is
 * 14 px but the hit area is 24 px.
 */
export function InfoTip({ children, title, label, trigger, side = 'top', align = 'center', className, contentClassName }: InfoTipProps) {
  const name = label ?? (typeof title === 'string' ? `Penjelasan: ${title}` : 'Penjelasan')
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={trigger ? undefined : name}
        className={cn(
          trigger
            ? 'inline-flex cursor-help items-center gap-1 rounded-sm underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 hover:decoration-foreground'
            : '-m-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        {trigger ?? <Info className="h-3.5 w-3.5" aria-hidden="true" />}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className={cn('space-y-1 text-xs leading-relaxed', contentClassName)}>
        {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
        <div className="text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  )
}
