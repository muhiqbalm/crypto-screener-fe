'use client'

import { AlertOctagon, CheckCircle2, Eye, HelpCircle, ShieldCheck, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatScore } from '@/lib/utils/format'
import { holdoutWarning, verdictCopy } from '@/lib/lab/form'
import type { LabCheck, LabRunMode, LabStatus, LabVerdict } from '@/lib/api/types/lab'

function fmtCheckValue(v: LabCheck['value']): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : formatScore(v)
  return v
}

/** Big verdict banner — intentionally has no close/dismiss control. */
export function VerdictBanner({ verdict, mode, status }: { verdict: LabVerdict; mode: LabRunMode; status: LabStatus }) {
  const copy = verdictCopy(verdict, mode, status)
  const Icon = copy.tone === 'pass' ? ShieldCheck : copy.tone === 'fail' ? AlertOctagon : HelpCircle
  return (
    <div
      role="status"
      data-testid="verdict-banner"
      data-tone={copy.tone}
      className={cn(
        'flex items-start gap-4 rounded-xl border-2 p-5',
        copy.tone === 'pass' && 'border-emerald-500/50 bg-emerald-500/10',
        copy.tone === 'fail' && 'border-rose-500/60 bg-rose-500/10',
        copy.tone === 'none' && 'border-border bg-muted/30',
      )}
    >
      <Icon
        className={cn(
          'h-10 w-10 shrink-0',
          copy.tone === 'pass' && 'text-emerald-400',
          copy.tone === 'fail' && 'text-rose-400',
          copy.tone === 'none' && 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-xl font-extrabold tracking-tight">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
      </div>
    </div>
  )
}

export function HoldoutWarning({ touches }: { touches: number | null | undefined }) {
  const msg = holdoutWarning(touches)
  if (!msg) return null
  return (
    <div role="alert" data-testid="holdout-warning" className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
      <Eye className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{msg} Makin sering holdout diintip, makin tidak bisa dipercaya.</span>
    </div>
  )
}

export function ChecksList({ checks }: { checks: LabCheck[] }) {
  if (checks.length === 0) {
    return <p className="text-xs text-muted-foreground">Tidak ada cek kejujuran untuk run ini (mode backtest tidak menjalankan cek).</p>
  }
  return (
    <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
      {checks.map((c) => (
        <li key={c.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2">
            {c.passed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="lolos" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" aria-label="gagal" />
            )}
            {c.label}
          </span>
          <span className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className={c.passed ? 'text-foreground' : 'text-rose-400'}>{fmtCheckValue(c.value)}</span>
            <span className="text-muted-foreground">batas {fmtCheckValue(c.threshold)}</span>
            <span className={cn('w-12 text-right font-bold', c.passed ? 'text-emerald-400' : 'text-rose-400')}>
              {c.passed ? 'LOLOS' : 'GAGAL'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
