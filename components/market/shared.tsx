'use client'

/**
 * Small Peluang koin helper that has no app-wide equivalent: a folded block for
 * method, track record and other "lihat bukti" content (answer first, method folded).
 * Everything else comes from the shared shell/ui components.
 */
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function Fold({ title, children, defaultOpen = false, className }: {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <details open={defaultOpen} className={cn('group rounded-xl border bg-card', className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t px-4 pb-4 pt-3 sm:px-5">{children}</div>
    </details>
  )
}
