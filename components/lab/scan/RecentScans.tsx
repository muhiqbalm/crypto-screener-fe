'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import { EmptyState, Section } from '@/components/lab/Section'
import { STATUS_COPY } from '@/components/lab/run/copy'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { useLabScans, useLabTemplates } from '@/lib/queries/lab'
import { templateShort } from '@/lib/lab/form'
import { sortTimeframes } from '@/lib/lab/timeframes'

/** Earlier "Banyak koin" tests: strategy, coins × timeframes, kind, Lolos count, status. */
export function RecentScans({ activeId }: { activeId: string | null }) {
  const { data, isPending, error, refetch } = useLabScans()
  const templatesQ = useLabTemplates()
  const scans = data ?? []
  const nameOf = (id?: string) => (id ? templateShort(id, templatesQ.data?.find((t) => t.id === id)?.name) : 'Strategi')
  return (
    <Section title="Uji banyak koin sebelumnya" description="20 terakhir. Semua hasil uji juga ada di Hasil uji → Riwayat.">
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <ErrorState error={error} title="Daftar uji banyak koin gagal dimuat" onRetry={() => refetch()} compact />
      ) : scans.length === 0 ? (
        <EmptyState title="Belum ada uji banyak koin" description="Pilih koin dan timeframe di atas, lalu jalankan." />
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border">
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
                  className={cn('flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-accent/50', String(s.id) === activeId && 'bg-accent/60')}
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">{nameOf(s.template_id)}</span>
                    <span className="num">{coins} koin × {tfs.join(', ') || '—'}</span>
                    <span className="text-muted-foreground">{s.mode === 'optimize' ? 'Cari setting terbaik' : 'Uji jujur'}</span>
                    {s.created_at && <span className="text-muted-foreground" title={formatTime(s.created_at, { year: true })}>{formatAge(s.created_at)}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={cn('num font-semibold', passes > 0 ? 'text-bullish' : 'text-muted-foreground')}>{passes} Lolos</span>
                    <span className="num text-muted-foreground">dari {s.progress?.total ?? rows.length}</span>
                    {s.status !== 'done' && <span className="text-info">{STATUS_COPY[s.status]} {s.progress?.done ?? 0}/{s.progress?.total ?? 0}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
