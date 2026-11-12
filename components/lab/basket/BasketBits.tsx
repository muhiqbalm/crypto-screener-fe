import { CheckCircle2, CircleDashed, Clock, FlaskConical, Hourglass, Layers, OctagonX, PlayCircle, ShieldAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Meter, Pill, type Tone } from '@/components/lab/arena/deck'
import { cn } from '@/lib/utils/cn'
import { COIN_STATUS_COPY, OUTCOME_COPY, gateItems } from '@/lib/lab/basket'
import type { BasketCoinStatus, BasketGate, BasketOutcome } from '@/lib/api/types/basket'

/**
 * Small pieces shared by the basket entry in Paper berjalan, its detail sheet and the Preset
 * page. Status is always icon + words, never colour alone (DESIGN.md §1.4).
 */

const OUTCOME_ICON: Record<BasketOutcome, LucideIcon> = {
  BELUM: Hourglass,
  LANJUT: PlayCircle,
  LULUS: CheckCircle2,
  GAGAL: OctagonX,
  TIDAK_SAH: ShieldAlert,
  TIDAK_CUKUP_DATA: TriangleAlert,
}

/** The pre-registered outcome so far (Mengumpulkan data · Lanjut · Lulus · Gagal · Tidak sah · Tidak cukup data). */
export function OutcomePill({ status, className }: { status: BasketOutcome; className?: string }) {
  const c = OUTCOME_COPY[status]
  return (
    <Pill tone={c.tone as Tone} icon={OUTCOME_ICON[status]} className={className}>
      {c.label}
    </Pill>
  )
}

const COIN_ICON: Record<BasketCoinStatus, LucideIcon> = {
  posisi_terbuka: FlaskConical,
  menunggu_sinyal_baru: Clock,
  menunggu_sinyal: CircleDashed,
  belum_dihitung: CircleDashed,
  error: TriangleAlert,
  paper_mati: TriangleAlert,
  watch_hilang: OctagonX,
}

export function CoinStatusPill({ status }: { status: BasketCoinStatus }) {
  const c = COIN_STATUS_COPY[status]
  return (
    <Pill tone={c.tone as Tone} icon={COIN_ICON[status]}>
      {c.label}
    </Pill>
  )
}

/** "Basket" mark: a stack icon with the coin count, where a preset shows its coin avatar. */
export function BasketAvatar({ n, size = 40 }: { n: number; size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-lab/40 bg-lab/12 text-lab"
      style={{ width: size, height: size }}
      aria-label={`Basket ${n} koin`}
    >
      <Layers className="h-5 w-5" aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 rounded-full border bg-background px-1.5 text-[12px] font-bold leading-5 tabular-nums text-foreground">{n}</span>
    </span>
  )
}

/** Honest note: the strategy holds a position from before paper started, so paper waits. */
export function PrePaperHint({ text, className }: { text: string | null; className?: string }) {
  if (!text) return null
  return (
    <p className={cn('flex items-start gap-2 text-[13px] leading-snug text-info', className)}>
      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </p>
  )
}

/** The four checkpoint-1 conditions with a bar each (praregistrasi §6). */
export function GateChecklist({ gate, className }: { gate: BasketGate; className?: string }) {
  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {gateItems(gate).map((g) => (
        <li key={g.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[14px]">
            <span className="flex items-center gap-1.5">
              {g.done ? <CheckCircle2 className="h-4 w-4 text-bullish" aria-hidden="true" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              {g.label}
            </span>
            <span className="font-semibold tabular-nums">
              {g.have}
              <span className="font-normal text-muted-foreground">/{g.need}</span>
            </span>
          </div>
          <Meter value={Math.min(g.have, g.need)} max={g.need} tone={g.done ? 'bullish' : 'lab'} label={`${g.label}: ${g.have} dari ${g.need}`} />
        </li>
      ))}
    </ul>
  )
}
