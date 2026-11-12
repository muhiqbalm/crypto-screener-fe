import { LabHeader } from '@/components/lab/LabHeader'
import { LeaderboardView } from '@/components/lab/LeaderboardView'
import { PageContainer } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = { title: 'Peringkat · Hasil uji' }

export default function LabLeaderboardPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Hasil uji"
        subtitle="Peringkat: yang terbaik di data baru. Yang Gagal tidak pernah jadi juara."
        status={<StatusPill kind="riset" />}
        help={{ apaIni: 'Menjawab: setting mana yang paling bagus di data baru, dan berapa kali sudah dicoba?', istilah: ['verdict', 'holdout', 'profit_factor', 'data_snooping'] }}
      />
      <LeaderboardView />
    </PageContainer>
  )
}
