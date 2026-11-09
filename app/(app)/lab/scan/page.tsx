import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { ScanView } from '@/components/lab/ScanView'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Scan Multi-Market | Strategy Lab',
}

export default function LabScanPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 pb-12 sm:px-6 lg:px-8">
      <LabHeader
        active="/lab/scan"
        title="Scan multi-market"
        subtitle="Jalankan validate / optimize di banyak symbol × timeframe sekaligus. Hasil diurutkan PASS dulu, lalu profit factor out-of-sample."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ScanView />
      </Suspense>
    </main>
  )
}
