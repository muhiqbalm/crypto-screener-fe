'use client'

import { PageHeader } from '@/components/shell/page'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Ban, Bookmark, CandlestickChart, Columns3, FlaskConical, Loader2, RefreshCw, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Eyebrow, Section } from '@/components/lab/Section'
import { ModeBadge, StatusBadge, signClass } from '@/components/lab/LabBadges'
import { ChecksList, HoldoutWarning, VerdictBanner } from '@/components/lab/HonestyReport'
import { CostDragSection } from '@/components/lab/CostDragSection'
import { EquitySection } from '@/components/lab/run/EquitySection'
import { JobProgress } from '@/components/lab/run/JobProgress'
import { KpiTiles } from '@/components/lab/run/KpiTiles'
import { OptimizeSection } from '@/components/lab/run/OptimizeSection'
import { ParamDiffTable } from '@/components/lab/run/ParamDiffTable'
import { SavePresetButton } from '@/components/lab/run/SavePresetButton'
import { SensitivityTab } from '@/components/lab/run/SensitivityTab'
import { TradesTab } from '@/components/lab/run/TradesTab'
import { fmtPf, num } from '@/components/lab/run/format'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { diffFromDefaults, isActiveStatus, relativeTime } from '@/lib/lab/form'
import { compareHref } from '@/lib/lab/planning'
import { useCancelLabJob, useLabJob, useLabRun, useLabTemplates } from '@/lib/queries/lab'
import { useCreateLabWatch } from '@/lib/queries/lab-live'

/**
 * Run detail page. Pieces live in components/lab/run/* (KPIs, progress,
 * optimize table, trades, sensitivity, equity).
 */

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

      <PageHeader
        eyebrow="Strategy Lab · detail run"
        eyebrowIcon={FlaskConical}
        tone="lab"
        title={
          <span className="num">
            {run.symbol} <span className="text-muted-foreground">{run.timeframe}</span>
          </span>
        }
        description={
          <span className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <ModeBadge mode={run.mode} />
              <StatusBadge status={run.status} />
              <span className="num text-xs text-muted-foreground">run #{String(run.id)}</span>
              {run.preset && (
                <Link href="/lab/presets" className="inline-flex items-center gap-1 rounded-full border border-lab/30 bg-lab/10 px-2 py-0.5 text-2xs font-medium text-lab hover:underline" title="Run ini memakai parameter preset ini tanpa diubah">
                  <Bookmark className="h-3 w-3" aria-hidden="true" />
                  <span className="num">{run.preset.name}</span>
                </Link>
              )}
              {(run.saved_as ?? []).map((n) => (
                <span key={n} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground" title="Disimpan sebagai preset">
                  disimpan sbg <span className="num font-medium text-foreground">{n}</span>
                </span>
              ))}
            </span>
            <span className="text-xs">
              {run.start ?? 'awal data'} → {run.end ?? 'terbaru'} · komisi {run.costs?.commission_pct ?? '—'}% · slippage {run.costs?.slippage_pct ?? '—'}% · funding{' '}
              {run.costs?.funding ? 'dihitung' : 'tidak'} · {relativeTime(run.created_at)}
              {run.honesty_version && <> · rapor v{run.honesty_version}</>}
            </span>
          </span>
        }
        actions={
          <>
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
              {done && run.mode !== 'backtest' && (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={compareHref([String(run.id)])}>
                    <Columns3 className="h-3.5 w-3.5" />
                    Bandingkan
                  </Link>
                </Button>
              )}
              {done && run.template_id !== 'universal_v0' && <SavePresetButton run={run} />}
              {done && (
                <Button size="sm" className="gap-1.5" onClick={showOnChart} disabled={createWatch.isPending}>
                  {createWatch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CandlestickChart className="h-3.5 w-3.5" />}
                  Tampilkan di Chart
                </Button>
              )}
          </>
        }
      />

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
                  <div className="col-span-2 text-2xs text-muted-foreground">
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

      {done && <CostDragSection run={run} />}

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
              <ParamDiffTable rows={changed} emptyText="Run ini memakai parameter default = preset 4H-ETH-Basic (tidak ada yang diubah)." />
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
