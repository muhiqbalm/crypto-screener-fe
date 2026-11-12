'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { HUB_TABS, isNavItemActive, type HubId, type HubTab } from '@/lib/nav'

export interface HubTabsProps {
  /** A hub from lib/nav.ts HUB_TABS ('uji' | 'hasil' | 'paper' | 'koin') … */
  hub?: HubId
  /** … or your own tabs (max 3). */
  items?: readonly HubTab[]
  /**
   * Active tab `value` for query-string views (e.g. /koin?view=terkuat): the
   * page reads its search params and passes the value. Without it the active
   * tab is derived from the pathname.
   */
  value?: string
  /** Accessible name, e.g. "Tampilan Peluang koin". */
  label: string
  className?: string
}

/**
 * Sub-tabs of one page (max. 3). Links, so every tab has its own URL.
 * ≥ 640 px: underline tabs. < 640 px: a full-width segmented control (all
 * tabs visible, no sideways scrolling).
 */
export function HubTabs({ hub, items, value, label, className }: HubTabsProps) {
  const pathname = usePathname()
  const all: readonly HubTab[] = items ?? (hub ? HUB_TABS[hub] : [])
  const tabs = all.slice(0, 3)
  if (process.env.NODE_ENV !== 'production' && all.length > 3) {
    console.warn(`HubTabs "${label}": max 3 sub-tabs, the rest are hidden.`)
  }
  if (tabs.length === 0) return null

  const isActive = (t: HubTab) => (value !== undefined ? t.value === value : isNavItemActive(t, pathname))

  return (
    <nav aria-label={label} className={className}>
      {/* phones: segmented */}
      <div
        className="grid gap-1 rounded-full border bg-muted/60 p-1 sm:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => {
          const active = isActive(t)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.icon && <t.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{t.label}</span>
            </Link>
          )
        })}
      </div>
      {/* ≥ sm: underline tabs */}
      <div className="hidden w-fit gap-1 rounded-full border bg-muted/60 p-1 sm:flex">
        {tabs.map((t) => {
          const active = isActive(t)
          return (
            <Link
              key={t.href}
              href={t.href}
              title={t.hint}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {t.icon && <t.icon className="h-4 w-4" aria-hidden="true" />}
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
