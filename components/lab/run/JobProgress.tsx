'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDuration } from '@/lib/lab/planning'
import type { LabJob } from '@/lib/api/types/lab'

function stageLabel(stage: string | null | undefined): string {
  const map: Record<string, string> = {
    queued: 'Menunggu antrian',
    data: 'Menyiapkan data',
    download: 'Mengunduh data',
    optimize: 'Mencari parameter',
    walk_forward: 'Walk-forward',
    backtest: 'Backtest',
    sensitivity: 'Uji sensitivitas',
    holdout: 'Ujian holdout',
    monte_carlo: 'Monte Carlo',
    report: 'Menyusun rapor',
  }
  return stage ? (map[stage] ?? stage.replace(/_/g, ' ')) : 'Memproses'
}

export function JobProgress({ job, status }: { job: LabJob | undefined; status: string }) {
  const p = job && typeof job.progress === 'object' && job.progress ? job.progress : null
  const total = p?.total ?? 0
  const done = p?.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null
  return (
    <div className="space-y-2 rounded-xl border border-info/30 bg-info/[0.07] p-4" role="status">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-info" />
          {status === 'queued' ? 'Menunggu antrian…' : `${stageLabel(p?.stage)}…`}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {p?.trials_total ? `trial ${p.trials_done ?? 0}/${p.trials_total}` : total > 0 ? `${done}/${total}` : ''}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
        <div
          className={cn('h-full rounded-full bg-info transition-all', pct === null && 'w-1/3 animate-pulse')}
          style={pct !== null ? { width: `${pct}%` } : undefined}
        />
      </div>
      <JobEta job={job} status={status} />
      <p className="text-2xs text-muted-foreground">Halaman update otomatis. Boleh ditinggal — hasilnya tersimpan di riwayat run.</p>
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
    <p className={cn('num text-2xs', overrun ? 'text-warn' : 'text-muted-foreground')}>
      {line}
      {overrun && ' — mendekati batas waktu, job akan dihentikan otomatis kalau lewat.'}
    </p>
  )
}
