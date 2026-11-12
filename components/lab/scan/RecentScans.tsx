'use client'

import Link from 'next/link'
import { History } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import { EmptyState } from '@/components/lab/Section'
import { Panel, StrategyChip } from '@/components/lab/run/v2-ui'
import { STATUS_COPY } from '@/components/lab/run/copy'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { useLabScans, useLabTemplates } from '@/lib/queries/lab'
import { sortTimeframes } from '@/lib/lab/timeframes'

/** Earlier "Banyak koin" tests: strategy, coins × timeframes, kind, Lolos count, status. */
export function RecentScans({ activeId }: { activeId: string | null }) {
  const { data, isPending, error, refetch } = useLabScans()
  const templatesQ = useLabTemplates()
  const scans = data ?? []
  const nameOf = (id: string) => templatesQ.data?.find((t) => t.id === id)?.name
  return (
    <Panel title="Uji banyak koin sebelumnya" icon={History} tone="muted" description="20 terakhir. Semuanya juga ada di Hasil uji.">
      {isPending ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState error={error} title="Daftar uji banyak koin gagal dimuat" onRetry={() => refetch()} compact />
      ) : scans.length === 0 ? (
        <EmptyState title="Belum ada uji banyak koin" description="Pilih koin dan timeframe di atas, lalu jalankan." />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
          {scans.map((s) => {
            const rows = s.rows ?? []
            const passes = rows.filter((r) => r.verdict === 'PASS').length
            const coins = new Set(rows.map((r) => r.symbol)).size
            const tfs = sortTimeframes(Array.from(new Set(rows.map((r) => r.timeframe))))
            return (
              <li key={String(s.id)}>
                <Link
                  href={`/lab/scan?id=${encodeURIComponent(String(s.id))}`}
                  aria-current={String(s.id) === activeId ? 'true' : undefined}
                  className={cn('flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm hover:bg-accent/50', String(s.id) === activeId && 'bg-accent/60')}
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    {s.template_id ? <StrategyChip templateId={s.template_id} name={nameOf(s.template_id)} /> : <span className="font-semibold">Strategi</span>}
                    <span className="num font-semibold">{coins} koin × {tfs.join(', ') || '—'}</span>
                    <span className="text-muted-foreground">{s.mode === 'optimize' ? 'Cari setting terbaik' : 'Uji jujur'}</span>
                    {s.created_at && <span className="text-muted-foreground" title={formatTime(s.created_at, { year: true })}>{formatAge(s.created_at)}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={cn('num display text-xl font-extrabold', passes > 0 ? 'text-bullish' : 'text-muted-foreground')}>{passes}</span>
                    <span className="text-muted-foreground">
                      Lolos dari <span className="num">{s.progress?.total ?? rows.length}</span>
                    </span>
                    {s.status !== 'done' && <span className="text-info">{STATUS_COPY[s.status]} {s.progress?.done ?? 0}/{s.progress?.total ?? 0}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
