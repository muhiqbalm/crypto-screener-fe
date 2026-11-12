'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ban, BookmarkPlus, CandlestickChart, Columns3, Eye, Loader2, PlayCircle, RefreshCw, Wand2 } from 'lucide-react'
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
import { AnswerCard, type AnswerTone } from '@/components/ui/answer-card'
import { NextStep, type NextStepAction } from '@/components/ui/next-step'
import { StatusPill } from '@/components/ui/status-pill'
import { ErrorState } from '@/components/shell/states'
import { describeError } from '@/components/shell/error-copy'
import { LabHeader } from '@/components/lab/LabHeader'
import { Section } from '@/components/lab/Section'
import { ChecksList, HoldoutWarning } from '@/components/lab/HonestyReport'
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
import { MODE_COPY, errorCopy, verdictSentence, type SentenceTone } from '@/components/lab/run/copy'
import { num } from '@/components/lab/run/format'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { formatAge, formatDate } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { diffFromDefaults, isActiveStatus, isLiveTemplate, templateShort } from '@/lib/lab/form'
import { compareHref } from '@/lib/lab/planning'
import { useCancelLabJob, useLabJob, useLabRun, useLabTemplates } from '@/lib/queries/lab'
import { useCreateLabWatch } from '@/lib/queries/lab-live'
import type { LabRunDetail } from '@/lib/api/types/lab'

const TONE: Record<SentenceTone, AnswerTone> = { pass: 'baik', fail: 'buruk', error: 'buruk', running: 'menunggu', none: 'info' }
const TITLE: Record<SentenceTone, string> = { pass: 'Lolos', fail: 'Gagal', error: 'Error', running: 'Sedang diuji', none: 'Tanpa rapor' }

function answerMetrics(run: LabRunDetail) {
  const ho = run.oos_metrics as Record<string, unknown> | null
  const src = ho ?? (run.mode === 'backtest' ? (run.metrics as Record<string, unknown>) : null)
  if (!src || run.status !== 'done') return undefined
  const where = ho ? 'di data baru' : 'seluruh periode'
  const m = src as LabRunDetail['metrics']
  const net = num(m, 'net_return_pct')
  const pf = num(m, 'profit_factor')
  const dd = num(m, 'max_dd_pct')
  const trades = num(m, 'trades')
  return [
    { label: `Hasil bersih ${where}`, value: formatPct(net, { signed: true }), valueClassName: signClass(net) },
    { label: 'PF', value: pf === null ? (trades ? '∞' : '—') : formatNumber(pf), hint: trades !== null ? `${formatNumber(trades, { digits: 0 })} trade` : undefined },
    { label: 'Turun terdalam', value: dd === null ? '—' : formatPct(-Math.abs(dd)), valueClassName: dd === null ? undefined : 'text-bearish' },
  ]
}

/**
 * Run detail: one verdict sentence first, then the next step, then the evidence (equity, report,
 * costs, trades). Pieces live in components/lab/run/*.
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
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
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
  const sentence = verdictSentence(run)
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

  // One primary next step per outcome (audit §2.12).
  let next: { description: string; action: NextStepAction; secondary?: NextStepAction } | null = null
  if (done && run.verdict === 'PASS') {
    next = {
      description: 'Lolos di data baru. Simpan setting ini sebagai preset dan jalankan paper (simulasi) untuk melihat hasilnya di pasar sekarang.',
      action: { label: 'Simpan sebagai preset & mulai paper', onClick: () => setPaperOpen(true), icon: PlayCircle },
      secondary: { label: 'Lihat di Chart', href: chartHref, icon: CandlestickChart },
    }
  } else if (done && run.verdict === 'FAIL') {
    next = {
      description: 'Gagal di data baru. Jangan dipakai untuk paper atau uang asli; ubah setting atau coba strategi lain, lalu uji lagi.',
      action: { label: 'Ubah setting', href: rerunHref, icon: Wand2 },
      secondary: { label: 'Lihat di Chart', href: chartHref, icon: CandlestickChart },
    }
  } else if (done && run.mode === 'backtest') {
    next = {
      description: 'Uji cepat bukan bukti. Uji jujur menilai setting yang sama di data baru yang dikunci.',
      action: { label: 'Uji jujur sekarang', href: `/lab?from=${encodeURIComponent(String(run.id))}`, icon: Wand2 },
      secondary: { label: 'Lihat di Chart', href: chartHref, icon: CandlestickChart },
    }
  } else if (run.status === 'error' || run.status === 'cancelled' || done) {
    next = {
      description: run.status === 'error' ? (err?.hint ?? 'Ubah setting lalu coba lagi.') : 'Ubah setting lalu jalankan lagi.',
      action: { label: 'Ubah setting & coba lagi', href: rerunHref, icon: Wand2 },
    }
  }

  const periodText = `${run.start ? formatDate(run.start) : 'awal data'} s/d ${run.end ? formatDate(run.end) : 'terbaru'}`

  return (
    <div className="space-y-6">
      <BackLink />

      <LabHeader
        title={`${strategy} · ${run.symbol} ${run.timeframe}`}
        subtitle={`${MODE_COPY[run.mode]} · uji #${run.id} · ${periodText} · fee ${run.costs?.commission_pct ?? '—'}% · slippage ${run.costs?.slippage_pct ?? '—'}% · funding ${run.costs?.funding ? 'dihitung' : 'tidak'} · ${formatAge(run.created_at)}`}
        status={<StatusPill kind="riset" />}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Muat ulang">
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            </Button>
            {active && run.job_id !== null && run.job_id !== undefined && (
              <Button variant="outline" size="sm" className="gap-1.5 text-bearish" disabled={cancel.isPending} onClick={() => setCancelOpen(true)}>
                <Ban className="h-3.5 w-3.5" />
                Batalkan
              </Button>
            )}
            {done && run.mode !== 'backtest' && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={compareHref([String(run.id)])}>
                  <Columns3 className="h-3.5 w-3.5" />
                  Bandingkan
                </Link>
              </Button>
            )}
            {done && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={watchSignals} disabled={createWatch.isPending} title="Hitung sinyal setting ini tiap candle tutup, tanpa order">
                {createWatch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                Pantau sinyal
              </Button>
            )}
            {done && run.template_id !== 'universal_v0' && <SavePresetButton run={run} />}
          </>
        }
      />

      <AnswerCard
        tone={TONE[sentence.tone]}
        title={TITLE[sentence.tone]}
        answer={sentence.text}
        metrics={answerMetrics(run)}
        evidenceHref={done && (run.checks?.length ?? 0) > 0 ? '#rapor' : undefined}
        evidenceLabel="Lihat rapor"
        status={<span className="text-2xs text-muted-foreground">{MODE_COPY[run.mode]}{run.preset ? ` · dari preset ${run.preset.name}` : ''}</span>}
        footer={
          (run.saved_as ?? []).length > 0 ? (
            <span className="text-2xs text-muted-foreground">
              Sudah disimpan sebagai <span className="num font-medium text-foreground">{(run.saved_as ?? []).join(', ')}</span>
            </span>
          ) : undefined
        }
      />

      {next && <NextStep description={next.description} action={next.action} secondary={next.secondary} />}

      {active && <JobProgress job={jobQ.data} status={run.status} />}

      {err && (
        <details className="rounded-xl border border-bearish/30 bg-bearish/[0.05] px-4 py-3 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-bearish">{err.text} Detail teknis</summary>
          <p className="mt-2 break-words font-mono text-2xs text-muted-foreground">{run.error || 'Server tidak mengirim pesan error.'}</p>
        </details>
      )}

      <HoldoutWarning touches={run.holdout_touches} />

      {done && <KpiTiles run={run} />}

      <EquitySection run={run} enabled={done} />

      {done && (run.checks?.length ?? 0) > 0 && (
        <Section id="rapor" className="scroll-mt-20" title="Rapor uji" description="Semua syarat harus terpenuhi supaya Lolos. Data kosong dihitung Gagal.">
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
              <TabsTrigger value="sens">Ketahanan</TabsTrigger>
            </TabsList>
            <TabsContent value="trades">
              <TradesTab id={run.id} enabled={done} />
            </TabsContent>
            <TabsContent value="params">
              <ParamDiffTable
                rows={changed}
                live={isLiveTemplate(run.template_id)}
                emptyText={isLiveTemplate(run.template_id) ? 'Uji ini memakai setting default = 4H-ETH-Basic (setting live), tidak ada yang diubah.' : 'Uji ini memakai setting default strategi, tidak ada yang diubah.'}
              />
            </TabsContent>
            <TabsContent value="sens">
              <SensitivityTab run={run} template={template} />
            </TabsContent>
          </Tabs>
        </Section>
      )}

      {(run.saved_as ?? []).length === 0 && done && run.verdict === 'FAIL' && (
        <p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Tetap ingin mempaper setting yang Gagal?{' '}
          <button type="button" onClick={() => setPaperOpen(true)} className="cursor-pointer font-medium text-info hover:underline">
            Simpan sebagai preset &amp; mulai paper
          </button>
        </p>
      )}

      {done && <PresetPaperDialog run={run} open={paperOpen} onOpenChange={setPaperOpen} />}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan uji #{run.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Uji yang sedang berjalan dihentikan dalam beberapa detik dan tidak menghasilkan rapor. Kunci data baru (holdout) tidak berubah.
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
    <Link href="/lab/hasil" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" />
      Kembali ke Hasil uji
    </Link>
  )
}
