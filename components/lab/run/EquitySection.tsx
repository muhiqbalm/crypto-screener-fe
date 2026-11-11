'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Section } from '@/components/lab/Section'
import { EquityChart } from '@/components/lab/EquityChart'
import { ApiError } from '@/lib/api/errors'
import { formatTimestamp } from '@/lib/utils/format'
import { useLabRunEquity } from '@/lib/queries/lab'
import type { LabRunDetail } from '@/lib/api/types/lab'

export function EquitySection({ run, enabled }: { run: LabRunDetail; enabled: boolean }) {
  const q = useLabRunEquity(run.id, enabled)
  let body: React.ReactNode
  if (!enabled) body = <p className="py-10 text-center text-sm text-muted-foreground">Kurva equity muncul setelah run selesai.</p>
  else if (q.isPending) body = <Skeleton className="h-[260px] w-full sm:h-[360px]" />
  else if (q.error) body = <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat kurva equity." />
  else if (!q.data || q.data.length === 0) body = <EmptyState title="Belum ada titik equity" description="Backend tidak mengirim kurva untuk run ini." />
  else body = <EquityChart points={q.data} holdoutStart={run.holdout_start} />
  return (
    <Section
      title="Kurva equity"
      description={run.holdout_start ? `Holdout terkunci mulai ${formatTimestamp(run.holdout_start).slice(0, 10)} — bagian ungu tidak pernah dilihat optimizer.` : 'Seluruh periode (in-sample).'}
    >
      {body}
    </Section>
  )
}
