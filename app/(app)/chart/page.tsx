import { Suspense } from 'react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Chart — Crypto Screener',
  description: 'Real-time Binance USD-M perpetual candlestick chart with optional Strategy Lab overlay.',
}

export default function ChartPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Chart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Candle real-time Binance Perp (USDⓈ-M) via WebSocket. Kalau feed perp tidak bisa diakses, chart
          pindah ke spot dan diberi label.
        </p>
      </div>
      {/* useSearchParams (?watch / ?run overlay) needs a Suspense boundary */}
      <Suspense fallback={<Skeleton className="h-[540px] w-full" />}>
        <ChartContainer />
      </Suspense>
    </main>
  )
}
