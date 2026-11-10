'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { NAV_GROUPS, isNavItemActive } from '@/lib/nav'

/** Grouped navigation list, shared by the desktop sidebar and mobile drawer. */
export function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const groups = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin)

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-0.5">
          <div className="eyebrow px-3 pb-1.5">{group.label}</div>
          {group.items.map((item) => {
            const active = isNavItemActive(item, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={item.hint}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" />
                )}
                <Icon
                  className={cn('h-4 w-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
