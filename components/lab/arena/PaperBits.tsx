import { CheckCircle2, CircleDashed, Clock, FlaskConical, Info, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react'
import { Meter, Pill, type Tone } from '@/components/lab/arena/deck'
import { cn } from '@/lib/utils/cn'
import { PRESET_STATUS_COPY, STATUS_COPY, type PresetStatus } from '@/lib/lab/arena'
import type { CheckStatus } from '@/lib/api/types/arena'

/**
 * Small pieces shared by Paper berjalan (Klasemen) and Preset.
 * Status is always icon + words, never colour alone.
 */

/** "12/30 transaksi" + bar. Progress only: there is no "siap live" verdict (CEO, 12 Nov 2026). */
export function PaperProgress({ n, of, className }: { n: number; of: number; className?: string }) {
  return (
    <div className={cn('min-w-[120px] space-y-2', className)}>
      <div className="text-[15px] tabular-nums">
        <span className="font-semibold">{n}</span>
        <span className="text-muted-foreground">/{of} transaksi</span>
      </div>
      <Meter value={n} max={of} label={`${n} dari ${of} transaksi paper`} />
    </div>
  )
}

const DRIFT: Record<CheckStatus, { tone: Tone; icon: LucideIcon }> = {
  sesuai: { tone: 'bullish', icon: CheckCircle2 },
  menyimpang: { tone: 'warn', icon: TriangleAlert },
  belum_cukup: { tone: 'muted', icon: Clock },
  info: { tone: 'muted', icon: Info },
}

/** "Sesuai uji?" answer for one preset or one check. */
export function DriftPill({ status, className }: { status: CheckStatus; size?: 'xs' | 'sm'; className?: string }) {
  const d = DRIFT[status]
  return (
    <Pill tone={d.tone} icon={d.icon} className={className}>
      {STATUS_COPY[status].label}
    </Pill>
  )
}

const PRESET: Record<PresetStatus['kind'], { tone: Tone; icon: LucideIcon }> = {
  belum_diuji: { tone: 'muted', icon: CircleDashed },
  lolos: { tone: 'bullish', icon: CheckCircle2 },
  gagal: { tone: 'bearish', icon: XCircle },
  paper: { tone: 'lab', icon: FlaskConical },
  menyimpang: { tone: 'warn', icon: TriangleAlert },
}

/** Belum diuji · Lolos · Gagal · Paper berjalan · Menyimpang (one big pill per preset). */
export function PresetStatusPill({ status }: { status: PresetStatus }) {
  const s = PRESET[status.kind]
  return (
    <Pill tone={s.tone} icon={s.icon}>
      {PRESET_STATUS_COPY[status.kind].label}
    </Pill>
  )
}
