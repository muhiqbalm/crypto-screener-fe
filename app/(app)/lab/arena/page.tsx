import { Suspense } from 'react'
import { PageContainer } from '@/components/shell/page'
import { LoadingState } from '@/components/shell/states'
import { StatusPill } from '@/components/ui/status-pill'
import { LabHeader } from '@/components/lab/LabHeader'
import { ArenaView } from '@/components/lab/arena/ArenaView'
import { PAPER_HELP } from '@/components/lab/arena/paper-help'

export const metadata = {
  title: 'Paper berjalan',
  description: 'Preset yang berjalan di akun simulasi: hasil, progres ke 30 transaksi, dan apakah masih sesuai hasil uji.',
}

/**
 * Paper berjalan → Klasemen. Supports `?highlight=<presetId>` (see ArenaView): used after
 * "Mulai paper" on the Preset page and "Simpan sebagai preset & mulai paper" on run detail.
 */
export default function ArenaPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Paper berjalan"
        subtitle="Preset di akun simulasi: hasil, progres ke 30 transaksi, dan kecocokan dengan uji."
        status={<StatusPill kind="paper" />}
        help={PAPER_HELP}
      />
      {/* useSearchParams (?highlight=) needs a Suspense boundary */}
      <Suspense fallback={<LoadingState rows={8} />}>
        <ArenaView />
      </Suspense>
    </PageContainer>
  )
}
