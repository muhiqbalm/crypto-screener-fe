'use client'

import { Fragment, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BookOpen, Bookmark, CandlestickChart, ChevronDown, ChevronRight, LineChart, Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { EmptyState, ErrorState, LoadingState, errorKind } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { SideBadge } from '@/components/trading/SideBadge'
import { ArenaEquityChart } from '@/components/lab/arena/ArenaEquityChart'
import { relativeTime } from '@/lib/lab/form'
import { formatPercent, formatPrice, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import {
  STATUS_COPY,
  arenaLinks,
  baseSlots,
  checkValues,
  fmtNum,
  fmtR,
  groupRows,
  groupSeries,
  lastActionLabel,
  sortRows,
  type ArenaGroupMode,
} from '@/lib/lab/arena'
import { useArenaCurves, useArenaReport } from '@/lib/queries/arena'
import type { ArenaReport, ArenaRow, CheckStatus } from '@/lib/api/types/arena'

const th = 'px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground'
const td = 'px-3 py-2 align-top'

function StatusBadge({ status }: { status: CheckStatus }) {
  const c = STATUS_COPY[status]
  return (
    <Badge variant={c.variant} size="sm">
      {status === 'menyimpang' && <AlertTriangle aria-hidden="true" />}
      {c.label}
    </Badge>
  )
}

function Progress({ n, of }: { n: number; of: number }) {
  const pct = Math.min(100, (n / of) * 100)
  return (
    <div className="min-w-[84px] space-y-1">
      <div className="num text-xs">
        {n}
        <span className="text-muted-foreground">/{of}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={of} aria-label={`${n} dari ${of} trade`}>
        <div className="h-full rounded-full bg-lab" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Summary({ r }: { r: ArenaReport }) {
  const n = r.rows.length
  const closed = r.rows.reduce((a, x) => a + x.stats.n_closed, 0)
  const drift = r.rows.filter((x) => x.drift.status === 'menyimpang').length
  const ready = r.rows.filter((x) => x.stats.n_closed >= r.review_min_trades).length
  const maxN = r.rows.reduce((a, x) => Math.max(a, x.stats.n_closed), 0)
  const days = r.rows.reduce((a, x) => Math.max(a, x.stats.days_running), 0)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Preset paper" value={n} hint={`Berjalan paling lama ${fmtNum(days, 1)} hari`} />
      <StatTile label="Trade tertutup" value={closed} hint={`Terbanyak per preset: ${maxN}/${r.review_min_trades}`} />
      <StatTile label="Siap direview" value={`${ready}/${n}`} hint={`Aturan riset: ≥ ${r.review_min_trades} trade paper per preset`} />
      <StatTile
        label="Menyimpang dari backtest"
        value={drift}
        valueClassName={drift ? 'text-warn' : undefined}
        hint={drift ? 'Lihat detail per preset di tabel' : 'Belum ada yang keluar dari rentang backtest'}
      />
    </div>
  )
}

function DriftDetail({ row }: { row: ArenaRow }) {
  const bt = row.backtest
  const sp = row.watch.strategy_position
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs">{row.drift.summary}</p>
      {row.drift.checks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b">
                <th className={th}>Cek</th>
                <th className={th}>Paper</th>
                <th className={th}>Backtest</th>
                <th className={th}>Rentang 95%</th>
                <th className={th}>Status</th>
                <th className={th}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {row.drift.checks.map((c) => {
                const v = checkValues(c)
                return (
                  <tr key={c.key} className="border-b last:border-0">
                    <td className={cn(td, 'font-medium')}>{c.label}</td>
                    <td className={cn(td, 'num')}>{v.observed}</td>
                    <td className={cn(td, 'num')}>{v.expected}</td>
                    <td className={cn(td, 'num whitespace-nowrap')}>{v.range}</td>
                    <td className={td}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className={cn(td, 'max-w-[380px] text-muted-foreground')}>{c.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="space-y-1 text-2xs text-muted-foreground">
        {bt ? (
          <p>
            Acuan backtest: holdout {bt.start.slice(0, 10)} → {bt.end.slice(0, 10)} · {bt.trades} trade (
            {fmtNum(bt.trades_per_month, 1)}/bulan) · win rate {fmtNum(bt.win_rate_pct, 1)}% · net {formatPercent(bt.net_return_pct, 1)} · max DD{' '}
            {fmtNum(bt.max_dd_pct, 1)}% · MC DD95 {fmtNum(bt.mc_dd_p95_pct, 1)}%. Sumber: {bt.source_note}.
            {bt.contaminated && <b className="text-warn"> Holdout sudah dilihat berkali-kali (terkontaminasi): acuan ini bukti lemah.</b>}
          </p>
        ) : (
          <p>Preset ini tidak menyimpan metrik backtest, jadi tidak ada acuan pembanding.</p>
        )}
        {sp && sp.opened_before_paper && !sp.mirrored && (
          <p>
            Strategi (watch) sedang memegang posisi {sp.side} sejak {sp.entry_time?.slice(0, 16).replace('T', ' ')} UTC. Posisi itu dibuka sebelum akun
            paper mulai, jadi tidak diikuti; paper baru masuk di sinyal berikutnya.
          </p>
        )}
        {row.stats.n_closed_manual > 0 && <p>{row.stats.n_closed_manual} trade manual di akun ini tidak dihitung di statistik (ekuitas tetap ikut).</p>}
        {row.watch.error && <p className="text-warn">Error watch terakhir: {row.watch.error}</p>}
      </div>
    </div>
  )
}

function ArenaTableRow({ row, reviewN }: { row: ArenaRow; reviewN: number }) {
  const [open, setOpen] = useState(false)
  const s = row.stats
  const p = row.open_position
  const links = arenaLinks(row)
  const linkCls = 'inline-flex items-center gap-1 text-info hover:underline'
  return (
    <Fragment>
      <tr className={cn('border-b', row.preset.live_reference && 'bg-lab/[0.04]')}>
        <td className={td}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-start gap-1 text-left font-medium hover:underline"
          >
            {open ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span className="num">{row.preset.name}</span>
          </button>
          <div className="mt-1 flex flex-wrap gap-1 pl-[18px]">
            <Badge variant="muted" size="sm">
              {row.preset.family_label}
            </Badge>
            {row.preset.live_reference && (
              <Badge variant="lab" size="sm">
                Referensi live
              </Badge>
            )}
            {row.preset.verdict && (
              <Badge variant={row.preset.verdict === 'PASS' ? 'info' : 'muted'} size="sm" title="Verdict Lab dari backtest/holdout saat preset dibuat">
                {row.preset.verdict}
              </Badge>
            )}
          </div>
        </td>
        <td className={cn(td, 'num text-right')}>{formatUsd(s.equity)}</td>
        <td className={cn(td, 'num text-right', signClass(s.return_pct))}>{formatPercent(s.return_pct, 2)}</td>
        <td className={cn(td, 'num text-right')}>{s.max_dd_pct === null ? '—' : `${s.max_dd_pct.toFixed(1)}%`}</td>
        <td className={cn(td, 'num text-right')} title={s.sharpe === null ? `Butuh ≥ 30 hari data harian (baru ${s.sharpe_days})` : 'Sharpe tahunan dari ekuitas harian'}>
          {s.sharpe === null ? <span className="text-2xs text-muted-foreground">belum cukup</span> : s.sharpe.toFixed(2)}
        </td>
        <td className={td}>
          <Progress n={s.n_closed} of={reviewN} />
          {s.n_open > 0 && <div className="mt-0.5 text-3xs text-muted-foreground">+{s.n_open} terbuka</div>}
        </td>
        <td className={cn(td, 'num')}>
          {s.win_rate_pct === null ? (
            '—'
          ) : (
            <>
              <div className="text-xs">{s.win_rate_pct.toFixed(0)}%</div>
              {s.win_rate_ci_pct && (
                <div className="text-3xs text-muted-foreground" title="Interval Wilson 95%">
                  {s.win_rate_ci_pct[0].toFixed(0)}–{s.win_rate_ci_pct[1].toFixed(0)}%
                </div>
              )}
              <div className="text-3xs text-muted-foreground">{fmtR(s.avg_r)} rata-rata</div>
            </>
          )}
        </td>
        <td className={td}>
          {p ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <SideBadge side={p.side} />
                <span className="num text-xs">{formatPrice(p.entry_price)}</span>
              </div>
              <div className={cn('num text-xs', signClass(p.unrealized_pnl))}>{formatUsdSigned(p.unrealized_pnl)}</div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Flat</span>
          )}
        </td>
        <td className={cn(td, 'text-xs')}>
          <div>{lastActionLabel(row.last_action)}</div>
          {row.last_action && <div className="text-3xs text-muted-foreground">{relativeTime(row.last_action.time)}</div>}
          <div className="text-3xs text-muted-foreground" title={row.watch.last_eval_at ?? undefined}>
            Watch dicek {relativeTime(row.watch.last_eval_at)}
          </div>
        </td>
        <td className={td}>
          <StatusBadge status={row.drift.status} />
        </td>
        <td className={cn(td, 'text-xs')}>
          <div className="flex flex-col gap-0.5">
            <Link href={links.preset} className={linkCls}>
              <Bookmark className="h-3 w-3" aria-hidden="true" /> Preset
            </Link>
            <Link href={links.journal} className={linkCls}>
              <BookOpen className="h-3 w-3" aria-hidden="true" /> Jurnal
            </Link>
            <Link href={links.watch} className={linkCls}>
              <CandlestickChart className="h-3 w-3" aria-hidden="true" /> Watch
            </Link>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b">
          <td colSpan={11} className="px-3 pb-3">
            <DriftDetail row={row} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function Leaderboard({ r, mode }: { r: ArenaReport; mode: ArenaGroupMode }) {
  const groups = useMemo(() => groupRows(sortRows(r.rows), mode), [r.rows, mode])
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-sm">
        <thead>
          <tr className="border-b">
            <th className={th}>Preset</th>
            <th className={cn(th, 'text-right')}>Ekuitas</th>
            <th className={cn(th, 'text-right')}>Return</th>
            <th className={cn(th, 'text-right')}>Max DD</th>
            <th className={cn(th, 'text-right')}>Sharpe</th>
            <th className={th}>Trade / {r.review_min_trades}</th>
            <th className={th}>Win rate</th>
            <th className={th}>Posisi terbuka</th>
            <th className={th}>Aksi terakhir</th>
            <th className={th}>vs backtest</th>
            <th className={th}>Link</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.key}>
              {mode !== 'all' && (
                <tr className="bg-muted/30">
                  <td colSpan={11} className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label} · {g.items.length} preset
                  </td>
                </tr>
              )}
              {g.items.map((row) => (
                <ArenaTableRow key={row.preset.id} row={row} reviewN={r.review_min_trades} />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Curves({ mode }: { mode: ArenaGroupMode }) {
  const q = useArenaCurves()
  const series = useMemo(() => q.data?.series ?? [], [q.data])
  const slots = useMemo(() => baseSlots(series.map((s) => s.base)), [series])
  const groups = useMemo(() => groupSeries(series, mode), [series, mode])
  const flat = series.every((s) => s.points.every((p) => Math.abs(p.equity - s.starting_balance) < 1e-9))
  return (
    <Section
      title="Kurva equity (dinormalisasi)"
      icon={<LineChart className="h-4 w-4 text-lab" />}
      description="% sejak saldo awal 10k tiap akun. Warna = strategi dasar (koin + parameter); garis = sizing: penuh 2×, putus-putus 1×, titik-titik VT60. Snapshot tiap jam + setiap trade ditutup."
    >
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.isError ? (
        <ErrorState kind={errorKind(q.error)} onRetry={() => q.refetch()} message="Gagal memuat kurva equity." />
      ) : !series.length ? (
        <EmptyState title="Belum ada preset paper" description="Hubungkan preset ke watch dengan auto-paper untuk mulai." />
      ) : (
        <div className="space-y-4">
          {flat && (
            <p className="text-xs text-muted-foreground">
              Semua akun masih di saldo awal (belum ada trade paper). Kurva akan bergerak setelah entry pertama.
            </p>
          )}
          <div className={cn('grid gap-4', mode !== 'all' && 'lg:grid-cols-2')}>
            {groups.map((g) => (
              <div key={g.key} className="min-w-0 space-y-1">
                {mode !== 'all' && <div className="eyebrow">{g.label}</div>}
                <ArenaEquityChart series={g.items} slots={slots} height={mode === 'all' ? 'h-[260px] sm:h-[360px]' : 'h-[220px]'} />
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
    <Section title="Cara membaca 'vs backtest'" description="Metode cek penyimpangan, dengan batas sampel kecil.">
      <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
        <li>
          <b className="text-foreground">Acuan</b> = metrik holdout yang tersimpan di preset (periode, jumlah trade, win rate, net return, max DD, MC DD95).
          4H-ETH-Basic tidak menyimpan holdout, jadi acuannya run riset di <span className="num">docs/research/eth-v2/holdout-results.json</span>.
          Hampir semua holdout ini sudah dilihat berkali-kali (terkontaminasi): acuan yang lemah, bukan target.
        </li>
        <li>
          <b className="text-foreground">Frekuensi trade</b>: entry paper sejak akun dibuat vs rentang Poisson 95% dari (trade/bulan backtest × lama berjalan).
          Dinilai setelah perkiraan ≥ {r.method.min_expected_entries} entry.
        </li>
        <li>
          <b className="text-foreground">Win rate</b>: jumlah menang dibanding rentang binomial 95% dengan win rate backtest; minimal {r.method.min_trades_rate}{' '}
          trade tertutup. Tabel juga menampilkan interval Wilson 95% win rate paper.
        </li>
        <li>
          <b className="text-foreground">Hasil per trade</b>: backtest tidak menyimpan R per trade, jadi pembandingnya % ekuitas per trade: interval t 95%
          rata-rata paper vs rata-rata geometrik holdout. Minimal {r.method.min_trades_rate} trade. Rata-rata R paper hanya ditampilkan.
        </li>
        <li>
          <b className="text-foreground">Drawdown</b> satu arah: DD paper lebih dalam dari batas backtest (yang lebih dalam dari MC DD95 dan max DD
          holdout) = menyimpang. DD dangkal baru dihitung &quot;sesuai&quot; setelah {r.review_min_trades} trade.
        </li>
        <li>
          <b className="text-foreground">Status</b>: menyimpang jika ada cek di luar rentang (≈5% peluang kebetulan per cek, jadi satu tanda saja belum
          vonis); sesuai hanya jika ≥ {r.review_min_trades} trade dan semua cek dalam rentang; selain itu belum cukup data. Sharpe muncul setelah ≥{' '}
          {r.method.min_sharpe_days} hari ekuitas harian.
        </li>
      </ul>
    </Section>
  )
}

export function ArenaView() {
  const q = useArenaReport()
  const [mode, setMode] = useState<ArenaGroupMode>('all')
  const toggle = (
    <Segmented<ArenaGroupMode>
      aria-label="Kelompokkan preset"
      size="xs"
      value={mode}
      onChange={setMode}
      options={[
        { value: 'all', label: 'Semua' },
        { value: 'coin', label: 'Per koin' },
        { value: 'family', label: 'Per sizing' },
      ]}
    />
  )

  if (q.isPending) return <LoadingState rows={8} />
  if (q.isError) return <ErrorState kind={errorKind(q.error)} onRetry={() => q.refetch()} message="Gagal memuat Arena Paper." />
  const r = q.data
  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-lg border border-lab/30 bg-lab/[0.06] p-3 text-xs text-muted-foreground">
        <Swords className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lab" aria-hidden="true" />
        <p>
          <b className="text-foreground">Paper saja, tanpa order live.</b> Aturan riset: review tiap preset setelah ≥ {r.review_min_trades} trade paper, sebelum
          mempertimbangkan perubahan live. Sampai titik itu angka di sini anekdot, bukan bukti.
        </p>
      </div>
      {!r.rows.length ? (
        <EmptyState title="Belum ada preset paper" description="Preset muncul di sini setelah dihubungkan ke watch dengan auto-paper." />
      ) : (
        <>
          <Summary r={r} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Kelompokkan:</span>
            {toggle}
          </div>
          <Curves mode={mode} />
          <Section
            title="Klasemen"
            description={`Urut return. Klik nama preset untuk detail cek vs backtest. Diperbarui ${relativeTime(r.generated_at)}.`}
          >
            <Leaderboard r={r} mode={mode} />
          </Section>
          <Method r={r} />
        </>
      )}
    </div>
  )
}
