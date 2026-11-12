'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldAlert, TriangleAlert } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useLabMe } from '@/lib/queries/lab'
import { ApiError } from '@/lib/api/errors'
import { PageContainer } from '@/components/shell/page'
import { isReadableByAll } from '@/lib/nav'

/**
 * Strategi (Lab) pages are admin-only, except the read-only pages every team
 * account may open (lib/nav.ts LAB_READ_ALL_PREFIXES, e.g. Laporan mingguan).
 * The backend is the real gate (every /lab call checks the JWT); this only
 * avoids rendering a page full of 403 errors. "Not an admin" and "could not
 * check" are different messages; the second one has a retry button.
 */
export function LabGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const openToAll = isReadableByAll(pathname)
  const { data, isPending, isError, error, refetch, isFetching } = useLabMe(!openToAll)

  if (openToAll) return <>{children}</>

  if (isPending) {
    return (
      <PageContainer>
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-16 w-80 max-w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageContainer>
    )
  }

  const checkFailed = isError && !(error instanceof ApiError && error.kind === 'auth')

  if (checkFailed) {
    return (
      <PageContainer className="pt-16 sm:pt-16">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <TriangleAlert className="h-10 w-10 text-warn" aria-hidden="true" />
          <h1 className="text-lg font-bold">Akses belum bisa dicek</h1>
          <p className="text-sm text-muted-foreground">
            Server tidak menjawab saat mengecek akses Strategi. Cek koneksi kamu, lalu coba lagi.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              Coba lagi
            </Button>
            <Button asChild variant="ghost">
              <Link href="/beranda">Ke Beranda</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (isError || !data?.is_admin) {
    return (
      <PageContainer className="pt-16 sm:pt-16">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <ShieldAlert className="h-10 w-10 text-warn" aria-hidden="true" />
          <h1 className="text-lg font-bold">Halaman ini khusus admin</h1>
          <p className="text-sm text-muted-foreground">
            Akun kamu belum punya akses ke alat Strategi. Laporan mingguan dan Peluang koin tetap bisa kamu baca.
          </p>
          <Button asChild variant="outline">
            <Link href="/beranda">Kembali ke Beranda</Link>
          </Button>
        </div>
      </PageContainer>
    )
  }

  return <>{children}</>
}
