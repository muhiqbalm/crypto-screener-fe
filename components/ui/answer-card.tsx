import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, Info, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { TONE_SOFT, TONE_TEXT, TONE_VAR, type Tone } from '@/components/ui/tone'

/**
 * "Jawaban dulu": the page's answer as a hero card: tone chip (icon + word,
 * never colour alone), one big sentence (20–24px), 2–3 big numbers and a
 * link to the evidence. Methods and caveats go below, folded.
 *
 *   <AnswerCard
 *     tone="baik"
 *     answer="Bot live aman: 8 dari 8 sinyal 7 hari terakhir sesuai strategi."
 *     metrics={[{ label: 'Sinyal cocok', value: '8 / 8' }, { label: 'Slippage', value: '+3.2 bps' }]}
 *     evidenceHref="#bukti"
 *     status={<StatusPill kind="live" />}
 *     aside={<Donut … />}
 *   />
 *
 * Server-safe.
 */
export type AnswerTone = 'baik' | 'perlu_dicek' | 'buruk' | 'menunggu' | 'info'

export const ANSWER_TONE: Record<AnswerTone, { label: string; Icon: LucideIcon; text: string; border: string; tone: Tone }> = {
  baik: { label: 'Baik', Icon: CheckCircle2, text: 'text-bullish', border: 'border-l-bullish', tone: 'bullish' },
  perlu_dicek: { label: 'Perlu dicek', Icon: TriangleAlert, text: 'text-warn', border: 'border-l-warn', tone: 'warn' },
  buruk: { label: 'Buruk', Icon: XCircle, text: 'text-bearish', border: 'border-l-bearish', tone: 'bearish' },
  menunggu: { label: 'Menunggu data', Icon: Clock, text: 'text-muted-foreground', border: 'border-l-muted-foreground/40', tone: 'muted' },
  info: { label: 'Info', Icon: Info, text: 'text-info', border: 'border-l-info', tone: 'info' },
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
  /** Visual on the right on wide screens (Donut, Gauge, Sparkline). */
  aside?: React.ReactNode
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
  aside,
  children,
  className,
}: AnswerCardProps) {
  const t = ANSWER_TONE[tone]
  return (
    <section
      aria-label="Jawaban"
      className={cn('ring-gradient glass relative flex flex-col gap-5 overflow-hidden rounded-3xl p-5 sm:p-7', className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full opacity-25 blur-3xl"
        style={{ background: TONE_VAR[t.tone] }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold', TONE_SOFT[t.tone])}>
          <t.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {title ?? t.label}
        </p>
        {status && <div className="flex items-center gap-2">{status}</div>}
      </div>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-5">
          <p className="display text-xl font-bold leading-snug text-foreground sm:text-2xl">{answer}</p>
          {metrics && metrics.length > 0 && (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {metrics.map((m, i) => (
                <div key={i} className="min-w-0 space-y-1">
                  <dt className="eyebrow truncate">{m.label}</dt>
                  <dd className={cn('num display truncate text-2xl font-extrabold sm:text-3xl', m.valueClassName)}>{m.value}</dd>
                  {m.hint && <dd className="truncate text-sm text-muted-foreground">{m.hint}</dd>}
                </div>
              ))}
            </dl>
          )}
        </div>
        {aside && <div className="flex shrink-0 justify-center">{aside}</div>}
      </div>
      {children}
      {(footer || evidenceHref) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="min-w-0">{footer}</div>
          {evidenceHref && (
            <Link
              href={evidenceHref}
              className={cn(
                'inline-flex items-center gap-1 rounded-full text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                TONE_TEXT.info,
              )}
            >
              {evidenceLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
