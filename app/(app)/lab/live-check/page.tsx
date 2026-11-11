import { PageContainer } from '@/components/shell/page'
import { LabHeader } from '@/components/lab/LabHeader'
import { LiveCheckView } from '@/components/lab/livecheck/LiveCheckView'

export const metadata = {
  title: 'Cek bot live',
  description: 'Sinyal 4H-ETH-Basic menurut Lab dibanding kiriman TradingView ke bot live, per bar 4H.',
}

export default function LiveCheckPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Cek bot live vs strategi"
        subtitle="Apakah bot live melakukan apa yang dikatakan strategi? Tiap bar 4H: sinyal 4H-ETH-Basic yang dihitung Lab, kiriman TradingView ke webhook, dan hasil eksekusinya. Hanya membaca, tidak mengirim order."
      />
      <LiveCheckView />
    </PageContainer>
  )
}
