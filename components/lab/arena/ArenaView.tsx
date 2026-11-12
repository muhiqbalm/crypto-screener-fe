'use client'

import { Fragment, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bookmark, LineChart, Sparkles } from 'lucide-react'
import { AnswerCard } from '@/components/ui/answer-card'
import { Freshness } from '@/components/ui/freshness'
import { NextStep } from '@/components/ui/next-step'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Segmented } from '@/components/ui/segmented'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { ArenaEquityChart } from '@/components/lab/arena/ArenaEquityChart'
import { DriftPill, PaperProgress } from '@/components/lab/arena/PaperBits'
import { PaperDetailSheet } from '@/components/lab/arena/PaperDetailSheet'
import { SideBadge } from '@/components/trading/SideBadge'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatPct, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatAge, formatTimeframe } from '@/lib/utils/time'
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
  lastActionLabel,
  parseHighlight,
  sortRows,
  strategyLabel,
  type ArenaGroupMode,
} from '@/lib/lab/arena'
import { exitReasonLabel } from '@/lib/lab/paper'
import { useArenaCurves, useArenaReport } from '@/lib/queries/arena'
import type { ArenaReport, ArenaRow } from '@/lib/api/types/arena'

function columns(reviewN: number): ResponsiveColumn<ArenaRow>[] {
  return [
    {
      key: 'preset',
      header: 'Preset',
      mobile: 'title',
      cell: (r) => (
        <div className="min-w-0">
          <div className="num truncate font-semibold">{r.preset.name}</div>
          <div className="truncate text-3xs font-normal text-muted-foreground">
            {strategyLabel(r.preset.template_id)} · {r.preset.coin} {formatTimeframe(r.preset.timeframe)}
            {r.preset.live_reference && ' · setting sama dengan bot live'}
            {!isRunning(r) && ' · paper otomatis mati'}
          </div>
        </div>
      ),
    },
    {
      key: 'drift',
      header: <Term k="drift" />,
      mobileLabel: 'Sesuai uji?',
      mobile: 'badge',
      cell: (r) => <DriftPill status={r.drift.status} size="xs" />,
    },
    {
      key: 'return',
      header: 'Hasil',
      mobile: 'field',
      align: 'right',
      cell: (r) => (
        <div>
          <div className={cn('num font-semibold', signClass(r.stats.return_pct))}>{formatPct(r.stats.return_pct, { digits: 2, signed: true })}</div>
          <div className="num hidden text-3xs text-muted-foreground sm:block">{formatUsd(r.stats.equity)}</div>
        </div>
      ),
    },
    {
      key: 'progress',
      header: <Term k="paper_progress" short />,
      mobileLabel: 'Transaksi',
      mobile: 'field',
      cell: (r) => (
        <>
          <PaperProgress n={r.stats.n_closed} of={reviewN} className="hidden sm:block" />
          <span className="num sm:hidden">
            {r.stats.n_closed}/{reviewN}
          </span>
        </>
      ),
    },
    {
      key: 'dd',
      header: <Term k="max_drawdown" short />,
      mobileLabel: 'Turun terdalam',
      mobile: 'field',
      align: 'right',
      cell: (r) => <span className="num">{r.stats.max_dd_pct === null ? '—' : formatPct(-Math.abs(r.stats.max_dd_pct), { digits: 1 })}</span>,
    },
    {
      key: 'win',
      header: <Term k="win_rate" short />,
      mobile: 'hidden',
      align: 'right',
      cell: (r) => <span className="num">{r.stats.win_rate_pct === null ? '—' : formatPct(r.stats.win_rate_pct, { digits: 0 })}</span>,
    },
    {
      key: 'position',
      header: 'Posisi',
      mobile: 'hidden',
      cell: (r) =>
        r.open_position ? (
          <div className="flex items-center gap-1.5">
            <SideBadge side={r.open_position.side} />
            <span className={cn('num text-xs', signClass(r.open_position.unrealized_pnl))}>{formatUsdSigned(r.open_position.unrealized_pnl)}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Tidak ada</span>
        ),
    },
    {
      key: 'last',
      header: 'Aksi terakhir',
      mobile: 'hidden',
      cell: (r) => {
        const a = r.last_action
        if (!a) return <span className="text-xs text-muted-foreground">{lastActionLabel(null)}</span>
        const side = a.side === 'long' ? 'Long' : a.side === 'short' ? 'Short' : a.side
        return (
          <div className="text-xs">
            <div className="whitespace-nowrap">{a.kind === 'open' ? `Buka ${side}` : `Tutup ${side}`}</div>
            {a.kind === 'close' && a.reason && <div className="text-3xs text-muted-foreground">{exitReasonLabel(a.reason)}</div>}
            <div className="text-3xs text-muted-foreground">{formatAge(a.time)}</div>
          </div>
        )
      },
    },
  ]
}

function Curves({ mode }: { mode: ArenaGroupMode }) {
  const q = useArenaCurves()
  const series = useMemo(() => q.data?.series ?? [], [q.data])
  const slots = useMemo(() => baseSlots(series.map((s) => s.base)), [series])
  const groups = useMemo(() => groupSeries(series, mode), [series, mode])
  const flat = series.every((s) => s.points.every((p) => Math.abs(p.equity - s.starting_balance) < 1e-9))
  return (
    <Section
      title="Kurva modal"
      icon={<LineChart className="h-4 w-4 text-lab" />}
      description="Perubahan modal tiap akun simulasi sejak saldo awal (%). Warna = preset dasar (koin + setting); garis penuh = ukuran 2×, putus-putus = 1×, titik-titik = ikut gejolak (VT60)."
    >
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Kurva modal tidak bisa dimuat" compact />
      ) : !series.length ? (
        <p className="text-xs text-muted-foreground">Kurva tidak tersedia: belum ada preset paper.</p>
      ) : (
        <div className="space-y-4">
          {flat && <p className="text-xs text-muted-foreground">Semua akun masih di saldo awal. Kurva mulai bergerak setelah transaksi pertama.</p>}
          <div className={cn('grid gap-4', mode !== 'all' && 'lg:grid-cols-2')}>
            {groups.map((g) => (
              <div key={g.key} className="min-w-0 space-y-1">
                {mode !== 'all' && <div className="eyebrow">{g.label}</div>}
                <ArenaEquityChart series={g.items} slots={slots} height={mode === 'all' ? 'h-[240px] sm:h-[340px]' : 'h-[220px]'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

function Method({ r }: { r: ArenaReport }) {
  return (
    <details className="group rounded-xl border bg-card px-4 py-3 text-sm sm:px-5">
      <summary className="cursor-pointer select-none font-semibold tracking-tight marker:text-muted-foreground">
        Bagaimana &quot;Sesuai uji?&quot; dinilai
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
        <li>
          Hasil paper dibandingkan dengan <b className="text-foreground">hasil uji preset</b> di data baru (holdout) yang disimpan saat preset dibuat. Untuk
          4H-ETH-Basic (setting bot live) acuannya diambil dari dokumen riset.
        </li>
        <li>
          Ada empat cek: <b className="text-foreground">jumlah transaksi</b>, <b className="text-foreground">persentase menang</b>,{' '}
          <b className="text-foreground">hasil per transaksi</b>, dan <b className="text-foreground">turun terdalam</b>. Tiap cek punya rentang wajar: seberapa
          jauh hasil boleh berbeda hanya karena kebetulan.
        </li>
        <li>
          <b className="text-foreground">Menyimpang</b> = minimal satu cek keluar dari rentang wajar. Satu tanda saja bisa kebetulan (kira-kira 1 dari 20 per
          cek), jadi lihat detailnya dulu.
        </li>
        <li>
          <b className="text-foreground">Sesuai uji</b> baru diberikan setelah {r.review_min_trades} transaksi tertutup dan semua cek dalam rentang. Sebelum itu
          statusnya <b className="text-foreground">belum cukup data</b>. Persentase menang baru dinilai setelah {r.method.min_trades_rate} transaksi.
        </li>
        <li>Turun terdalam hanya dinilai satu arah: lebih dalam dari batas uji = menyimpang; lebih dangkal belum tentu bagus sebelum cukup transaksi.</li>
        <li>Hampir semua data uji sudah sering dilihat saat riset, jadi acuannya lemah. Anggap sebagai petunjuk, bukan target.</li>
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
  const highlight = parseHighlight(useSearchParams().get(HIGHLIGHT_PARAM))
  const [mode, setMode] = useState<ArenaGroupMode>('all')
  const [openId, setOpenId] = useState<number | null>(null)

  if (q.isPending) return <LoadingState rows={8} label="Memuat Paper berjalan…" />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Paper berjalan tidak bisa dimuat" />
  const r = q.data
  const reviewN = r.review_min_trades || REVIEW_MIN_TRADES
  const a = arenaAnswer(r)
  const cols = columns(reviewN)
  const groups = groupRows(sortRows(r.rows), mode)
  const picked = highlight ? arenaRowFor(highlight, r.rows) : null
  const openRow = openId === null ? null : arenaRowFor(openId, r.rows)

  return (
    <div className="space-y-5">
      {highlight !== null &&
        (picked ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/[0.07] p-3 text-sm">
            <p className="flex min-w-0 items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <b className="num">{picked.preset.name}</b> berjalan di paper:{' '}
                {picked.stats.n_closed === 0 && !picked.open_position
                  ? `belum ada transaksi. Transaksi pertama muncul setelah sinyal berikutnya; sinyal dicek tiap candle ${formatTimeframe(picked.preset.timeframe)} tutup.`
                  : `${picked.stats.n_closed}/${reviewN} transaksi tertutup, ${STATUS_COPY[picked.drift.status].label.toLowerCase()}.`}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setOpenId(picked.preset.id)}
              className="shrink-0 cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
            >
              Lihat detail
            </button>
          </div>
        ) : (
          <div role="status" className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            Preset #{highlight} belum ada di Paper berjalan. Mulai dari halaman Preset dengan tombol &quot;Mulai paper&quot;.
          </div>
        ))}

      <AnswerCard
        tone={a.tone}
        answer={a.text}
        status={<StatusPill kind="paper" />}
        metrics={[
          { label: 'Preset berjalan', value: formatCount(a.running), hint: `${formatCount(r.rows.length)} punya akun simulasi` },
          { label: 'Transaksi tertutup', value: formatCount(a.closedTotal), hint: `terbanyak ${a.maxClosed}/${reviewN} per preset` },
          { label: 'Menyimpang', value: formatCount(a.drifting.length), valueClassName: a.drifting.length ? 'text-warn' : undefined },
        ]}
        evidenceHref={r.rows.length ? '#klasemen' : undefined}
        evidenceLabel="Lihat klasemen"
        footer={<Freshness updatedAt={r.generated_at} />}
      />

      {r.rows.length === 0 ? (
        <NextStep
          title="Belum ada preset yang berjalan di paper"
          description="Pilih preset yang lolos uji, lalu tekan Mulai paper. Akun simulasi 10,000 USDT dibuat otomatis."
          action={{ label: 'Buka Preset', href: '/lab/presets', icon: Bookmark }}
        />
      ) : (
        <>
          <Section
            id="klasemen"
            className="scroll-mt-20"
            title="Klasemen"
            description="Urut hasil tertinggi. Ketuk satu baris untuk detail cek dan tautan."
            action={
              <Segmented<ArenaGroupMode>
                aria-label="Kelompokkan preset"
                size="xs"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'all', label: 'Semua' },
                  { value: 'coin', label: 'Per koin' },
                  { value: 'family', label: 'Per ukuran' },
                ]}
              />
            }
          >
            <div className="space-y-4">
              {groups.map((g) => (
                <Fragment key={g.key}>
                  {mode !== 'all' && <div className="eyebrow">{`${g.label} · ${g.items.length} preset`}</div>}
                  <ResponsiveTable
                    rows={g.items}
                    columns={cols}
                    rowKey={(row) => row.preset.id}
                    onRowClick={(row) => setOpenId(row.preset.id)}
                    rowLabel={(row) => `Detail ${row.preset.name}`}
                    isRowHighlighted={(row) => row.preset.id === highlight}
                    caption="Klasemen preset paper"
                  />
                </Fragment>
              ))}
            </div>
          </Section>
          <Curves mode={mode} />
          <Method r={r} />
        </>
      )}

      <PaperDetailSheet row={openRow} reviewN={reviewN} onClose={() => setOpenId(null)} />
    </div>
  )
}
