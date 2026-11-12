'use client'

import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Activity, AlertTriangle, Bookmark, ChevronRight, LineChart, PlayCircle, Sparkles, Trophy } from 'lucide-react'
import { NextStep } from '@/components/ui/next-step'
import { Segmented } from '@/components/ui/segmented'
import { StatusPill } from '@/components/ui/status-pill'
import { Freshness } from '@/components/ui/freshness'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { ArenaEquityChart } from '@/components/lab/arena/ArenaEquityChart'
import { DriftPill } from '@/components/lab/arena/PaperBits'
import { PaperDetailSheet } from '@/components/lab/arena/PaperDetailSheet'
import { BigNumber, CardLink, CoinAvatar, CountUp, DeckCard, Meter, Pill, RankBadge, SectionHead, Spark, signTone, type Tone } from '@/components/lab/arena/deck'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatPct } from '@/lib/utils/format'
import { formatTimeframe } from '@/lib/utils/time'
import {
  HIGHLIGHT_PARAM,
  REVIEW_MIN_TRADES,
  STATUS_COPY,
  arenaAnswer,
  arenaRowFor,
  baseSlots,
  groupRows,
  groupSeries,
  isRunning,
  parseHighlight,
  sortRows,
  strategyLabel,
  type ArenaGroupMode,
} from '@/lib/lab/arena'
import { useArenaCurves, useArenaReport } from '@/lib/queries/arena'
import type { ArenaReport, ArenaRow } from '@/lib/api/types/arena'

const TONE_OF: Record<string, Tone> = { baik: 'bullish', perlu_dicek: 'warn', menunggu: 'muted', info: 'info' }
const TONE_WORD: Record<string, string> = { baik: 'Baik', perlu_dicek: 'Perlu dicek', menunggu: 'Menunggu data', info: 'Info' }

const pct2 = (v: number) => formatPct(v, { digits: 2, signed: true })

/** One leaderboard row: rank, coin, equity sparkline, P/L and DD as big numbers, x/30 bar, "Sesuai uji?". */
function LeaderRow({ row, rank, reviewN, spark, highlighted, onOpen }: { row: ArenaRow; rank: number; reviewN: number; spark: number[]; highlighted: boolean; onOpen: () => void }) {
  const s = row.stats
  const outline = row.drift.status === 'menyimpang' ? 'warn' : undefined
  return (
    <DeckCard onClick={onOpen} ariaLabel={`Detail ${row.preset.name}`} outline={outline} highlighted={highlighted} bodyClassName="p-5 sm:p-6">
      <div className="grid items-center gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1.7fr)_140px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_20px]">
        <div className="flex min-w-0 items-center gap-3">
          <RankBadge rank={rank} />
          <CoinAvatar coin={row.preset.coin} />
          <div className="min-w-0">
            <div className="font-display truncate text-lg font-semibold tracking-tight">{row.preset.name}</div>
            <div className="truncate text-[13px] text-muted-foreground">
              {strategyLabel(row.preset.template_id)} · {formatTimeframe(row.preset.timeframe)}
              {row.preset.live_reference && ' · setting bot live'}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
              <DriftPill status={row.drift.status} />
              {!isRunning(row) && <Pill tone="muted">Paper mati</Pill>}
            </div>
          </div>
        </div>
        <Spark values={spark} width={140} height={44} label={`Kurva modal ${row.preset.name}`} className="hidden lg:block" />
        <BigNumber label="Hasil" value={<CountUp value={s.return_pct ?? 0} format={pct2} />} tone={signTone(s.return_pct)} size="sm" />
        <BigNumber
          label="Drawdown"
          value={s.max_dd_pct === null ? '—' : formatPct(-Math.abs(s.max_dd_pct), { digits: 1 })}
          tone={s.max_dd_pct ? 'bearish' : 'muted'}
          size="sm"
        />
        <div className="min-w-0 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Transaksi</span>
            <span className="font-display text-lg font-bold tabular-nums">
              {s.n_closed}
              <span className="text-sm font-medium text-muted-foreground">/{reviewN}</span>
            </span>
          </div>
          <Meter value={s.n_closed} max={reviewN} label={`${s.n_closed} dari ${reviewN} transaksi paper`} />
          <div className="hidden flex-wrap gap-1.5 lg:flex">
            <DriftPill status={row.drift.status} />
            {!isRunning(row) && <Pill tone="muted">Paper mati</Pill>}
          </div>
        </div>
        <ChevronRight className="hidden h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 lg:block" aria-hidden="true" />
      </div>
    </DeckCard>
  )
}

function Curves({ mode }: { mode: ArenaGroupMode }) {
  const q = useArenaCurves()
  const series = useMemo(() => q.data?.series ?? [], [q.data])
  const slots = useMemo(() => baseSlots(series.map((s) => s.base)), [series])
  const groups = useMemo(() => groupSeries(series, mode), [series, mode])
  return (
    <DeckCard icon={LineChart} iconTone="lab" title="Kurva modal" action={<span className="hidden text-[13px] text-muted-foreground sm:inline">% sejak saldo awal</span>}>
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Kurva modal tidak bisa dimuat" compact />
      ) : !series.length ? (
        <p className="text-[15px] text-muted-foreground">Belum ada preset paper.</p>
      ) : (
        <div className={cn('grid gap-6', mode !== 'all' && 'lg:grid-cols-2')}>
          {groups.map((g) => (
            <div key={g.key} className="min-w-0 space-y-2">
              {mode !== 'all' && <div className="text-sm font-semibold">{g.label}</div>}
              <ArenaEquityChart series={g.items} slots={slots} height={mode === 'all' ? 'h-[300px] sm:h-[440px]' : 'h-[280px]'} />
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[13px] text-muted-foreground">Garis penuh = ukuran 2×, putus-putus = 1×, titik-titik = ikut gejolak (VT60).</p>
    </DeckCard>
  )
}

function Method({ r }: { r: ArenaReport }) {
  return (
    <details className="rounded-3xl border bg-card px-6 py-4">
      <summary className="cursor-pointer select-none text-[17px] font-semibold tracking-tight">Bagaimana &quot;Sesuai uji?&quot; dinilai</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
        <li>Hasil paper dibandingkan dengan hasil uji preset di data baru (holdout).</li>
        <li>Empat cek: jumlah transaksi, persentase menang, hasil per transaksi, turun terdalam. Tiap cek punya rentang wajar.</li>
        <li>
          <b className="text-foreground">Menyimpang</b> = minimal satu cek keluar rentang. Satu tanda bisa kebetulan (±1 dari 20 per cek).
        </li>
        <li>
          <b className="text-foreground">Sesuai uji</b> baru diberikan setelah {r.review_min_trades} transaksi dan semua cek dalam rentang.
        </li>
        <li>Data uji sudah sering dilihat saat riset: anggap petunjuk, bukan target.</li>
      </ul>
    </details>
  )
}

/**
 * Paper berjalan → Klasemen. `/lab/arena?highlight=<presetId>` marks that preset and shows a
 * "baru dimulai" note on top: "Mulai paper" (Preset page) and "Simpan sebagai preset & mulai
 * paper" (run detail) navigate here with it. Needs a Suspense boundary (useSearchParams).
 */
export function ArenaView() {
  const q = useArenaReport()
  const curvesQ = useArenaCurves()
  const highlight = parseHighlight(useSearchParams().get(HIGHLIGHT_PARAM))
  const [mode, setMode] = useState<ArenaGroupMode>('all')
  const [openId, setOpenId] = useState<number | null>(null)
  const sparks = useMemo(() => {
    const m = new Map<number, number[]>()
    for (const s of curvesQ.data?.series ?? []) m.set(s.preset_id, s.points.slice(-40).map((p) => p.equity))
    return m
  }, [curvesQ.data])

  if (q.isPending) return <LoadingState rows={8} label="Memuat Paper berjalan…" />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Paper berjalan tidak bisa dimuat" />
  const r = q.data
  const reviewN = r.review_min_trades || REVIEW_MIN_TRADES
  const a = arenaAnswer(r)
  const ranked = sortRows(r.rows)
  const rankOf = new Map(ranked.map((row, i) => [row.preset.id, i + 1]))
  const groups = groupRows(ranked, mode)
  const picked = highlight ? arenaRowFor(highlight, r.rows) : null
  const openRow = openId === null ? null : arenaRowFor(openId, r.rows)
  const tone = TONE_OF[a.tone] ?? 'info'

  return (
    <div className="space-y-8">
      {highlight !== null &&
        (picked ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand/40 bg-brand/10 p-5 text-[15px]">
            <p className="flex min-w-0 items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <b>{picked.preset.name}</b> berjalan di paper:{' '}
                {picked.stats.n_closed === 0 && !picked.open_position
                  ? `transaksi pertama muncul setelah sinyal berikutnya (cek tiap candle ${formatTimeframe(picked.preset.timeframe)}).`
                  : `${picked.stats.n_closed}/${reviewN} transaksi, ${STATUS_COPY[picked.drift.status].label.toLowerCase()}.`}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setOpenId(picked.preset.id)}
              className="shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold hover:bg-accent"
            >
              Lihat detail
            </button>
          </div>
        ) : (
          <div role="status" className="rounded-3xl border border-dashed p-5 text-[15px] text-muted-foreground">
            Preset #{highlight} belum ada di Paper berjalan. Mulai dari halaman Preset.
          </div>
        ))}

      {r.rows.length === 0 ? (
        <NextStep
          title="Belum ada preset di paper"
          description="Pilih preset yang lolos uji, lalu tekan Mulai paper."
          action={{ label: 'Buka Preset', href: '/lab/presets', icon: Bookmark }}
        />
      ) : (
        <>
          {/* bento: answer (hero) + three numbers */}
          <div className="grid gap-5 lg:grid-cols-4">
            <DeckCard
              hero
              icon={a.drifting.length ? AlertTriangle : Activity}
              iconTone={tone}
              eyebrow="Jawaban"
              action={<StatusPill kind="paper" />}
              className="lg:col-span-2 lg:row-span-2"
            >
              <p className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{a.text}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <Pill tone={tone}>{TONE_WORD[a.tone] ?? 'Info'}</Pill>
                <CardLink href="#klasemen">Lihat klasemen</CardLink>
              </div>
              <div className="mt-4 text-[13px] text-muted-foreground">
                <Freshness updatedAt={r.generated_at} />
              </div>
            </DeckCard>
            <DeckCard icon={PlayCircle} iconTone="lab" title="Berjalan">
              <BigNumber label="Preset di paper" value={<CountUp value={a.running} format={(v) => formatCount(Math.round(v))} />} size="lg" hint={`${r.rows.length} punya akun simulasi`} />
            </DeckCard>
            <DeckCard icon={AlertTriangle} iconTone={a.drifting.length ? 'warn' : 'muted'} title="Menyimpang">
              <BigNumber
                label="Dari hasil uji"
                value={<CountUp value={a.drifting.length} format={(v) => formatCount(Math.round(v))} />}
                tone={a.drifting.length ? 'warn' : undefined}
                size="lg"
                hint={a.drifting.length ? a.drifting.map((x) => x.preset.name).join(', ') : 'semua masih dalam rentang'}
              />
            </DeckCard>
            <DeckCard icon={Trophy} iconTone="info" title="Transaksi tertutup" className="lg:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <BigNumber label="Semua preset" value={<CountUp value={a.closedTotal} format={(v) => formatCount(Math.round(v))} />} size="lg" />
                <div className="min-w-[200px] flex-1 space-y-2">
                  <div className="flex justify-between text-[13px] text-muted-foreground">
                    <span>Terbanyak per preset</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {a.maxClosed}/{reviewN}
                    </span>
                  </div>
                  <Meter value={a.maxClosed} max={reviewN} label={`Terbanyak ${a.maxClosed} dari ${reviewN} transaksi`} />
                </div>
              </div>
            </DeckCard>
          </div>

          <section className="space-y-4">
            <SectionHead
              id="klasemen"
              icon={Trophy}
              title="Klasemen"
              sub="Urut hasil tertinggi. Ketuk satu baris untuk detail."
              action={
                <Segmented<ArenaGroupMode>
                  aria-label="Kelompokkan preset"
                  size="sm"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'all', label: 'Semua' },
                    { value: 'coin', label: 'Per koin' },
                    { value: 'family', label: 'Per ukuran' },
                  ]}
                />
              }
            />
            <div className="space-y-3">
              {groups.map((g) => (
                <Fragment key={g.key}>
                  {mode !== 'all' && <div className="pt-2 text-sm font-semibold text-muted-foreground">{`${g.label} · ${g.items.length} preset`}</div>}
                  {g.items.map((row) => (
                    <LeaderRow
                      key={row.preset.id}
                      row={row}
                      rank={rankOf.get(row.preset.id) ?? 0}
                      reviewN={reviewN}
                      spark={sparks.get(row.preset.id) ?? []}
                      highlighted={row.preset.id === highlight}
                      onOpen={() => setOpenId(row.preset.id)}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
          </section>

          <Curves mode={mode} />
          <Method r={r} />
        </>
      )}

      <PaperDetailSheet row={openRow} reviewN={reviewN} onClose={() => setOpenId(null)} />
    </div>
  )
}
