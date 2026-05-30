import { ChartContainer } from '@/components/chart/ChartContainer'

export const metadata = {
  title: 'Chart — Crypto Screener',
  description: 'Real-time candlestick chart powered by Binance WebSocket.',
}

export default function ChartPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Chart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time candlestick chart via Binance WebSocket. Updates on every new candle.
        </p>
      </div>
      <ChartContainer />
    </main>
  )
}
