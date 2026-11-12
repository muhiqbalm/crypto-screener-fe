import { StatusPill } from '@/components/ui/status-pill'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { cn } from '@/lib/utils/cn'
import { PRESET_STATUS_COPY, STATUS_COPY, type PresetStatus } from '@/lib/lab/arena'
import type { CheckStatus } from '@/lib/api/types/arena'

/**
 * Small pieces shared by Paper berjalan (Klasemen) and Preset. Server-safe.
 * Status is always icon + words, never colour alone.
 */

/** "12/30 transaksi" + bar. Progress only: there is no "siap live" verdict (CEO, 12 Nov 2026). */
export function PaperProgress({ n, of, className }: { n: number; of: number; className?: string }) {
  const pct = of > 0 ? Math.min(100, (n / of) * 100) : 0
  return (
    <div className={cn('min-w-[88px] space-y-1', className)}>
      <div className="num text-xs">
        {n}
        <span className="text-muted-foreground">/{of} transaksi</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={n}
        aria-valuemin={0}
        aria-valuemax={of}
        aria-label={`${n} dari ${of} transaksi paper`}
      >
        <div className="h-full rounded-full bg-lab" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const DRIFT_KIND = { sesuai: 'sehat', menyimpang: 'perlu_dicek', belum_cukup: 'menunggu', info: 'menunggu' } as const

/** "Sesuai uji?" answer for one preset or one check. */
export function DriftPill({ status, size = 'sm' }: { status: CheckStatus; size?: 'xs' | 'sm' }) {
  return <StatusPill kind={DRIFT_KIND[status]} label={STATUS_COPY[status].label} size={size} />
}

/** Belum diuji · Lolos · Gagal · Paper berjalan · Menyimpang (one pill per preset). */
export function PresetStatusPill({ status }: { status: PresetStatus }) {
  const copy = PRESET_STATUS_COPY[status.kind]
  if (status.kind === 'paper') return <StatusPill kind="paper" label={copy.label} />
  if (status.kind === 'menyimpang') return <StatusPill kind="perlu_dicek" label={copy.label} />
  return <VerdictBadge verdict={status.kind} />
}
