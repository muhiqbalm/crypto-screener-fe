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
        className="grid gap-0.5 rounded-lg border bg-muted/40 p-0.5 sm:hidden"
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
                'flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.icon && <t.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span className="truncate">{t.label}</span>
            </Link>
          )
        })}
      </div>
      {/* ≥ sm: underline tabs */}
      <div className="hidden gap-1 border-b sm:flex">
        {tabs.map((t) => {
          const active = isActive(t)
          return (
            <Link
              key={t.href}
              href={t.href}
              title={t.hint}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px inline-flex shrink-0 items-center gap-1.5 rounded-t-sm border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
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
