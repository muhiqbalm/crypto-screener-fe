import { CryptoNewsView } from '@/components/news/CryptoNewsView'

export const metadata = {
  title: 'Crypto News & Sentiment | BMTM MoonTrade',
  description: 'CoinTelegraph headlines with keyword sentiment tagging and the Fear & Greed index.',
}

export default function NewsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CryptoNewsView />
    </main>
  )
}
