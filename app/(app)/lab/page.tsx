import { Suspense } from 'react'
import Link from 'next/link'
import { LabHeader } from '@/components/lab/LabHeader'
import { RunBuilder } from '@/components/lab/RunBuilder'
import { BuilderSkeleton } from '@/components/lab/builder/BuilderSkeleton'
import { PageContainer } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'

export const metadata = {
  title: 'Uji strategi',
  description: 'Uji satu strategi di satu koin: atur parameter penting, lalu uji jujur di data baru yang dikunci.',
}

export default function LabPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Uji strategi"
        subtitle="Uji satu strategi di data baru yang dikunci. Bot live tidak tersentuh."
        status={<StatusPill kind="riset" />}
        help={{
          apaIni: 'Halaman ini menjawab: apakah setting strategi ini untung di data yang belum pernah dipakai untuk menyetelnya?',
          caraPakai: [
            'Pilih strategi, koin dan timeframe. Defaultnya sudah terisi.',
            'Ubah parameter penting kalau perlu. Yang lain ada di Lanjutan.',
            'Klik Uji jujur. Kalau Lolos, simpan sebagai preset dan mulai paper dari halaman hasil.',
          ],
          istilah: ['validate', 'holdout', 'optimize', 'param_importance', 'preset'],
        }}
      />
      <Suspense fallback={<BuilderSkeleton />}>
        <RunBuilder />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Semua hasil uji ada di{' '}
        <Link href="/lab/hasil" className="font-medium text-info hover:underline">
          Hasil uji
        </Link>
        .
      </p>
    </PageContainer>
  )
}
