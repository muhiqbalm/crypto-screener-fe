'use client'

import { CheckCircle2, Eye, HelpCircle, Loader2, ShieldCheck, ShieldX, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatNumber } from '@/lib/utils/format'
import { checkLabel, checkReason, holdoutWarning, thresholdText, verdictCopy, verdictReasons } from '@/lib/lab/form'
import type { LabCheck, LabRunMode, LabStatus, LabVerdict } from '@/lib/api/types/lab'

function fmtCheckValue(v: LabCheck['value']): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  if (typeof v === 'number') return v >= 999 ? '∞' : Number.isInteger(v) ? formatNumber(v, { digits: 0 }) : formatNumber(v)
  return v
}

/**
 * Hero verdict card. Intentionally has no close/dismiss control.
 * `children` renders on the right (headline numbers).
 */
export function VerdictBanner({
  verdict,
  mode,
  status,
  checks = [],
  children,
}: {
  verdict: LabVerdict
  mode: LabRunMode
  status: LabStatus
  checks?: LabCheck[]
  children?: React.ReactNode
}) {
  const copy = verdictCopy(verdict, mode, status)
  const { failed, passed } = verdictReasons(checks)
  const running = status === 'queued' || status === 'running'
  const Icon = running ? Loader2 : copy.tone === 'pass' ? ShieldCheck : copy.tone === 'fail' ? ShieldX : HelpCircle
  const reasons = copy.tone === 'fail' ? failed : copy.tone === 'pass' ? passed.slice(0, 3) : []

  return (
    <div
      role="status"
      data-testid="verdict-banner"
      data-tone={copy.tone}
      className={cn(
        'overflow-hidden rounded-xl border-2',
        copy.tone === 'pass' && 'border-bullish/50 bg-bullish/[0.07]',
        copy.tone === 'fail' && 'border-bearish/50 bg-bearish/[0.07]',
        copy.tone === 'none' && 'border-border bg-muted/20',
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Icon
            className={cn(
              'h-12 w-12 shrink-0 sm:h-14 sm:w-14',
              running && 'animate-spin',
              copy.tone === 'pass' && 'text-bullish',
              copy.tone === 'fail' && 'text-bearish',
              copy.tone === 'none' && 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-2">
            <p
              className={cn(
                'text-3xl font-black tracking-tight sm:text-4xl',
                copy.tone === 'pass' && 'text-bullish',
                copy.tone === 'fail' && 'text-bearish',
              )}
            >
              {copy.title}
            </p>
            <p className="text-sm text-muted-foreground">{copy.body}</p>
            {reasons.length > 0 && (
              <ul className="space-y-1 pt-1" data-testid="verdict-reasons">
                {reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm">
                    {copy.tone === 'fail' ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bearish" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bullish" aria-hidden="true" />
                    )}
                    <span>
                      {copy.tone === 'fail' && failed[0] === r ? 'Gagal karena ' + r.charAt(0).toLowerCase() + r.slice(1) : r}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  )
}

export function HoldoutWarning({ touches }: { touches: number | null | undefined }) {
  const msg = holdoutWarning(touches)
  if (!msg) return null
  return (
    <div role="alert" data-testid="holdout-warning" className="flex items-start gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
      <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{msg} Makin sering dipakai, makin kurang bisa dipercaya.</span>
    </div>
  )
}

/** Checks as a table: status icon · check · value · requirement · plain-language note. */
export function ChecksList({ checks }: { checks: LabCheck[] }) {
  if (checks.length === 0) {
    return <p className="text-sm text-muted-foreground">Uji ini tidak punya rapor (uji cepat tidak menjalankan syarat rapor).</p>
  }
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="w-full text-sm sm:min-w-[520px]">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="w-10 px-3 py-2"><span className="sr-only">Status</span></th>
            <th className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Syarat</th>
            <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground">Nilai</th>
            <th className="hidden px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">Batas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {checks.map((c) => (
            <tr key={c.name} className={cn(!c.passed && 'bg-bearish/[0.04]')}>
              <td className="px-3 py-2.5 align-top">
                {c.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-bullish" aria-label="lolos" />
                ) : (
                  <XCircle className="h-5 w-5 text-bearish" aria-label="gagal" />
                )}
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-medium">{checkLabel(c)}</div>
                <div className="text-xs text-muted-foreground">{checkReason(c)}</div>
              </td>
              <td className={cn('px-3 py-2.5 text-right align-top font-mono tabular-nums', c.passed ? 'text-foreground' : 'font-semibold text-bearish')}>
                {fmtCheckValue(c.value)}
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right align-top font-mono text-xs text-muted-foreground sm:table-cell">
                {thresholdText(c.threshold)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
