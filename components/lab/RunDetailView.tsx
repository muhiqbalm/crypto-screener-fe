'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Ban, CandlestickChart, Loader2, RefreshCw, Sparkles, Trophy, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Eyebrow, Section } from '@/components/lab/Section'
import { ModeBadge, StatusBadge, signClass } from '@/components/lab/LabBadges'
import { ChecksList, HoldoutWarning, VerdictBanner } from '@/components/lab/HonestyReport'
import { EquityChart } from '@/components/lab/EquityChart'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { diffFromDefaults, isActiveStatus, paramLabel, relativeTime } from '@/lib/lab/form'
import { useCancelLabJob, useLabJob, useLabRun, useLabRunEquity, useLabRunTrades, useLabTemplates } from '@/lib/queries/lab'
import { useCreateLabWatch } from '@/lib/queries/lab-live'
import type { LabId, LabJob, LabMetrics, LabParamValue, LabRunDetail, LabTemplate } from '@/lib/api/types/lab'

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function num(m: LabMetrics | null | undefined, k: string): number | null {
  const v = m?.[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function fmtDd(v: number | null): string {
  return v === null ? '—' : `−${formatScore(Math.abs(v), 1)}%`
}

function fmtPf(v: number | null): string {
  return v === null ? '—' : formatScore(v)
}

function fmtVal(v: LabParamValue | undefined): string {
  if (v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'on' : 'off'
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)
  return v
}

interface Kpi {
  label: string
  key: string
  fmt: (v: number | null) => string
  cls?: (v: number | null) => string
}

const KPIS: Kpi[] = [
  { label: 'Net return', key: 'net_return_pct', fmt: (v) => formatPercent(v, 1), cls: signClass },
  { label: 'Profit factor', key: 'profit_factor', fmt: fmtPf },
  { label: 'Max drawdown', key: 'max_dd_pct', fmt: fmtDd, cls: (v) => (v === null ? '' : 'text-bearish') },
  { label: 'Winrate', key: 'win_rate_pct', fmt: (v) => (v === null ? '—' : `${formatScore(v, 1)}%`) },
  { label: 'Trade', key: 'trades', fmt: (v) => (v === null ? '—' : String(Math.round(v))) },
  { label: 'Sharpe', key: 'sharpe', fmt: (v) => (v === null ? '—' : formatScore(v)) },
]

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

export function KpiTiles({ run }: { run: LabRunDetail }) {
  const oos = run.oos_metrics
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {KPIS.map((k) => {
        const is = num(run.metrics, k.key)
        const ho = oos ? num(oos, k.key) : null
        return (
          <div key={k.key} className="flex flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <Eyebrow>{k.label}</Eyebrow>
            {oos ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground">In-sample</div>
                  <div className={cn('font-mono text-sm tabular-nums', k.cls?.(is))}>{k.fmt(is)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-lab">Holdout</div>
                  <div className={cn('font-mono text-base font-bold tabular-nums', k.cls?.(ho))}>{k.fmt(ho)}</div>
                </div>
              </div>
            ) : (
              <div className={cn('mt-2 font-mono text-lg font-bold tabular-nums', k.cls?.(is))}>{k.fmt(is)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function stageLabel(stage: string | null | undefined): string {
  const map: Record<string, string> = {
    queued: 'Menunggu antrian',
    data: 'Menyiapkan data',
    download: 'Mengunduh data',
    optimize: 'Mencari parameter',
    walk_forward: 'Walk-forward',
    backtest: 'Backtest',
    sensitivity: 'Uji sensitivitas',
    holdout: 'Ujian holdout',
    monte_carlo: 'Monte Carlo',
    report: 'Menyusun rapor',
  }
  return stage ? (map[stage] ?? stage.replace(/_/g, ' ')) : 'Memproses'
}

export function JobProgress({ job, status }: { job: LabJob | undefined; status: string }) {
  const p = job && typeof job.progress === 'object' && job.progress ? job.progress : null
  const total = p?.total ?? 0
  const done = p?.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null
  return (
    <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.07] p-4" role="status">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          {status === 'queued' ? 'Menunggu antrian…' : `${stageLabel(p?.stage)}…`}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {p?.trials_total ? `trial ${p.trials_done ?? 0}/${p.trials_total}` : total > 0 ? `${done}/${total}` : ''}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
        <div
          className={cn('h-full rounded-full bg-sky-500 transition-all', pct === null && 'w-1/3 animate-pulse')}
          style={pct !== null ? { width: `${pct}%` } : undefined}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Halaman update otomatis. Boleh ditinggal — hasilnya tersimpan di riwayat run.</p>
    </div>
  )
}

function ParamDiffTable({ rows, emptyText }: { rows: { key: string; label: string; def: LabParamValue; value: LabParamValue }[]; emptyText: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="border-b border-border/60 bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Parameter</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Default live</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dipakai</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2">
                <div className="text-sm">{r.label}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{r.key}</div>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{fmtVal(r.def)}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-warn">{fmtVal(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OptimizeSection({ run, template }: { run: LabRunDetail; template: LabTemplate | undefined }) {
  const diff = diffFromDefaults(template, run.best_params)
  const labelOf = (k: string) => {
    const spec = template?.params.find((p) => p.key === k)
    return spec ? paramLabel(spec) : k
  }
  const trials = run.top_trials ?? []
  return (
    <Section
      title="Hasil cari parameter"
      icon={<Sparkles className="h-4 w-4 text-lab" />}
      description={
        [
          run.n_trials ? `${run.trials_done ?? 0}/${run.n_trials} percobaan` : null,
          run.search?.params?.length ? `${run.search.params.length} parameter dicari` : null,
          run.objective ? `objektif: ${run.objective}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      action={
        run.best_params ? (
          <Button asChild size="sm">
            <Link href={`/lab?from=${encodeURIComponent(String(run.id))}&use=best`}>
              <Wand2 />
              Uji parameter ini
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold">Parameter terbaik vs default</h3>
          <ParamDiffTable rows={diff} emptyText="Parameter terbaik sama dengan default live." />
          <p className="text-[11px] text-muted-foreground">Dipilih dari data in-sample saja. Rapor di atas sudah menguji parameter ini di holdout.</p>
        </div>

        {trials.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold"><Trophy className="h-3.5 w-3.5 text-warn" />Top {trials.length} kombinasi</h3>
            <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border/60 bg-muted/30">
                  <tr>
                    {['#', 'Parameter', 'Net', 'PF', 'Max DD', 'Trade', 'Segmen untung', ''].map((h, i) => (
                      <th key={h || i} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i >= 2 && i < 7 ? 'text-right' : 'text-left')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {trials.map((t) => (
                    <tr key={t.rank} className={cn(t.rank === 1 && 'bg-lab/[0.05]')}>
                      <td className="px-3 py-2 font-mono text-xs font-bold">{t.rank}</td>
                      <td className="px-3 py-2">
                        {t.error ? (
                          <span className="text-xs text-bearish">{t.error}</span>
                        ) : (
                          <div className="flex max-w-[320px] flex-wrap gap-1">
                            {Object.entries(t.params).map(([k, v]) => (
                              <span key={k} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]" title={k}>
                                {labelOf(k)}: <b>{fmtVal(v)}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono text-xs', signClass(t.metrics?.net_return_pct))}>{formatPercent(t.metrics?.net_return_pct, 1)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{fmtPf(t.metrics?.profit_factor ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-bearish">{fmtDd(t.metrics?.max_dd_pct ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{valueOrDash(t.metrics?.trades)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {t.metrics?.segments ? `${t.metrics.profitable_segments ?? 0}/${t.metrics.segments}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                          <Link href={`/lab?from=${encodeURIComponent(String(run.id))}&use=trial&rank=${t.rank}`}>Uji kombinasi ini</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">Metrik di tabel ini dari data in-sample (walk-forward), bukan holdout.</p>
          </div>
        )}
      </div>
    </Section>
  )
}

function TradesTab({ id, enabled }: { id: LabId; enabled: boolean }) {
  const q = useLabRunTrades(id, enabled)
  if (!enabled) return <p className="py-6 text-center text-sm text-muted-foreground">Daftar trade muncul setelah run selesai.</p>
  if (q.isPending) return <Skeleton className="h-48 w-full" />
  if (q.error) return <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat daftar trade." />
  const trades = q.data ?? []
  if (trades.length === 0) return <EmptyState title="Tidak ada trade di periode ini" description="Coba periode lebih panjang atau longgarkan filter entry." />
  return (
    <div className="-mx-4 max-h-[520px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 border-b border-border/60 bg-card">
          <tr>
            {['Entry', 'Exit', 'Arah', 'Harga entry', 'Harga exit', 'P&L', 'Return equity', 'Alasan'].map((h, i) => (
              <th key={h} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i >= 3 && i <= 6 ? 'text-right' : 'text-left')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {trades.map((t, i) => (
            <tr key={`${t.entry_time}-${i}`}>
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px]">{formatTimestamp(t.entry_time).slice(0, 16)}</td>
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{formatTimestamp(t.exit_time).slice(0, 16)}</td>
              <td className={cn('px-3 py-1.5 text-xs font-bold uppercase', t.side.toLowerCase() === 'long' ? 'text-bullish' : 'text-bearish')}>{t.side}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{formatPrice(t.entry_price)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">{formatPrice(t.exit_price)}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(t.pnl_pct))}>{formatPercent(t.pnl_pct)}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(t.return_on_equity_pct))}>{formatPercent(t.return_on_equity_pct)}</td>
              <td className="px-3 py-1.5 text-xs">{valueOrDash(t.exit_reason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SensitivityTab({ run, template }: { run: LabRunDetail; template: LabTemplate | undefined }) {
  const s = run.sensitivity
  if (!s || !s.params?.length) return <p className="py-6 text-center text-sm text-muted-foreground">Uji sensitivitas hanya ada di mode Validasi / Optimize.</p>
  const labelOf = (k: string) => {
    const spec = template?.params.find((p) => p.key === k)
    return spec ? paramLabel(spec) : k
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Tiap parameter digeser ±10–20%. Stabilitas rendah (≤ {s.threshold ?? 0.5}) = hasil gampang berubah = rapuh. {s.unstable} dari {s.params.length} rapuh.
      </p>
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>
              {['Parameter', 'Nilai', 'Stabilitas', 'Status'].map((h, i) => (
                <th key={h} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i > 0 ? 'text-right' : 'text-left')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {s.params.map((p) => (
              <tr key={p.param}>
                <td className="px-3 py-2 text-sm">{labelOf(p.param)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{fmtVal(p.base ?? undefined)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{p.stability === null ? '—' : formatScore(p.stability)}</td>
                <td className={cn('px-3 py-2 text-right text-xs font-semibold', p.fragile ? 'text-bearish' : 'text-bullish')}>{p.fragile ? 'Rapuh' : 'Stabil'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EquitySection({ run, enabled }: { run: LabRunDetail; enabled: boolean }) {
  const q = useLabRunEquity(run.id, enabled)
  let body: React.ReactNode
  if (!enabled) body = <p className="py-10 text-center text-sm text-muted-foreground">Kurva equity muncul setelah run selesai.</p>
  else if (q.isPending) body = <Skeleton className="h-[260px] w-full sm:h-[360px]" />
  else if (q.error) body = <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat kurva equity." />
  else if (!q.data || q.data.length === 0) body = <EmptyState title="Belum ada titik equity" description="Backend tidak mengirim kurva untuk run ini." />
  else body = <EquityChart points={q.data} holdoutStart={run.holdout_start} />
  return (
    <Section
      title="Kurva equity"
      description={run.holdout_start ? `Holdout terkunci mulai ${formatTimestamp(run.holdout_start).slice(0, 10)} — bagian ungu tidak pernah dilihat optimizer.` : 'Seluruh periode (in-sample).'}
    >
      {body}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RunDetailView({ id }: { id: string }) {
  const router = useRouter()
  const { data: run, isPending, error, refetch, isFetching } = useLabRun(id)
  const templatesQ = useLabTemplates()
  const cancel = useCancelLabJob()
  const createWatch = useCreateLabWatch()
  const active = isActiveStatus(run?.status)
  const jobQ = useLabJob(run?.job_id, active)

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !run) {
    const notFound = error instanceof ApiError && error.kind === 'not_found'
    return (
      <div className="space-y-4">
        <BackLink />
        <Section>
          <ErrorPanel
            kind={error instanceof ApiError ? error.kind : 'server'}
            onRetry={() => refetch()}
            messageOverride={notFound ? `Run #${id} tidak ditemukan.` : 'Gagal memuat detail run dari server Lab.'}
          />
        </Section>
      </div>
    )
  }

  const done = run.status === 'done'
  const template = templatesQ.data?.find((t) => t.id === run.template_id)
  const changed = diffFromDefaults(template, run.params)
  const ho = run.oos_metrics

  const showOnChart = () => {
    createWatch.mutate(
      { template_id: run.template_id, symbol: run.symbol, timeframe: run.timeframe, params: run.params, costs: run.costs },
      {
        onSuccess: (res) => router.push(`/chart?watch=${encodeURIComponent(String(res.watch_id))}`),
        onError: (err) => notify.error('Gagal membuat watch', { description: apiErrorDetail(err) ?? 'Server Lab menolak atau tidak bisa dihubungi.' }),
      },
    )
  }

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ModeBadge mode={run.mode} />
            <StatusBadge status={run.status} />
            <span className="font-mono text-xs text-muted-foreground">run #{String(run.id)}</span>
          </div>
          <h1 className="font-mono text-3xl font-extrabold tracking-tight sm:text-4xl">
            {run.symbol} <span className="text-muted-foreground">{run.timeframe}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {run.start ?? 'awal data'} → {run.end ?? 'terbaru'} · komisi {run.costs?.commission_pct ?? '—'}% · slippage {run.costs?.slippage_pct ?? '—'}% · funding{' '}
            {run.costs?.funding ? 'dihitung' : 'tidak'} · {relativeTime(run.created_at)}
            {run.honesty_version && <> · rapor v{run.honesty_version}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5" aria-label="Refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
          {active && run.job_id !== null && run.job_id !== undefined && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-bearish"
              disabled={cancel.isPending}
              onClick={() =>
                cancel.mutate(run.job_id!, {
                  onSuccess: () => notify.info('Permintaan batal terkirim'),
                  onError: () => notify.error('Gagal membatalkan job'),
                })
              }
            >
              <Ban className="h-3.5 w-3.5" />
              Batalkan
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/lab?from=${encodeURIComponent(String(run.id))}`}>
              <Wand2 className="h-3.5 w-3.5" />
              Ubah &amp; jalankan ulang
            </Link>
          </Button>
          {done && (
            <Button size="sm" className="gap-1.5" onClick={showOnChart} disabled={createWatch.isPending}>
              {createWatch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CandlestickChart className="h-3.5 w-3.5" />}
              Tampilkan di Chart
            </Button>
          )}
        </div>
      </div>

      {active && <JobProgress job={jobQ.data} status={run.status} />}

      {run.status === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-bearish/40 bg-bearish/[0.07] p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-bearish" />
          <div className="min-w-0 space-y-2">
            <p className="font-semibold text-bearish">Run gagal dijalankan</p>
            <p className="break-words font-mono text-xs text-muted-foreground">{run.error || 'Backend tidak mengirim pesan error.'}</p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/lab?from=${encodeURIComponent(String(run.id))}`}>Ubah pengaturan &amp; coba lagi</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Hero verdict */}
      {run.status !== 'error' && (
        <div className="space-y-3">
          <VerdictBanner verdict={run.verdict} mode={run.mode} status={run.status} checks={run.checks ?? []}>
            {done && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg bg-background/60 px-4 py-3 lg:min-w-[260px]">
                <div>
                  <Eyebrow>{ho ? 'Return holdout' : 'Net return'}</Eyebrow>
                  <div className={cn('font-mono text-2xl font-bold tabular-nums', signClass(num(ho ?? run.metrics, 'net_return_pct')))}>
                    {formatPercent(num(ho ?? run.metrics, 'net_return_pct'), 1)}
                  </div>
                </div>
                <div>
                  <Eyebrow>{ho ? 'PF holdout' : 'Profit factor'}</Eyebrow>
                  <div className="font-mono text-2xl font-bold tabular-nums">{fmtPf(num(ho ?? run.metrics, 'profit_factor'))}</div>
                </div>
                {ho && num(ho, 'stress_net_return_pct') !== null && (
                  <div className="col-span-2 text-[11px] text-muted-foreground">
                    Dengan biaya 2×:{' '}
                    <span className={cn('font-mono font-semibold', signClass(num(ho, 'stress_net_return_pct')))}>{formatPercent(num(ho, 'stress_net_return_pct'), 1)}</span>
                  </div>
                )}
              </div>
            )}
          </VerdictBanner>
          <HoldoutWarning touches={run.holdout_touches} />
        </div>
      )}

      {done && <KpiTiles run={run} />}

      <EquitySection run={run} enabled={done} />

      {done && run.checks?.length > 0 && (
        <Section title="Rapor kejujuran" description="Semua cek harus lolos supaya rapor LOLOS. Data kosong dihitung gagal.">
          <ChecksList checks={run.checks} />
        </Section>
      )}

      {done && run.mode === 'optimize' && <OptimizeSection run={run} template={template} />}

      {done && (
        <Section>
          <Tabs defaultValue="trades">
            <TabsList className="mb-3">
              <TabsTrigger value="trades">Trade</TabsTrigger>
              <TabsTrigger value="params">Parameter{changed.length > 0 ? ` (${changed.length})` : ''}</TabsTrigger>
              <TabsTrigger value="sens">Sensitivitas</TabsTrigger>
            </TabsList>
            <TabsContent value="trades">
              <TradesTab id={run.id} enabled={done} />
            </TabsContent>
            <TabsContent value="params">
              <ParamDiffTable rows={changed} emptyText="Run ini memakai parameter default live ETH 4H (tidak ada yang diubah)." />
            </TabsContent>
            <TabsContent value="sens">
              <SensitivityTab run={run} template={template} />
            </TabsContent>
          </Tabs>
        </Section>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/lab" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" />
      Kembali ke Lab
    </Link>
  )
}
