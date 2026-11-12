import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, Info, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * "Jawaban dulu": one sentence that answers the page's question, its tone
 * (icon + word, not only colour), 2–3 key numbers and a link to the evidence.
 * Methods and caveats go below the card, folded.
 *
 *   <AnswerCard
 *     tone="baik"
 *     answer="Bot live aman: 8 dari 8 sinyal 7 hari terakhir tereksekusi sesuai strategi."
 *     metrics={[{ label: 'Sinyal cocok', value: '8 / 8' }, { label: 'Slippage rata-rata', value: '+3.2 bps' }]}
 *     evidenceHref="#bukti"
 *     status={<StatusPill kind="live" />}
 *   />
 *
 * Server-safe.
 */
export type AnswerTone = 'baik' | 'perlu_dicek' | 'buruk' | 'menunggu' | 'info'

export const ANSWER_TONE: Record<AnswerTone, { label: string; Icon: LucideIcon; text: string; border: string }> = {
  baik: { label: 'Baik', Icon: CheckCircle2, text: 'text-bullish', border: 'border-l-bullish' },
  perlu_dicek: { label: 'Perlu dicek', Icon: TriangleAlert, text: 'text-warn', border: 'border-l-warn' },
  buruk: { label: 'Buruk', Icon: XCircle, text: 'text-bearish', border: 'border-l-bearish' },
  menunggu: { label: 'Menunggu data', Icon: Clock, text: 'text-muted-foreground', border: 'border-l-muted-foreground/40' },
  info: { label: 'Info', Icon: Info, text: 'text-info', border: 'border-l-info' },
}

export interface AnswerMetric {
  label: React.ReactNode
  value: React.ReactNode
  /** Small line under the value (basis, period). */
  hint?: React.ReactNode
  /** Tailwind text class for the value, e.g. signClass(v). */
  valueClassName?: string
}

export interface AnswerCardProps {
  tone: AnswerTone
  /** The one-sentence answer. */
  answer: React.ReactNode
  /** Small title above the answer. Default: the tone's word ("Baik", "Perlu dicek"…). */
  title?: React.ReactNode
  /** 2–3 key numbers. */
  metrics?: AnswerMetric[]
  /** Link to the evidence (anchor or page). */
  evidenceHref?: string
  /** Link text. Default "Lihat bukti". */
  evidenceLabel?: string
  /** Pill slot on the right of the title row (LIVE / PAPER…). */
  status?: React.ReactNode
  /** Freshness line or other footer. */
  footer?: React.ReactNode
  /** Extra content under the metrics (e.g. a NextStep button). */
  children?: React.ReactNode
  className?: string
}

export function AnswerCard({
  tone,
  answer,
  title,
  metrics,
  evidenceHref,
  evidenceLabel = 'Lihat bukti',
  status,
  footer,
  children,
  className,
}: AnswerCardProps) {
  const t = ANSWER_TONE[tone]
  return (
    <section
      aria-label="Jawaban"
      className={cn('flex flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 shadow-xs sm:p-5', t.border, className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('flex items-center gap-1.5 text-xs font-semibold', t.text)}>
          <t.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {title ?? t.label}
        </p>
        {status && <div className="flex items-center gap-1.5">{status}</div>}
      </div>
      <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">{answer}</p>
      {metrics && metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m, i) => (
            <div key={i} className="min-w-0 space-y-0.5">
              <dt className="eyebrow truncate">{m.label}</dt>
              <dd className={cn('num truncate text-base font-bold', m.valueClassName)}>{m.value}</dd>
              {m.hint && <dd className="truncate text-2xs text-muted-foreground">{m.hint}</dd>}
            </div>
          ))}
        </dl>
      )}
      {children}
      {(footer || evidenceHref) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
          <div className="min-w-0">{footer}</div>
          {evidenceHref && (
            <Link
              href={evidenceHref}
              className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {evidenceLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
