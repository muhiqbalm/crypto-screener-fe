'use client'

import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, Section } from '@/components/lab/Section'
import { MODE_LABEL, RunStateChip, signClass } from '@/components/lab/LabBadges'
import { formatPercent, formatScore, valueOrDash } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/lab/form'
import { useLabRuns } from '@/lib/queries/lab'
import { UNIVERSAL_TEMPLATE_ID } from '@/lib/api/types/universal'

export function UniversalRunsList() {
  const q = useLabRuns(50)
  const rows = (q.data ?? []).filter((r) => r.template_id === UNIVERSAL_TEMPLATE_ID)
  return (
    <Section title="Riwayat run Universal" description="Angka di tabel = in-sample. Buka run untuk lihat holdout.">
      {q.isPending ? <Skeleton className="h-32 w-full" /> : rows.length === 0 ? (
        <EmptyState title="Belum ada run Universal" description="Mulai dengan Validasi pakai setting default." />
      ) : (
        <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
          {rows.map((r) => (
            <li key={String(r.id)}>
              <Link href={`/lab/universal/runs/${encodeURIComponent(String(r.id))}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/50">
                <span className="font-mono text-xs font-semibold">#{String(r.id)}</span>
                <span className="text-xs text-muted-foreground">{MODE_LABEL[r.mode]}</span>
                <RunStateChip status={r.status} verdict={r.verdict} mode={r.mode} />
                <span className={cn('ml-auto font-mono text-xs tabular-nums', signClass(r.net_return_pct))}>{formatPercent(r.net_return_pct, 1)}</span>
                <span className="hidden font-mono text-xs sm:inline">PF {formatScore(r.profit_factor)}</span>
                <span className="hidden font-mono text-xs sm:inline">{valueOrDash(r.trades)} trade</span>
                <span className="text-xs text-muted-foreground">{relativeTime(r.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
