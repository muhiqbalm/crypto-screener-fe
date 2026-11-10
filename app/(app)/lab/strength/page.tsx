import { PageContainer } from '@/components/shell/page'
import { LabHeader } from '@/components/lab/LabHeader'
import { StrengthTable } from '@/components/lab/universal/StrengthTable'

export const metadata = {
  title: 'Koin Terkuat',
  description: 'Peringkat kekuatan relatif koin perp: momentum, tren, volatilitas, funding.',
}

export default function StrengthPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Koin Terkuat"
        subtitle="Peringkat relatif ±30 koin perp berdasarkan momentum 7/30/90 hari yang disesuaikan volatilitas, tren, dan funding. Diperbarui otomatis setiap close candle 4 jam."
      />
      <StrengthTable />
    </PageContainer>
  )
}
