'use client'

import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { formatDate } from '@/lib/utils/time'
import { BigKpi, HeroPanel, StrategyChip, type HeroTone } from './v2-ui'
import { MODE_COPY, verdictHeadline, type SentenceTone } from './copy'
import { num } from './format'
import type { LabRunDetail } from '@/lib/api/types/lab'

const HERO_TONE: Record<SentenceTone, HeroTone> = { pass: 'pass', fail: 'fail', error: 'fail', running: 'neutral', none: 'neutral' }
const WORD_CLASS: Record<SentenceTone, string> = {
  pass: 'text-bullish',
  fail: 'text-bearish',
  error: 'text-bearish',
  running: 'text-info',
  none: 'text-foreground',
}

function ToneIcon({ tone }: { tone: SentenceTone }) {
  const cls = 'h-10 w-10 shrink-0 sm:h-12 sm:w-12'
  if (tone === 'pass') return <CheckCircle2 className={cn(cls, 'text-bullish')} aria-hidden="true" />
  if (tone === 'fail' || tone === 'error') return <XCircle className={cn(cls, 'text-bearish')} aria-hidden="true" />
  if (tone === 'running') return <Loader2 className={cn(cls, 'animate-spin text-info motion-reduce:animate-none')} aria-hidden="true" />
  return <CircleDashed className={cn(cls, 'text-muted-foreground')} aria-hidden="true" />
}

/**
 * Run verdict as the page's hero (design v2 bento): Lolos / Gagal in big type with a soft glow,
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
    <HeroPanel tone={HERO_TONE[h.tone]} className={className}>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StrategyChip templateId={run.template_id} name={strategyName} />
        <span className="rounded-full border border-border px-3 py-1 text-[13px] font-medium">{MODE_COPY[run.mode]}</span>
        {run.holdout_start && <span className="text-[13px]">data baru sejak {formatDate(run.holdout_start)}</span>}
      </div>
      <div className="mt-5 flex items-center gap-4">
        <ToneIcon tone={h.tone} />
        <p className={cn('text-4xl font-extrabold tracking-tight sm:text-5xl', WORD_CLASS[h.tone])}>{h.word}</p>
      </div>
      <p className="mt-3 max-w-2xl text-lg font-medium leading-snug text-foreground sm:text-xl">{h.line}</p>
      {done && src && (
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/70 pt-5 sm:gap-6">
          <BigKpi label={`Hasil ${where}`} value={net} format={(v) => formatPct(v, { signed: true })} valueClassName={signClass(net)} />
          <BigKpi label="Turun terdalam" value={dd === null ? null : -Math.abs(dd)} format={(v) => formatPct(v)} valueClassName={dd === null ? undefined : 'text-bearish'} />
          <BigKpi
            label="Trade"
            value={trades}
            format={(v) => formatNumber(v === null ? null : Math.round(v), { digits: 0 })}
            hint={pf === null ? undefined : `PF ${formatNumber(pf)}`}
          />
        </div>
      )}
    </HeroPanel>
  )
}
