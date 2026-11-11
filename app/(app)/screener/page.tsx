import { BarChart2 } from 'lucide-react'
import { MarketScreenerTab } from '@/components/screener/MarketScreenerTab'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { RegimeBadge } from '@/components/lab/outlook/RegimeBadge'

export const metadata = {
  title: 'Screener',
  description: 'Screener pasar kripto real-time dengan sinyal, tier dan ranking.',
}

export default function ScreenerPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={BarChart2}
        title="Market screener"
        description="Perpetual USDT-M diurutkan berdasarkan skor multi-faktor, lengkap dengan sinyal dan tier. Klik baris untuk rincian 5 faktor."
        actions={<RegimeBadge withEth />}
      />
      <MarketScreenerTab />
    </PageContainer>
  )
}
