import { PageContainer } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'
import { LabHeader } from '@/components/lab/LabHeader'
import { UniversalArchiveBanner } from '@/components/lab/universal/ArchiveBanner'
import { UniversalBuilder } from '@/components/lab/universal/UniversalBuilder'
import { UniversalRunsList } from '@/components/lab/universal/UniversalRunsList'
import { UniversalWatches } from '@/components/lab/universal/UniversalWatches'

export const metadata = {
  title: 'Universal v0 (arsip)',
  description: 'Arsip strategi portofolio multi-koin yang dihentikan 10 Nov 2026. Data dan pantauan lama disimpan.',
}

/** Archive (CEO decision K6): not in the menu, linked from Hasil uji. Data and watches are kept. */
export default function UniversalPage() {
  return (
    <PageContainer>
      <LabHeader
        title="Universal v0"
        subtitle="Strategi portofolio multi-koin: pegang koin terkuat yang sedang naik, ukuran posisi menyesuaikan gejolak, rebalance berkala. Paper saja, tanpa order nyata."
        status={<StatusPill kind="arsip" />}
        hub={null}
      />
      <UniversalArchiveBanner />
      <UniversalWatches />
      <UniversalRunsList />
      <details className="rounded-xl border bg-card px-4 py-3 sm:px-5">
        <summary className="cursor-pointer select-none text-sm font-semibold tracking-tight">Uji ulang Universal (arsip)</summary>
        <div className="mt-4">
          <UniversalBuilder />
        </div>
      </details>
    </PageContainer>
  )
}
