'use client'

import Link from 'next/link'
import { ChevronDown, Loader2, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/shell/NotificationBell'
import { useSystemStatus } from '@/components/shell/system-status'
import { cn } from '@/lib/utils/cn'
import { useSession } from '@/lib/utils/use-session'
import { useLogout } from '@/lib/queries/auth'

/**
 * User Hub: ONE capsule top-right (team rule) with
 *  - notifications (bell + unread count; admins: the feed lives in the Lab),
 *  - the account menu: name & role, system status, "Akun & koneksi"
 *    (/settings), light/dark theme, logout.
 * A coloured dot + hidden text on the avatar warns when the system is not
 * normal; the words are inside the menu.
 */
export function UserHub({ isAdmin }: { isAdmin: boolean }) {
  const session = useSession()
  const logout = useLogout()
  const { resolvedTheme, setTheme } = useTheme()
  const status = useSystemStatus()
  if (!session) return null

  const name = session.user?.name || session.user?.email?.split('@')[0] || 'Anggota'
  const initial = name.charAt(0).toUpperCase()
  const role = session.user?.role?.trim() || (isAdmin ? 'admin' : null)
  const isDark = resolvedTheme !== 'light'

  return (
    <div className="flex items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-xs">
      {isAdmin && <NotificationBell className="h-8 w-8 rounded-full" />}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex cursor-pointer items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Menu akun${status.attention ? `, ${status.label}` : ''}`}
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-brand/30 bg-brand/15 font-mono text-xs font-bold text-brand">
            {initial}
            {status.attention && (
              <span
                className={cn('absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card', status.dotClass)}
                aria-hidden="true"
              />
            )}
          </span>
          <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:inline">{name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-1.5rem)]">
          <DropdownMenuLabel>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold">{name}</span>
              {role && (
                <Badge variant="brand" size="xs">
                  {role.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <div className="truncate text-xs font-normal text-muted-foreground">{session.user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5" role="status" aria-live="polite">
            <p className="eyebrow mb-1">Status sistem</p>
            <p className="flex items-center gap-2 text-sm">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', status.dotClass)} aria-hidden="true" />
              {status.label}
            </p>
            {status.detail && <p className="num mt-0.5 pl-4 text-2xs text-muted-foreground">{status.detail}</p>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings aria-hidden="true" />
              Akun &amp; koneksi
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setTheme(isDark ? 'light' : 'dark')
            }}
          >
            {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {isDark ? 'Tema terang' : 'Tema gelap'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-bearish focus:bg-bearish/10 focus:text-bearish [&_svg]:text-bearish"
          >
            {logout.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
