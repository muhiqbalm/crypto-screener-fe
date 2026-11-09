import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { ScanView } from '@/components/lab/ScanView'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Scan Multi-Market | Strategy Lab',
}

export default function LabScanPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8">
      <LabHeader
        active="/lab/scan"
        title="Scan banyak koin"
        subtitle="Jalankan Validasi atau Cari Parameter Terbaik di banyak koin × timeframe sekaligus, lalu bandingkan rapornya di satu peta."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ScanView />
      </Suspense>
    </main>
  )
}
