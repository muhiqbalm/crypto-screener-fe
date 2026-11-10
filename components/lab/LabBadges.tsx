'use client'

import { CheckCircle2, Clock, Loader2, XCircle, Ban, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { LabRunMode, LabStatus, LabVerdict } from '@/lib/api/types/lab'

const pill = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-medium leading-4'

const STATUS_STYLE: Record<LabStatus, { label: string; className: string; Icon: typeof Clock }> = {
  queued: { label: 'Antri', className: 'border-border bg-muted/50 text-muted-foreground', Icon: Clock },
  running: { label: 'Jalan', className: 'border-info/40 bg-info/10 text-info', Icon: Loader2 },
  done: { label: 'Selesai', className: 'border-border bg-muted/40 text-muted-foreground', Icon: CheckCircle2 },
  error: { label: 'Error', className: 'border-bearish/40 bg-bearish/10 text-bearish', Icon: AlertTriangle },
  cancelled: { label: 'Dibatalkan', className: 'border-border bg-muted/50 text-muted-foreground', Icon: Ban },
}

export function StatusBadge({ status }: { status: LabStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.queued
  return (
    <span className={cn(pill, s.className)}>
      <s.Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} aria-hidden="true" />
      {s.label}
    </span>
  )
}

/** LOLOS / GAGAL chip. Icon + word so colour is never the only signal. */
export function VerdictBadge({ verdict, size = 'sm' }: { verdict: LabVerdict; size?: 'sm' | 'md' }) {
  const big = size === 'md' && 'px-2.5 py-1 text-xs'
  if (verdict === 'PASS') {
    return (
      <span className={cn(pill, 'border-bullish/40 bg-bullish/10 font-bold text-bullish', big)}>
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        LOLOS
      </span>
    )
  }
  if (verdict === 'FAIL') {
    return (
      <span className={cn(pill, 'border-bearish/40 bg-bearish/10 font-bold text-bearish', big)}>
        <XCircle className="h-3 w-3" aria-hidden="true" />
        GAGAL
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

/** Status for unfinished runs, verdict once done — one chip per row. */
export function RunStateChip({ status, verdict, mode }: { status: LabStatus; verdict: LabVerdict; mode: LabRunMode }) {
  if (status !== 'done') return <StatusBadge status={status} />
  if (verdict) return <VerdictBadge verdict={verdict} />
  return <span className={cn(pill, 'border-border text-muted-foreground')}>{mode === 'backtest' ? 'Tanpa rapor' : 'Selesai'}</span>
}

export const MODE_LABEL: Record<LabRunMode, string> = {
  backtest: 'Backtest',
  validate: 'Validasi',
  optimize: 'Optimize',
}

export function ModeBadge({ mode }: { mode: LabRunMode }) {
  return (
    <span className={cn(pill, 'border-border/80 font-mono text-3xs uppercase tracking-wide text-muted-foreground')}>
      {MODE_LABEL[mode] ?? mode}
    </span>
  )
}

/** Signed number class (green/red) — re-exported from lib/utils/format. */
export { signClass } from '@/lib/utils/format'
