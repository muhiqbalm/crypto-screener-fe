'use client'

import { LineChart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState, EmptyState } from '@/components/shell/states'
import { EquityChart } from '@/components/lab/EquityChart'
import { formatDate } from '@/lib/utils/time'
import { useLabRunEquity } from '@/lib/queries/lab'
import type { LabRunDetail } from '@/lib/api/types/lab'
import { Panel } from './v2-ui'

const CHART_HEIGHT = 'h-[300px] sm:h-[440px]'

/** The page's one big chart: equity over the whole period, with the new-data part marked. */
export function EquitySection({ run, enabled }: { run: LabRunDetail; enabled: boolean }) {
  const q = useLabRunEquity(run.id, enabled)
  let body: React.ReactNode
  if (!enabled) body = <p className="py-16 text-center text-base text-muted-foreground">Kurva modal muncul setelah uji selesai.</p>
  else if (q.isPending) body = <Skeleton className={`${CHART_HEIGHT} w-full rounded-2xl`} />
  else if (q.error) body = <ErrorState error={q.error} title="Kurva modal gagal dimuat" onRetry={() => q.refetch()} compact />
  else if (!q.data || q.data.length === 0) body = <EmptyState title="Kurva modal tidak tersedia" description="Server tidak mengirim kurva untuk uji ini." />
  else body = <EquityChart points={q.data} holdoutStart={run.holdout_start} heightClass={CHART_HEIGHT} />
  return (
    <Panel
      title="Kurva modal"
      icon={LineChart}
      aside={run.holdout_start ? <span className="text-2xs">data baru mulai {formatDate(run.holdout_start)}</span> : <span className="text-2xs">seluruh periode</span>}
    >
      {body}
    </Panel>
  )
}
