import { Suspense } from 'react'
import { Lock } from 'lucide-react'
import { LoginForm } from '@/components/auth/LoginForm'
import { Brand } from '@/components/shell/Brand'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Masuk',
  description: 'Masuk ke BMTM MoonTrade — screener & trade system.',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Brand size="lg" className="mb-8" href="/login" />

      <div className="w-full max-w-sm">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke terminal</h1>
          <p className="text-sm text-muted-foreground">Screener, trading otomatis & Strategy Lab tim BMTM.</p>
        </div>

        {/* useSearchParams (?next=) needs a Suspense boundary */}
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {/* inline, so the icon stays next to the text when it wraps */}
          <Lock className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
          Terminal privat — hanya untuk anggota tim yang diundang.
        </p>
      </div>
    </main>
  )
}
