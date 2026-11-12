'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoTip } from '@/components/ui/info-tip'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { describeError } from '@/components/shell/error-copy'
import { BuilderSkeleton } from '@/components/lab/builder/BuilderSkeleton'
import { Step } from '@/components/lab/builder/Step'
import { StrategyStep } from '@/components/lab/builder/StrategyStep'
import { ImportantParams } from '@/components/lab/builder/ImportantParams'
import { AdvancedPanel } from '@/components/lab/builder/AdvancedPanel'
import { HoldoutNote, RunStep } from '@/components/lab/builder/RunStep'
import { OptimizeDialog } from '@/components/lab/builder/OptimizeDialog'
import { onlyKeys } from '@/components/lab/OptimizePanel'
import { useDebounced } from '@/components/lab/builder/useDebounced'
import {
  fromPreset,
  initialForm,
  periodRange,
  switchTemplate,
  tfDefaultsPatch,
  type FormState,
  type Period,
  type PrefillUse,
} from '@/components/lab/builder/form-state'
import { MODE_COPY } from '@/components/lab/run/copy'
import { holdoutPeriodError, proposedHoldoutStart, tfDefault } from '@/lib/lab/planning'
import {
  defaultSearchKeys,
  importanceByKey,
  localImportance,
  stepKeys,
  stepParams,
} from '@/lib/lab/importance'
import { useLabEstimate, useLabPresets, useLabRunDefaults } from '@/lib/queries/lab-insights'
import { notify } from '@/lib/utils/toast'
import { formatDate } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import {
  useCreateLabRun,
  useLabDataStatus,
  useLabHoldoutLock,
  useLabImportance,
  useLabRun,
  useLabSymbols,
  useLabTemplates,
} from '@/lib/queries/lab'
import { buildRunRequest, changedKeys, templateShort, validateOptimize, validateRunForm } from '@/lib/lab/form'
import type { LabRunMode, LabTemplate } from '@/lib/api/types/lab'

/**
 * "Uji strategi" in 3 steps: (1) what is tested, (2) the params that matter, (3) one primary
 * action. Everything else lives in the searchable "Lanjutan". Importance (research file / runs)
 * only decides what is shown first; it never changes a value.
 */
export function RunBuilder() {
  const router = useRouter()
  const search = useSearchParams()
  const fromId = search.get('from')
  const useParam = search.get('use')
  const use: PrefillUse = useParam === 'best' ? 'best' : useParam === 'trial' ? 'trial' : 'params'
  const presetParam = search.get('preset')
  const rankParam = search.get('rank')
  const rank = rankParam !== null && Number.isFinite(Number(rankParam)) ? Number(rankParam) : null

  const templatesQ = useLabTemplates()
  const symbolsQ = useLabSymbols()
  const prefillQ = useLabRun(fromId)
  const dataStatusQ = useLabDataStatus()
  const defaultsQ = useLabRunDefaults()
  const presetsQ = useLabPresets()
  const createRun = useCreateLabRun()

  const [form, setForm] = useState<FormState | null>(null)
  const [formKey, setFormKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingMode, setPendingMode] = useState<LabRunMode | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ack, setAck] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [optOpen, setOptOpen] = useState(false)
  const advancedRef = useRef<HTMLElement>(null)

  const templates = templatesQ.data ?? []
  const symbols = symbolsQ.data ?? []
  const defaults = defaultsQ.data
  const prefillReady = !fromId || prefillQ.isSuccess || prefillQ.isError
  const presetReady = !presetParam || presetsQ.isSuccess || presetsQ.isError
  const urlPreset = presetParam ? (presetsQ.data ?? []).find((p) => String(p.id) === presetParam) ?? null : null
  const desiredKey = `${fromId ?? ''}|${use}|${rank ?? ''}|${presetParam ?? ''}`

  // Initialise (or re-initialise when ?from / ?preset changes) during render, not in an effect.
  if (templates.length > 0 && symbolsQ.isSuccess && prefillReady && presetReady && formKey !== desiredKey) {
    setFormKey(desiredKey)
    setForm(initialForm(templates, symbols, prefillQ.data ?? null, use, rank, defaults, urlPreset))
    setErrors({})
    setSubmitError(null)
  }

  const template: LabTemplate | undefined = form ? templates.find((t) => t.id === form.templateId) ?? templates[0] : undefined
  const importanceQ = useLabImportance(template?.id, form?.timeframe)
  const lockQ = useLabHoldoutLock(template?.id, form?.symbol, form?.timeframe)
  // One debounced estimate for the primary action ("Uji jujur"); the optimize estimate is
  // requested only while its dialog is open.
  const estimateBody = useDebounced(
    template && form && form.symbol && form.timeframe
      ? { template_id: template.id, mode: 'validate' as const, symbols: [form.symbol], timeframes: [form.timeframe], start: form.start || undefined, end: form.end || undefined }
      : null,
    600,
  )
  const estimateQ = useLabEstimate(estimateBody)

  if (templatesQ.isPending || symbolsQ.isPending || (fromId && prefillQ.isPending)) return <BuilderSkeleton />

  const loadErr = templatesQ.error ?? symbolsQ.error
  if (loadErr) {
    return (
      <ErrorState
        error={loadErr}
        title="Strategi atau daftar koin gagal dimuat"
        onRetry={() => {
          void templatesQ.refetch()
          void symbolsQ.refetch()
        }}
      />
    )
  }
  if (templates.length === 0 || symbols.length === 0) {
    return (
      <EmptyState
        title={templates.length === 0 ? 'Belum ada strategi' : 'Belum ada daftar koin'}
        description="Server Lab belum mengirim data ini. Coba muat ulang sebentar lagi."
        action={<Button variant="outline" size="sm" onClick={() => { void templatesQ.refetch(); void symbolsQ.refetch() }}>Muat ulang</Button>}
      />
    )
  }
  if (!form || !template) return null

  // ── derived ────────────────────────────────────────────────────────────
  const measured = importanceQ.data && importanceQ.data.template_id === template.id ? importanceQ.data : null
  const importance = measured ?? localImportance(template, form.timeframe)
  const step = stepParams(template, importance)
  const inStep = stepKeys(step)
  const hiddenKeys = new Set(template.params.filter((p) => !inStep.has(p.key)).map((p) => p.key))
  const changed = changedKeys(template, form.params)
  const hiddenChanged = changed.filter((k) => hiddenKeys.has(k)).length
  const impMap = importanceByKey(measured)
  const importantSearch = new Set(defaultSearchKeys(template, step))
  const search_ = form.searchTouched ? form.optimize : onlyKeys(template, form.optimize, importantSearch)
  const symbolInfo = symbols.find((s) => s.symbol === form.symbol)
  const dataRow = dataStatusQ.data?.find((d) => d.symbol === form.symbol && d.timeframe === form.timeframe)
  const tfDef = tfDefault(form.timeframe, defaults)
  const lock = lockQ.data
  const lockStart = lock?.locked ? lock.holdout_start : null
  const periodError = holdoutPeriodError(lockStart, form.start, form.end)
  const proposed = proposedHoldoutStart(form.start || dataRow?.first?.slice(0, 10) || '2020-01-01', form.end || dataRow?.last || null)
  const presets = (presetsQ.data ?? []).filter((p) => p.template_id === template.id)
  const combo = `${templateShort(template.id, template.name)} × ${form.symbol.replace(/USDT$/, '')} × ${form.timeframe}`

  const update = (patch: Partial<FormState>) => {
    setSubmitError(null)
    setAck(false)
    setForm({ ...form, ...patch })
  }

  const openAdvancedChanged = () => {
    setAdvancedOpen(true)
    setOnlyChanged(true)
    setQuery('')
    requestAnimationFrame(() => advancedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const submit = (mode: LabRunMode) => {
    const state = { ...form, template }
    const errs = { ...validateRunForm(state), ...(mode === 'optimize' ? validateOptimize(template, search_) : {}) }
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      if (Object.keys(errs).some((k) => k.startsWith('search') || hiddenKeys.has(k) || k === 'commission_pct' || k === 'slippage_pct')) setAdvancedOpen(true)
      notify.error('Masih ada isian yang belum valid', { description: 'Cek kolom yang ditandai merah.' })
      return
    }
    if (mode !== 'backtest' && periodError) {
      notify.error('Periode bentrok dengan data baru yang terkunci', { description: periodError })
      return
    }
    setPendingMode(mode)
    setSubmitError(null)
    const req = buildRunRequest(state, mode, mode === 'optimize' ? search_ : null)
    if (form.presetId) req.preset_id = form.presetId
    createRun.mutate(req, {
      onSuccess: (res) => {
        setOptOpen(false)
        notify.success(`${MODE_COPY[mode]} masuk antrian`, { description: `Uji #${res.run_id}` })
        router.push(`/lab/runs/${encodeURIComponent(String(res.run_id))}`)
      },
      onError: (err) => {
        const d = describeError(err)
        setSubmitError(`${d.message}${d.hint ? ` ${d.hint}` : ''}`)
        notify.error('Uji gagal dibuat', { description: d.message })
      },
      onSettled: () => setPendingMode(null),
    })
  }

  const basisAside = (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[13px]">
        Dasar: <span className="font-semibold text-foreground">{importance.basis}</span>
      </span>
      <InfoTip title="Dasar urutan parameter" label="Penjelasan dasar urutan parameter" align="end">
        <span className="block">{importance.basis_detail}</span>
        {importance.note && <span className="mt-1 block">{importance.note}</span>}
        {importanceQ.isError && <span className="mt-1 block">Server belum menyediakan data kepentingan parameter, jadi urutannya bawaan strategi.</span>}
      </InfoTip>
    </span>
  )

  return (
    <div className="space-y-6">
      {fromId && (prefillQ.data || prefillQ.isError) && (
        <div className={cn('flex items-start gap-3 rounded-2xl border px-5 py-3.5 text-[15px]', prefillQ.isError ? 'border-warn/40 bg-warn/10 text-warn' : 'border-lab/30 bg-lab/10 text-lab')}>
          <Wand2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {prefillQ.isError
            ? `Uji #${fromId} tidak bisa dimuat, jadi form memakai default.`
            : `Diisi dari uji #${fromId}${use === 'best' ? ' (setting terbaik)' : use === 'trial' && rank !== null ? ` (kombinasi #${rank})` : ''}. Periksa, lalu klik Uji jujur.`}
        </div>
      )}

      <Step n={1} title="Apa yang diuji" description="Strategi, koin, timeframe, periode. Default sudah terisi.">
        <StrategyStep
          templates={templates}
          template={template}
          presets={presets}
          symbols={symbols}
          form={form}
          errors={errors}
          dataRow={dataRow}
          dataPending={dataStatusQ.isPending}
          autoStart={tfDef.start}
          autoReason={tfDef.reason}
          onTemplate={(id) => {
            const t = templates.find((x) => x.id === id) ?? templates[0]
            update(switchTemplate(form, t, defaults))
          }}
          onPreset={(p) => {
            if (!p) return update({ presetId: null })
            const next = fromPreset(form, templates, p)
            update({ ...next, ...tfDefaultsPatch(next, next.timeframe, defaults) })
          }}
          onSymbol={(s) => update({ symbol: s })}
          onTimeframe={(tf) => update({ timeframe: tf, ...tfDefaultsPatch(form, tf, defaults) })}
          onPeriod={(p: Period) => update({ period: p, ...periodRange(p, form.timeframe, form, defaults) })}
          onDates={(d) => update(d)}
        />
        {symbolInfo === undefined && <p className="pt-3 text-sm text-warn">Koin {form.symbol} tidak ada di daftar server.</p>}
      </Step>

      <Step
        n={2}
        title="Parameter penting"
        description={
          importance.source === 'template'
            ? 'Belum diukur di timeframe ini. Ini parameter utama strategi.'
            : 'Hanya yang terbukti mengubah hasil.'
        }
        aside={basisAside}
      >
        {importanceQ.isPending && importanceQ.fetchStatus !== 'idle' ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2" aria-busy="true">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
          </div>
        ) : (
          <ImportantParams step={step} importance={importance} values={form.params} errors={errors} onChange={(params) => update({ params })} />
        )}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span>{hiddenKeys.size} parameter lain ada di Lanjutan.</span>
          {hiddenChanged > 0 && (
            <button type="button" onClick={openAdvancedChanged} className="cursor-pointer rounded-full bg-warn/15 px-3 py-1 text-[13px] font-semibold text-warn hover:underline">
              {hiddenChanged} parameter lanjutan diubah · lihat
            </button>
          )}
        </div>
      </Step>

      <AdvancedPanel
        ref={advancedRef}
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        query={query}
        onQuery={setQuery}
        onlyChanged={onlyChanged}
        onOnlyChanged={setOnlyChanged}
        template={template}
        values={form.params}
        errors={errors}
        onParams={(params) => update({ params })}
        hiddenKeys={hiddenKeys}
        hiddenChanged={hiddenChanged}
        importance={impMap}
        costs={form.costs}
        onCosts={(costs) => update({ costs })}
        optimize={search_}
        onOptimize={(optimize) => update({ optimize, searchTouched: true, trialsTouched: form.trialsTouched || optimize.nTrials !== form.optimize.nTrials })}
        importantKeys={importantSearch}
        onQuickTest={() => submit('backtest')}
        quickPending={pendingMode === 'backtest'}
        disabled={createRun.isPending}
      />

      <Step
        n={3}
        title="Jalankan"
        description={
          <>
            <span className="num">{combo}</span> · {form.period === 'auto' ? `otomatis sejak ${formatDate(form.start)}` : form.start ? `sejak ${formatDate(form.start)}` : 'semua data'}
            {changed.length > 0 ? ` · ${changed.length} parameter diubah` : ' · setting default'}
            {hiddenChanged > 0 && (
              <>
                {' '}
                <button type="button" onClick={openAdvancedChanged} className="cursor-pointer font-semibold text-warn hover:underline">
                  ({hiddenChanged} di Lanjutan · lihat)
                </button>
              </>
            )}
          </>
        }
      >
        <RunStep
          holdout={
            <HoldoutNote
              lock={lock}
              loading={lockQ.isPending && lockQ.fetchStatus !== 'idle'}
              failed={lockQ.isError}
              proposedStart={proposed}
              combo={combo}
              periodError={periodError}
            />
          }
          estimate={estimateQ.data}
          estimating={estimateQ.isFetching}
          ack={ack}
          onAck={setAck}
          pendingMode={pendingMode}
          disabled={createRun.isPending}
          blockedReason={periodError ? 'Ubah periode dulu supaya tidak bentrok dengan data baru yang terkunci.' : null}
          onValidate={() => submit('validate')}
          onOptimize={() => setOptOpen(true)}
          submitError={submitError}
        />
      </Step>

      <OptimizeDialog
        open={optOpen}
        onOpenChange={setOptOpen}
        template={template}
        search={search_}
        importance={impMap}
        estimateBody={estimateBody ? { ...estimateBody, mode: 'optimize', n_trials: search_.nTrials } : null}
        pending={pendingMode === 'optimize'}
        onConfirm={() => submit('optimize')}
      />
    </div>
  )
}
