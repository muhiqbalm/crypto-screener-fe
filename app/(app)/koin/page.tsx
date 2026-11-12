import { Compass } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { KoinHub } from '@/components/market/KoinHub'
import { parseView } from '@/lib/lab/outlook'

export const metadata = {
  title: 'Peluang koin',
  description: 'Koin mana yang layak dilihat: arah strategi dengan bukti historis, peringkat momentum, dan skor 5 faktor.',
}

export default async function KoinPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const view = parseView((await searchParams).view)
  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={Compass}
        title="Peluang koin"
        description="Koin mana yang layak dilihat sekarang: arah dari strategi, rencana entry/SL/TP, dan bukti dari panggilan serupa di masa lalu. Informasi, bukan saran investasi."
      />
      <KoinHub view={view} />
    </PageContainer>
  )
}
