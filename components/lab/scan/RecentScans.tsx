'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Section } from '@/components/lab/Section'
import { StatusBadge } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatTimestamp } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { useLabScans } from '@/lib/queries/lab'
import { relativeTime } from '@/lib/lab/form'

export function RecentScans({ activeId }: { activeId: string | null }) {
  const { data, isPending, error, refetch } = useLabScans()
  const scans = data ?? []
  return (
    <Section title="Scan sebelumnya">
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat daftar scan." />
      ) : scans.length === 0 ? (
        <EmptyState title="Belum ada scan" description="Pilih koin dan timeframe di atas, lalu klik Jalankan scan." />
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border">
          {scans.map((s) => {
            const passes = (s.rows ?? []).filter((r) => r.verdict === 'PASS').length
            return (
              <li key={String(s.id)}>
                <Link
                  href={`/lab/scan?id=${encodeURIComponent(String(s.id))}`}
                  className={cn('flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-accent/50', String(s.id) === activeId && 'bg-accent/60')}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-semibold">#{String(s.id)}</span>
                    {s.mode && <span className="text-muted-foreground">{s.mode === 'optimize' ? 'Optimize' : 'Validasi'}</span>}
                    {s.created_at && <span className="text-muted-foreground" title={formatTimestamp(s.created_at)}>{relativeTime(s.created_at)}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{s.progress?.done ?? 0}/{s.progress?.total ?? 0}</span>
                    {passes > 0 && <span className="font-semibold text-bullish">{passes} LOLOS</span>}
                    <StatusBadge status={s.status} />
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
