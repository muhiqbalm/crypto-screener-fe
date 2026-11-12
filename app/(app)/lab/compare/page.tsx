import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { CompareView } from '@/components/lab/compare/CompareView'
import { PageContainer } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = { title: 'Bandingkan · Hasil uji' }

export default function LabComparePage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Hasil uji"
        subtitle="2–4 uji berdampingan: angka, rapor, dan kurva modal."
        status={<StatusPill kind="riset" />}
        help={{ apaIni: 'Menjawab: dari beberapa uji, mana yang lebih bagus di data baru?', istilah: ['holdout', 'rapor', 'cost_drag'] }}
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <CompareView />
      </Suspense>
    </PageContainer>
  )
}
