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
        description="Koin mana yang layak dilihat sekarang: arah dari strategi, rencana entry/SL/TP, dan bukti dari panggilan serupa di masa lalu."
        help={{
          apaIni: 'Satu tempat untuk pertanyaan "koin mana?". Outlook memberi arah per koin dari strategi utamanya beserta buktinya; Terkuat memeringkat momentum; Tabel faktor menampilkan skor 5 faktor screener.',
          caraPakai: [
            'Mulai dari "Peluang terbaik": hanya panggilan yang kasus serupanya terbukti untung.',
            'Klik koin untuk rencana lengkap: zona entry, batal kalau, target, dan untung/rugi untuk modalmu.',
            'Posisi baru lebih kuat daripada menyusul posisi yang sudah berjalan.',
          ],
          istilah: ['peluang_terbaik', 'keyakinan', 'fase', 'kasus_serupa', 'direction', 'screener_score', 'tier'],
        }}
      />
      <KoinHub view={view} />
    </PageContainer>
  )
}
