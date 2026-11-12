import { Suspense } from 'react'
import { PageContainer } from '@/components/shell/page'
import { LoadingState } from '@/components/shell/states'
import { StatusPill } from '@/components/ui/status-pill'
import { LabHeader } from '@/components/lab/LabHeader'
import { JournalView } from '@/components/journal/JournalView'
import { PAPER_HELP } from '@/components/lab/arena/paper-help'

export const metadata = {
  title: 'Jurnal · Paper berjalan',
  description: 'Setiap transaksi paper, terbaru di atas, dengan hasil bersih, R, catatan dan tag. Transaksi bot live hanya tampil bila dinyalakan.',
}

export default function JournalPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Paper berjalan"
        subtitle="Jurnal: setiap transaksi simulasi, terbaru di atas."
        status={<StatusPill kind="paper" />}
        help={PAPER_HELP}
      />
      {/* useSearchParams (?account_id= deep link) needs a Suspense boundary */}
      <Suspense fallback={<LoadingState rows={6} />}>
        <JournalView />
      </Suspense>
    </PageContainer>
  )
}
