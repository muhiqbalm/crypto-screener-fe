'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Info, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import type { AttentionItem, AttentionLevel } from '@/components/home/logic'

const LEVEL: Record<AttentionLevel, { label: string; Icon: LucideIcon; cls: string }> = {
  kritis: { label: 'Kritis', Icon: XCircle, cls: 'text-bearish' },
  penting: { label: 'Penting', Icon: TriangleAlert, cls: 'text-warn' },
  info: { label: 'Info', Icon: Info, cls: 'text-info' },
}

/** "Perlu perhatian": 0–3 rows, most serious first; empty says so explicitly. */
export function AttentionList({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  return (
    <section aria-labelledby="perhatian-title" className="rounded-xl border bg-card p-4 shadow-xs sm:px-5">
      <h2 id="perhatian-title" className="flex items-center gap-2 text-sm font-semibold">
        Perlu perhatian
        {!loading && items.length > 0 && (
          <span className="num rounded-full bg-muted px-1.5 text-2xs font-semibold text-muted-foreground">{items.length}</span>
        )}
      </h2>
      {loading ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-bullish" aria-hidden="true" />
          Tidak ada yang perlu dicek.
        </p>
      ) : (
        <ul className="mt-2 divide-y">
          {items.map((it) => {
            const l = LEVEL[it.level]
            return (
              <li key={it.id} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-2 first:pt-1 last:pb-0">
                <p className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                  <l.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', l.cls)} aria-hidden="true" />
                  <span>
                    <span className={cn('mr-1.5 text-2xs font-semibold uppercase tracking-wide', l.cls)}>{l.label}</span>
                    {it.text}
                    {it.detail && <span className="mt-0.5 block text-2xs text-muted-foreground">{it.detail}</span>}
                  </span>
                </p>
                <Link
                  href={it.href}
                  className="ml-6 inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:ml-0"
                >
                  {it.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
