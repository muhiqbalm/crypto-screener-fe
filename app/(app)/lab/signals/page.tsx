import { Suspense } from 'react'
import { PageContainer } from '@/components/shell/page'
import { LoadingState } from '@/components/shell/states'
import { LabHeader } from '@/components/lab/LabHeader'
import { LedgerView } from '@/components/lab/ledger/LedgerView'

export const metadata = {
  title: 'Rekam jejak sinyal',
  description: 'Setiap sinyal screener, pantauan Lab dan webhook dicatat lalu dicek 4 jam sampai 7 hari kemudian: mana yang bekerja, mana yang cuma noise.',
}

export default function SignalsPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Rekam jejak sinyal"
        subtitle="Sinyal mana yang bekerja, mana yang cuma noise."
        help={{
          apaIni:
            'Setiap sinyal dari screener, pantauan Lab dan webhook TradingView dicatat otomatis, lalu dicek apakah arahnya benar 4 jam, 1 hari, 3 hari dan 7 hari kemudian.',
          caraPakai: [
            'Baca jawaban di atas dulu: jenis sinyal yang terbukti, yang negatif, dan yang belum bisa dibedakan dari kebetulan.',
            'Ganti "Dicek setelah" untuk melihat jangka waktu lain. Ketuk satu jenis sinyal untuk melihat sinyal-sinyalnya.',
            'Filter tersimpan di alamat halaman, jadi tampilan yang sama bisa dibagikan lewat tautan.',
          ],
          istilah: ['ledger', 'hit_rate', 'horizon', 'mean_move', 'vs_btc', 'uncertainty_range', 'terbukti', 'belum_cukup_data'],
        }}
      />
      {/* useSearchParams (?type= / ?source= / ?symbol= filters) needs a Suspense boundary */}
      <Suspense fallback={<LoadingState rows={6} />}>
        <LedgerView />
      </Suspense>
    </PageContainer>
  )
}
