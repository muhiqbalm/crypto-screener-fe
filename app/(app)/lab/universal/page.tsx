import { PageContainer } from '@/components/shell/page'
import { LabHeader } from '@/components/lab/LabHeader'
import { UniversalBuilder } from '@/components/lab/universal/UniversalBuilder'
import { UniversalRunsList } from '@/components/lab/universal/UniversalRunsList'
import { UniversalWatches } from '@/components/lab/universal/UniversalWatches'

export const metadata = {
  title: 'Universal v0',
  description: 'Strategi portofolio multi-koin: trend following + momentum, ukuran posisi berbasis volatilitas.',
}

export default function UniversalPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Universal v0"
        subtitle="Satu aturan untuk semua koin: pegang koin terkuat yang sedang uptrend, ukuran posisi menyesuaikan volatilitas, rebalance berkala. Diuji dengan rapor jujur yang sama. Paper trading saja — tidak ada order nyata."
      />
      <UniversalBuilder />
      <UniversalWatches />
      <UniversalRunsList />
    </PageContainer>
  )
}
