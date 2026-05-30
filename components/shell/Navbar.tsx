'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Webhook, Settings, LogOut, User, Loader2, Wallet, LineChart } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { useSession } from '@/lib/utils/use-session'
import { useLogout } from '@/lib/queries/auth'

const NAV_LINKS = [
  { href: '/screener', label: 'Screener', icon: BarChart2 },
  { href: '/chart',    label: 'Chart',    icon: LineChart  },
  { href: '/webhook',  label: 'Webhook',  icon: Webhook    },
  { href: '/balance',  label: 'Balance',  icon: Wallet     },
  { href: '/settings', label: 'Settings', icon: Settings   },
]

export function Navbar() {
  const pathname = usePathname()
  const session = useSession()
  const logout = useLogout()

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Brand */}
        <Link
          href="/screener"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <BarChart2 className="h-5 w-5 text-bullish" aria-hidden="true" />
          <span>Crypto Screener</span>
        </Link>

        {/* Nav links — only shown when logged in */}
        {session && (
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {session ? (
            /* Logged-in: show user info + logout */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="max-w-[140px] truncate text-sm font-medium">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                {logout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            /* Not logged in: show Login button */
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>

      </div>
    </header>
  )
}
