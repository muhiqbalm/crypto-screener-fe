'use client'

import { cn } from '@/lib/utils/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

/**
 * Segmented control (2–6 mutually exclusive options). Each option is a
 * toggle button with aria-pressed; wrap with a visible label or pass
 * `aria-label`.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  className,
  'aria-label': ariaLabel,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'xs' | 'sm'
  className?: string
  'aria-label'?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex gap-0.5 rounded-lg border bg-muted/40 p-0.5', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5',
              size === 'xs' ? 'h-6 px-2 text-2xs' : 'h-7 px-3 text-xs',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
