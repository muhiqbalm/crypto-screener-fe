import { AnswerCard } from '@/components/ui/answer-card'
import { Donut } from '@/components/ui/donut'
import { Freshness } from '@/components/ui/freshness'
import { LiveDot } from '@/components/ui/live-dot'
import { TONE_BG, TONE_TEXT, type Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'
import { BOT_ANSWER_TONE, type BotTone, type BotVerdict } from '@/lib/bot/status'
import type { LiveCheckReport } from '@/lib/api/types/livecheck'

const DOT: Record<BotTone, Tone> = { ok: 'bullish', warn: 'warn', bad: 'bearish', wait: 'muted' }

export interface SignalSplit {
  cocok: number
  hargaBeda: number
  /** Gagal / ditolak + tidak terkirim. */
  gagal: number
  /** Menunggu + tanpa log: not judged yet. */
  menunggu: number
  /** Webhook calls without a strategy signal (not in the ring: not a strategy signal). */
  takTerduga: number
  /** cocok + harga beda + gagal: the "dari N" of the verdict sentence. */
  judged: number
}

/**
 * Counts for the donut, from the same 7-day rows the verdict reads, in the same groups (and
 * colours) as the Cek bot live strip below: cocok, harga beda, gagal / tidak terkirim, menunggu.
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

/**
 * "Bot live aman?" as the page's answer hero (shared AnswerCard): the verdict sentence, three
 * big counts that double as the ring's legend, and the donut of the 7-day signals on the right.
 */
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
  const parts: Array<{ n: number; label: string; tone: Tone }> = [
    { n: split.cocok, label: 'Cocok', tone: 'bullish' },
    { n: split.hargaBeda, label: 'Harga beda', tone: 'warn' },
    { n: split.gagal, label: 'Gagal', tone: 'bearish' },
    { n: split.menunggu, label: 'Menunggu', tone: 'muted' },
  ]
  const ringLabel = [
    `${split.cocok} cocok`,
    `${split.hargaBeda} harga beda`,
    `${split.gagal} gagal atau tidak terkirim`,
    `${split.menunggu} menunggu`,
  ].join(', ')
  return (
    <AnswerCard
      tone={BOT_ANSWER_TONE[v.tone]}
      answer={v.sentence}
      className={cn('justify-between', className)}
      status={
        <span className="inline-flex items-center gap-2 text-3xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <LiveDot tone={DOT[v.tone]} pulse={v.tone !== 'wait'} label="Status bot live" />
          Bot live aman? · 7 hari
        </span>
      }
      metrics={parts.slice(0, 3).map((p) => ({
        label: (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', TONE_BG[p.tone])} aria-hidden="true" />
            {p.label}
          </span>
        ),
        value: p.n,
        valueClassName: p.n > 0 ? TONE_TEXT[p.tone] : 'text-muted-foreground',
      }))}
      aside={
        <Donut
          size={208}
          thickness={22}
          label={ringLabel}
          segments={parts.map((p) => ({ value: p.n, tone: p.tone, label: p.label.toLowerCase() }))}
          center={
            <div className="flex flex-col items-center">
              <span className="num display text-5xl font-extrabold leading-none">{split.judged ? `${split.cocok}/${split.judged}` : '—'}</span>
              <span className="mt-1.5 text-sm font-medium text-muted-foreground">{split.judged ? 'sinyal sesuai' : 'belum ada sinyal'}</span>
              {split.menunggu > 0 && <span className="text-xs text-muted-foreground">+{split.menunggu} menunggu</span>}
            </div>
          }
        />
      }
      evidenceHref="#cek"
      evidenceLabel={v.focus === 'masalah' ? 'Lihat yang bermasalah' : 'Lihat bukti'}
      footer={<Freshness dataLabel="Cek terakhir" dataAt={updatedAt} timeframe="4h" stale={stale} />}
    >
      {split.takTerduga > 0 && (
        <p className="text-sm text-muted-foreground">
          + <b className="num text-info">{split.takTerduga}</b> kiriman tak terduga (bukan sinyal strategi), lihat di Cek bot live.
        </p>
      )}
    </AnswerCard>
  )
}
