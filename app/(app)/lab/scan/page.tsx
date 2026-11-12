import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { ScanView } from '@/components/lab/ScanView'
import { PageContainer } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = {
  title: 'Uji banyak koin',
}

export default function LabScanPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Uji strategi"
        subtitle="Banyak koin: satu strategi diuji di banyak koin × timeframe sekaligus, lalu rapornya dilihat di satu peta."
        status={<StatusPill kind="riset" />}
        help={{
          apaIni: 'Menjawab: di koin dan timeframe mana strategi ini Lolos di data baru?',
          caraPakai: [
            'Pilih strategi, koin dan timeframe.',
            'Pakai setting default, satu preset, atau preset terbaik per koin.',
            'Jalankan, lalu klik sel di peta untuk melihat rapornya.',
          ],
          istilah: ['scan', 'validate', 'holdout', 'data_snooping'],
        }}
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ScanView />
      </Suspense>
    </PageContainer>
  )
}
