'use client'

import { Check, ClipboardCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatNumber } from '@/lib/utils/format'
import { checkLabel, checkReason, thresholdText } from '@/lib/lab/form'
import type { LabCheck } from '@/lib/api/types/lab'
import { Panel } from './v2-ui'

function value(v: LabCheck['value']): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  if (typeof v === 'number') return v >= 999 ? '∞' : formatNumber(v, { digits: Number.isInteger(v) ? 0 : 2 })
  return v
}

/**
 * The report as big tick / cross rows (design v2): one row per requirement, the value and its
 * limit on the right. The plain-language reason is shown only where a requirement failed.
 */
export function ReportChecklist({ checks, className }: { checks: LabCheck[]; className?: string }) {
  const passed = checks.filter((c) => c.passed).length
  const pct = checks.length ? Math.round((passed / checks.length) * 100) : 0
  return (
    <Panel
      id="rapor"
      className={cn('scroll-mt-24', className)}
      title="Rapor uji"
      icon={ClipboardCheck}
      aside={
        <span className="num text-base font-semibold text-foreground">
          {passed}/{checks.length} <span className="font-normal text-muted-foreground">syarat terpenuhi</span>
        </span>
      }
    >
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={passed} aria-label="Syarat rapor terpenuhi">
        <div className={cn('h-full rounded-full', passed === checks.length ? 'bg-bullish' : 'bg-warn')} style={{ width: `${pct}%` }} />
      </div>
      <ul className="divide-y divide-border/60">
        {checks.map((c) => (
          <li key={c.name} className="flex min-h-16 items-center gap-4 py-3">
            <span
              className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full', c.passed ? 'bg-bullish/15 text-bullish' : 'bg-bearish/15 text-bearish')}
              aria-label={c.passed ? 'terpenuhi' : 'tidak terpenuhi'}
              role="img"
            >
              {c.passed ? <Check className="h-5 w-5" strokeWidth={3} /> : <X className="h-5 w-5" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">{checkLabel(c)}</p>
              {!c.passed && <p className="text-sm text-bearish">{checkReason(c)}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className={cn('num text-lg font-bold', !c.passed && 'text-bearish')}>{value(c.value)}</p>
              <p className="text-[13px] text-muted-foreground">{thresholdText(c.threshold)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
