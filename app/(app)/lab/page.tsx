import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { RunBuilder } from '@/components/lab/RunBuilder'
import { RunsTable } from '@/components/lab/RunsTable'
import { PageContainer } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Strategy Lab',
  description: 'Uji ulang strategi Rosyade dengan parameter, symbol dan timeframe apa pun.',
}

export default function LabPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Uji strategi Rosyade"
        subtitle="Logika sama dengan strategi live ETH 4H. Ganti koin, timeframe atau parameter, lalu lihat rapor LOLOS/GAGAL yang diuji jujur. Strategi live di TradingView tidak tersentuh."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <RunBuilder />
      </Suspense>
      <RunsTable />
    </PageContainer>
  )
}
