import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { ScanView } from '@/components/lab/ScanView'
import { PageContainer } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Scan Banyak Koin · Strategy Lab',
}

export default function LabScanPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Scan banyak koin"
        subtitle="Jalankan Validasi atau Cari Parameter Terbaik di banyak koin × timeframe sekaligus, lalu bandingkan rapornya di satu peta."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ScanView />
      </Suspense>
    </PageContainer>
  )
}
