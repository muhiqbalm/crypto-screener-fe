import { LabHeader } from '@/components/lab/LabHeader'
import { PresetsView } from '@/components/lab/PresetsView'
import { PageContainer } from '@/components/shell/page'

export const metadata = { title: 'Preset · Strategy Lab' }

export default function LabPresetsPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Preset strategi"
        subtitle="Parameter bernama per koin × timeframe. Pakai untuk uji ulang, scan, atau pantau sinyal live + paper otomatis."
      />
      <PresetsView />
    </PageContainer>
  )
}
