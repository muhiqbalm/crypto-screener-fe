'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useLabMe } from '@/lib/queries/lab'

/**
 * Lab is admin-only. The backend is the real gate (every /lab call checks the
 * JWT); this only avoids rendering a page full of 403 errors for non-admins.
 */
export function LabGate({ children }: { children: React.ReactNode }) {
  const { data, isPending, isError } = useLabMe()

  if (isPending) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (isError || !data?.is_admin) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <ShieldAlert className="h-10 w-10 text-warn" aria-hidden="true" />
          <h1 className="text-lg font-bold">Strategy Lab khusus admin</h1>
          <p className="text-sm text-muted-foreground">
            {isError
              ? 'Gagal cek akses Lab ke server. Coba lagi nanti, atau hubungi admin.'
              : 'Akun kamu belum punya akses ke Strategy Lab.'}
          </p>
          <Button asChild variant="outline">
            <Link href="/screener">Kembali ke Screener</Link>
          </Button>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
