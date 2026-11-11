'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  FlaskConical,
  Gauge,
  ListChecks,
  Printer,
  Server,
  Wallet,
  Webhook,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatTile } from '@/components/ui/stat-tile'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Section } from '@/components/lab/Section'
import { ErrorState, LoadingState, errorKind } from '@/components/shell/states'
import { cn } from '@/lib/utils/cn'
import { formatPercent, formatTimestamp, formatUsdSigned, signClass } from '@/lib/utils/format'
import { NO_DATA, VERDICT_COPY, VERDICT_ORDER, directionLabel, weekLabel } from '@/lib/lab/report'
import { useReportWeeks, useWeeklyReport } from '@/lib/queries/report'
import type {
  ExecActual,
  LedgerReportSection,
  LedgerVerdictStats,
  SectionBase,
  WeeklyReport,
} from '@/lib/api/types/report'

const th = 'px-2 py-1.5 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground'
const td = 'px-2 py-1.5 align-top'
const sectionCls = 'break-inside-avoid print:shadow-none'

function NoData({ s, children }: { s: SectionBase | undefined; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
      <p className="font-medium">{NO_DATA}</p>
      {s?.error ? <p className="mt-1 text-bearish">Sumber error: {s.error}</p> : children}
    </div>
  )
}

function num(v: number | null | undefined, digits = 1, suffix = ''): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(digits)}${suffix}`
}

function Verdict({ v }: { v: LedgerVerdictStats | null | undefined }) {
  if (!v) return <span className="text-muted-foreground">—</span>
  const c = VERDICT_COPY[v.verdict]
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant={c.variant} size="xs">{c.label}</Badge>
      <span className="num text-2xs text-muted-foreground">n={v.n}</span>
    </span>
  )
}

// ── sections ──────────────────────────────────────────────────────────────

function PaperBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.paper
  const rows = s.presets ?? []
  return (
    <Section
      className={sectionCls}
      icon={<Wallet className="h-4 w-4 text-lab" />}
      title="Preset paper"
      description={`Return, trade dan drawdown per preset paper (target ${s.target_trades ?? 30} trade sebelum dinilai).`}
      action={<Link href="/lab/arena" className="text-2xs text-info hover:underline print:hidden">Arena Paper →</Link>}
    >
      {!s.available || rows.length === 0 ? (
        <NoData s={s}>Belum ada preset paper yang berjalan di minggu ini.</NoData>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Trade minggu ini" value={s.trades_week ?? 0} hint={`${s.trades_total ?? 0} trade sejak mulai`} />
            <StatTile label="Preset aktif" value={rows.filter((p) => p.active).length} hint={`${rows.length} preset tercatat`} />
            <StatTile
              label="Terbaik minggu ini"
              value={s.best ? s.best.preset : '—'}
              hint={s.best ? formatPercent(s.best.week_return_pct) : 'belum ada trade ditutup'}
              valueClassName="text-base"
            />
            <StatTile
              label="Terburuk minggu ini"
              value={s.worst ? s.worst.preset : '—'}
              hint={s.worst ? formatPercent(s.worst.week_return_pct) : 'butuh ≥ 2 preset yang trade'}
              valueClassName="text-base"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="border-b">
                <tr>
                  <th className={th}>Preset</th>
                  <th className={cn(th, 'text-right')}>Return minggu</th>
                  <th className={cn(th, 'text-right')}>Return total</th>
                  <th className={cn(th, 'text-right')}>Trade (minggu / total)</th>
                  <th className={cn(th, 'text-right')}>Max DD</th>
                  <th className={cn(th, 'text-right')}>Posisi terbuka</th>
                  <th className={th}>Progres ke {s.target_trades ?? 30}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p) => (
                  <tr key={p.preset_id}>
                    <td className={td}>
                      <div className="font-medium">{p.preset}</div>
                      <div className="text-3xs text-muted-foreground">
                        mulai {p.started_at.slice(0, 10)}
                        {p.live_reference && ' · acuan live'}
                        {!p.active && ' · nonaktif'}
                      </div>
                    </td>
                    <td className={cn(td, 'num text-right', signClass(p.trades_week ? p.week_return_pct : null))}>
                      {p.trades_week ? formatPercent(p.week_return_pct) : '—'}
                    </td>
                    <td className={cn(td, 'num text-right', signClass(p.trades_total ? p.total_return_pct : null))}>
                      {p.trades_total ? formatPercent(p.total_return_pct) : '—'}
                    </td>
                    <td className={cn(td, 'num text-right')}>
                      {p.trades_week} / {p.trades_total}
                    </td>
                    <td className={cn(td, 'num text-right')}>{p.max_dd_pct === null ? '—' : `${p.max_dd_pct.toFixed(2)}%`}</td>
                    <td className={cn(td, 'num text-right')}>
                      {p.open_positions}
                      {p.unrealized_pnl !== null && (
                        <span className={cn('ml-1 text-3xs', signClass(p.unrealized_pnl))}>({formatUsdSigned(p.unrealized_pnl)})</span>
                      )}
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-lab" style={{ width: `${Math.max(0, Math.min(100, p.progress_pct))}%` }} />
                        </div>
                        <span className="num text-3xs text-muted-foreground">{p.trades_total}/{s.target_trades ?? 30}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.note && <p className="text-2xs text-muted-foreground">{s.note}</p>}
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

function LedgerBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.ledger
  return (
    <Section
      className={sectionCls}
      icon={<ListChecks className="h-4 w-4 text-info" />}
      title="Catatan Sinyal"
      description="Tipe sinyal mana yang terbukti, negatif, atau belum terbukti: minggu ini dibanding keseluruhan (horizon 1 hari)."
      action={<Link href="/lab/signals" className="text-2xs text-info hover:underline print:hidden">Buka Catatan Sinyal →</Link>}
    >
      {!s.available ? (
        <NoData s={s} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="eyebrow mb-1.5">Minggu ini · {s.signals_week ?? 0} sinyal</div>
              {counts(s.counts_week)}
            </div>
            <div className="rounded-lg border p-3">
              <div className="eyebrow mb-1.5">Keseluruhan (s/d akhir minggu)</div>
              {counts(s.counts_overall)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="border-b">
                <tr>
                  <th className={th}>Sinyal</th>
                  <th className={th}>Minggu ini</th>
                  <th className={cn(th, 'text-right')}>Rata-rata 1h (minggu)</th>
                  <th className={th}>Keseluruhan</th>
                  <th className={cn(th, 'text-right')}>Rata-rata 1h (total)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(s.groups ?? []).map((g) => (
                  <tr key={g.key}>
                    <td className={td}>
                      <span className="font-medium">{g.signal_type}</span>{' '}
                      <span className="text-muted-foreground">{directionLabel(g.direction)} · {g.source}</span>
                    </td>
                    <td className={td}><Verdict v={g.week} /></td>
                    <td className={cn(td, 'num text-right', signClass(g.week?.mean_pct))}>{g.week ? formatPercent(g.week.mean_pct) : '—'}</td>
                    <td className={td}><Verdict v={g.overall} /></td>
                    <td className={cn(td, 'num text-right', signClass(g.overall.mean_pct))}>{formatPercent(g.overall.mean_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.note && <p className="text-2xs text-muted-foreground">{s.note}</p>}
        </div>
      )}
    </Section>
  )
}

function ExecTiles({ a, label }: { a: ExecActual; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label={`Sinyal ${label}`} value={a.n_counted} hint={`${a.n_signals} tercatat · ${a.n_with_fill} dengan fill`} />
      <StatTile
        label="Slippage rata-rata"
        value={num(a.mean_slippage_bps, 1, ' bps')}
        hint={`median ${num(a.median_slippage_bps, 1, ' bps')}`}
        valueClassName={a.mean_slippage_bps === null ? '' : signClass(-a.mean_slippage_bps)}
      />
      <StatTile label="Latensi rata-rata" value={num(a.mean_latency_s, 1, ' dtk')} hint={a.latency_upper_bound ? 'batas atas (created_at)' : `median ${num(a.median_latency_s, 1, ' dtk')}`} />
      <StatTile label="Sinyal dengan fill" value={a.n_with_fill} hint="fill pasar dari trade_logs" />
    </div>
  )
}

function ExecutionBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.execution
  return (
    <Section
      className={sectionCls}
      icon={<Gauge className="h-4 w-4 text-info" />}
      title="Kualitas eksekusi"
      description="Slippage dan latensi sinyal webhook live, plus simulasi limit order pasif (shadow)."
      action={<Link href="/lab/signals" className="text-2xs text-info hover:underline print:hidden">Detail →</Link>}
    >
      {!s.available || !s.week ? (
        <NoData s={s}>{s.overall ? `Tidak ada sinyal live minggu ini (${s.overall.n_signals} sinyal sejak mulai dicatat).` : null}</NoData>
      ) : (
        <div className="space-y-3">
          <ExecTiles a={s.week} label="minggu ini" />
          {(s.grid_week ?? []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead className="border-b">
                  <tr>
                    <th className={th}>Limit (k × ATR)</th>
                    <th className={th}>TTL</th>
                    <th className={cn(th, 'text-right')}>Terisi</th>
                    <th className={cn(th, 'text-right')}>Hemat rata-rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {s.grid_week!.map((c) => (
                    <tr key={`${c.k}|${c.ttl_min}`}>
                      <td className={cn(td, 'num')}>{c.k}</td>
                      <td className={cn(td, 'num')}>{c.ttl_min} mnt</td>
                      <td className={cn(td, 'num text-right')}>{c.filled}/{c.n}</td>
                      <td className={cn(td, 'num text-right', signClass(c.mean_saving_bps))}>{num(c.mean_saving_bps, 1, ' bps')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-2xs text-muted-foreground">
            Sampel kecil = anekdot. Keseluruhan: {s.overall?.n_counted ?? 0} sinyal, slippage rata-rata {num(s.overall?.mean_slippage_bps, 1, ' bps')}.
          </p>
        </div>
      )}
    </Section>
  )
}

function LiveBotBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.live_bot
  return (
    <Section
      className={sectionCls}
      icon={<Webhook className="h-4 w-4 text-brand" />}
      title="Aktivitas bot live"
      description="Dari trade_logs (dibaca read-only): sinyal masuk, order yang tereksekusi dan yang ditolak."
      action={<Link href="/lab/live-check" className="text-2xs text-info hover:underline print:hidden">Cek Live vs Strategi →</Link>}
    >
      {!s.available ? (
        <NoData s={s}>Tidak ada sinyal webhook di minggu ini.</NoData>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Sinyal" value={s.signals ?? 0} hint="alert TradingView" />
            <StatTile label="Order" value={s.orders ?? 0} hint="satu per user" />
            <StatTile label="Tereksekusi" value={s.executed ?? 0} valueClassName="text-bullish" />
            <StatTile label="Ditolak / gagal" value={s.rejected ?? 0} valueClassName={s.rejected ? 'text-bearish' : ''} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="border-b">
                <tr>
                  <th className={th}>Waktu (UTC)</th>
                  <th className={th}>Sinyal</th>
                  <th className={cn(th, 'text-right')}>Order</th>
                  <th className={cn(th, 'text-right')}>Tereksekusi</th>
                  <th className={cn(th, 'text-right')}>Ditolak</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(s.alerts ?? []).map((a) => (
                  <tr key={`${a.ts}|${a.symbol}|${a.action}|${a.side}`}>
                    <td className={cn(td, 'num')}>{a.ts.replace('T', ' ').slice(0, 16)}</td>
                    <td className={td}>
                      {a.action} {a.side} <span className="text-muted-foreground">{a.symbol}</span>
                    </td>
                    <td className={cn(td, 'num text-right')}>{a.orders}</td>
                    <td className={cn(td, 'num text-right text-bullish')}>{a.executed}</td>
                    <td className={cn(td, 'num text-right', a.rejected ? 'text-bearish' : '')}>{a.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {s.note && <p className="text-2xs text-muted-foreground">{s.note}</p>}
        </div>
      )}
    </Section>
  )
}

const MODE_LABEL: Record<string, string> = { backtest: 'Backtest', validate: 'Validasi', optimize: 'Optimasi' }

function LabBlock({ r }: { r: WeeklyReport }) {
  const s = r.sections.lab
  return (
    <Section className={sectionCls} icon={<FlaskConical className="h-4 w-4 text-lab" />} title="Aktivitas Lab" description="Run, scan, preset yang disimpan, hasil PASS dan peringatan data-snooping.">
      {!s.available ? (
        <NoData s={s}>Tidak ada run, scan atau preset baru di minggu ini.</NoData>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Run"
              value={s.runs ?? 0}
              hint={Object.entries(s.runs_by_mode ?? {}).map(([m, n]) => `${MODE_LABEL[m] ?? m} ${n}`).join(' · ') || '—'}
            />
            <StatTile label="PASS" value={s.pass ?? 0} hint={`${s.fail ?? 0} FAIL`} valueClassName={s.pass ? 'text-bullish' : ''} />
            <StatTile label="Scan" value={s.scans ?? 0} />
            <StatTile label="Preset disimpan" value={s.presets_saved?.length ?? 0} />
          </div>
          {(s.snooping_warnings ?? []).length > 0 && (
            <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
              <div>
                <b className="text-warn">Peringatan data-snooping</b>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {s.snooping_warnings!.map((w) => (
                    <li key={`${w.template_id}|${w.symbol}`}>
                      {w.symbol} · {w.template_id}: {w.runs} run validasi/optimasi, {w.timeframes} timeframe, {w.trials} percobaan parameter, holdout disentuh {w.holdout_touches}×
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {(s.pass_runs ?? []).length > 0 && (
            <div>
              <div className="eyebrow mb-1">Run PASS</div>
              <ul className="space-y-0.5 text-xs">
                {s.pass_runs!.map((p) => (
                  <li key={p.id}>
                    <Link href={`/lab/runs/${p.id}`} className="text-info hover:underline">#{p.id}</Link> {MODE_LABEL[p.mode] ?? p.mode}{' '}
                    {p.timeframe.toUpperCase()} {p.symbol} · {p.template_id} ·{' '}
                    <span className={cn('num', signClass(p.net_return_pct))}>{formatPercent(p.net_return_pct)}</span>
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
                    {p.verdict ? ` · ${p.verdict}` : ''}
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
    <Section className={sectionCls} icon={<Server className="h-4 w-4 text-muted-foreground" />} title="Kesehatan sistem" description="Deploy, backup harian dan status proses (PM2). Log dibaca read-only; rahasia disensor.">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Deploy live" value={d.available ? d.live ?? 0 : '—'} hint={d.available ? `${d.dry_run ?? 0} dry-run` : NO_DATA} />
          <StatTile label="Deploy gagal" value={d.available ? d.failed ?? 0 : '—'} valueClassName={d.failed ? 'text-bearish' : ''} />
          <StatTile label="Backup OK" value={b.available ? b.ok ?? 0 : '—'} hint={b.available ? `${b.failed ?? 0} gagal` : NO_DATA} />
          <StatTile label="Backup terakhir" value={b.last ? b.last.ts.slice(0, 16).replace('T', ' ') : '—'} valueClassName="text-sm" hint={b.last ? 'UTC' : NO_DATA} />
        </div>
        {d.available && (d.events ?? []).length > 0 ? (
          <ul className="space-y-0.5 text-xs">
            {d.events!.filter((e) => e.kind === 'live' || e.kind === 'failed').map((e, i) => (
              <li key={`${e.ts}|${i}`} className="flex gap-2">
                <span className="num shrink-0 text-muted-foreground">{e.ts.replace('T', ' ').slice(0, 16)}</span>
                <Badge variant={e.kind === 'live' ? 'bullish' : 'bearish'} size="xs">{e.kind === 'live' ? 'live' : 'gagal'}</Badge>
                <span className="min-w-0 break-words">{e.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2xs text-muted-foreground">{d.available ? 'Tidak ada deploy di minggu ini.' : 'Log deploy tidak tersedia.'}</p>
        )}
        {s.processes ? (
          <div className="flex flex-wrap gap-1.5">
            {s.processes.map((p) => (
              <Badge key={p.name} variant={p.status === 'online' ? 'bullish' : 'bearish'} size="sm">
                {p.name}: {p.status} · {p.restarts ?? '—'} restart
                {p.up_since ? ` · sejak ${p.up_since.slice(0, 16).replace('T', ' ')}` : ''}
              </Badge>
            ))}
            <span className="text-3xs text-muted-foreground">
              Dibaca {formatTimestamp(s.processes_at)}; jumlah restart kumulatif sejak proses didaftarkan, bukan per minggu.
            </span>
          </div>
        ) : (
          <p className="text-2xs text-muted-foreground">Status proses: {NO_DATA.toLowerCase()} (hanya dibaca untuk minggu berjalan / saat snapshot).</p>
        )}
      </div>
    </Section>
  )
}

function HooksBlock({ r }: { r: WeeklyReport }) {
  return (
    <Section className={cn(sectionCls, 'print:hidden')} icon={<Activity className="h-4 w-4 text-muted-foreground" />} title="Halaman terkait" description="Ringkasan dari halaman ini akan disambungkan ke laporan berikutnya.">
      <div className="grid gap-2 sm:grid-cols-3" data-report-hooks="">
        {r.hooks.map((h) => (
          <Link key={h.id} href={h.href} data-report-hook={h.id} className="group rounded-lg border p-3 transition-colors hover:bg-accent">
            <div className="flex items-center justify-between text-sm font-medium">
              {h.title}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </div>
            <p className="mt-0.5 text-2xs text-muted-foreground">{h.note}</p>
          </Link>
        ))}
      </div>
    </Section>
  )
}

// ── page ──────────────────────────────────────────────────────────────────

export function WeeklyReportView() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const week = params.get('week')
  const weeks = useReportWeeks()
  const report = useWeeklyReport(week)
  const selected = week ?? weeks.data?.current ?? ''

  function pick(w: string) {
    router.replace(w === weeks.data?.current ? pathname : `${pathname}?week=${encodeURIComponent(w)}`, { scroll: false })
  }

  const r = report.data
  return (
    <div className="space-y-5" data-report-print="">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Select value={selected} onValueChange={pick} disabled={!weeks.data}>
          <SelectTrigger className="w-[280px]" aria-label="Pilih minggu">
            <SelectValue placeholder="Pilih minggu" />
          </SelectTrigger>
          <SelectContent>
            {(weeks.data?.weeks ?? []).map((w) => (
              <SelectItem key={w.week} value={w.week}>
                {weekLabel(w)}
                {w.current ? ' (berjalan)' : w.snapshot ? ' · snapshot' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!r}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Simpan PDF
        </Button>
        <span className="text-2xs text-muted-foreground">Pakai dialog cetak browser → “Simpan sebagai PDF”.</span>
      </div>

      {report.isLoading ? (
        <LoadingState rows={8} />
      ) : report.isError || !r ? (
        <ErrorState kind={errorKind(report.error)} onRetry={() => report.refetch()} />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">Laporan Mingguan {weekLabel(r)}</span>
              {r.source === 'snapshot' ? (
                <Badge variant="info" size="sm">Snapshot (beku)</Badge>
              ) : r.partial ? (
                <Badge variant="warn" size="sm">Minggu berjalan · data sementara</Badge>
              ) : (
                <Badge variant="muted" size="sm">Dihitung ulang (tanpa snapshot)</Badge>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">
              Periode {r.start.slice(0, 10)} 00:00 – {r.end.slice(0, 10)} 00:00 UTC ·{' '}
              {r.snapshot ? `snapshot dibuat ${formatTimestamp(r.snapshot.generated_at)}` : `dihitung ${formatTimestamp(r.generated_at)}`}
            </p>
          </div>
          <PaperBlock r={r} />
          <LedgerBlock r={r} />
          <ExecutionBlock r={r} />
          <LiveBotBlock r={r} />
          <LabBlock r={r} />
          <SystemBlock r={r} />
          <HooksBlock r={r} />
        </>
      )}
    </div>
  )
}
