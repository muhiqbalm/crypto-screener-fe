'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Activity, ArrowRight, ArrowUpRight, FlaskConical, Gauge, ListChecks, Printer, Server, TriangleAlert, Wallet, Webhook } from 'lucide-react'
import { AnswerCard, ANSWER_TONE, type AnswerTone } from '@/components/ui/answer-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatTile } from '@/components/ui/stat-tile'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { cn } from '@/lib/utils/cn'
import { formatBps, formatCount, formatNumber, formatPct, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatTime, formatTimeframe } from '@/lib/utils/time'
import { SOURCE_LABEL as SIGNAL_SOURCE_LABEL, typeLabel } from '@/lib/lab/ledger'
import { strategyLabel } from '@/lib/lab/arena'
import {
  NO_DATA,
  RUN_MODE_LABEL,
  VERDICT_COPY,
  VERDICT_ORDER,
  WEEK_KIND_COPY,
  defaultWeek,
  directionLabel,
  reportHooks,
  reportKind,
  topFindings,
  weekKind,
  weekLabel,
  weekPeriod,
  type Finding,
} from '@/lib/lab/report'
import { useLabMe } from '@/lib/queries/lab'
import { useReportWeeks, useWeeklyReport } from '@/lib/queries/report'
import type {
  ExecActual,
  LedgerGroupRow,
  LedgerReportSection,
  LedgerVerdictStats,
  LiveAlert,
  PaperPresetRow,
  SectionBase,
  WeeklyReport,
} from '@/lib/api/types/report'

const sectionCls = 'break-inside-avoid print:shadow-none'
const linkCls = 'inline-flex items-center gap-1 text-2xs text-info hover:underline print:hidden'

function NoData({ s, children }: { s: SectionBase | undefined; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
      <p className="font-medium">{NO_DATA}</p>
      {s?.error ? <p className="mt-1 text-bearish">Sumber data bermasalah: {s.error}</p> : children && <p className="mt-1">{children}</p>}
    </div>
  )
}

/** A link to an admin-only page: plain text for team members (no dead ends). */
function AdminLink({ href, isAdmin, children }: { href: string; isAdmin: boolean; children: React.ReactNode }) {
  if (!isAdmin) return null
  return (
    <Link href={href} className={linkCls}>
      {children} <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  )
}

function Verdict({ v }: { v: LedgerVerdictStats | null | undefined }) {
  if (!v) return <span className="text-muted-foreground">—</span>
  const c = VERDICT_COPY[v.verdict]
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={c.variant} size="xs">
        {c.label}
      </Badge>
      <span className="num text-2xs text-muted-foreground">{formatCount(v.n)} sinyal</span>
    </span>
  )
}

// ── Ringkasan minggu ini ───────────────────────────────────────────────────

const FINDING_TONE: Record<Finding['tone'], AnswerTone> = { buruk: 'buruk', perlu_dicek: 'perlu_dicek', baik: 'baik', info: 'info' }

function Findings({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const f = topFindings(r, { isAdmin })
  if (f.length === 0) {
    return <AnswerCard tone="menunggu" title={<Term k="weekly_findings" />} answer="Tidak ada temuan: semua bagian laporan minggu ini kosong." />
  }
  const [top, ...rest] = f
  return (
    <AnswerCard
      tone={FINDING_TONE[top.tone]}
      title={<Term k="weekly_findings" />}
      answer={top.text}
      evidenceHref={top.href}
      evidenceLabel={top.linkLabel}
      className={sectionCls}
    >
      {rest.length > 0 && (
        <ol className="mt-1 space-y-1.5 text-sm">
          {rest.map((x) => {
            const t = ANSWER_TONE[FINDING_TONE[x.tone]]
            return (
              <li key={x.key} className="flex items-start gap-2">
                <t.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.text)} aria-label={t.label} />
                <span className="min-w-0">
                  {x.text}
                  {x.href && (
                    <>
                      {' '}
                      <Link href={x.href} className="whitespace-nowrap text-info hover:underline print:hidden">
                        {x.linkLabel ?? 'Detail'} →
                      </Link>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </AnswerCard>
  )
}

// ── sections ────────────────────────────────────────────────────────────────

function paperColumns(target: number): ResponsiveColumn<PaperPresetRow>[] {
  return [
    {
      key: 'preset',
      header: 'Preset',
      mobile: 'title',
      cell: (p) => (
        <div className="min-w-0">
          <div className="num truncate font-medium">{p.preset}</div>
          <div className="truncate text-3xs font-normal text-muted-foreground">
            mulai {formatTime(p.started_at, { time: false })}
            {p.live_reference && ' · setting bot live'}
            {!p.active && ' · paper otomatis mati'}
          </div>
        </div>
      ),
    },
    {
      key: 'week',
      header: 'Hasil minggu ini',
      mobileLabel: 'Minggu ini',
      mobile: 'field',
      align: 'right',
      cell: (p) => (
        <span className={cn('num', signClass(p.trades_week ? p.week_return_pct : null))}>
          {p.trades_week ? formatPct(p.week_return_pct, { digits: 2, signed: true }) : '—'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Hasil total',
      mobile: 'field',
      align: 'right',
      cell: (p) => (
        <span className={cn('num', signClass(p.trades_total ? p.total_return_pct : null))}>
          {p.trades_total ? formatPct(p.total_return_pct, { digits: 2, signed: true }) : '—'}
        </span>
      ),
    },
    {
      key: 'trades',
      header: 'Transaksi',
      mobile: 'field',
      align: 'right',
      cell: (p) => (
        <span className="num">
          {p.trades_week} / {p.trades_total}
          <span className="hidden text-3xs text-muted-foreground sm:inline"> (minggu / total)</span>
        </span>
      ),
    },
    {
      key: 'dd',
      header: <Term k="max_drawdown" short />,
      mobile: 'hidden',
      align: 'right',
      cell: (p) => <span className="num">{p.max_dd_pct === null ? '—' : formatPct(-Math.abs(p.max_dd_pct), { digits: 2 })}</span>,
    },
    {
      key: 'open',
      header: 'Posisi terbuka',
      mobile: 'hidden',
      align: 'right',
      cell: (p) => (
        <span className="num">
          {p.open_positions}
          {p.unrealized_pnl !== null && <span className={cn('ml-1 text-3xs', signClass(p.unrealized_pnl))}>({formatUsdSigned(p.unrealized_pnl)})</span>}
        </span>
      ),
    },
    {
      key: 'progress',
      header: `Progres ke ${target}`,
      mobile: 'badge',
      cell: (p) => (
        <span className="num text-xs">
          {p.trades_total}/{target}
        </span>
      ),
    },
  ]
}

function PaperBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.paper
  const rows = s.presets ?? []
  const target = s.target_trades ?? 30
  return (
    <Section
      className={sectionCls}
      icon={<Wallet className="h-4 w-4 text-lab" aria-hidden="true" />}
      title={
        <span className="inline-flex items-center gap-2">
          Paper <StatusPill kind="paper" size="xs" />
        </span>
      }
      description={`Hasil, transaksi dan turun terdalam per preset simulasi. Preset dinilai setelah ${target} transaksi.`}
      action={<AdminLink href="/lab/arena" isAdmin={isAdmin}>Paper berjalan</AdminLink>}
    >
      {!s.available || rows.length === 0 ? (
        <NoData s={s}>Belum ada preset paper yang berjalan di minggu ini.</NoData>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Transaksi minggu ini" value={formatCount(s.trades_week ?? 0)} hint={`${formatCount(s.trades_total ?? 0)} sejak mulai`} />
            <StatTile label="Preset aktif" value={formatCount(rows.filter((p) => p.active).length)} hint={`${rows.length} preset tercatat`} />
            <StatTile
              label="Terbaik minggu ini"
              value={s.best ? s.best.preset : '—'}
              hint={s.best ? formatPct(s.best.week_return_pct, { digits: 2, signed: true }) : 'belum ada transaksi ditutup'}
              valueClassName="text-base"
            />
            <StatTile
              label="Terburuk minggu ini"
              value={s.worst ? s.worst.preset : '—'}
              hint={s.worst ? formatPct(s.worst.week_return_pct, { digits: 2, signed: true }) : 'butuh minimal 2 preset yang bertransaksi'}
              valueClassName="text-base"
            />
          </div>
          <ResponsiveTable rows={rows} columns={paperColumns(target)} rowKey={(p) => p.preset_id} caption="Preset paper minggu ini" />
          {s.note && <p className="text-2xs text-muted-foreground">Hasil dan turun terdalam dari transaksi yang sudah ditutup; posisi terbuka dihitung terpisah.</p>}
        </div>
      )}
    </Section>
  )
}

function counts(c: LedgerReportSection['counts_week']) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {VERDICT_ORDER.filter((k) => c?.[k]).map((k) => (
        <Badge key={k} variant={VERDICT_COPY[k].variant} size="sm">
          {VERDICT_COPY[k].label}: {c?.[k]}
        </Badge>
      ))}
      {!VERDICT_ORDER.some((k) => c?.[k]) && <span className="text-2xs text-muted-foreground">—</span>}
    </div>
  )
}

const LEDGER_COLUMNS: ResponsiveColumn<LedgerGroupRow>[] = [
  {
    key: 'signal',
    header: 'Sinyal',
    mobile: 'title',
    cell: (g) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{typeLabel(g.signal_type)}</div>
        <div className="truncate text-3xs font-normal text-muted-foreground">
          {directionLabel(g.direction)} · {SIGNAL_SOURCE_LABEL[g.source as keyof typeof SIGNAL_SOURCE_LABEL] ?? g.source}
        </div>
      </div>
    ),
  },
  { key: 'week', header: 'Minggu ini', mobile: 'badge', cell: (g) => <Verdict v={g.week} /> },
  {
    key: 'week_mean',
    header: 'Rata-rata minggu ini',
    mobileLabel: 'Minggu ini',
    mobile: 'field',
    align: 'right',
    cell: (g) => <span className={cn('num', signClass(g.week?.mean_pct))}>{g.week ? formatPct(g.week.mean_pct, { digits: 2, signed: true }) : '—'}</span>,
  },
  { key: 'overall', header: 'Keseluruhan', mobile: 'hidden', cell: (g) => <Verdict v={g.overall} /> },
  {
    key: 'overall_mean',
    header: 'Rata-rata keseluruhan',
    mobileLabel: 'Keseluruhan',
    mobile: 'field',
    align: 'right',
    cell: (g) => <span className={cn('num', signClass(g.overall.mean_pct))}>{formatPct(g.overall.mean_pct, { digits: 2, signed: true })}</span>,
  },
]

function LedgerBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.ledger
  return (
    <Section
      className={sectionCls}
      icon={<ListChecks className="h-4 w-4 text-info" aria-hidden="true" />}
      title="Rekam jejak sinyal"
      description="Jenis sinyal mana yang terbukti, negatif, atau belum terbukti, dicek 1 hari setelah sinyal: minggu ini dibanding keseluruhan."
      action={<AdminLink href="/lab/signals" isAdmin={isAdmin}>Rekam jejak sinyal</AdminLink>}
    >
      {!s.available ? (
        <NoData s={s} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="eyebrow mb-1.5">Minggu ini · {formatCount(s.signals_week ?? 0)} sinyal</div>
              {counts(s.counts_week)}
            </div>
            <div className="rounded-lg border p-3">
              <div className="eyebrow mb-1.5">Keseluruhan (sampai akhir minggu)</div>
              {counts(s.counts_overall)}
            </div>
          </div>
          <ResponsiveTable rows={s.groups ?? []} columns={LEDGER_COLUMNS} rowKey={(g) => g.key} caption="Rekam jejak per jenis sinyal" />
          <p className="text-2xs text-muted-foreground">
            Sinyal di hari terakhir minggu ini belum punya hasil 1 hari saat laporan dibuat. Butuh minimal 10 sinyal di 5 hari berbeda sebelum ada kesimpulan.
          </p>
        </div>
      )}
    </Section>
  )
}

function ExecTiles({ a, label }: { a: ExecActual; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label={`Sinyal ${label}`} value={formatCount(a.n_counted)} hint={`${formatCount(a.n_signals)} tercatat · ${formatCount(a.n_with_fill)} terisi`} />
      <StatTile
        label={<Term k="slippage_bps" short />}
        value={a.mean_slippage_bps === null ? '—' : formatBps(a.mean_slippage_bps)}
        hint={`rata-rata; median ${a.median_slippage_bps === null ? '—' : formatBps(a.median_slippage_bps)}`}
      />
      <StatTile
        label={<Term k="alert_latency" short />}
        value={a.mean_latency_s === null ? '—' : `${formatNumber(a.mean_latency_s, { digits: 1 })} dtk`}
        hint={a.latency_upper_bound ? 'batas atas (waktu catat)' : `median ${a.median_latency_s === null ? '—' : `${formatNumber(a.median_latency_s, { digits: 1 })} dtk`}`}
      />
      <StatTile label="Sinyal terisi" value={formatCount(a.n_with_fill)} hint="ada harga eksekusi" />
    </div>
  )
}

function ExecutionBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.execution
  return (
    <Section
      className={sectionCls}
      icon={<Gauge className="h-4 w-4 text-info" aria-hidden="true" />}
      title={
        <span className="inline-flex items-center gap-2">
          Kualitas eksekusi bot live <StatusPill kind="live" size="xs" />
        </span>
      }
      description="Selisih harga dan jeda alert bot live, plus simulasi kalau dulu memakai order limit."
      action={<AdminLink href="/bot#eksekusi" isAdmin={isAdmin}>Status bot</AdminLink>}
    >
      {!s.available || !s.week ? (
        <NoData s={s}>{s.overall ? `Tidak ada sinyal live minggu ini (${formatCount(s.overall.n_signals)} sinyal sejak mulai dicatat).` : null}</NoData>
      ) : (
        <div className="space-y-3">
          <ExecTiles a={s.week} label="minggu ini" />
          {(s.grid_week ?? []).length > 0 && (
            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-xs font-semibold">
                <Term k="limit_sim" />
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-3xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1 text-left font-semibold">Jarak dari harga</th>
                    <th className="py-1 text-left font-semibold">Ditunggu</th>
                    <th className="py-1 text-right font-semibold">Terisi</th>
                    <th className="py-1 text-right font-semibold">Hemat</th>
                  </tr>
                </thead>
                <tbody>
                  {s.grid_week!.map((c) => (
                    <tr key={`${c.k}|${c.ttl_min}`} className="border-b last:border-0">
                      <td className="num py-1.5">{formatNumber(c.k, { maxDigits: 2 })} × ATR</td>
                      <td className="num py-1.5">{c.ttl_min} mnt</td>
                      <td className="num py-1.5 text-right">
                        {c.filled}/{c.n}
                      </td>
                      <td className={cn('num py-1.5 text-right', signClass(c.mean_saving_bps))}>{c.mean_saving_bps === null ? '—' : formatBps(c.mean_saving_bps)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-2xs text-muted-foreground">
            Sampel kecil = anekdot. Keseluruhan: {formatCount(s.overall?.n_counted ?? 0)} sinyal, slippage rata-rata{' '}
            {s.overall?.mean_slippage_bps === null || s.overall?.mean_slippage_bps === undefined ? '—' : formatBps(s.overall.mean_slippage_bps)}.
          </p>
        </div>
      )}
    </Section>
  )
}

const ALERT_COLUMNS: ResponsiveColumn<LiveAlert>[] = [
  {
    key: 'signal',
    header: 'Sinyal',
    mobile: 'title',
    cell: (a) => (
      <span>
        {a.action === 'open' ? 'Buka' : a.action === 'close' ? 'Tutup' : a.action} {a.side} <span className="text-muted-foreground">{a.symbol.replace(/USDT$/, '')}</span>
      </span>
    ),
  },
  { key: 'time', header: 'Waktu', mobile: 'badge', cell: (a) => <span className="num whitespace-nowrap text-xs">{formatTime(a.ts)}</span> },
  { key: 'orders', header: 'Order', mobile: 'field', align: 'right', cell: (a) => <span className="num">{a.orders}</span> },
  { key: 'executed', header: 'Tereksekusi', mobile: 'field', align: 'right', cell: (a) => <span className="num">{a.executed}</span> },
  {
    key: 'rejected',
    header: 'Ditolak',
    mobile: 'field',
    align: 'right',
    cell: (a) => <span className={cn('num', a.rejected ? 'font-semibold text-bearish' : '')}>{a.rejected}</span>,
  },
]

function LiveBotBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.live_bot
  return (
    <Section
      className={sectionCls}
      icon={<Webhook className="h-4 w-4 text-brand" aria-hidden="true" />}
      title={
        <span className="inline-flex items-center gap-2">
          Aktivitas bot live <StatusPill kind="live" size="xs" />
        </span>
      }
      description="Alert TradingView yang masuk, order yang tereksekusi dan yang ditolak (dibaca saja, tanpa mengubah apa pun)."
      action={<AdminLink href="/bot" isAdmin={isAdmin}>Status bot</AdminLink>}
    >
      {!s.available ? (
        <NoData s={s}>Tidak ada alert bot live di minggu ini.</NoData>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Sinyal" value={formatCount(s.signals ?? 0)} hint="alert TradingView" />
            <StatTile label="Order" value={formatCount(s.orders ?? 0)} hint="satu per akun" />
            <StatTile label="Tereksekusi" value={formatCount(s.executed ?? 0)} />
            <StatTile label="Ditolak / gagal" value={formatCount(s.rejected ?? 0)} valueClassName={s.rejected ? 'text-bearish' : ''} />
          </div>
          <ResponsiveTable
            rows={s.alerts ?? []}
            columns={ALERT_COLUMNS}
            rowKey={(a) => `${a.ts}|${a.symbol}|${a.action}|${a.side}`}
            caption="Alert bot live minggu ini"
          />
        </div>
      )}
    </Section>
  )
}

function LabBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.lab
  return (
    <Section
      className={sectionCls}
      icon={<FlaskConical className="h-4 w-4 text-lab" aria-hidden="true" />}
      title="Aktivitas Lab"
      description="Uji yang dijalankan, yang lolos dan gagal, preset baru, dan peringatan terlalu banyak mencoba."
    >
      {!s.available ? (
        <NoData s={s}>Tidak ada uji, uji banyak koin atau preset baru di minggu ini.</NoData>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Uji"
              value={formatCount(s.runs ?? 0)}
              hint={Object.entries(s.runs_by_mode ?? {}).map(([m, n]) => `${RUN_MODE_LABEL[m] ?? m} ${n}`).join(' · ') || '—'}
            />
            <StatTile label="Lolos" value={formatCount(s.pass ?? 0)} hint={`${formatCount(s.fail ?? 0)} gagal`} />
            <StatTile label="Uji banyak koin" value={formatCount(s.scans ?? 0)} />
            <StatTile label="Preset baru" value={formatCount(s.presets_saved?.length ?? 0)} />
          </div>
          {(s.snooping_warnings ?? []).length > 0 && (
            <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
              <div>
                <b className="text-warn">
                  <Term k="data_snooping" />
                </b>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {s.snooping_warnings!.map((w) => (
                    <li key={`${w.template_id}|${w.symbol}`}>
                      {w.symbol.replace(/USDT$/, '')} · {strategyLabel(w.template_id)}: {w.runs} uji jujur/cari setting, {w.timeframes} timeframe,{' '}
                      {formatCount(w.trials)} kombinasi setting, data baru dipakai {w.holdout_touches}×
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {(s.pass_runs ?? []).length > 0 && (
            <div>
              <div className="eyebrow mb-1">Uji yang lolos</div>
              <ul className="space-y-0.5 text-xs">
                {s.pass_runs!.map((p) => (
                  <li key={p.id}>
                    {isAdmin ? (
                      <Link href={`/lab/runs/${p.id}`} className="text-info hover:underline">
                        #{p.id}
                      </Link>
                    ) : (
                      <span>#{p.id}</span>
                    )}{' '}
                    {RUN_MODE_LABEL[p.mode] ?? p.mode} · {p.symbol.replace(/USDT$/, '')} {formatTimeframe(p.timeframe)} · {strategyLabel(p.template_id)} ·{' '}
                    <span className={cn('num', signClass(p.net_return_pct))}>{formatPct(p.net_return_pct, { digits: 2, signed: true })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(s.presets_saved ?? []).length > 0 && (
            <div>
              <div className="eyebrow mb-1">Preset baru</div>
              <div className="flex flex-wrap gap-1.5">
                {s.presets_saved!.map((p) => (
                  <Badge key={p.id} variant={p.archived ? 'muted' : 'lab'} size="sm">
                    {p.name}
                    {p.verdict === 'PASS' ? ' · Lolos' : p.verdict === 'FAIL' ? ' · Gagal' : ''}
                    {p.archived ? ' · dihapus' : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

function SystemBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.system
  const d = s.deploys
  const b = s.backups
  return (
    <Section
      className={sectionCls}
      icon={<Server className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title="Kesehatan sistem"
      description="Pembaruan sistem, cadangan harian dan proses server. Log hanya dibaca; rahasia disensor."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Pembaruan sistem" value={d.available ? formatCount(d.live ?? 0) : '—'} hint={d.available ? `${d.dry_run ?? 0} uji coba` : NO_DATA} />
          <StatTile label="Pembaruan gagal" value={d.available ? formatCount(d.failed ?? 0) : '—'} valueClassName={d.failed ? 'text-bearish' : ''} />
          <StatTile label="Cadangan berhasil" value={b.available ? formatCount(b.ok ?? 0) : '—'} hint={b.available ? `${b.failed ?? 0} gagal` : NO_DATA} />
          <StatTile label="Cadangan terakhir" value={b.last ? formatTime(b.last.ts) : '—'} valueClassName="text-sm" hint={b.last ? undefined : NO_DATA} />
        </div>
        {d.available && (d.events ?? []).some((e) => e.kind === 'live' || e.kind === 'failed') ? (
          <ul className="space-y-1 text-xs">
            {d.events!
              .filter((e) => e.kind === 'live' || e.kind === 'failed')
              .map((e, i) => (
                <li key={`${e.ts}|${i}`} className="flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="num shrink-0 text-muted-foreground">{formatTime(e.ts)}</span>
                  <Badge variant={e.kind === 'live' ? 'bullish' : 'bearish'} size="xs">
                    {e.kind === 'live' ? 'terpasang' : 'gagal'}
                  </Badge>
                  <span className="min-w-0 break-words font-mono text-2xs">{e.message}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-2xs text-muted-foreground">{d.available ? 'Tidak ada pembaruan sistem di minggu ini.' : 'Log pembaruan sistem tidak tersedia.'}</p>
        )}
        {s.processes ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {s.processes.map((p) => (
                <StatusPill
                  key={p.name}
                  kind={p.status === 'online' ? 'sehat' : 'bermasalah'}
                  label={`${p.name}: ${p.status === 'online' ? 'berjalan' : p.status}`}
                />
              ))}
            </div>
            <p className="text-3xs text-muted-foreground">
              Dibaca {formatTime(s.processes_at)}. Jumlah restart: {s.processes.map((p) => `${p.name} ${p.restarts ?? '—'}`).join(', ')} (kumulatif sejak proses
              didaftarkan, bukan per minggu).
            </p>
          </div>
        ) : (
          <p className="text-2xs text-muted-foreground">Status proses server: tidak tersedia (hanya dibaca untuk minggu berjalan atau saat laporan dibekukan).</p>
        )}
      </div>
    </Section>
  )
}

function HooksBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const hooks = reportHooks(r.hooks, isAdmin)
  if (hooks.length === 0) return null
  return (
    <Section
      className={cn(sectionCls, 'print:hidden')}
      icon={<Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title="Halaman terkait"
    >
      <div className="grid gap-2 sm:grid-cols-3" data-report-hooks="">
        {hooks.map((h) => (
          <Link key={h.id} href={h.href} data-report-hook={h.id} className="group rounded-lg border p-3 transition-colors hover:bg-accent">
            <div className="flex items-center justify-between text-sm font-medium">
              {h.title}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
            </div>
            <p className="mt-0.5 text-2xs text-muted-foreground">{h.note}</p>
          </Link>
        ))}
      </div>
    </Section>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

/**
 * Laporan mingguan. Readable by every logged-in account (CEO decision); links to admin-only
 * pages are hidden for team members. Opens the newest final (frozen) week unless `?week=` says
 * otherwise; the running week is "sementara" and heavier to build. Needs a Suspense boundary.
 */
export function WeeklyReportView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const me = useLabMe()
  const isAdmin = Boolean(me.data?.is_admin)
  const weeks = useReportWeeks()
  const fallback = defaultWeek(weeks.data)
  const week = params.get('week') ?? fallback
  const report = useWeeklyReport(week, { enabled: Boolean(week) })

  function pick(w: string) {
    router.replace(w === fallback ? pathname : `${pathname}?week=${encodeURIComponent(w)}`, { scroll: false })
  }

  const r = report.data
  const kind = r ? reportKind(r) : null
  return (
    <div className="space-y-5" data-report-print="">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Select value={week ?? ''} onValueChange={pick} disabled={!weeks.data}>
          <SelectTrigger className="w-full sm:w-[320px]" aria-label="Pilih minggu">
            <SelectValue placeholder="Pilih minggu" />
          </SelectTrigger>
          <SelectContent>
            {(weeks.data?.weeks ?? []).map((w) => (
              <SelectItem key={w.week} value={w.week}>
                {weekLabel(w)} · {WEEK_KIND_COPY[weekKind(w)].label}
                {w.current ? ' (berjalan)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!r}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Simpan PDF
        </Button>
        <span className="text-2xs text-muted-foreground">Pakai dialog cetak browser, lalu pilih &quot;Simpan sebagai PDF&quot;.</span>
      </div>

      {weeks.isError ? (
        <ErrorState error={weeks.error} onRetry={() => weeks.refetch()} title="Daftar minggu tidak bisa dimuat" />
      ) : !week || report.isPending ? (
        <LoadingState rows={8} label="Memuat laporan…" />
      ) : report.isError || !r ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} title="Laporan tidak bisa dimuat" />
      ) : (
        <>
          <div className={cn('rounded-xl border bg-card p-4 text-xs', sectionCls)}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Laporan mingguan {weekLabel(r)}</h2>
              {kind && (
                <Badge variant={kind === 'final' ? 'info' : kind === 'sementara' ? 'warn' : 'muted'} size="sm" title={WEEK_KIND_COPY[kind].hint}>
                  {WEEK_KIND_COPY[kind].label}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{weekPeriod(r)}</p>
            <p className="text-muted-foreground">
              {r.snapshot
                ? `Laporan final, dibekukan ${formatTime(r.snapshot.generated_at)}: angkanya tidak berubah lagi.`
                : r.partial
                  ? `Sementara, dihitung ${formatTime(r.generated_at)}: angka masih bisa berubah sampai minggu selesai.`
                  : `Dihitung ulang ${formatTime(r.generated_at)} karena minggu ini tidak punya laporan final.`}
            </p>
          </div>
          <Findings r={r} isAdmin={isAdmin} />
          <PaperBlock r={r} isAdmin={isAdmin} />
          <LiveBotBlock r={r} isAdmin={isAdmin} />
          <ExecutionBlock r={r} isAdmin={isAdmin} />
          <LedgerBlock r={r} isAdmin={isAdmin} />
          <LabBlock r={r} isAdmin={isAdmin} />
          <SystemBlock r={r} />
          <HooksBlock r={r} isAdmin={isAdmin} />
        </>
      )}
    </div>
  )
}
