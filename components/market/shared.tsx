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
    <details open={defaultOpen} className={cn('group rounded-3xl border bg-card', className)}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="border-t px-5 pb-5 pt-4 text-[15px] sm:px-6">{children}</div>
    </details>
  )
}
