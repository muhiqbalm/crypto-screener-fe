import { Suspense } from 'react'
import { PageContainer } from '@/components/shell/page'
import { LoadingState } from '@/components/shell/states'
import { LabHeader } from '@/components/lab/LabHeader'
import { WeeklyReportView } from '@/components/lab/report/WeeklyReportView'
import './print.css'

export const metadata = {
  title: 'Laporan Mingguan',
  description: 'Rangkuman per minggu (ISO, UTC): preset paper, Catatan Sinyal, kualitas eksekusi, bot live, aktivitas Lab dan kesehatan sistem.',
}

export default function WeeklyReportPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Laporan Mingguan"
        subtitle="Satu minggu ISO (Senin 00:00 – Senin 00:00 UTC) dari data nyata. Minggu yang sudah lewat dibekukan sebagai snapshot tiap Senin 00:30 UTC, jadi angkanya tidak berubah lagi."
      />
      {/* useSearchParams (?week=) needs a Suspense boundary */}
      <Suspense fallback={<LoadingState rows={8} />}>
        <WeeklyReportView />
      </Suspense>
    </PageContainer>
  )
}
