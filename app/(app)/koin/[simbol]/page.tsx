import { PageContainer } from '@/components/shell/page'
import { CoinPage } from '@/components/market/coin/CoinPage'
import { coinLabel, symbolFromParam } from '@/lib/lab/outlook'

export async function generateMetadata({ params }: { params: Promise<{ simbol: string }> }) {
  const symbol = symbolFromParam((await params).simbol)
  return {
    title: `${coinLabel(symbol)} · Peluang koin`,
    description: `Keputusan, rencana trade, faktor dan bukti untuk ${coinLabel(symbol)}.`,
  }
}

export default async function KoinSymbolPage({ params }: { params: Promise<{ simbol: string }> }) {
  const symbol = symbolFromParam((await params).simbol)
  return (
    <PageContainer>
      <CoinPage symbol={symbol} />
    </PageContainer>
  )
}
