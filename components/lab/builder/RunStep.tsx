'use client'

import { AlertTriangle, Loader2, Lock, LockOpen, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InfoTip } from '@/components/ui/info-tip'
import { RuntimeEstimate } from '@/components/lab/RuntimeEstimate'
import { cn } from '@/lib/utils/cn'
import { estimateLevel, formatDuration, needsAck } from '@/lib/lab/planning'
import { formatDate } from '@/lib/utils/time'
import type { LabRunMode } from '@/lib/api/types/lab'
import type { LabEstimate } from '@/lib/api/types/lab-insights'
import type { LabHoldoutLock } from '@/lib/api/types/lab-uji'

/** Locked holdout of this strategy x coin x timeframe, shown before anything is queued (one line). */
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
  let tip: string | null = null
  if (loading) {
    body = <span className="text-muted-foreground">Cek kunci data baru…</span>
  } else if (failed || !lock) {
    body = <span className="text-muted-foreground">Status kunci data baru tidak tersedia. Rapor tetap memakai kunci di server.</span>
  } else if (lock.locked && lock.holdout_start) {
    body = (
      <span>
        Data baru <span className="num font-semibold">{combo}</span> terkunci sejak{' '}
        <span className="num font-semibold">{formatDate(lock.holdout_start)}</span> · dipakai{' '}
        <span className={cn('num font-semibold', lock.touches >= 2 && 'text-warn')}>{lock.touches}×</span>
      </span>
    )
    tip = `Uji jujur hanya menilai hasil setelah tanggal itu.${lock.touches >= 2 ? ' Makin sering dipakai, makin kurang bisa dipercaya.' : ''}`
  } else {
    body = (
      <span>
        Data baru <span className="num font-semibold">{combo}</span> belum dikunci
        {proposedStart ? <> · uji jujur pertama mengunci data sejak ±<span className="num font-semibold">{formatDate(proposedStart)}</span></> : ' · uji jujur pertama mengunci ±20% data terakhir'}
      </span>
    )
    tip = 'Kunci berlaku untuk seterusnya: data setelah tanggal itu hanya dipakai untuk menilai, tidak untuk menyetel.'
  }
  const Icon = lock && lock.locked ? Lock : LockOpen
  return (
    <div className="space-y-2">
      <div className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm', lock?.locked ? 'border-lab/30 bg-lab/[0.07]' : 'border-border bg-muted/30')}>
        <Icon className="h-5 w-5 shrink-0 text-lab" aria-hidden="true" />
        <p className="min-w-0 flex-1">{body}</p>
        {tip && (
          <InfoTip title="Data baru (holdout)" label="Penjelasan kunci data baru" align="end">
            {tip}
          </InfoTip>
        )}
      </div>
      {periodError && (
        <p role="alert" className="flex items-start gap-2.5 rounded-2xl border border-bearish/40 bg-bearish/[0.08] px-4 py-3 text-sm text-bearish">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {periodError}
        </p>
      )}
    </div>
  )
}

/**
 * Step 3: one big primary action ("Uji jujur" on the current setting) and "Cari setting terbaik"
 * as the secondary action, which opens a warning first (research: optimising tends to overfit).
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
  const validateOff = disabled || needAck || Boolean(blockedReason)
  return (
    <div className="space-y-5">
      {holdout}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Button
            type="button"
            onClick={onValidate}
            disabled={validateOff}
            aria-describedby="run-validate-hint"
            className={cn(
              'h-14 w-full gap-2.5 rounded-full px-6 text-lg font-bold [&_svg]:size-5',
              !validateOff && 'shadow-[0_10px_32px_-8px] shadow-primary/60 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
            )}
          >
            {pendingMode === 'validate' ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Uji jujur
          </Button>
          <p id="run-validate-hint" className="text-center text-sm text-muted-foreground">
            Rapor Lolos/Gagal di data baru{estimate ? <> · <span className="num">{formatDuration(estimate.longest_s)}</span></> : null}
          </p>
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOptimize}
            disabled={disabled || Boolean(blockedReason)}
            aria-describedby="run-optimize-hint"
            className="h-14 w-full gap-2.5 rounded-full px-6 text-base font-semibold [&_svg]:size-5"
          >
            {pendingMode === 'optimize' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Cari setting terbaik
          </Button>
          <p id="run-optimize-hint" className="text-center text-sm text-muted-foreground">Termasuk uji jujur · sering cuma kebetulan</p>
        </div>
      </div>
      {blockedReason && <p className="text-sm text-bearish">{blockedReason}</p>}
      {submitError && (
        <p role="alert" className="rounded-2xl border border-bearish/40 bg-bearish/[0.08] px-4 py-3 text-sm text-bearish">{submitError}</p>
      )}
      <RuntimeEstimate estimate={estimate} loading={estimating} ack={ack} onAck={onAck} compact />
    </div>
  )
}
