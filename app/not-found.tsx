import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = { title: 'Halaman tidak ditemukan' }

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Compass className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="num text-sm text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Alamat ini tidak ada atau sudah dipindah.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/screener">Ke Screener</Link>
      </Button>
    </main>
  )
}
