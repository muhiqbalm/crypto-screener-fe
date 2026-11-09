'use client'

import { CheckCircle2, Clock, Loader2, XCircle, Ban, AlertTriangle, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import type { LabRunMode, LabStatus, LabVerdict } from '@/lib/api/types/lab'

const STATUS_STYLE: Record<LabStatus, { label: string; className: string; Icon: typeof Clock }> = {
  queued: { label: 'Antri', className: 'bg-muted/60 text-muted-foreground border-border/80', Icon: Clock },
  running: { label: 'Jalan', className: 'bg-sky-500/10 text-sky-400 border-sky-500/30', Icon: Loader2 },
  done: { label: 'Selesai', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', Icon: CheckCircle2 },
  error: { label: 'Error', className: 'bg-rose-500/10 text-rose-400 border-rose-500/30', Icon: AlertTriangle },
  cancelled: { label: 'Dibatalkan', className: 'bg-muted/60 text-muted-foreground border-border/80', Icon: Ban },
}

export function StatusBadge({ status }: { status: LabStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.queued
  return (
    <Badge variant="outline" className={cn('gap-1 font-mono text-[10px] uppercase tracking-wide', s.className)}>
      <s.Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} aria-hidden="true" />
      {s.label}
    </Badge>
  )
}

export function VerdictBadge({ verdict }: { verdict: LabVerdict }) {
  if (verdict === 'PASS') {
    return (
      <Badge variant="outline" className="gap-1 font-mono text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border-emerald-500/40">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        PASS
      </Badge>
    )
  }
  if (verdict === 'FAIL') {
    return (
      <Badge variant="outline" className="gap-1 font-mono text-[10px] font-bold bg-rose-500/15 text-rose-400 border-rose-500/40">
        <XCircle className="h-3 w-3" aria-hidden="true" />
        FAIL
      </Badge>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <MinusCircle className="h-3 w-3" aria-hidden="true" />—
    </span>
  )
}

const MODE_LABEL: Record<LabRunMode, string> = {
  backtest: 'Backtest',
  validate: 'Validate',
  optimize: 'Optimize',
}

export function ModeBadge({ mode }: { mode: LabRunMode }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px] border-border/80 text-muted-foreground">
      {MODE_LABEL[mode] ?? mode}
    </Badge>
  )
}

/** Signed number class (green/red) used for return-like metrics. */
export function signClass(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return 'text-foreground'
  return v > 0 ? 'text-bullish' : 'text-bearish'
}
