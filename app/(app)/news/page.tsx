import { CryptoNewsView } from '@/components/news/CryptoNewsView'

export const metadata = {
  title: 'Sentimen & berita',
  description: 'Indeks takut–serakah dan judul berita kripto terbaru dengan nada judul dari kata kunci.',
}

export default function NewsPage() {
  return <CryptoNewsView />
}
