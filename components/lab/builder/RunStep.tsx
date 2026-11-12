'use client'

import { AlertTriangle, Loader2, Lock, LockOpen, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RuntimeEstimate } from '@/components/lab/RuntimeEstimate'
import { cn } from '@/lib/utils/cn'
import { estimateLevel, formatDuration, needsAck } from '@/lib/lab/planning'
import { formatDate } from '@/lib/utils/time'
import type { LabRunMode } from '@/lib/api/types/lab'
import type { LabEstimate } from '@/lib/api/types/lab-insights'
import type { LabHoldoutLock } from '@/lib/api/types/lab-uji'

/** Locked holdout of this strategy x coin x timeframe, shown before anything is queued. */
export function HoldoutNote({
  lock,
  loading,
  failed,
  proposedStart,
  combo,
  periodError,
}: {
  lock: LabHoldoutLock | undefined
  loading: boolean
  failed: boolean
  proposedStart: string | null
  combo: string
  periodError: string | null
}) {
  let body: React.ReactNode
  if (loading) {
    body = <span className="text-muted-foreground">Cek kunci data baru…</span>
  } else if (failed || !lock) {
    body = <span className="text-muted-foreground">Status kunci data baru (holdout) tidak tersedia. Rapor tetap memakai kunci yang ada di server.</span>
  } else if (lock.locked && lock.holdout_start) {
    body = (
      <span>
        Data baru (holdout) <span className="num font-medium">{combo}</span> terkunci sejak{' '}
        <span className="num font-semibold">{formatDate(lock.holdout_start)}</span>, sudah dipakai{' '}
        <span className="num font-semibold">{lock.touches}×</span>. Uji jujur hanya menilai hasil setelah tanggal itu.
        {lock.touches >= 2 && <span className="text-warn"> Makin sering dipakai, makin kurang bisa dipercaya.</span>}
      </span>
    )
  } else {
    body = (
      <span>
        Data baru (holdout) <span className="num font-medium">{combo}</span> belum dikunci. Uji jujur pertama akan mengunci ±20% data
        terakhir{proposedStart ? <> (mulai ±<span className="num font-semibold">{formatDate(proposedStart)}</span>)</> : null} untuk seterusnya.
      </span>
    )
  }
  const Icon = lock && lock.locked ? Lock : LockOpen
  return (
    <div className="space-y-1.5">
      <p className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', lock?.locked ? 'border-lab/30 bg-lab/[0.06]' : 'border-border bg-muted/30')}>
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lab" aria-hidden="true" />
        {body}
      </p>
      {periodError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-bearish/40 bg-bearish/[0.07] px-3 py-2 text-xs text-bearish">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {periodError}
        </p>
      )}
    </div>
  )
}

/**
 * Step 3: one primary action ("Uji jujur" on the current setting) and "Cari setting terbaik" as
 * the secondary action, which opens a warning first (research: optimising tends to overfit).
 */
export function RunStep({
  holdout,
  estimate,
  estimating,
  ack,
  onAck,
  pendingMode,
  disabled,
  blockedReason,
  onValidate,
  onOptimize,
  submitError,
}: {
  holdout: React.ReactNode
  estimate: LabEstimate | undefined
  estimating: boolean
  ack: boolean
  onAck: (v: boolean) => void
  pendingMode: LabRunMode | null
  disabled: boolean
  /** Why "Uji jujur" cannot run yet (e.g. the period breaks the holdout lock). */
  blockedReason: string | null
  onValidate: () => void
  onOptimize: () => void
  submitError: string | null
}) {
  const level = estimateLevel(estimate)
  const needAck = needsAck(level) && !ack
  return (
    <div className="space-y-3">
      {holdout}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Button
          type="button"
          size="lg"
          onClick={onValidate}
          disabled={disabled || needAck || Boolean(blockedReason)}
          className="h-auto flex-col items-start gap-0.5 whitespace-normal px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            {pendingMode === 'validate' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Uji jujur
          </span>
          <span className="text-2xs font-normal opacity-85">
            Rapor Lolos/Gagal di data baru{estimate ? ` · ${formatDuration(estimate.longest_s)}` : ''}
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOptimize}
          disabled={disabled || Boolean(blockedReason)}
          className="h-auto flex-col items-start gap-0.5 whitespace-normal px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            {pendingMode === 'optimize' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Cari setting terbaik
          </span>
          <span className="text-2xs font-normal text-muted-foreground">Termasuk uji jujur. Sering hanya menemukan kebetulan.</span>
        </Button>
      </div>
      {blockedReason && <p className="text-2xs text-bearish">{blockedReason}</p>}
      {submitError && (
        <p role="alert" className="rounded-md border border-bearish/40 bg-bearish/[0.07] px-3 py-2 text-xs text-bearish">{submitError}</p>
      )}
      <RuntimeEstimate estimate={estimate} loading={estimating} ack={ack} onAck={onAck} />
    </div>
  )
}
