'use client'

import Link from 'next/link'
import { BellRing, CheckCircle2, ChevronRight, Info, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react'
import { Panel } from '@/components/ui/hero-card'
import { IconTitle } from '@/components/ui/icon-title'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import type { AttentionItem, AttentionLevel } from '@/components/home/logic'

const LEVEL: Record<AttentionLevel, { label: string; Icon: LucideIcon; chip: string }> = {
  kritis: { label: 'Kritis', Icon: XCircle, chip: 'bg-bearish/15 text-bearish' },
  penting: { label: 'Penting', Icon: TriangleAlert, chip: 'bg-warn/15 text-warn' },
  info: { label: 'Info', Icon: Info, chip: 'bg-info/15 text-info' },
}

/** "Perlu perhatian": 0–3 rows, most serious first; empty says so explicitly. */
export function AttentionList({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  return (
    <Panel aria-labelledby="perhatian-title" className="flex flex-col gap-4">
      <IconTitle
        icon={BellRing}
        tone={items.some((i) => i.level === 'kritis') ? 'bearish' : items.length ? 'warn' : 'bullish'}
        title={<span id="perhatian-title">Perlu perhatian</span>}
        action={
          !loading && items.length > 0 ? (
            <span className="num grid h-7 min-w-7 place-items-center rounded-full bg-muted px-2 text-sm font-bold">{items.length}</span>
          ) : undefined
        }
      />
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-bullish/10 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-bullish" aria-hidden="true" />
          <p className="text-base font-semibold">Semua aman. Tidak ada yang perlu dicek.</p>
        </div>
      ) : (
        <ul className="-mx-2 space-y-1">
          {items.map((it) => {
            const l = LEVEL[it.level]
            return (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="group flex items-start gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn('mt-0.5 inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold', l.chip)}>
                    <l.Icon className="h-4 w-4" aria-hidden="true" />
                    {l.label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-base leading-snug">{it.text}</span>
                    {it.detail && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{it.detail}</span>}
                  </span>
                  <span className="sr-only">Buka {it.linkLabel}</span>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
