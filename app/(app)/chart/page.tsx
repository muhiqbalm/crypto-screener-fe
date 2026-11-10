import { Suspense } from 'react'
import { CandlestickChart } from 'lucide-react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Chart',
  description: 'Chart candle real-time Binance USD-M perpetual dengan overlay Strategy Lab opsional.',
}

export default function ChartPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={CandlestickChart}
        title="Chart"
        description="Candle real-time Binance Perp (USDⓈ-M) via WebSocket. Kalau feed perp tidak bisa diakses, chart pindah ke spot dan diberi label."
      />
      {/* useSearchParams (?watch / ?run overlay) needs a Suspense boundary */}
      <Suspense fallback={<Skeleton className="h-[540px] w-full rounded-xl" />}>
        <ChartContainer />
      </Suspense>
    </PageContainer>
  )
}
