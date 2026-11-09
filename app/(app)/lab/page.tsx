import { Suspense } from 'react'
import { LabHeader } from '@/components/lab/LabHeader'
import { RunBuilder } from '@/components/lab/RunBuilder'
import { RunsTable } from '@/components/lab/RunsTable'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Strategy Lab | BMTM MoonTrade',
  description: 'Uji ulang strategi Rosyade dengan parameter, symbol dan timeframe apa pun.',
}

export default function LabPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 pb-12 sm:px-6 lg:px-8">
      <LabHeader
        active="/lab"
        title="Strategy Lab"
        subtitle="Logika sama dengan strategi live Rosyade (ETH 4H), tapi semua parameter bisa diubah dan dijalankan di perp Binance mana pun, timeframe apa pun. Strategi live di TradingView tidak tersentuh."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RunBuilder />
      </Suspense>
      <RunsTable />
    </main>
  )
}
