import {
  Archive,
  CheckCircle2,
  Clock,
  FlaskConical,
  Microscope,
  Radio,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * Mode pills mark where a number comes from; health pills say how something is.
 *
 *   live        LIVE         real money on the exchange
 *   paper       PAPER        simulation, no real orders
 *   riset       RISET        research / Lab result, not used by the bot
 *   arsip       ARSIP        retired feature, data kept read-only
 *   sehat       Sehat        all good
 *   perlu_dicek Perlu dicek  look at it (warn)
 *   bermasalah  Bermasalah   broken / failed
 *   menunggu    Menunggu data not enough data yet
 *
 * Always icon + text (colour is never the only signal). Server-safe.
 */
export type StatusKind = 'live' | 'paper' | 'riset' | 'arsip' | 'sehat' | 'perlu_dicek' | 'bermasalah' | 'menunggu'

export const STATUS_PILL: Record<StatusKind, { label: string; title: string; Icon: LucideIcon; className: string }> = {
  live: {
    label: 'LIVE',
    title: 'LIVE: uang asli di exchange',
    Icon: Radio,
    className: 'border-foreground/80 bg-foreground text-background',
  },
  paper: {
    label: 'PAPER',
    title: 'PAPER: simulasi, tidak ada order sungguhan',
    Icon: FlaskConical,
    className: 'border-lab/35 bg-lab/10 text-lab',
  },
  riset: {
    label: 'RISET',
    title: 'RISET: hasil uji Lab, belum dipakai bot live',
    Icon: Microscope,
    className: 'border-info/35 bg-info/10 text-info',
  },
  arsip: {
    label: 'ARSIP',
    title: 'ARSIP: fitur lama, data hanya untuk dibaca',
    Icon: Archive,
    className: 'border-border bg-muted/60 text-muted-foreground',
  },
  sehat: { label: 'Sehat', title: 'Sehat', Icon: CheckCircle2, className: 'border-bullish/35 bg-bullish/10 text-bullish' },
  perlu_dicek: { label: 'Perlu dicek', title: 'Perlu dicek', Icon: TriangleAlert, className: 'border-warn/40 bg-warn/10 text-warn' },
  bermasalah: { label: 'Bermasalah', title: 'Bermasalah', Icon: XCircle, className: 'border-bearish/40 bg-bearish/10 text-bearish' },
  menunggu: { label: 'Menunggu data', title: 'Menunggu data', Icon: Clock, className: 'border-border bg-muted/50 text-muted-foreground' },
}

export interface StatusPillProps {
  kind: StatusKind
  /** Override the visible text (keep the meaning, e.g. "LIVE · ETH 4H"). */
  label?: React.ReactNode
  size?: 'xs' | 'sm'
  className?: string
}

export function StatusPill({ kind, label, size = 'sm', className }: StatusPillProps) {
  const s = STATUS_PILL[kind]
  const mode = kind === 'live' || kind === 'paper' || kind === 'riset' || kind === 'arsip'
  return (
    <span
      title={s.title}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-semibold leading-none',
        size === 'xs' ? 'h-4 px-1.5 text-3xs [&_svg]:size-2.5' : 'h-5 px-2 text-2xs [&_svg]:size-3',
        mode && 'font-mono tracking-wide',
        s.className,
        className,
      )}
    >
      <s.Icon aria-hidden="true" />
      {label ?? s.label}
      {mode && <span className="sr-only">{` (${s.title.split(': ')[1]})`}</span>}
    </span>
  )
}
