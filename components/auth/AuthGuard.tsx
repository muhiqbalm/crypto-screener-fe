'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/lib/utils/use-session'

/**
 * Client-side gate for the (app) routes. UX only — every protected API call
 * is authorised by the backend (Bearer JWT), so bypassing this reveals no data.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Intentional: `mounted` stays false for the first commit so the redirect
  // effect below never fires while useSession() still returns the SSR snapshot
  // (null) during hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && (!session || !session.accessToken)) {
      // Remember where the user was going; /login validates it (safeNextPath).
      const next = `${pathname}${window.location.search}`
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [mounted, session, router, pathname])

  if (!mounted || !session?.accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4" aria-busy="true">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" />
          Memeriksa sesi…
        </div>
      </div>
    )
  }

  return <>{children}</>
}
