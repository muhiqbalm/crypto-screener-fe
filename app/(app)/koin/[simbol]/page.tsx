import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/shell/page'
import { CoinPage } from '@/components/market/coin/CoinPage'
import { coinLabel, symbolFromParam } from '@/lib/lab/outlook'

/** "ETH", "eth", "ETHUSDT", "ETH/USDT:USDT", "1000PEPE", "1000PEPEUSDT" -> one canonical URL /koin/ETH. */
function canonical(raw: string): { symbol: string; slug: string } {
  const symbol = symbolFromParam(raw)
  return { symbol, slug: coinLabel(symbol) }
}

export async function generateMetadata({ params }: { params: Promise<{ simbol: string }> }) {
  const { slug } = canonical((await params).simbol)
  return {
    title: `${slug} · Peluang koin`,
    description: `Keputusan, rencana, faktor dan bukti untuk ${slug}.`,
  }
}

export default async function KoinSymbolPage({ params }: { params: Promise<{ simbol: string }> }) {
  const raw = (await params).simbol
  const { symbol, slug } = canonical(raw)
  if (decodeURIComponent(raw) !== slug) redirect(`/koin/${encodeURIComponent(slug)}`)
  return (
    <PageContainer width="wide">
      <CoinPage symbol={symbol} />
    </PageContainer>
  )
}
