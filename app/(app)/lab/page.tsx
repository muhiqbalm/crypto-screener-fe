import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { RunBuilder } from '@/components/lab/RunBuilder'
import { RunsTable } from '@/components/lab/RunsTable'
import { PageContainer } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Strategy Lab',
  description: 'Uji ulang strategi Rosyade family dengan parameter, symbol dan timeframe apa pun.',
}

export default function LabPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Uji strategi"
        subtitle="Rosyade family — logika yang sama dengan preset live 4H-ETH-Basic. Tiap koin & timeframe biasanya butuh parameter sendiri: uji, lalu simpan sebagai preset. Strategi live di TradingView tidak tersentuh."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <RunBuilder />
      </Suspense>
      <RunsTable />
    </PageContainer>
  )
}
