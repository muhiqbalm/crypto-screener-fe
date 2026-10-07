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

  useEffect(() => {
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-emerald-400">
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
