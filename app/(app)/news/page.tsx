import { CryptoNewsView } from '@/components/news/CryptoNewsView'

export const metadata = {
  title: 'AI News & Catalyst Intelligence | BMTM MoonTrade',
  description: 'Real-time crypto macro news, AI sentiment scoring, and high-impact trading catalysts.',
}

export default function NewsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CryptoNewsView />
    </main>
  )
}
