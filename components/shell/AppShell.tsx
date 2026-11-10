'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Brand } from '@/components/shell/Brand'
import { ApiStatus } from '@/components/shell/ApiStatus'
import { SidebarNav } from '@/components/shell/SidebarNav'
import { UserMenu } from '@/components/shell/UserMenu'
import { useSession } from '@/lib/utils/use-session'
import { useLabMe } from '@/lib/queries/lab'

/**
 * Authenticated app frame:
 *  - lg+: fixed left sidebar (brand, grouped nav, API status) + slim top bar
 *  - < lg: top bar with a menu button that opens the same nav in a drawer
 * Pages render inside <main id="main">; use <PageContainer> for width/padding.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const pathname = usePathname()
  // Lab/Journal links are an admin-only UI hint (backend enforces access).
  // Any error (403, network, endpoint missing) hides them.
  const { data: labMe, isError } = useLabMe(Boolean(session?.accessToken))
  const isAdmin = !isError && labMe?.is_admin === true

  const [mobileOpen, setMobileOpen] = useState(false)
  // Close the drawer on navigation (state adjustment during render).
  const [navPath, setNavPath] = useState(pathname)
  if (navPath !== pathname) {
    setNavPath(pathname)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Lewati ke konten
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-topbar items-center px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <SidebarNav isAdmin={isAdmin} />
        </div>
        <div className="border-t p-3">
          <ApiStatus className="w-full justify-center" />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] bg-sidebar">
          <SheetTitle className="sr-only">Navigasi</SheetTitle>
          <SheetDescription className="sr-only">Menu halaman BMTM MoonTrade</SheetDescription>
          <div className="flex h-topbar items-center px-4">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <SidebarNav isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="border-t p-3">
            <ApiStatus className="w-full justify-center" />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-sidebar">
        <header className="sticky top-0 z-20 flex h-topbar items-center gap-3 border-b bg-background/85 px-3 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden cursor-pointer"
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Brand className="lg:hidden" />
          <div className="ml-auto flex items-center gap-3">
            <ApiStatus className="hidden md:inline-flex lg:hidden xl:inline-flex" />
            <UserMenu />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
