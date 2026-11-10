'use client'

import Link from 'next/link'
import { ChevronsUpDown, Loader2, LogOut, Moon, Settings, Sun } from 'lucide-react'
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
import { useSession } from '@/lib/utils/use-session'
import { useLogout } from '@/lib/queries/auth'

export function UserMenu() {
  const session = useSession()
  const logout = useLogout()
  const { resolvedTheme, setTheme } = useTheme()
  if (!session) return null

  const name = session.user?.name || session.user?.email?.split('@')[0] || 'Member'
  const initial = name.charAt(0).toUpperCase()
  // Role badge only when the backend actually returns a role.
  const role = session.user?.role?.trim() || null
  const isDark = resolvedTheme !== 'light'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        aria-label="Menu akun"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-brand/30 bg-brand/15 font-mono text-xs font-bold text-brand">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-xs font-semibold sm:inline">{name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{name}</span>
            {role && <Badge variant="brand" size="xs">{role.replace(/_/g, ' ')}</Badge>}
          </div>
          <div className="truncate text-xs font-normal text-muted-foreground">{session.user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" />
            Pengaturan akun &amp; API
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
  )
}
