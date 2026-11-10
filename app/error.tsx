'use client'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  unstable_retry: () => void
}

export default function Error({ error, unstable_retry }: ErrorProps) {
  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-8 w-8 text-bearish" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">Terjadi kesalahan</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Halaman ini gagal dimuat. Coba lagi; kalau masih gagal, muat ulang browser.
        </p>
        {error.digest && <p className="num text-2xs text-muted-foreground">ref: {error.digest}</p>}
      </div>
      <Button variant="outline" onClick={unstable_retry}>
        Coba lagi
      </Button>
    </div>
  )
}
