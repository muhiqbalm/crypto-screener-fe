import { MarketScreenerTab } from '@/components/screener/MarketScreenerTab'

export const metadata = {
  title: 'Market Screener — Crypto Screener',
  description: 'Real-time crypto market screener with signals, tiers, and rankings.',
}

export default function ScreenerPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Market Screener</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time ranked crypto assets with signals and tier classifications.
        </p>
      </div>
      <MarketScreenerTab />
    </main>
  )
}
