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
  masalah: number
  cek: number
  menunggu: number
  judged: number
}

/** Counts for the donut, from the same 7-day rows the verdict reads. */
export function splitSignals(r: LiveCheckReport | null | undefined): SignalSplit {
  const rows = r?.rows ?? []
  const n = (f: (s: string, perlu: boolean) => boolean) => rows.filter((x) => x.expected && f(x.status, x.perlu_dicek)).length
  const cocok = n((s) => s === 'cocok')
  const masalah = n((s, p) => (s === 'gagal' || s === 'tidak_terkirim') && !p)
  const cek = n((s, p) => s === 'harga_beda' || ((s === 'gagal' || s === 'tidak_terkirim') && p))
  const menunggu = n((s) => s === 'menunggu' || s === 'tanpa_log')
  return { cocok, masalah, cek, menunggu, judged: cocok + masalah + cek }
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
  const chips: Array<{ n: number; label: string; cls: string }> = [
    { n: split.cocok, label: 'cocok', cls: 'bg-bullish' },
    { n: split.masalah, label: 'bermasalah', cls: 'bg-bearish' },
    { n: split.cek, label: 'perlu dicek', cls: 'bg-warn' },
    { n: split.menunggu, label: 'menunggu', cls: 'bg-muted-foreground/50' },
  ]
  return (
    <HeroCard glow={s.tone} className={className} aria-label="Bot live aman?">
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

      <div className="mt-6 flex flex-col items-center gap-7 sm:flex-row sm:items-center">
        <Donut
          size={176}
          thickness={20}
          label={`${split.cocok} cocok, ${split.masalah} bermasalah, ${split.cek} perlu dicek, ${split.menunggu} menunggu`}
          segments={[
            { value: split.cocok, className: 'stroke-bullish', label: 'cocok' },
            { value: split.masalah, className: 'stroke-bearish', label: 'bermasalah' },
            { value: split.cek, className: 'stroke-warn', label: 'perlu dicek' },
            { value: split.menunggu, className: 'stroke-muted-foreground/40', label: 'menunggu' },
          ]}
        >
          <span className="num text-[44px] font-bold leading-none tracking-tight">
            {split.judged ? `${split.cocok}/${split.judged}` : '—'}
          </span>
          <span className="mt-1 text-[13px] font-medium text-muted-foreground">{split.judged ? 'sinyal sesuai' : 'belum ada sinyal'}</span>
        </Donut>

        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-[20px] font-semibold leading-snug sm:text-[22px]">{v.sentence}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Rincian sinyal 7 hari">
            {chips
              .filter((c) => c.n > 0 || c.label === 'cocok')
              .map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[15px]">
                  <span className={`h-2.5 w-2.5 rounded-[3px] ${c.cls}`} aria-hidden="true" />
                  <b className="num">{c.n}</b> <span className="text-muted-foreground">{c.label}</span>
                </li>
              ))}
          </ul>
          <Link href="#cek" className="inline-flex items-center gap-1 text-[15px] font-semibold text-info hover:underline">
            {v.focus === 'masalah' ? 'Lihat yang bermasalah' : 'Lihat bukti'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mt-6 border-t border-border/60 pt-3">
        <Freshness dataLabel="Cek terakhir" dataAt={updatedAt} timeframe="4h" stale={stale} />
      </div>
    </HeroCard>
  )
}
