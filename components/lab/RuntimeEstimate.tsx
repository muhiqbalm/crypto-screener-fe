'use client'

import { AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { estimateLevel, formatDuration, needsAck } from '@/lib/lab/planning'
import type { LabEstimate } from '@/lib/api/types/lab-insights'

/**
 * Runtime estimate shown before queueing a run or scan. Long jobs get a
 * warning; jobs near or over their timeout need an explicit acknowledgement
 * (`ack`) before the submit button is enabled.
 */
export function RuntimeEstimate({
  estimate,
  loading,
  scan = false,
  ack,
  onAck,
  compact = false,
  className,
}: {
  estimate: LabEstimate | null | undefined
  loading?: boolean
  scan?: boolean
  ack: boolean
  onAck: (v: boolean) => void
  /** One line (time + queue) unless the job is long or near its timeout. */
  compact?: boolean
  className?: string
}) {
  if (!estimate) {
    return loading ? (
      <p className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-4 w-4 animate-spin" /> Menghitung perkiraan waktu…
      </p>
    ) : null
  }
  const level = estimateLevel(estimate)
  const e = estimate
  const tfParts = Object.entries(e.by_timeframe).map(([tf, v]) => `${tf} ${formatDuration(v.seconds_each)}`)
  const head = scan
    ? `${formatDuration(e.wall_s)} total · ${e.cells.length} kombinasi${e.parallel > 1 ? ` · ${e.parallel} paralel` : ' · berurutan'}`
    : `${formatDuration(e.longest_s)} per run`
  const wait = e.queue.wait_s > 0 ? `Antrian: ${e.queue.ahead_jobs} job di depan, mulai ${formatDuration(e.queue.wait_s)} lagi.` : 'Slot kosong — langsung jalan.'
  if (compact && level === 'ok') {
    return (
      <p className={cn('flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground', className)} role="status">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="num font-semibold text-foreground">Perkiraan {head}</span>
        <span aria-hidden="true">·</span>
        <span>{wait}</span>
      </p>
    )
  }
  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border px-4 py-3 text-sm',
        level === 'ok' && 'border-border bg-muted/30 text-muted-foreground',
        level === 'long' && 'border-warn/30 bg-warn/[0.07] text-muted-foreground',
        (level === 'danger' || level === 'over') && 'border-warn/50 bg-warn/10 text-warn',
        className,
      )}
      role="status"
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="num text-[15px] font-semibold text-foreground">Perkiraan {head}</span>
        {scan && tfParts.length > 0 && <span className="num">({tfParts.join(', ')} per koin)</span>}
        {!e.calibrated && <span title="Belum cukup run selesai di server ini untuk kalibrasi">· dari tarif terukur</span>}
      </p>
      <p>
        {wait} Selesai {formatDuration(e.eta_done_s)} lagi. Batas waktu per job {formatDuration(e.timeout_s).replace('±', '')}.
      </p>
      {level === 'long' && <p>Job panjang. Boleh ditinggal — hasilnya tersimpan di riwayat.</p>}
      {(level === 'danger' || level === 'over') && (
        <div className="space-y-1.5">
          <p className="flex items-start gap-1.5 font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {level === 'over'
              ? `Perkiraan melewati batas waktu job (${e.exceeds_timeout.slice(0, 3).join(', ')}${e.exceeds_timeout.length > 3 ? '…' : ''}) — kemungkinan besar dihentikan sebelum selesai. Perpendek periode atau kurangi percobaan.`
              : 'Perkiraan mendekati batas waktu job — bisa dihentikan sebelum selesai. Perpendek periode atau kurangi percobaan.'}
          </p>
          {needsAck(level) && (
            <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-foreground">
              <input type="checkbox" checked={ack} onChange={(ev) => onAck(ev.target.checked)} className="h-5 w-5 accent-current" />
              Saya paham, tetap jalankan
            </label>
          )}
        </div>
      )}
    </div>
  )
}
