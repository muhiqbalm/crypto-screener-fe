'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from '@/lib/utils/use-session'
import { Loader2, ShieldCheck } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // Intentional: `mounted` stays false for the first commit so the redirect
  // effect below never fires while useSession() still returns the SSR snapshot
  // (null) during hydration. A useSyncExternalStore "is client" hook would also
  // drop the one-commit loading gate on client-side navigation into (app),
  // which is a visible change, so the pattern is kept as is.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && (!session || !session.accessToken)) {
      router.replace('/login')
    }
  }, [mounted, session, router, pathname])

  // While mounting or redirecting unauthenticated visitor, show clean loading gate
  if (!mounted || !session?.accessToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bullish/10 border border-bullish/20 text-bullish">
            <Loader2 className="h-6 w-6 animate-spin text-bullish" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-bullish">
              <ShieldCheck className="h-3.5 w-3.5" />
              PRIVATE TERMINAL GATEWAY
            </div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Verifying Authorization...
            </h2>
            <p className="text-xs text-muted-foreground">
              Directing to authorized login view
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
