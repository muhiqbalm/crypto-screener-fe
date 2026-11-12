'use client'

import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react'
import { HeroCard } from '@/components/ui/hero-card'
import { signTone, type Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'
import { formatNumber, formatPct } from '@/lib/utils/format'
import { formatDate } from '@/lib/utils/time'
import { HeroKpi, StrategyChip } from './v2-ui'
import { MODE_COPY, verdictHeadline, type SentenceTone } from './copy'
import { num } from './format'
import type { LabRunDetail } from '@/lib/api/types/lab'

const GLOW: Record<SentenceTone, Tone> = { pass: 'bullish', fail: 'bearish', error: 'bearish', running: 'brand', none: 'brand' }
const WORD_CLASS: Record<SentenceTone, string> = {
  pass: 'text-bullish',
  fail: 'text-bearish',
  error: 'text-bearish',
  running: 'text-info',
  none: 'text-foreground',
}
// Kept out of cn(): tailwind-merge reads `text-glow` as a text colour and would drop the tone colour.
const GLOW_WORD: Record<SentenceTone, boolean> = { pass: true, fail: true, error: false, running: false, none: false }

function ToneIcon({ tone }: { tone: SentenceTone }) {
  const cls = 'h-11 w-11 shrink-0 sm:h-14 sm:w-14'
  if (tone === 'pass') return <CheckCircle2 className={cn(cls, 'text-bullish')} aria-hidden="true" />
  if (tone === 'fail' || tone === 'error') return <XCircle className={cn(cls, 'text-bearish')} aria-hidden="true" />
  if (tone === 'running') return <Loader2 className={cn(cls, 'animate-spin text-info motion-reduce:animate-none')} aria-hidden="true" />
  return <CircleDashed className={cn(cls, 'text-muted-foreground')} aria-hidden="true" />
}

/**
 * Run verdict as the page's hero card (bento span 2): Lolos / Gagal in big type with a soft glow,
 * one line why, then 3 big KPIs (result, deepest drawdown, trades) from the data that decided it.
 */
export function VerdictHero({ run, strategyName, className }: { run: LabRunDetail; strategyName?: string | null; className?: string }) {
  const h = verdictHeadline(run)
  const done = run.status === 'done'
  const ho = run.oos_metrics as Record<string, unknown> | null
  const src = (ho ?? (run.mode === 'backtest' ? run.metrics : null)) as LabRunDetail['metrics'] | null
  const net = num(src, 'net_return_pct')
  const dd = num(src, 'max_dd_pct')
  const trades = num(src, 'trades')
  const pf = num(src, 'profit_factor')
  const where = ho ? 'di data baru' : 'seluruh periode'
  return (
    <HeroCard span={2} glow={GLOW[h.tone]} className={cn('sm:p-8', className)} aria-labelledby="verdict-word">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StrategyChip templateId={run.template_id} name={strategyName} size="md" />
        <span className="inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-semibold text-foreground">{MODE_COPY[run.mode]}</span>
        {run.holdout_start && <span className="text-2xs">data baru sejak {formatDate(run.holdout_start)}</span>}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <ToneIcon tone={h.tone} />
        <p id="verdict-word" className={`${cn('display text-5xl font-extrabold leading-none sm:text-6xl', WORD_CLASS[h.tone])}${GLOW_WORD[h.tone] ? ' text-glow' : ''}`}>
          {h.word}
        </p>
      </div>
      <p className="mt-4 max-w-2xl text-lg font-medium leading-snug sm:text-xl">{h.line}</p>
      {done && src && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <HeroKpi label={`Hasil ${where}`} value={net} format={(v) => formatPct(v, { signed: true })} tone={signTone(net)} />
          <HeroKpi label="Turun terdalam" value={dd === null ? null : -Math.abs(dd)} format={(v) => formatPct(v)} tone={dd === null ? undefined : 'bearish'} />
          <HeroKpi label="Trade" value={trades} format={(v) => formatNumber(Math.round(v), { digits: 0 })} hint={pf === null ? undefined : `PF ${formatNumber(pf)}`} />
        </div>
      )}
    </HeroCard>
  )
}
