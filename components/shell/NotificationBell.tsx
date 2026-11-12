'use client'

import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { formatAge } from '@/lib/utils/time'
import { NOTIF_TYPE_LABEL, safeNotificationLink, unreadBadge } from '@/lib/lab/report'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/lib/queries/report'
import type { LabNotification, NotificationType } from '@/lib/api/types/report'

/**
 * In-web notifications for Lab admins (job finished, paper preset trades, Signal Ledger
 * verdict changes, deploys, weekly report). Polls every 60 s, paused while the tab is hidden.
 * Rendered only for admins (inside the User Hub capsule); any API error just hides the count.
 */
export function NotificationBell({ className }: { className?: string } = {}) {
  const router = useRouter()
  const { data, isError, isLoading } = useNotifications()
  const markOne = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const unread = isError ? null : unreadBadge(data?.unread)
  const items = data?.items ?? []

  function open(n: LabNotification) {
    if (!n.read) markOne.mutate(n.id)
    const href = safeNotificationLink(n.link)
    if (href) router.push(href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread && (
          <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bearish px-1 text-3xs font-bold text-bearish-foreground">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-sm font-semibold">Notifikasi</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              markAll.mutate()
            }}
            disabled={!data?.unread || markAll.isPending}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-medium text-info hover:bg-info/10 disabled:cursor-default disabled:opacity-40 cursor-pointer"
          >
            {markAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-3 w-3" aria-hidden="true" />}
            Tandai semua sudah dibaca
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Memuat…</p>
          ) : isError ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Notifikasi tidak bisa dimuat.</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => open(n)}
                className={cn('flex-col items-start gap-0.5 px-3 py-2', !n.read && 'bg-info/[0.06]')}
              >
                <div className="flex w-full items-center gap-2">
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-info" aria-label="belum dibaca" />}
                  <Badge variant="muted" size="xs">
                    {NOTIF_TYPE_LABEL[n.type as NotificationType] ?? n.type}
                  </Badge>
                  <span className="ml-auto shrink-0 text-3xs text-muted-foreground">{formatAge(n.created_at)}</span>
                </div>
                <span className={cn('w-full text-xs', n.read ? 'text-muted-foreground' : 'font-semibold')}>{n.title}</span>
                {n.body && <span className="line-clamp-2 w-full text-2xs text-muted-foreground">{n.body}</span>}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
