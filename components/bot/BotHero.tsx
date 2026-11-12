import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, TriangleAlert, XCircle } from 'lucide-react'
import type { BotTone, BotVerdict } from '@/lib/bot/status'
import type { LiveCheckReport } from '@/lib/api/types/livecheck'
import { Freshness } from '@/components/ui/freshness'
import { Donut } from './kit/Donut'
import { LiveDot } from './kit/LiveDot'
import { BigPill, HeroCard, type Tone } from './kit/Tiles'

const VERDICT: Record<BotTone, { tone: Tone; word: string; Icon: typeof CheckCircle2 }> = {
  ok: { tone: 'ok', word: 'Aman', Icon: CheckCircle2 },
  warn: { tone: 'warn', word: 'Perlu dicek', Icon: TriangleAlert },
  bad: { tone: 'bad', word: 'Belum aman', Icon: XCircle },
  wait: { tone: 'muted', word: 'Menunggu data', Icon: Clock },
}

export interface SignalSplit {
  cocok: number
  hargaBeda: number
  /** Gagal / ditolak + tidak terkirim. */
  gagal: number
  /** Menunggu + tanpa log: not judged yet. */
  menunggu: number
  /** Webhook calls without a strategy signal (not part of the ring: not a strategy signal). */
  takTerduga: number
  /** cocok + harga beda + gagal: the "dari N" of the verdict sentence. */
  judged: number
}

/**
 * Counts for the donut, from the same 7-day rows the verdict reads, in the same four groups
 * (and colours) as the Cek bot live strip below: cocok, harga beda, gagal / tidak terkirim, menunggu.
 */
export function splitSignals(r: LiveCheckReport | null | undefined): SignalSplit {
  const rows = r?.rows ?? []
  const n = (...st: string[]) => rows.filter((x) => x.expected && st.includes(x.status)).length
  const cocok = n('cocok')
  const hargaBeda = n('harga_beda')
  const gagal = n('gagal', 'tidak_terkirim')
  const menunggu = n('menunggu', 'tanpa_log')
  const takTerduga = rows.filter((x) => x.status === 'tak_terduga').length
  return { cocok, hargaBeda, gagal, menunggu, takTerduga, judged: cocok + hargaBeda + gagal }
}

/** "Bot live aman?" as a hero: verdict pill + pulsing dot, donut with the big ratio, one sentence. */
export function BotHero({
  v,
  split,
  updatedAt,
  stale,
  className,
}: {
  v: BotVerdict
  split: SignalSplit
  updatedAt?: string
  stale: boolean
  className?: string
}) {
  const s = VERDICT[v.tone]
  const live = v.tone === 'ok' ? 'ok' : v.tone === 'bad' ? 'bad' : v.tone === 'warn' ? 'warn' : 'off'
  // Same words and colours as the Cek bot live legend, so the ring and the strip read alike.
  const parts: Array<{ n: number; label: string; bg: string; stroke: string }> = [
    { n: split.cocok, label: 'cocok', bg: 'bg-bullish', stroke: 'stroke-bullish' },
    { n: split.hargaBeda, label: 'harga beda', bg: 'bg-warn', stroke: 'stroke-warn' },
    { n: split.gagal, label: 'gagal / tidak terkirim', bg: 'bg-bearish', stroke: 'stroke-bearish' },
    { n: split.menunggu, label: 'menunggu', bg: 'bg-muted-foreground/50', stroke: 'stroke-muted-foreground/40' },
  ]
  return (
    <HeroCard glow={s.tone} className={className} aria-label="Bot live aman?">
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <LiveDot tone={live} label={`Status bot: ${s.word}`} />
            Bot live aman? · 7 hari
          </p>
          <BigPill tone={s.tone}>
            <s.Icon aria-hidden="true" />
            {s.word}
          </BigPill>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-6 sm:flex-row sm:gap-9">
          <Donut
            size={216}
            thickness={24}
            label={parts.map((p) => `${p.n} ${p.label.replace(' / ', ' atau ')}`).join(', ')}
            segments={parts.map((p) => ({ value: p.n, className: p.stroke, label: p.label }))}
          >
            <span className="num text-[52px] font-bold leading-none tracking-tight">
              {split.judged ? `${split.cocok}/${split.judged}` : '—'}
            </span>
            <span className="mt-1.5 text-[14px] font-medium text-muted-foreground">{split.judged ? 'sinyal sesuai' : 'belum ada sinyal'}</span>
          </Donut>

          <div className="min-w-0 flex-1 space-y-5">
            <p className="text-[20px] font-semibold leading-snug sm:text-[24px]">{v.sentence}</p>
            <ul className="grid grid-cols-2 gap-x-5 gap-y-2" aria-label="Rincian sinyal 7 hari">
              {parts.map((p) => (
                <li key={p.label} className="flex items-center gap-2 text-[15px]">
                  <span className={`h-3 w-3 shrink-0 rounded-[4px] ${p.bg}`} aria-hidden="true" />
                  <b className="num">{p.n}</b> <span className="text-muted-foreground">{p.label}</span>
                </li>
              ))}
              {split.takTerduga > 0 && (
                <li className="flex items-center gap-2 text-[15px]">
                  <span className="h-3 w-3 shrink-0 rounded-[4px] bg-info" aria-hidden="true" />
                  <b className="num">{split.takTerduga}</b> <span className="text-muted-foreground">tak terduga</span>
                </li>
              )}
            </ul>
            <Link
              href="#cek"
              className="inline-flex items-center gap-1.5 rounded-full border border-info/40 bg-info/10 px-4 py-2 text-[15px] font-semibold text-info transition hover:bg-info/20"
            >
              {v.focus === 'masalah' ? 'Lihat yang bermasalah' : 'Lihat bukti'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="border-t border-border/60 pt-3">
          <Freshness dataLabel="Cek terakhir" dataAt={updatedAt} timeframe="4h" stale={stale} />
        </div>
      </div>
    </HeroCard>
  )
}
