import { Suspense } from 'react'
import { PageContainer } from '@/components/shell/page'
import { LoadingState } from '@/components/shell/states'
import { LabHeader } from '@/components/lab/LabHeader'
import { LedgerView } from '@/components/lab/ledger/LedgerView'
import { ExecutionQuality } from '@/components/lab/shadow/ExecutionQuality'

export const metadata = {
  title: 'Catatan Sinyal',
  description: 'Semua sinyal screener, Lab dan webhook dicatat otomatis lalu dinilai: hit rate dan return 4 jam – 7 hari.',
}

export default function SignalsPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Catatan Sinyal"
        subtitle="Setiap sinyal dari screener, Lab watch, Universal v0 dan webhook TradingView dicatat otomatis, lalu dinilai 4 jam, 1, 3 dan 7 hari kemudian. Tujuannya: tahu sinyal mana yang benar-benar bekerja dan mana yang cuma noise."
      />
      {/* useSearchParams (?type= / ?source= / ?symbol= filters) needs a Suspense boundary */}
      <Suspense fallback={<LoadingState rows={6} />}>
        <LedgerView />
      </Suspense>
      <div className="mt-5">
        <ExecutionQuality />
      </div>
    </PageContainer>
  )
}
