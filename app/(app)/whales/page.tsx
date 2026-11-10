import { WhaleRadarView } from '@/components/whales/WhaleRadarView'

export const metadata = {
  title: 'Whale Radar',
  description: 'Rasio long/short top trader Binance Futures dan transaksi perpetual besar.',
}

export default function WhalesPage() {
  return <WhaleRadarView />
}
