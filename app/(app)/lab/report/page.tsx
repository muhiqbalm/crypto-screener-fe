import { Suspense } from 'react'
import { PageContainer } from '@/components/shell/page'
import { LoadingState } from '@/components/shell/states'
import { LabHeader } from '@/components/lab/LabHeader'
import { WeeklyReportView } from '@/components/lab/report/WeeklyReportView'
import './print.css'

export const metadata = {
  title: 'Laporan mingguan',
  description: 'Ringkasan per minggu (Senin–Senin WIB): paper, bot live, kualitas eksekusi, rekam jejak sinyal, aktivitas Lab dan kesehatan sistem.',
}

/** Readable by every logged-in team account (LabGate lets /lab/report through; backend: lab_user). */
export default function WeeklyReportPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Laporan mingguan"
        subtitle="Apa yang terjadi minggu ini, dimulai dari tiga hal terpenting. Satu minggu = Senin 07:00 WIB sampai Senin berikutnya."
        help={{
          apaIni:
            'Rangkuman satu minggu dari data nyata: paper, bot live, kualitas eksekusi, rekam jejak sinyal, aktivitas Lab dan kesehatan sistem.',
          caraPakai: [
            'Halaman dibuka di laporan final terbaru: angkanya dibekukan tiap Senin 07:30 WIB dan tidak berubah lagi.',
            'Pilih minggu berjalan untuk angka sementara (dihitung saat dibuka, masih bisa berubah).',
            'Tombol "Simpan PDF" mencetak laporan ini lewat dialog cetak browser.',
          ],
          istilah: ['weekly_findings', 'report_final', 'report_week', 'paper', 'live', 'slippage_bps'],
        }}
      />
      {/* useSearchParams (?week=) needs a Suspense boundary */}
      <Suspense fallback={<LoadingState rows={8} />}>
        <WeeklyReportView />
      </Suspense>
    </PageContainer>
  )
}
