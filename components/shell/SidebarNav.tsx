'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { StatusPill } from '@/components/ui/status-pill'
import { isNavItemActive, navForRole, type NavItem } from '@/lib/nav'

export type AdminCheck = 'admin' | 'member' | 'loading' | 'error'

function Item({
  item,
  pathname,
  showHint,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  showHint: boolean
  onNavigate?: () => void
}) {
  const active = isNavItemActive(item, pathname)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={showHint ? undefined : item.hint}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-start gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" />}
      <Icon
        className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground')}
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="block truncate">{item.label}</span>
        {showHint && item.hint && (
          <span className="block text-2xs font-normal leading-snug text-muted-foreground">{item.hint}</span>
        )}
      </span>
    </Link>
  )
}

/**
 * Menu shared by the desktop sidebar and the phone drawer: Beranda, then the
 * Pasar and Bot & Strategi clusters (sub-groups carry a LIVE / PAPER pill).
 * `showHints` prints each item's one-line hint (drawer: there is no hover on
 * phones). When the admin check failed (network/server), the admin items are
 * hidden and a retry notice explains why, instead of silently dropping them.
 */
export function SidebarNav({
  isAdmin,
  adminCheck,
  onRetryAdmin,
  onNavigate,
  showHints = false,
}: {
  isAdmin: boolean
  adminCheck?: AdminCheck
  onRetryAdmin?: () => void
  onNavigate?: () => void
  showHints?: boolean
}) {
  const pathname = usePathname()
  const { home, clusters } = navForRole(isAdmin)

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <Item item={home} pathname={pathname} showHint={showHints} onNavigate={onNavigate} />
      </div>
      {clusters.map((cluster) => (
        <div key={cluster.id} className="flex flex-col gap-2">
          <div className="eyebrow px-3">{cluster.label}</div>
          {cluster.sections.map((section) => (
            <div key={section.id} className="flex flex-col gap-0.5">
              {section.label && (
                <div className="flex items-center justify-between gap-2 px-3 pb-0.5 pt-1">
                  <span className="truncate text-2xs font-medium text-muted-foreground">{section.label}</span>
                  {section.mode && <StatusPill kind={section.mode} size="xs" />}
                </div>
              )}
              {section.items.map((item) => (
                <Item key={item.href} item={item} pathname={pathname} showHint={showHints} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </div>
      ))}
      {adminCheck === 'error' && (
        <div role="status" className="mx-1 space-y-1.5 rounded-lg border border-warn/40 bg-warn/10 p-2.5 text-2xs text-foreground">
          <p className="flex items-start gap-1.5">
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
            Akses menu admin tidak bisa dicek ke server, jadi menu Strategi disembunyikan dulu.
          </p>
          {onRetryAdmin && (
            <button
              type="button"
              onClick={onRetryAdmin}
              className="inline-flex cursor-pointer items-center gap-1 rounded font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Coba lagi
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
