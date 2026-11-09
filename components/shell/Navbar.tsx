'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  LineChart,
  Radar,
  Newspaper,
  Webhook,
  Wallet,
  Settings,
  LogOut,
  ChevronDown,
  Zap,
  Activity,
  Loader2,
  Sun,
  Moon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { useSession } from '@/lib/utils/use-session'
import { useLogout } from '@/lib/queries/auth'
import { useApiHealth } from '@/lib/queries/health'

export function Navbar() {
  const pathname = usePathname()
  const session = useSession()
  const logout = useLogout()
  const { theme, setTheme } = useTheme()
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  const { data: health, isPending: healthPending } = useApiHealth()

  // Dropdown states
  const [intelOpen, setIntelOpen] = useState(false)
  const [engineOpen, setEngineOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const navRef = useRef<HTMLDivElement>(null)

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIntelOpen(false)
        setEngineOpen(false)
        setUserOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdowns on route change (state adjustment during render instead
  // of setState inside an effect — avoids a cascading re-render).
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setIntelOpen(false)
    setEngineOpen(false)
    setUserOpen(false)
  }

  const isIntelActive = ['/screener', '/chart', '/whales', '/news'].some((p) =>
    pathname.startsWith(p)
  )
  const isEngineActive = ['/webhook', '/balance'].some((p) =>
    pathname.startsWith(p)
  )

  const userDisplayName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Member'
  const userInitial = userDisplayName.charAt(0).toUpperCase()
  // Role badge only when the backend actually returns a role for this user.
  // GET /trading/users/me does not currently include `role`, so the badge
  // stays hidden rather than claiming a role we cannot verify.
  const userRole = session?.user?.role?.trim() || null
  const roleLabel = userRole
    ? userRole
        .split(/[_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    : null

  // Real backend health: GET /api/v1/health with browser-measured latency.
  const statusDot = isMock
    ? 'bg-amber-400'
    : healthPending
      ? 'bg-muted-foreground/50'
      : health?.status === 'healthy'
        ? 'bg-emerald-500 animate-pulse'
        : health?.status === 'degraded'
          ? 'bg-amber-400'
          : 'bg-rose-500'
  const statusText = isMock
    ? 'Mock Mode'
    : healthPending
      ? 'Checking API…'
      : health?.status === 'healthy'
        ? `API Online • ${health.latencyMs}ms`
        : health?.status === 'degraded'
          ? `API Degraded (stale data) • ${health.latencyMs}ms`
          : 'API Offline'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div
        ref={navRef}
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6"
      >
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <Link
            href="/screener"
            className="flex items-center gap-2.5 tracking-tight transition-opacity hover:opacity-85"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-sm shadow-emerald-500/20">
              <BarChart2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                BMTM
              </span>
              <span className="font-bold tracking-tight text-foreground text-sm">
                MOONTRADE
              </span>
              <span className="hidden sm:inline-flex text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                TRADE SYSTEM
              </span>
            </div>
          </Link>

          {/* Center: Clustered Category Dropdowns */}
          <nav className="flex items-center gap-2" aria-label="Main navigation">
            {/* 1. Market Intel Cluster */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIntelOpen(!intelOpen)
                  setEngineOpen(false)
                  setUserOpen(false)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 cursor-pointer',
                  isIntelActive
                    ? 'bg-accent/80 text-foreground font-bold shadow-xs'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>Market Intel</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200 opacity-70',
                    intelOpen && 'rotate-180'
                  )}
                />
              </button>

              {intelOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl border border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                    Quantitative &amp; Market Intelligence
                  </div>
                  <Link
                    href="/news"
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent',
                      pathname === '/news' && 'bg-accent/70'
                    )}
                  >
                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 mt-0.5">
                      <Newspaper className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        News &amp; Sentiment
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">RSS</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">Fear &amp; Greed + breaking crypto wires</div>
                    </div>
                  </Link>

                  <Link
                    href="/whales"
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent',
                      pathname === '/whales' && 'bg-accent/70'
                    )}
                  >
                    <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 mt-0.5">
                      <Radar className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        Whale Radar
                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">Live FAPI</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">Binance top trader L/S &amp; large trades</div>
                    </div>
                  </Link>

                  <Link
                    href="/screener"
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent',
                      pathname === '/screener' && 'bg-accent/70'
                    )}
                  >
                    <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5">
                      <BarChart2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Quant Screener</div>
                      <div className="text-[11px] text-muted-foreground">Multi-factor ranking &amp; OI delta</div>
                    </div>
                  </Link>

                  <Link
                    href="/chart"
                    className={cn(
                      'flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent',
                      pathname === '/chart' && 'bg-accent/70'
                    )}
                  >
                    <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400 mt-0.5">
                      <LineChart className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Interactive Chart</div>
                      <div className="text-[11px] text-muted-foreground">TradingView candles &amp; indicators</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Trade Engine Cluster (Visible when authenticated) */}
            {session && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setEngineOpen(!engineOpen)
                    setIntelOpen(false)
                    setUserOpen(false)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 cursor-pointer',
                    isEngineActive
                      ? 'bg-accent/80 text-foreground font-bold shadow-xs'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Trade Engine</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200 opacity-70',
                      engineOpen && 'rotate-180'
                    )}
                  />
                </button>

                {engineOpen && (
                  <div className="absolute left-0 mt-2 w-64 rounded-xl border border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1.5 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                      Automated Execution Gateway
                    </div>
                    <Link
                      href="/webhook"
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent',
                        pathname === '/webhook' && 'bg-accent/70'
                      )}
                    >
                      <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 mt-0.5">
                        <Webhook className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Webhook Gateway</div>
                        <div className="text-[11px] text-muted-foreground">TradingView dedicated bridge</div>
                      </div>
                    </Link>

                    <Link
                      href="/balance"
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent',
                        pathname === '/balance' && 'bg-accent/70'
                      )}
                    >
                      <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">Balance &amp; Margin</div>
                        <div className="text-[11px] text-muted-foreground">Live Binance equity &amp; positions</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Right: Status Pill & Consolidated User Hub */}
        <div className="flex items-center gap-3">
          {/* Engine Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-muted/50 border border-border/60">
            <span className={cn('h-2 w-2 rounded-full', statusDot)} />
            <span className="text-[11px] font-medium text-foreground">
              {statusText}
            </span>
          </div>

          {session ? (
            /* Consolidated User Profile Hub Dropdown */
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserOpen(!userOpen)
                  setIntelOpen(false)
                  setEngineOpen(false)
                }}
                className="flex items-center gap-2 rounded-full p-1 pl-1.5 pr-2.5 bg-card/80 border border-border/80 hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                  {userInitial}
                </div>
                <span className="max-w-[100px] truncate text-xs font-semibold text-foreground">
                  {userDisplayName}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    userOpen && 'rotate-180'
                  )}
                />
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="p-2 border-b border-border/60 mb-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{userDisplayName}</span>
                      {roleLabel && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold tracking-wide">
                          {roleLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {session.user.email}
                    </div>
                  </div>

                  {/* Navigation Links inside User Hub */}
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Terminal &amp; API Settings</span>
                  </Link>

                  {/* Theme Switcher Row */}
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs text-foreground">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      Appearance
                    </span>
                    <button
                      type="button"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted/70 hover:bg-muted text-foreground border border-border/60 cursor-pointer"
                    >
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </button>
                  </div>

                  <div className="my-1 border-t border-border/60" />

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    {logout.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    <span>Sign Out of Terminal</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm" className="cursor-pointer font-medium text-xs">
              <Link href="/login">Terminal Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
