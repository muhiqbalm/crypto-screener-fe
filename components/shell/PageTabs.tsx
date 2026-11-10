'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { isNavItemActive, type NavItem } from '@/lib/nav'

/**
 * Route-based tab strip (e.g. Strategy Lab sub-pages). Items come from lib/nav.ts.
 * Items hold icon components, so render this from a client component (they
 * cannot cross the server→client boundary as props).
 */
export function PageTabs({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="-mb-5 flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = isNavItemActive(item, pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors',
              active
                ? 'border-brand text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
