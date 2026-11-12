import { LabHeader } from '@/components/lab/LabHeader'
import { RunsTable } from '@/components/lab/RunsTable'
import { PageContainer } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = { title: 'Hasil uji' }

export default function LabHasilPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Hasil uji"
        subtitle="Semua uji dan rapornya, terbaru di atas."
        status={<StatusPill kind="riset" />}
        help={{
          apaIni: 'Riwayat semua uji: apa yang diuji, kapan, dan hasilnya Lolos atau Gagal di data baru.',
          caraPakai: [
            'Klik baris untuk melihat rapor dan langkah berikutnya.',
            'Centang 2–4 uji lalu klik Bandingkan.',
            'Peringkat mengurutkan hasil terbaik di data baru.',
          ],
          istilah: ['run', 'verdict', 'holdout', 'scan'],
        }}
      />
      <RunsTable />
    </PageContainer>
  )
}
