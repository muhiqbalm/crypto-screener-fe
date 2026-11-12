'use client'

import { CheckCircle2, Clock, Loader2, Ban, AlertTriangle } from 'lucide-react'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { termLabel } from '@/lib/glossary'
import { cn } from '@/lib/utils/cn'
import type { LabRunMode, LabStatus, LabVerdict } from '@/lib/api/types/lab'

/**
 * Lab status chips. The verdict chip is the global one (components/ui/verdict-badge:
 * PASS/FAIL → "Lolos"/"Gagal", the only place that mapping lives); it is re-exported
 * here so the old `@/components/lab/LabBadges` imports keep working.
 */
export { VerdictBadge, normalizeVerdict, VERDICT_LABEL } from '@/components/ui/verdict-badge'

const pill = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-medium leading-4'

const STATUS_STYLE: Record<LabStatus, { label: string; className: string; Icon: typeof Clock }> = {
  queued: { label: 'Antre', className: 'border-border bg-muted/50 text-muted-foreground', Icon: Clock },
  running: { label: 'Berjalan', className: 'border-info/40 bg-info/10 text-info', Icon: Loader2 },
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

/** Status for unfinished runs, verdict once done — one chip per row. */
export function RunStateChip({ status, verdict, mode }: { status: LabStatus; verdict: LabVerdict; mode: LabRunMode }) {
  if (status !== 'done') return <StatusBadge status={status} />
  if (verdict) return <VerdictBadge verdict={verdict} />
  return <span className={cn(pill, 'border-border text-muted-foreground')}>{mode === 'backtest' ? 'Tanpa rapor' : 'Selesai'}</span>
}

/** Run mode names from the glossary (one name per concept). */
export const MODE_LABEL: Record<LabRunMode, string> = {
  backtest: termLabel('backtest', { short: true }),
  validate: termLabel('validate', { short: true }),
  optimize: termLabel('optimize', { short: true }),
}

export function ModeBadge({ mode }: { mode: LabRunMode }) {
  return <span className={cn(pill, 'border-border text-muted-foreground')}>{MODE_LABEL[mode] ?? mode}</span>
}

/** Signed number class (green/red) — re-exported from lib/utils/format. */
export { signClass } from '@/lib/utils/format'
