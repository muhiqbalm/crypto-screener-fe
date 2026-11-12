import { Suspense } from 'react'
import { CandlestickChart } from 'lucide-react'
import { ChartContainer } from '@/components/chart/ChartContainer'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Chart',
  description: 'Candle Binance perpetual (USDT) real-time, waktu WIB, dengan simulasi strategi Lab untuk admin.',
}

export default function ChartPage() {
  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={CandlestickChart}
        title="Chart"
        description="Candle perpetual Binance real-time · default 4 jam · waktu WIB."
        help={{
          apaIni:
            'Chart harga kontrak perpetual Binance. Admin juga bisa menampilkan simulasi strategi Lab (PAPER) di atasnya: sinyal, posisi pura-pura, dan transaksi hasil uji. Simulasi tidak pernah mengirim order sungguhan.',
          caraPakai: [
            'Pilih koin dan timeframe; pilihanmu tersimpan di alamat halaman, jadi bisa dibagikan.',
            'Persen di sebelah harga dibanding candle sebelumnya; "24 jam" dibanding harga sekitar 24 jam lalu.',
            'Kalau feed perpetual tidak bisa diakses, chart memakai data spot dan diberi label.',
          ],
          istilah: ['perpetual', 'timeframe', 'watch', 'paper'],
        }}
      />
      {/* useSearchParams (?symbol / ?tf / ?watch / ?run) needs a Suspense boundary */}
      <Suspense fallback={<Skeleton className="h-[540px] w-full rounded-xl" />}>
        <ChartContainer />
      </Suspense>
    </PageContainer>
  )
}
