import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Brand } from '@/components/shell/Brand'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Pendaftaran ditutup',
  description: 'Pendaftaran publik BMTM MoonTrade ditutup.',
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Brand size="lg" className="mb-8" href="/login" />

      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-warn/25 bg-warn/10 text-warn">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Pendaftaran ditutup</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          BMTM MoonTrade berjalan dalam mode akses privat. Akun hanya dibuat oleh admin untuk anggota tim yang diundang.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/login">
            <ArrowLeft aria-hidden="true" />
            Kembali ke halaman masuk
          </Link>
        </Button>
      </div>
    </main>
  )
}
