'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

/**
 * Error boundary inside the app shell (audit 2026-11-13 P4): a page that
 * throws while rendering keeps the sidebar and header, so the user can always
 * move on. The root `app/error.tsx` only catches what breaks the shell itself.
 */
export default function AppError({ error, unstable_retry }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-bearish/12 text-bearish">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1.5">
        <h1 className="display text-xl font-bold">Halaman ini gagal ditampilkan</h1>
        <p className="text-base text-muted-foreground">Halaman lain tetap bisa dibuka dari menu. Bot dan posisi tidak terpengaruh.</p>
        {error.digest && <p className="num text-2xs text-muted-foreground">ref: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={unstable_retry}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Coba lagi
        </Button>
        <Button asChild variant="outline">
          <Link href="/beranda">
            <Home className="h-4 w-4" aria-hidden="true" />
            Ke Beranda
          </Link>
        </Button>
      </div>
    </div>
  )
}
