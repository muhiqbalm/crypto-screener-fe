import { CryptoNewsView } from '@/components/news/CryptoNewsView'

export const metadata = {
  title: 'Berita & Sentimen',
  description: 'Headline CoinTelegraph dengan tag sentimen dan indeks Fear & Greed.',
}

export default function NewsPage() {
  return <CryptoNewsView />
}
