import { WhaleRadarView } from '@/components/whales/WhaleRadarView'

export const metadata = {
  title: 'Whale Radar & Smart Money Flow | BMTM MoonTrade',
  description: 'Track institutional exchange inflows, cold storage accumulation, and Binance Top Trader long/short ratios in real time.',
}

export default function WhalesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <WhaleRadarView />
    </main>
  )
}
