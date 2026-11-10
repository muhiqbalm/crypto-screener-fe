import { LabHeader } from '@/components/lab/LabHeader'
import { StrengthTable } from '@/components/lab/universal/StrengthTable'

export const metadata = {
  title: 'Koin Terkuat | Strategy Lab',
  description: 'Peringkat kekuatan relatif koin perp: momentum, tren, volatilitas, funding.',
}

export default function StrengthPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8">
      <LabHeader
        active="/lab/strength"
        title="Koin Terkuat"
        subtitle="Peringkat relatif ±30 koin perp berdasarkan momentum 7/30/90 hari yang disesuaikan volatilitas, tren, dan funding. Diperbarui otomatis setiap close candle 4 jam."
      />
      <StrengthTable />
    </main>
  )
}
