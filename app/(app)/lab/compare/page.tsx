import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { CompareView } from '@/components/lab/compare/CompareView'
import { PageContainer } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = { title: 'Bandingkan Run · Strategy Lab' }

export default function LabComparePage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Bandingkan run"
        subtitle="2–4 run berdampingan: metrik seluruh periode & holdout, rapor kejujuran dan kurva equity yang dinormalisasi."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <CompareView />
      </Suspense>
    </PageContainer>
  )
}
