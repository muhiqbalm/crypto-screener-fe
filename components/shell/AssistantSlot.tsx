import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

/**
 * Reserved place for the AI assistant (audit §3.8). Until the AI exists it is
 * filled with automatic summaries built from data the page already has, so
 * users get used to where it lives.
 *
 * Data contract (keep it safe for the AI later):
 * - only reads JSON the app already shows (Outlook factors + evidence codes,
 *   signal track record, live-check summary, paper arena);
 * - every claim says how strong its evidence is and when it was measured;
 * - labelled "bukan saran investasi";
 * - NEVER creates orders, changes settings or creates watches. This component
 *   has no action props on purpose.
 */
export interface AssistantContext {
  /** Where the slot sits: 'beranda', 'koin', 'run', … */
  kind: string
  /** Coin symbol / run id the summary is about. */
  subject?: string
  /** Human label, e.g. "ETH" or "Uji #123". */
  label?: string
}

export interface AssistantItem {
  /** One plain sentence. */
  text: React.ReactNode
  /** Evidence strength in words, e.g. "terbukti", "belum terbukti", "dari 31 posisi". */
  evidence?: string
  /** When the underlying data was measured, already formatted (formatTime). */
  at?: string
  /** Link to the detail behind the claim. */
  href?: string
}

export interface AssistantSlotProps {
  context: AssistantContext
  items: AssistantItem[]
  /** 'otomatis' = rule-based summary (now), 'ai' = model output (later). Default 'otomatis'. */
  source?: 'otomatis' | 'ai'
  /** Default "Asisten". */
  title?: string
  loading?: boolean
  /** Shown when there are no items. */
  emptyText?: string
  className?: string
}

export function AssistantSlot({
  context,
  items,
  source = 'otomatis',
  title = 'Asisten',
  loading,
  emptyText = 'Belum ada ringkasan untuk saat ini.',
  className,
}: AssistantSlotProps) {
  const sourceLabel = source === 'ai' ? 'AI · bukan saran investasi' : 'Ringkasan otomatis · bukan saran investasi'
  return (
    <section
      aria-label={`${title}${context.label ? `: ${context.label}` : ''}`}
      data-assistant-context={context.kind}
      data-assistant-subject={context.subject}
      className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-info" aria-hidden="true" />
          {title}
          {context.label && <span className="font-normal text-muted-foreground">· {context.label}</span>}
        </h2>
        <span className="text-3xs font-medium uppercase tracking-wide text-muted-foreground">{sourceLabel}</span>
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-info/70" aria-hidden="true" />
              <div className="min-w-0 space-y-0.5">
                <p>
                  {it.text}
                  {it.href && (
                    <Link
                      href={it.href}
                      className="ml-1.5 inline-flex items-center gap-0.5 whitespace-nowrap rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Lihat
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </p>
                {(it.evidence || it.at) && (
                  <p className="text-2xs text-muted-foreground">{[it.evidence && `Bukti: ${it.evidence}`, it.at].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
