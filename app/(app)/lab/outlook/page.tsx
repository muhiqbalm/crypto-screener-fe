import { PageContainer } from '@/components/shell/page'
import { LabHeader } from '@/components/lab/LabHeader'
import { OutlookView } from '@/components/lab/outlook/OutlookView'

export const metadata = {
  title: 'Outlook Koin',
  description: 'Per koin: arah long/short dari strategi teruji, rencana entry/SL/TP, bukti historis kasus serupa, rekam jejak, dan proyeksi dana.',
}

export default function OutlookPage() {
  return (
    <PageContainer width="wide">
      <LabHeader
        title="Outlook Koin"
        subtitle="Per koin: arah dari strategi utama (preset teruji, kalau ada), rencana entry/SL/TP dengan batas batal, dan keyakinan dari hasil panggilan serupa di simulasi historis. Faktor lain hanya konteks. Informasi, bukan jaminan."
      />
      <OutlookView />
    </PageContainer>
  )
}
