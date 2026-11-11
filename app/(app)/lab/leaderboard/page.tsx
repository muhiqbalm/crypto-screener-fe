import { LabHeader } from '@/components/lab/LabHeader'
import { LeaderboardView } from '@/components/lab/LeaderboardView'
import { PageContainer } from '@/components/shell/page'

export const metadata = { title: 'Peringkat · Strategy Lab' }

export default function LabLeaderboardPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Peringkat hasil"
        subtitle="Semua run validasi & scan, diurutkan berdasarkan hasil di holdout. Yang GAGAL tidak pernah jadi juara — dan jumlah percobaan per koin ditampilkan supaya juara karena kebetulan kelihatan."
      />
      <LeaderboardView />
    </PageContainer>
  )
}
