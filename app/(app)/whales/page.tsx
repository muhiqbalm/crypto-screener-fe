import { WhaleRadarView } from '@/components/whales/WhaleRadarView'

export const metadata = {
  title: 'Whale Radar | BMTM MoonTrade',
  description: 'Binance Futures top trader long/short ratios and large perpetual trades.',
}

export default function WhalesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <WhaleRadarView />
    </main>
  )
}
