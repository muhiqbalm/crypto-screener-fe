import { PageContainer } from '@/components/shell/page'
import { LabHeader } from '@/components/lab/LabHeader'
import { ArenaView } from '@/components/lab/arena/ArenaView'

export const metadata = {
  title: 'Arena Paper',
  description: 'Semua preset paper berdampingan: ekuitas, drawdown, progres ke 30 trade, dan cek penyimpangan terhadap backtest.',
}

export default function ArenaPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Arena Paper"
        subtitle="Semua preset yang jalan di paper, berdampingan: ekuitas, drawdown, progres ke 30 trade, dan apakah hasil paper masih sesuai dengan backtest-nya."
      />
      <ArenaView />
    </PageContainer>
  )
}
