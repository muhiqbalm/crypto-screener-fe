'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  FlaskConical,
  Gauge,
  Info,
  ListChecks,
  Printer,
  Server,
  TriangleAlert,
  Wallet,
  Webhook,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusPill } from '@/components/ui/status-pill'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { BigNumber, CardLink, DeckCard, Meter, Pill, Ring, SectionHead, signTone, type Tone } from '@/components/lab/arena/deck'
import { cn } from '@/lib/utils/cn'
import { formatBps, formatCount, formatNumber, formatPct, signClass } from '@/lib/utils/format'
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
import type { LedgerGroupRow, LedgerReportSection, LiveAlert, SectionBase, WeeklyReport } from '@/lib/api/types/report'

const foldCls = 'rounded-2xl border px-5 py-3 print:border-0 print:px-0'
const sumCls = 'cursor-pointer select-none text-[15px] font-semibold print:hidden'

function NoData({ s, children }: { s: SectionBase | undefined; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed px-5 py-8 text-center text-[15px] text-muted-foreground">
      <p className="font-medium">{NO_DATA}</p>
      {s?.error ? <p className="mt-1 text-bearish">Sumber data bermasalah: {s.error}</p> : children && <p className="mt-1">{children}</p>}
    </div>
  )
}

/** Link to an admin-only page; nothing for team members (no dead ends). */
function AdminLink({ href, isAdmin, children }: { href: string; isAdmin: boolean; children: React.ReactNode }) {
  return isAdmin ? <CardLink href={href}>{children}</CardLink> : null
}

// ── 3 findings ─────────────────────────────────────────────────────────────

const FINDING: Record<Finding['tone'], { tone: Tone; icon: LucideIcon; word: string }> = {
  buruk: { tone: 'bearish', icon: XCircle, word: 'Masalah' },
  perlu_dicek: { tone: 'warn', icon: TriangleAlert, word: 'Perlu dicek' },
  baik: { tone: 'bullish', icon: CheckCircle2, word: 'Baik' },
  info: { tone: 'info', icon: Info, word: 'Info' },
}

function Findings({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const f = topFindings(r, { isAdmin })
  if (f.length === 0) {
    return (
      <DeckCard icon={Info} iconTone="muted" title="Ringkasan minggu ini">
        <p className="text-lg">Tidak ada temuan: semua bagian laporan minggu ini kosong.</p>
      </DeckCard>
    )
  }
  return (
    <section className="space-y-4">
      <SectionHead icon={FileText} title="3 hal terpenting" />
      <div className="grid gap-5 lg:grid-cols-3">
        {f.map((x, i) => {
          const c = FINDING[x.tone]
          return (
            <DeckCard key={x.key} hero={i === 0} icon={c.icon} iconTone={c.tone} eyebrow={`#${i + 1}`} action={<Pill tone={c.tone}>{c.word}</Pill>} outline={i === 0 ? undefined : c.tone === 'muted' ? undefined : c.tone}>
              <p className="text-lg font-semibold leading-snug tracking-tight">{x.text}</p>
              {x.href && <CardLink href={x.href} className="mt-4">{x.linkLabel ?? 'Lihat detail'}</CardLink>}
            </DeckCard>
          )
        })}
      </div>
    </section>
  )
}

// ── sections ────────────────────────────────────────────────────────────────

function Block({ icon, title, pill, link, children }: { icon: LucideIcon; title: string; pill?: React.ReactNode; link?: React.ReactNode; children: React.ReactNode }) {
  return (
    <DeckCard icon={icon} iconTone="info" title={<span className="inline-flex items-center gap-2">{title} {pill}</span>} action={link}>
      {children}
    </DeckCard>
  )
}

function PaperBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.paper
  const rows = s.presets ?? []
  const target = s.target_trades ?? 30
  return (
    <Block icon={Wallet} title="Paper" pill={<StatusPill kind="paper" size="xs" />} link={<AdminLink href="/lab/arena" isAdmin={isAdmin}>Paper berjalan</AdminLink>}>
      {!s.available || rows.length === 0 ? (
        <NoData s={s}>Belum ada preset paper di minggu ini.</NoData>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <BigNumber label="Transaksi" value={formatCount(s.trades_week ?? 0)} hint="minggu ini" />
            <BigNumber label="Aktif" value={formatCount(rows.filter((p) => p.active).length)} hint={`dari ${rows.length} preset`} />
            <BigNumber
              label="Terbaik"
              value={s.best ? formatPct(s.best.week_return_pct, { digits: 1, signed: true }) : '—'}
              tone={signTone(s.best?.week_return_pct)}
              hint={s.best?.preset ?? 'belum ada transaksi'}
            />
            <BigNumber
              label="Terburuk"
              value={s.worst ? formatPct(s.worst.week_return_pct, { digits: 1, signed: true }) : '—'}
              tone={signTone(s.worst?.week_return_pct)}
              hint={s.worst?.preset ?? 'butuh 2 preset bertransaksi'}
            />
          </div>
          <ul className="space-y-4">
            {rows.map((p) => (
              <li key={p.preset_id} className="grid items-center gap-x-5 gap-y-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">{p.preset}</div>
                  <div className="truncate text-[13px] text-muted-foreground">
                    {p.live_reference ? 'setting bot live' : `mulai ${formatTime(p.started_at, { time: false })}`}
                    {!p.active && ' · paper mati'}
                  </div>
                </div>
                <div>
                  <div className={cn('text-[15px] font-semibold tabular-nums', signClass(p.trades_week ? p.week_return_pct : null))}>
                    {p.trades_week ? formatPct(p.week_return_pct, { digits: 2, signed: true }) : '—'}
                  </div>
                  <div className="text-[13px] text-muted-foreground">minggu ini</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Transaksi</span>
                    <span className="font-semibold tabular-nums">
                      {p.trades_total}/{target}
                    </span>
                  </div>
                  <Meter value={p.trades_total} max={target} label={`${p.trades_total} dari ${target} transaksi`} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Block>
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
  { key: 'time', header: 'Waktu', mobile: 'badge', cell: (a) => <span className="whitespace-nowrap tabular-nums">{formatTime(a.ts)}</span> },
  { key: 'orders', header: 'Order', mobile: 'field', align: 'right', cell: (a) => <span className="tabular-nums">{a.orders}</span> },
  { key: 'executed', header: 'Tereksekusi', mobile: 'field', align: 'right', cell: (a) => <span className="tabular-nums">{a.executed}</span> },
  {
    key: 'rejected',
    header: 'Ditolak',
    mobile: 'field',
    align: 'right',
    cell: (a) => <span className={cn('tabular-nums', a.rejected ? 'font-semibold text-bearish' : '')}>{a.rejected}</span>,
  },
]

function LiveBotBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.live_bot
  const orders = s.orders ?? 0
  const executed = s.executed ?? 0
  return (
    <Block icon={Webhook} title="Bot live" pill={<StatusPill kind="live" size="xs" />} link={<AdminLink href="/bot" isAdmin={isAdmin}>Status bot</AdminLink>}>
      {!s.available ? (
        <NoData s={s}>Tidak ada alert bot live di minggu ini.</NoData>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-6">
            <Ring value={executed} max={orders || 1} tone={s.rejected ? 'warn' : 'bullish'} size={96} label={`${executed} dari ${orders} order tereksekusi`}>
              <span className="leading-tight">
                <span className="font-display block text-xl font-bold tabular-nums">
                  {executed}/{orders}
                </span>
                <span className="text-[11px] text-muted-foreground">order</span>
              </span>
            </Ring>
            <dl className="min-w-[160px] flex-1 space-y-2">
              {(
                [
                  ['sinyal (alert)', formatCount(s.signals ?? 0), undefined],
                  ['order tereksekusi', formatCount(executed), 'text-bullish'],
                  ['order ditolak', formatCount(s.rejected ?? 0), s.rejected ? 'text-bearish' : undefined],
                ] as const
              ).map(([label, value, cls]) => (
                <div key={label} className="flex items-baseline gap-3">
                  <dd className={cn('font-display w-12 text-right text-[28px] font-bold leading-none tabular-nums', cls)}>{value}</dd>
                  <dt className="text-[15px] text-muted-foreground">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <details className={foldCls}>
            <summary className={sumCls}>Lihat alert ({(s.alerts ?? []).length})</summary>
            <div className="mt-4">
              <ResponsiveTable rows={s.alerts ?? []} columns={ALERT_COLUMNS} rowKey={(a) => `${a.ts}|${a.symbol}|${a.action}|${a.side}`} caption="Alert bot live minggu ini" />
            </div>
          </details>
        </div>
      )}
    </Block>
  )
}

function ExecutionBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.execution
  const a = s.week
  return (
    <Block icon={Gauge} title="Kualitas eksekusi" pill={<StatusPill kind="live" size="xs" />} link={<AdminLink href="/bot#eksekusi" isAdmin={isAdmin}>Status bot</AdminLink>}>
      {!s.available || !a ? (
        <NoData s={s}>{s.overall ? `Tidak ada sinyal live minggu ini (${formatCount(s.overall.n_signals)} sejak mulai dicatat).` : null}</NoData>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            <BigNumber label="Slippage" value={a.mean_slippage_bps === null ? '—' : formatBps(a.mean_slippage_bps)} hint="rata-rata" />
            <BigNumber label="Jeda alert" value={a.mean_latency_s === null ? '—' : `${formatNumber(a.mean_latency_s, { digits: 1 })} dtk`} hint={a.latency_upper_bound ? 'batas atas' : 'rata-rata'} />
            <BigNumber label="Terisi" value={`${formatCount(a.n_with_fill)}/${formatCount(a.n_counted)}`} hint="sinyal" />
          </div>
          {(s.grid_week ?? []).length > 0 && (
            <details className={foldCls}>
              <summary className={sumCls}>Simulasi order limit</summary>
              <ul className="mt-4 space-y-3">
                {s.grid_week!.map((c) => (
                  <li key={`${c.k}|${c.ttl_min}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 text-[15px]">
                    <span>
                      {formatNumber(c.k, { maxDigits: 2 })} × ATR, tunggu {c.ttl_min} mnt
                    </span>
                    <span className={cn('font-semibold tabular-nums', signClass(c.mean_saving_bps))}>
                      {c.mean_saving_bps === null ? '—' : `hemat ${formatBps(c.mean_saving_bps)}`}
                    </span>
                    <Meter value={c.filled} max={c.n || 1} tone="info" label={`${c.filled} dari ${c.n} terisi`} />
                    <span className="text-[13px] tabular-nums text-muted-foreground">
                      {c.filled}/{c.n} terisi
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Block>
  )
}

const VERDICT_TONE: Record<string, Tone> = { terbukti: 'bullish', negatif: 'bearish', belum_terbukti: 'warn', belum_cukup_data: 'muted' }

function counts(c: LedgerReportSection['counts_week']) {
  const any = VERDICT_ORDER.some((k) => c?.[k])
  return (
    <div className="flex flex-wrap gap-2">
      {VERDICT_ORDER.filter((k) => c?.[k]).map((k) => (
        <Pill key={k} tone={VERDICT_TONE[k]}>
          {VERDICT_COPY[k].label} <span className="tabular-nums">{c?.[k]}</span>
        </Pill>
      ))}
      {!any && <span className="text-[15px] text-muted-foreground">—</span>}
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
        <div className="truncate text-[13px] font-normal text-muted-foreground">
          {directionLabel(g.direction)} · {SIGNAL_SOURCE_LABEL[g.source as keyof typeof SIGNAL_SOURCE_LABEL] ?? g.source}
        </div>
      </div>
    ),
  },
  {
    key: 'week',
    header: 'Minggu ini',
    mobile: 'badge',
    cell: (g) => (g.week ? <Pill tone={VERDICT_TONE[g.week.verdict]}>{VERDICT_COPY[g.week.verdict].label}</Pill> : <span className="text-muted-foreground">—</span>),
  },
  {
    key: 'week_mean',
    header: 'Rata-rata minggu ini',
    mobileLabel: 'Minggu ini',
    mobile: 'field',
    align: 'right',
    cell: (g) => <span className={cn('tabular-nums', signClass(g.week?.mean_pct))}>{g.week ? formatPct(g.week.mean_pct, { digits: 2, signed: true }) : '—'}</span>,
  },
  {
    key: 'overall',
    header: 'Keseluruhan',
    mobile: 'hidden',
    cell: (g) => <Pill tone={VERDICT_TONE[g.overall.verdict]}>{VERDICT_COPY[g.overall.verdict].label}</Pill>,
  },
  {
    key: 'overall_mean',
    header: 'Rata-rata keseluruhan',
    mobileLabel: 'Keseluruhan',
    mobile: 'field',
    align: 'right',
    cell: (g) => <span className={cn('tabular-nums', signClass(g.overall.mean_pct))}>{formatPct(g.overall.mean_pct, { digits: 2, signed: true })}</span>,
  },
]

function LedgerBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.ledger
  return (
    <Block icon={ListChecks} title="Rekam jejak sinyal" link={<AdminLink href="/lab/signals" isAdmin={isAdmin}>Rekam jejak</AdminLink>}>
      {!s.available ? (
        <NoData s={s} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Minggu ini · {formatCount(s.signals_week ?? 0)} sinyal</div>
              {counts(s.counts_week)}
            </div>
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Keseluruhan</div>
              {counts(s.counts_overall)}
            </div>
          </div>
          <details className={foldCls}>
            <summary className={sumCls}>Lihat per jenis sinyal ({(s.groups ?? []).length})</summary>
            <div className="mt-4">
              <ResponsiveTable rows={s.groups ?? []} columns={LEDGER_COLUMNS} rowKey={(g) => g.key} caption="Rekam jejak per jenis sinyal" />
            </div>
          </details>
          <p className="text-[13px] text-muted-foreground">Dicek 1 hari setelah sinyal, sebelum biaya.</p>
        </div>
      )}
    </Block>
  )
}

function LabBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const s = r.sections.lab
  const warnings = s.snooping_warnings ?? []
  return (
    <Block icon={FlaskConical} title="Aktivitas Lab">
      {!s.available ? (
        <NoData s={s}>Tidak ada uji atau preset baru di minggu ini.</NoData>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <BigNumber label="Uji" value={formatCount(s.runs ?? 0)} hint={`${formatCount(s.scans ?? 0)} banyak koin`} />
            <BigNumber label="Lolos" value={formatCount(s.pass ?? 0)} tone={s.pass ? 'bullish' : undefined} />
            <BigNumber label="Gagal" value={formatCount(s.fail ?? 0)} tone={s.fail ? 'bearish' : undefined} />
            <BigNumber label="Preset" value={formatCount(s.presets_saved?.length ?? 0)} hint="baru" />
          </div>
          {warnings.length > 0 && (
            <p className="flex items-start gap-2 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-[15px]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
              <span>
                Terlalu banyak mencoba: {warnings.map((w) => `${w.symbol.replace(/USDT$/, '')} ${strategyLabel(w.template_id)}`).join(', ')}. Hasil terbaiknya bisa kebetulan.
              </span>
            </p>
          )}
          {(s.pass_runs ?? []).length > 0 && (
            <details className={foldCls}>
              <summary className={sumCls}>Uji yang lolos ({s.pass_runs!.length})</summary>
              <ul className="mt-3 space-y-1.5 text-[15px]">
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
                    <span className={cn('font-semibold tabular-nums', signClass(p.net_return_pct))}>{formatPct(p.net_return_pct, { digits: 2, signed: true })}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Block>
  )
}

function SystemBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.system
  const d = s.deploys
  const b = s.backups
  return (
    <Block icon={Server} title="Kesehatan sistem">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          <BigNumber label="Pembaruan" value={d.available ? formatCount(d.live ?? 0) : '—'} hint={d.available ? 'sistem' : NO_DATA} />
          <BigNumber label="Gagal" value={d.available ? formatCount(d.failed ?? 0) : '—'} tone={d.failed ? 'bearish' : undefined} hint="pembaruan" />
          <BigNumber label="Cadangan" value={b.available ? `${formatCount(b.ok ?? 0)} ok` : '—'} hint={b.available ? `${b.failed ?? 0} gagal` : NO_DATA} />
          <BigNumber label="Terakhir" value={b.last ? formatTime(b.last.ts, { date: true, time: false }) : '—'} size="sm" hint={b.last ? formatTime(b.last.ts, { date: false }) : undefined} />
        </div>
        {s.processes ? (
          <div className="flex flex-wrap gap-2">
            {s.processes.map((p) => (
              <StatusPill key={p.name} kind={p.status === 'online' ? 'sehat' : 'bermasalah'} label={`${p.name}: ${p.status === 'online' ? 'berjalan' : p.status}`} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Status proses server tidak tersedia untuk minggu ini.</p>
        )}
      </div>
    </Block>
  )
}

function HooksBlock({ r, isAdmin }: { r: WeeklyReport; isAdmin: boolean }) {
  const hooks = reportHooks(r.hooks, isAdmin)
  if (hooks.length === 0) return null
  return (
    <div className="grid gap-5 sm:grid-cols-3 print:hidden" data-report-hooks="">
      {hooks.map((h) => (
        <Link key={h.id} href={h.href} data-report-hook={h.id} className="group rounded-3xl border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none">
          <div className="flex items-center justify-between text-[17px] font-semibold">
            {h.title}
            <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
          </div>
          <p className="mt-1 text-[15px] text-muted-foreground">{h.note}</p>
        </Link>
      ))}
    </div>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

function openFolds(open: boolean) {
  document.querySelectorAll<HTMLDetailsElement>('[data-report-print] details').forEach((d) => {
    if (open) {
      d.dataset.wasOpen = d.open ? '1' : '0'
      d.open = true
    } else if (d.dataset.wasOpen === '0') {
      d.open = false
    }
  })
}

/**
 * Laporan mingguan. Readable by every logged-in account (CEO decision); links to admin-only
 * pages are hidden for team members. Opens the newest final (frozen) week unless `?week=` says
 * otherwise. Printing (button or Ctrl+P) unfolds every detail first so the PDF is complete.
 * Needs a Suspense boundary.
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

  useEffect(() => {
    const before = () => openFolds(true)
    const after = () => openFolds(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  function pick(w: string) {
    router.replace(w === fallback ? pathname : `${pathname}?week=${encodeURIComponent(w)}`, { scroll: false })
  }

  const r = report.data
  const kind = r ? reportKind(r) : null
  return (
    <div className="space-y-8" data-report-print="">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Select value={week ?? ''} onValueChange={pick} disabled={!weeks.data}>
          <SelectTrigger className="h-11 w-full rounded-full px-5 text-[15px] sm:w-[340px]" aria-label="Pilih minggu">
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
        <Button
          variant="outline"
          className="h-11 rounded-full px-5"
          onClick={() => {
            openFolds(true)
            window.print()
          }}
          disabled={!r}
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Simpan PDF
        </Button>
      </div>

      {weeks.isError ? (
        <ErrorState error={weeks.error} onRetry={() => weeks.refetch()} title="Daftar minggu tidak bisa dimuat" />
      ) : !week || report.isPending ? (
        <LoadingState rows={8} label="Memuat laporan…" />
      ) : report.isError || !r ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} title="Laporan tidak bisa dimuat" />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 break-inside-avoid">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-info">Laporan mingguan</div>
              <h2 className="font-display mt-1 text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">{weekLabel(r)}</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">{weekPeriod(r)}</p>
            </div>
            {kind && (
              <Pill tone={kind === 'final' ? 'info' : kind === 'sementara' ? 'warn' : 'muted'} icon={kind === 'final' ? CheckCircle2 : Activity}>
                {WEEK_KIND_COPY[kind].label}
                {r.snapshot ? ` · ${formatTime(r.snapshot.generated_at)}` : ''}
              </Pill>
            )}
          </div>
          <Findings r={r} isAdmin={isAdmin} />
          <div className="grid gap-5 xl:grid-cols-2">
            <PaperBlock r={r} isAdmin={isAdmin} />
            <LiveBotBlock r={r} isAdmin={isAdmin} />
            <ExecutionBlock r={r} isAdmin={isAdmin} />
            <LedgerBlock r={r} isAdmin={isAdmin} />
            <LabBlock r={r} isAdmin={isAdmin} />
            <SystemBlock r={r} />
          </div>
          <HooksBlock r={r} isAdmin={isAdmin} />
        </>
      )}
    </div>
  )
}
