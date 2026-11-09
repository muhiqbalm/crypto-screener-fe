'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Ban, CandlestickChart, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { ModeBadge, StatusBadge, VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { ChecksList, HoldoutWarning, VerdictBanner } from '@/components/lab/HonestyReport'
import { EquityChart } from '@/components/lab/EquityChart'
import { ApiError } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { isActiveStatus, metricLabel, orderedMetricKeys } from '@/lib/lab/form'
import { useCancelLabJob, useLabRun, useLabRunEquity, useLabRunTrades } from '@/lib/queries/lab'
import { useCreateLabWatch } from '@/lib/queries/lab-live'
import type { LabMetrics, LabParamValue, LabRunDetail } from '@/lib/api/types/lab'

const SIGNED_KEYS = new Set(['net_return_pct', 'cagr_pct', 'avg_trade_pct', 'expectancy_pct'])

export function formatMetric(key: string, v: LabMetrics[string] | undefined): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  if (typeof v === 'string') return v
  if (!Number.isFinite(v)) return '—'
  if (key === 'trades' || key.endsWith('_count')) return String(Math.round(v))
  if (SIGNED_KEYS.has(key)) return formatPercent(v)
  if (key.endsWith('_pct')) return `${formatScore(v)}%`
  return formatScore(v)
}

function metricClass(key: string, v: LabMetrics[string] | undefined): string {
  if (typeof v !== 'number') return ''
  if (SIGNED_KEYS.has(key)) return signClass(v)
  if (key === 'max_dd_pct') return 'text-bearish'
  return ''
}

function MetricsSection({ run }: { run: LabRunDetail }) {
  const oos = run.oos_metrics
  const keys = orderedMetricKeys(run.metrics, oos)
  if (keys.length === 0) return <EmptyPanel message="Backend belum mengirim metrik untuk run ini." />

  if (!oos) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {keys.map((k) => (
          <div key={k} className="rounded-lg border border-border/60 bg-card/50 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{metricLabel(k)}</div>
            <div className={`mt-1 font-mono text-lg font-bold tabular-nums ${metricClass(k, run.metrics[k])}`}>
              {formatMetric(k, run.metrics[k])}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[11px] uppercase">Metrik</TableHead>
          <TableHead className="text-right text-[11px] uppercase">In-sample</TableHead>
          <TableHead className="text-right text-[11px] uppercase">Out-of-sample</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k}>
            <TableCell className="py-2 text-xs">{metricLabel(k)}</TableCell>
            <TableCell className={`py-2 text-right font-mono text-xs tabular-nums ${metricClass(k, run.metrics[k])}`}>
              {formatMetric(k, run.metrics[k])}
            </TableCell>
            <TableCell className={`py-2 text-right font-mono text-xs font-bold tabular-nums ${metricClass(k, oos[k])}`}>
              {formatMetric(k, oos[k])}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ParamsList({ params }: { params: Record<string, LabParamValue> }) {
  const entries = Object.entries(params ?? {})
  if (entries.length === 0) return <p className="text-xs text-muted-foreground">—</p>
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-border/30 py-1 text-xs">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-mono">{String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

function TradesSection({ id, enabled }: { id: string; enabled: boolean }) {
  const q = useLabRunTrades(id, enabled)
  if (!enabled) return <p className="text-xs text-muted-foreground">Daftar trade muncul setelah run selesai.</p>
  if (q.isPending) return <Skeleton className="h-40 w-full" />
  if (q.error)
    return (
      <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat daftar trade." />
    )
  const trades = q.data ?? []
  if (trades.length === 0) return <EmptyPanel message="Tidak ada trade di periode ini." />
  return (
    <div className="max-h-[480px] overflow-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            {['Entry', 'Exit', 'Arah', 'Harga entry', 'Harga exit', 'P&L', 'Return equity', 'Alasan exit'].map((h) => (
              <TableHead key={h} className="text-[11px] uppercase">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((t, i) => (
            <TableRow key={`${t.entry_time}-${i}`}>
              <TableCell className="py-1.5 font-mono text-[11px]">{formatTimestamp(t.entry_time)}</TableCell>
              <TableCell className="py-1.5 font-mono text-[11px]">{formatTimestamp(t.exit_time)}</TableCell>
              <TableCell className={`py-1.5 text-xs font-bold uppercase ${t.side.toLowerCase() === 'long' ? 'text-bullish' : 'text-bearish'}`}>{t.side}</TableCell>
              <TableCell className="py-1.5 font-mono text-xs tabular-nums">{formatPrice(t.entry_price)}</TableCell>
              <TableCell className="py-1.5 font-mono text-xs tabular-nums">{formatPrice(t.exit_price)}</TableCell>
              <TableCell className={`py-1.5 font-mono text-xs tabular-nums ${signClass(t.pnl_pct)}`}>{formatPercent(t.pnl_pct)}</TableCell>
              <TableCell className={`py-1.5 font-mono text-xs tabular-nums ${signClass(t.return_on_equity_pct)}`}>{formatPercent(t.return_on_equity_pct)}</TableCell>
              <TableCell className="py-1.5 text-xs">{valueOrDash(t.exit_reason)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EquitySection({ id, enabled }: { id: string; enabled: boolean }) {
  const q = useLabRunEquity(id, enabled)
  if (!enabled) return <p className="text-xs text-muted-foreground">Kurva equity muncul setelah run selesai.</p>
  if (q.isPending) return <Skeleton className="h-80 w-full" />
  if (q.error)
    return (
      <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat kurva equity." />
    )
  if (!q.data || q.data.length === 0) return <EmptyPanel message="Backend tidak mengirim titik equity untuk run ini." />
  return <EquityChart points={q.data} />
}

export function RunDetailView({ id }: { id: string }) {
  const router = useRouter()
  const { data: run, isPending, error, refetch, isFetching } = useLabRun(id)
  const cancel = useCancelLabJob()
  const createWatch = useCreateLabWatch()

  if (isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (error || !run) {
    const notFound = error instanceof ApiError && error.kind === 'not_found'
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorPanel
          kind={error instanceof ApiError ? error.kind : 'server'}
          onRetry={() => refetch()}
          messageOverride={notFound ? `Run ${id} tidak ditemukan.` : 'Gagal memuat detail run dari server Lab.'}
        />
      </div>
    )
  }

  const done = run.status === 'done'
  const active = isActiveStatus(run.status)

  const showOnChart = () => {
    createWatch.mutate(
      { template_id: run.template_id, symbol: run.symbol, timeframe: run.timeframe, params: run.params, costs: run.costs },
      {
        onSuccess: (res) => router.push(`/chart?watch=${encodeURIComponent(res.watch_id)}`),
        onError: () => notify.error('Gagal membuat watch', { description: 'Server Lab menolak atau tidak bisa dihubungi.' }),
      },
    )
  }

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/40 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <ModeBadge mode={run.mode} />
            <VerdictBadge verdict={run.verdict} />
          </div>
          <h1 className="font-mono text-3xl font-extrabold tracking-tight">
            {run.symbol} <span className="text-muted-foreground">{run.timeframe}</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Template <span className="font-mono">{run.template_id}</span> · periode {run.start ?? 'awal data'} → {run.end ?? 'akhir data'} · dibuat{' '}
            {formatTimestamp(run.created_at)}
            {run.engine_commit && (
              <>
                {' '}· engine <span className="font-mono">{run.engine_commit}</span>
              </>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Biaya: komisi {run.costs?.commission_pct ?? '—'}% · slippage {run.costs?.slippage_pct ?? '—'}% · funding {run.costs?.funding ? 'dihitung' : 'tidak dihitung'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {active && run.job_id && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-rose-400"
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
            <Link href={`/lab?from=${encodeURIComponent(run.id)}`}>
              <Wand2 className="h-3.5 w-3.5" />
              Edit &amp; jalankan ulang
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

      {active && (
        <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Run masih {run.status === 'queued' ? 'antri' : 'jalan'}. Halaman update otomatis tiap 3 detik.
        </div>
      )}

      {run.status === 'error' && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div>
            <p className="font-bold text-rose-300">Run gagal</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{run.error || 'Backend tidak mengirim pesan error.'}</p>
          </div>
        </div>
      )}

      {/* Honesty report */}
      <section className="space-y-3" aria-labelledby="honesty-h">
        <h2 id="honesty-h" className="text-sm font-bold uppercase tracking-wider">Laporan kejujuran</h2>
        <VerdictBanner verdict={run.verdict} mode={run.mode} status={run.status} />
        <HoldoutWarning touches={run.holdout_touches} />
        {done && <ChecksList checks={run.checks ?? []} />}
      </section>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Kurva equity</CardTitle>
        </CardHeader>
        <CardContent>
          <EquitySection id={run.id} enabled={done} />
        </CardContent>
      </Card>

      {done && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
              {run.oos_metrics ? 'Metrik: in-sample vs out-of-sample' : 'Metrik'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsSection run={run} />
          </CardContent>
        </Card>
      )}

      {run.mode === 'optimize' && run.best_params && Object.keys(run.best_params).length > 0 && (
        <Card className="border-violet-500/30">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Parameter terbaik (optimize)
            </CardTitle>
            <Button asChild size="sm">
              <Link href={`/lab?from=${encodeURIComponent(run.id)}&use=best`}>Pakai parameter ini</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ParamsList params={run.best_params} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Dipilih di in-sample. Wajib divalidasi ulang — parameter hasil optimize gampang overfit.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Parameter run</CardTitle>
        </CardHeader>
        <CardContent>
          <ParamsList params={run.params} />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Daftar trade</CardTitle>
        </CardHeader>
        <CardContent>
          <TradesSection id={run.id} enabled={done} />
        </CardContent>
      </Card>
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
