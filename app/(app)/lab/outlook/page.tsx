import { PageContainer } from '@/components/shell/page'
import { LabHeader } from '@/components/lab/LabHeader'
import { OutlookView } from '@/components/lab/outlook/OutlookView'

export const metadata = {
  title: 'Outlook Koin',
  description: 'Bias long/short per koin dari strategi Rosyade 4H, faktor pendukung beserta bukti, dan proyeksi dana.',
}

export default function OutlookPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Outlook Koin"
        subtitle="Arah tiap koin mengikuti posisi strategi Rosyade 4H; tren, momentum, funding/OI, screener dan kondisi pasar hanya menaikkan atau menurunkan keyakinan. Setiap faktor menunjukkan seberapa terbukti. Informasi, bukan jaminan."
      />
      <OutlookView />
    </PageContainer>
  )
}
