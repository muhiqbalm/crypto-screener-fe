'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Section } from '@/components/lab/Section'
import { EquityChart } from '@/components/lab/EquityChart'
import { ApiError } from '@/lib/api/errors'
import { formatDate } from '@/lib/utils/time'
import { useLabRunEquity } from '@/lib/queries/lab'
import type { LabRunDetail } from '@/lib/api/types/lab'

export function EquitySection({ run, enabled }: { run: LabRunDetail; enabled: boolean }) {
  const q = useLabRunEquity(run.id, enabled)
  let body: React.ReactNode
  if (!enabled) body = <p className="py-10 text-center text-sm text-muted-foreground">Kurva modal muncul setelah uji selesai.</p>
  else if (q.isPending) body = <Skeleton className="h-[260px] w-full sm:h-[360px]" />
  else if (q.error) body = <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Kurva modal gagal dimuat." />
  else if (!q.data || q.data.length === 0) body = <EmptyState title="Kurva modal tidak tersedia" description="Server tidak mengirim kurva untuk uji ini." />
  else body = <EquityChart points={q.data} holdoutStart={run.holdout_start} />
  return (
    <Section
      title="Kurva modal"
      description={run.holdout_start ? `Data baru (holdout) mulai ${formatDate(run.holdout_start)}: bagian setelah garis batas tidak pernah dipakai untuk menyetel.` : 'Seluruh periode, tanpa data baru (uji cepat).'}
    >
      {body}
    </Section>
  )
}
