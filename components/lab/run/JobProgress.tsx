'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDuration } from '@/lib/lab/planning'
import type { LabJob } from '@/lib/api/types/lab'
import { stageLabel } from './copy'

export function JobProgress({ job, status }: { job: LabJob | undefined; status: string }) {
  const p = job && typeof job.progress === 'object' && job.progress ? job.progress : null
  const total = p?.total ?? 0
  const done = p?.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null
  return (
    <div className="flex flex-col justify-center gap-3 rounded-3xl border border-info/30 bg-info/[0.07] p-6" role="status">
      <div className="flex flex-wrap items-center justify-between gap-2 text-base">
        <span className="flex items-center gap-2 font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-info motion-reduce:animate-none" />
          {status === 'queued' ? 'Menunggu antrian…' : `${stageLabel(p?.stage)}…`}
        </span>
        <span className="num text-sm text-muted-foreground">
          {p?.trials_total ? `percobaan ${p.trials_done ?? 0}/${p.trials_total}` : total > 0 ? `${done}/${total}` : ''}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
        <div
          className={cn('h-full rounded-full bg-info transition-all', pct === null && 'w-1/3 animate-pulse')}
          style={pct !== null ? { width: `${pct}%` } : undefined}
        />
      </div>
      <JobEta job={job} status={status} />
      <p className="text-sm text-muted-foreground">Boleh ditinggal; hasilnya tersimpan di Hasil uji.</p>
    </div>
  )
}

/** Queue position + ETA (backend simulation of the worker queue; an estimate, not a promise). */
export function etaLine(job: LabJob | undefined, status: string): string | null {
  if (!job) return null
  const parts: string[] = []
  if (status === 'queued') {
    if (job.queue_position) parts.push(`Posisi antrian #${job.queue_position}`)
    if (typeof job.eta_start_s === 'number') parts.push(job.eta_start_s < 60 ? 'mulai sebentar lagi' : `mulai ${formatDuration(job.eta_start_s)} lagi`)
  } else if (typeof job.elapsed_s === 'number') {
    parts.push(`sudah ${formatDuration(job.elapsed_s).replace('±', '')}`)
  }
  if (typeof job.eta_done_s === 'number') parts.push(`perkiraan selesai ${formatDuration(job.eta_done_s)} lagi`)
  if (typeof job.timeout_s === 'number') parts.push(`batas waktu ${formatDuration(job.timeout_s).replace('±', '')}`)
  return parts.length ? parts.join(' · ') : null
}

function JobEta({ job, status }: { job: LabJob | undefined; status: string }) {
  const line = etaLine(job, status)
  const overrun =
    status === 'running' && typeof job?.elapsed_s === 'number' && typeof job?.timeout_s === 'number' && job.elapsed_s > job.timeout_s * 0.8
  if (!line) return null
  return (
    <p className={cn('num text-sm', overrun ? 'text-warn' : 'text-muted-foreground')}>
      {line}
      {overrun && ' — mendekati batas waktu, job akan dihentikan otomatis kalau lewat.'}
    </p>
  )
}
