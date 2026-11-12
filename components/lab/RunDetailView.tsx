'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Ban, CandlestickChart, Columns3, Eye, Loader2, PlayCircle, RefreshCw, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusPill } from '@/components/ui/status-pill'
import { BentoGrid } from '@/components/ui/hero-card'
import { ErrorState } from '@/components/shell/states'
import { describeError } from '@/components/shell/error-copy'
import { LabHeader } from '@/components/lab/LabHeader'
import { HoldoutAlert } from '@/components/lab/run/HoldoutAlert'
import { CostDragSection } from '@/components/lab/CostDragSection'
import { EquitySection } from '@/components/lab/run/EquitySection'
import { JobProgress } from '@/components/lab/run/JobProgress'
import { KpiTiles } from '@/components/lab/run/KpiTiles'
import { OptimizeSection } from '@/components/lab/run/OptimizeSection'
import { ParamDiffTable } from '@/components/lab/run/ParamDiffTable'
import { SavePresetButton } from '@/components/lab/run/SavePresetButton'
import { SensitivityTab } from '@/components/lab/run/SensitivityTab'
import { TradesTab } from '@/components/lab/run/TradesTab'
import { PresetPaperDialog } from '@/components/lab/run/PresetPaperDialog'
import { ReportChecklist } from '@/components/lab/run/ReportChecklist'
import { VerdictHero } from '@/components/lab/run/VerdictHero'
import { Panel } from '@/components/lab/run/v2-ui'
import { MODE_COPY, errorCopy } from '@/components/lab/run/copy'
import { formatAge, formatDate } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { diffFromDefaults, isActiveStatus, isLiveTemplate, templateShort } from '@/lib/lab/form'
import { compareHref } from '@/lib/lab/planning'
import { useCancelLabJob, useLabJob, useLabRun, useLabTemplates } from '@/lib/queries/lab'
import { useCreateLabWatch } from '@/lib/queries/lab-live'

interface Step {
  title: string
  line: string
  label: string
  href?: string
  onClick?: () => void
  icon: typeof ArrowRight
}

/**
 * Run detail, design v2: a bento of the verdict hero (Lolos / Gagal + 3 big KPIs) and one big
 * next-step button, then the big equity chart, the report as tick / cross rows and the
 * training-vs-new-data panel. Pieces live in components/lab/run/*.
 */
export function RunDetailView({ id }: { id: string }) {
  const router = useRouter()
  const { data: run, isPending, error, refetch, isFetching } = useLabRun(id)
  const templatesQ = useLabTemplates()
  const cancel = useCancelLabJob()
  const createWatch = useCreateLabWatch()
  const active = isActiveStatus(run?.status)
  const jobQ = useLabJob(run?.job_id, active)
  const [paperOpen, setPaperOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-12 w-72" />
        <BentoGrid>
          <Skeleton className="h-80 rounded-3xl md:col-span-2" />
          <Skeleton className="h-80 rounded-3xl md:col-span-2 xl:col-span-1" />
        </BentoGrid>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  if (error || !run) {
    const notFound = describeError(error).kind === 'not_found'
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState
          error={error}
          title={notFound ? `Uji #${id} tidak ditemukan` : 'Detail uji gagal dimuat'}
          onRetry={notFound ? undefined : () => refetch()}
          action={<Button asChild variant="outline" size="sm"><Link href="/lab/hasil">Buka Hasil uji</Link></Button>}
        />
      </div>
    )
  }

  const done = run.status === 'done'
  const template = templatesQ.data?.find((t) => t.id === run.template_id)
  const strategy = templateShort(run.template_id, template?.name)
  const changed = diffFromDefaults(template, run.params)
  const usedParams = run.mode === 'optimize' && run.best_params ? run.best_params : run.params
  const rerunHref = `/lab?from=${encodeURIComponent(String(run.id))}${run.mode === 'optimize' && run.best_params ? '&use=best' : ''}`
  const chartHref = `/chart?run=${encodeURIComponent(String(run.id))}`
  const err = run.status === 'error' ? errorCopy(run.error) : null

  const watchSignals = () => {
    createWatch.mutate(
      { template_id: run.template_id, symbol: run.symbol, timeframe: run.timeframe, params: usedParams, costs: run.costs },
      {
        onSuccess: (res) => {
          notify.success('Sinyal dipantau', { description: 'Tanpa order dan tanpa paper. Lihat sinyalnya di Chart.' })
          router.push(`/chart?watch=${encodeURIComponent(String(res.watch_id))}`)
        },
        onError: (e) => notify.error('Gagal memantau sinyal', { description: describeError(e).message }),
      },
    )
  }

  // One primary next step per outcome.
  let next: Step | null = null
  if (done && run.verdict === 'PASS') {
    next = { title: 'Mulai paper', line: 'Simpan setting ini, lalu jalankan di akun simulasi.', label: 'Simpan sebagai preset & mulai paper', onClick: () => setPaperOpen(true), icon: PlayCircle }
  } else if (done && run.verdict === 'FAIL') {
    next = { title: 'Ubah setting', line: 'Jangan dipakai untuk paper atau uang asli.', label: 'Ubah setting', href: rerunHref, icon: Wand2 }
  } else if (done && run.mode === 'backtest') {
    next = { title: 'Uji jujur', line: 'Uji cepat bukan bukti. Uji jujur memakai data baru yang dikunci.', label: 'Uji jujur sekarang', href: `/lab?from=${encodeURIComponent(String(run.id))}`, icon: Wand2 }
  } else if (run.status === 'error' || run.status === 'cancelled' || done) {
    next = { title: 'Coba lagi', line: err?.hint ?? 'Ubah setting lalu jalankan lagi.', label: 'Ubah setting & coba lagi', href: rerunHref, icon: Wand2 }
  }

  const periodText = `${run.start ? formatDate(run.start) : 'awal data'} s/d ${run.end ? formatDate(run.end) : 'terbaru'}`

  return (
    <div className="space-y-6 sm:space-y-8">
      <BackLink />

      <LabHeader
        title={`${strategy} · ${run.symbol} ${run.timeframe}`}
        subtitle={`${MODE_COPY[run.mode]} · uji #${run.id} · ${periodText} · ${formatAge(run.created_at)}`}
        status={<StatusPill kind="riset" />}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Muat ulang">
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
            {active && run.job_id !== null && run.job_id !== undefined && (
              <Button variant="outline" className="gap-1.5 rounded-full text-bearish" disabled={cancel.isPending} onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4" />
                Batalkan
              </Button>
            )}
          </>
        }
      />

      <BentoGrid>
        <VerdictHero run={run} strategyName={template?.name} />
        {next ? (
          <Panel className="flex flex-col md:col-span-2 xl:col-span-1" bodyClassName="flex flex-1 flex-col">
            <p className="kicker">Langkah berikutnya</p>
            <p className="display mt-2 text-2xl font-bold">{next.title}</p>
            <p className="mt-1 text-base text-muted-foreground">{next.line}</p>
            <div className="mt-auto space-y-4 pt-6">
              {next.href ? (
                <Button asChild size="lg" className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-full px-5 py-3 text-center leading-snug text-base font-semibold shadow-[0_10px_32px_-10px] shadow-primary/60">
                  <Link href={next.href}>
                    <next.icon className="h-5 w-5" aria-hidden="true" />
                    {next.label}
                  </Link>
                </Button>
              ) : (
                <Button size="lg" onClick={next.onClick} className="h-auto min-h-12 w-full gap-2 whitespace-normal rounded-full px-5 py-3 text-center leading-snug text-base font-semibold shadow-[0_10px_32px_-10px] shadow-primary/60">
                  <next.icon className="h-5 w-5" aria-hidden="true" />
                  {next.label}
                </Button>
              )}
              {done && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                  <Link href={chartHref} className="inline-flex items-center gap-1.5 font-medium text-info hover:underline">
                    <CandlestickChart className="h-4 w-4" aria-hidden="true" />
                    Lihat di Chart
                  </Link>
                  {run.mode !== 'backtest' && (
                    <Link href={compareHref([String(run.id)])} className="inline-flex items-center gap-1.5 font-medium text-info hover:underline">
                      <Columns3 className="h-4 w-4" aria-hidden="true" />
                      Bandingkan
                    </Link>
                  )}
                  <button type="button" onClick={watchSignals} disabled={createWatch.isPending} className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-info hover:underline disabled:opacity-50">
                    {createWatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    Pantau sinyal
                  </button>
                </div>
              )}
              {done && run.template_id !== 'universal_v0' && (
                <div className="flex justify-center">
                  {run.verdict === 'FAIL' ? (
                    <button type="button" onClick={() => setPaperOpen(true)} className="cursor-pointer text-2xs text-muted-foreground underline-offset-4 hover:underline">
                      Tetap simpan sebagai preset &amp; mulai paper
                    </button>
                  ) : (
                    <SavePresetButton run={run} />
                  )}
                </div>
              )}
            </div>
          </Panel>
        ) : (
          active && (
            <div className="md:col-span-2 xl:col-span-1">
              <JobProgress job={jobQ.data} status={run.status} />
            </div>
          )
        )}
      </BentoGrid>

      {err && (
        <details className="rounded-3xl border border-bearish/30 bg-bearish/[0.05] px-5 py-4">
          <summary className="cursor-pointer text-sm font-medium text-bearish">Detail teknis error</summary>
          <p className="mt-2 break-words font-mono text-2xs text-muted-foreground">{run.error || 'Server tidak mengirim pesan error.'}</p>
        </details>
      )}

      <HoldoutAlert touches={run.holdout_touches} />

      <EquitySection run={run} enabled={done} />

      {done && (
        <BentoGrid>
          {(run.checks?.length ?? 0) > 0 && <ReportChecklist checks={run.checks} className="md:col-span-2" />}
          <KpiTiles run={run} className={(run.checks?.length ?? 0) > 0 ? 'md:col-span-2 xl:col-span-1' : 'md:col-span-2 xl:col-span-3'} />
        </BentoGrid>
      )}

      {done && <CostDragSection run={run} />}

      {done && run.mode === 'optimize' && <OptimizeSection run={run} template={template} />}

      {done && (
        <Panel>
          <Tabs defaultValue="trades">
            <TabsList className="mb-4">
              <TabsTrigger value="trades">Transaksi</TabsTrigger>
              <TabsTrigger value="params">Parameter{changed.length > 0 ? ` (${changed.length})` : ''}</TabsTrigger>
              <TabsTrigger value="sens">Ketahanan</TabsTrigger>
            </TabsList>
            <TabsContent value="trades">
              <TradesTab id={run.id} enabled={done} />
            </TabsContent>
            <TabsContent value="params">
              <ParamDiffTable
                rows={changed}
                live={isLiveTemplate(run.template_id)}
                emptyText={isLiveTemplate(run.template_id) ? 'Setting default = 4H-ETH-Basic (setting live), tidak ada yang diubah.' : 'Setting default strategi, tidak ada yang diubah.'}
              />
            </TabsContent>
            <TabsContent value="sens">
              <SensitivityTab run={run} template={template} />
            </TabsContent>
          </Tabs>
        </Panel>
      )}

      {done && <PresetPaperDialog run={run} template={template} open={paperOpen} onOpenChange={setPaperOpen} />}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan uji #{run.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Uji dihentikan dalam beberapa detik dan tidak menghasilkan rapor. Kunci data baru (holdout) tidak berubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Jangan</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run.job_id !== null &&
                run.job_id !== undefined &&
                cancel.mutate(run.job_id, {
                  onSuccess: () => notify.info('Permintaan batal terkirim'),
                  onError: (e) => notify.error('Gagal membatalkan', { description: describeError(e).message }),
                })
              }
            >
              Batalkan uji
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/lab/hasil" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      Kembali ke Hasil uji
    </Link>
  )
}
