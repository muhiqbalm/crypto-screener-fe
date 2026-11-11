'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bookmark, ChevronDown, Database, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { AdvancedParams, MainParams, ParamSummary } from '@/components/lab/ParamForm'
import { CostDisclosure } from '@/components/lab/CostInputs'
import { DOWNLOAD_HINT, SymbolPicker } from '@/components/lab/SymbolPicker'
import { OptimizePanel, optimizeSummary } from '@/components/lab/OptimizePanel'
import { PresetSelect } from '@/components/lab/PresetSelect'
import { RunActionBar } from '@/components/lab/builder/RunActionBar'
import { BuilderSkeleton } from '@/components/lab/builder/BuilderSkeleton'
import {
  fromPreset,
  initialForm,
  pickTimeframe,
  tfDefaultsPatch,
  type FormState,
  type PrefillUse,
} from '@/components/lab/builder/form-state'
import { tfDefault } from '@/lib/lab/planning'
import { useLabEstimate, useLabPresets, useLabRunDefaults } from '@/lib/queries/lab-insights'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { notify } from '@/lib/utils/toast'
import { formatTimestamp } from '@/lib/utils/format'
import { hasTimeframeData, lowerTfHint, sortTimeframes } from '@/lib/lab/timeframes'
import { cn } from '@/lib/utils/cn'
import { useCreateLabRun, useLabDataStatus, useLabRun, useLabSymbols, useLabTemplates } from '@/lib/queries/lab'
import {
  DATE_PRESETS,
  buildRunRequest,
  changedKeys,
  defaultOptimizeConfig,
  initialParamValues,
  presetRange,
  splitParams,
  validateOptimize,
  validateRunForm,
} from '@/lib/lab/form'
import type { LabRunMode } from '@/lib/api/types/lab'

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
  const [ack, setAck] = useState(false)

  const [form, setForm] = useState<FormState | null>(null)
  const [formKey, setFormKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingMode, setPendingMode] = useState<LabRunMode | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const templates = templatesQ.data ?? []
  const symbols = symbolsQ.data ?? []
  const prefillReady = !fromId || prefillQ.isSuccess || prefillQ.isError
  const presetReady = !presetParam || presetsQ.isSuccess || presetsQ.isError
  const urlPreset = presetParam ? (presetsQ.data ?? []).find((p) => String(p.id) === presetParam) ?? null : null
  const desiredKey = `${fromId ?? ''}|${use}|${rank ?? ''}|${presetParam ?? ''}`

  // Estimates for validate + optimize with the current inputs (backend model, calibrated on this server).
  const estBase = form && form.symbol && form.timeframe
    ? { template_id: form.templateId, symbols: [form.symbol], timeframes: [form.timeframe], start: form.start || undefined, end: form.end || undefined }
    : null
  const estValidate = useLabEstimate(estBase && { ...estBase, mode: 'validate' })
  const estOptimize = useLabEstimate(estBase && { ...estBase, mode: 'optimize', n_trials: form?.optimize.nTrials })
  const estBacktest = useLabEstimate(estBase && { ...estBase, mode: 'backtest' })

  // Initialise (or re-initialise when ?from / ?preset changes) during render, not in an effect.
  if (templates.length > 0 && symbolsQ.isSuccess && prefillReady && presetReady && formKey !== desiredKey) {
    setFormKey(desiredKey)
    setForm(initialForm(templates, symbols, prefillQ.data ?? null, use, rank, defaultsQ.data, urlPreset))
    setErrors({})
    setSubmitError(null)
  }

  if (templatesQ.isPending || symbolsQ.isPending || (fromId && prefillQ.isPending)) return <BuilderSkeleton />

  const loadErr = templatesQ.error ?? symbolsQ.error
  if (loadErr) {
    return (
      <Section>
        <ErrorPanel
          kind={loadErr instanceof ApiError ? loadErr.kind : 'server'}
          onRetry={() => {
            void templatesQ.refetch()
            void symbolsQ.refetch()
          }}
          messageOverride="Gagal memuat template / daftar koin dari server Lab."
        />
      </Section>
    )
  }

  if (templates.length === 0 || symbols.length === 0) {
    return (
      <Section>
        <EmptyState
          title={templates.length === 0 ? 'Belum ada template strategi' : 'Belum ada daftar koin'}
          description="Server Lab belum mengirim data ini. Coba muat ulang sebentar lagi."
          action={<Button variant="outline" size="sm" onClick={() => { void templatesQ.refetch(); void symbolsQ.refetch() }}>Muat ulang</Button>}
        />
      </Section>
    )
  }

  if (!form) return null

  const template = templates.find((t) => t.id === form.templateId) ?? templates[0]
  const symbolInfo = symbols.find((s) => s.symbol === form.symbol)
  const dataRow = dataStatusQ.data?.find((d) => d.symbol === form.symbol && d.timeframe === form.timeframe)
  const changed = changedKeys(template, form.params).length
  const { main, advanced } = splitParams(template)
  const advancedCount = advanced.reduce((a, g) => a + g.params.length, 0)
  const update = (patch: Partial<FormState>) => {
    setSubmitError(null)
    setAck(false)
    setForm({ ...form, ...patch })
  }
  const presets = (presetsQ.data ?? []).filter((p) => templates.some((t) => t.id === p.template_id))
  const activePreset = presets.find((p) => String(p.id) === form.presetId) ?? null
  const tfDef = tfDefault(form.timeframe, defaultsQ.data)
  const longerPeriod = form.periodTouched && (form.start === '' || form.start < tfDef.start) && tfDef.start > '2020-01-01'
  const moreTrials = form.trialsTouched && form.optimize.nTrials > tfDef.nTrials

  const submit = (mode: LabRunMode) => {
    const state = { ...form, template }
    const errs = { ...validateRunForm(state), ...(mode === 'optimize' ? validateOptimize(template, form.optimize) : {}) }
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      notify.error('Masih ada input yang belum valid', { description: 'Cek kolom yang ditandai merah.' })
      return
    }
    setPendingMode(mode)
    setSubmitError(null)
    const req = buildRunRequest(state, mode, mode === 'optimize' ? form.optimize : null)
    if (form.presetId) req.preset_id = form.presetId
    createRun.mutate(req, {
      onSuccess: (res) => {
        notify.success('Run masuk antrian', { description: `Run #${res.run_id}` })
        router.push(`/lab/runs/${encodeURIComponent(String(res.run_id))}`)
      },
      onError: (err) => {
        const detail = apiErrorDetail(err)
        setSubmitError(detail ?? 'Server Lab menolak atau tidak bisa dihubungi.')
        notify.error('Gagal membuat run', { description: detail ?? undefined })
      },
      onSettled: () => setPendingMode(null),
    })
  }

  const presetLabel = DATE_PRESETS.find((p) => p.id === form.preset)?.label ?? 'Custom'

  return (
    <div className="space-y-4">
      {fromId && (prefillQ.data || prefillQ.isError) && (
        <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', prefillQ.isError ? 'border-warn/40 bg-warn/10 text-warn' : 'border-lab/30 bg-lab/10 text-lab')}>
          <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {prefillQ.isError
            ? `Run #${fromId} tidak bisa dimuat — form memakai default live.`
            : `Diisi dari run #${fromId}${use === 'best' ? ' (parameter terbaik)' : use === 'trial' && rank !== null ? ` (kombinasi #${rank})` : ''}. Klik Validasi untuk menguji.`}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Left: market, period, costs, optimize settings */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Section title="Pasar & periode" icon={<Database className="h-4 w-4 text-lab" />}>
            <div className="space-y-4">
              {templates.length > 1 ? (
                <div className="space-y-1.5">
                  <label htmlFor="lab-template" className="text-xs font-medium">Template</label>
                  <select
                    id="lab-template"
                    value={template.id}
                    onChange={(e) => {
                      const t = templates.find((x) => x.id === e.target.value) ?? templates[0]
                      update({ templateId: t.id, params: initialParamValues(t), timeframe: pickTimeframe(t, form.timeframe), optimize: defaultOptimizeConfig(t), presetId: null })
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-popover">{t.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground" title={template.description}>
                  Strategi: <span className="font-medium text-foreground">{template.name}</span>
                </p>
              )}

              {presets.length > 0 && (
                <div className="space-y-1.5">
                  <label htmlFor="lab-preset" className="flex items-center gap-1.5 text-xs font-medium">
                    <Bookmark className="h-3.5 w-3.5 text-lab" aria-hidden="true" />
                    Preset
                  </label>
                  <PresetSelect
                    id="lab-preset"
                    presets={presets}
                    value={form.presetId}
                    onChange={(p) => {
                      if (!p) return update({ presetId: null })
                      const next = fromPreset(form, templates, p)
                      update({ ...next, ...tfDefaultsPatch(next, next.timeframe, defaultsQ.data) })
                    }}
                  />
                  <p className="text-2xs text-muted-foreground">
                    {activePreset
                      ? `${activePreset.name}: parameter khusus ${activePreset.symbol.replace(/USDT$/, '')} ${activePreset.timeframe}.${activePreset.symbol !== form.symbol || activePreset.timeframe !== form.timeframe ? ' Dipakai di koin/TF lain — hasil bisa jauh berbeda.' : ''}`
                      : 'Satu logika strategi, parameter berbeda per koin & timeframe. Pilih preset untuk mengisi form.'}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="lab-symbol" className="text-xs font-medium">Koin (Binance perp)</label>
                <SymbolPicker symbols={symbols} value={form.symbol} onChange={(s) => update({ symbol: s })} invalid={Boolean(errors.symbol)} />
                {errors.symbol && <p className="text-2xs text-bearish">{errors.symbol}</p>}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium">Timeframe</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Timeframe">
                  {sortTimeframes(template.timeframes).map((tf) => {
                    const noData = hasTimeframeData(symbolInfo, tf) === false
                    return (
                      <Chip
                        key={tf}
                        active={form.timeframe === tf}
                        onClick={() => update({ timeframe: tf, ...tfDefaultsPatch(form, tf, defaultsQ.data) })}
                        className="min-w-12 gap-1.5 font-mono"
                        title={noData ? `Data ${tf} untuk ${form.symbol} belum ada, akan diunduh saat dipakai` : undefined}
                      >
                        {tf}
                        {noData && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="belum ada data" />}
                      </Chip>
                    )
                  })}
                </div>
                {lowerTfHint([form.timeframe]) && <p className="text-2xs text-warn">{lowerTfHint([form.timeframe])}</p>}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium">Periode</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Periode">
                  {DATE_PRESETS.map((p) => (
                    <Chip
                      key={p.id}
                      active={form.preset === p.id}
                      onClick={() => {
                        const r = presetRange(p.id)
                        update(r ? { preset: p.id, ...r, periodTouched: true } : { preset: 'custom', periodTouched: true })
                      }}
                    >
                      {p.label}
                    </Chip>
                  ))}
                </div>
                {form.preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <label htmlFor="lab-start" className="text-2xs text-muted-foreground">Mulai</label>
                      <Input id="lab-start" type="date" value={form.start} onChange={(e) => update({ start: e.target.value, periodTouched: true })} className={cn('h-8 px-2 text-xs', errors.start && 'border-bearish')} />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="lab-end" className="text-2xs text-muted-foreground">Sampai (kosong = terbaru)</label>
                      <Input id="lab-end" type="date" value={form.end} onChange={(e) => update({ end: e.target.value, periodTouched: true })} className={cn('h-8 px-2 text-xs', errors.end && 'border-bearish')} />
                    </div>
                  </div>
                )}
                {(errors.start || errors.end) && <p className="text-2xs text-bearish">{errors.end ?? errors.start}</p>}
                <p className="text-2xs text-muted-foreground">20% data terakhir dikunci sebagai holdout untuk ujian akhir.</p>
                {!form.periodTouched && tfDef.reason && <p className="text-2xs text-muted-foreground">Default {form.timeframe}: {tfDef.reason}</p>}
                {longerPeriod && (
                  <p className="text-2xs text-warn">
                    Lebih panjang dari default {form.timeframe} (mulai {tfDef.start}) — run jauh lebih lama.{' '}
                    <button type="button" className="underline cursor-pointer" onClick={() => update({ ...tfDefaultsPatch({ ...form, periodTouched: false }, form.timeframe, defaultsQ.data), periodTouched: false })}>
                      Pakai default
                    </button>
                  </p>
                )}
              </div>

              <p className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
                <Database className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {symbolInfo && !symbolInfo.has_data
                    ? DOWNLOAD_HINT
                    : dataStatusQ.isPending
                      ? 'Cek data…'
                      : dataRow
                        ? `${dataRow.rows.toLocaleString('id-ID')} candle tersedia · ${formatTimestamp(dataRow.first).slice(0, 10)} → ${formatTimestamp(dataRow.last).slice(0, 10)}`
                        : `Data ${form.timeframe} untuk ${form.symbol} akan diunduh saat dipakai (±1 menit).`}
                </span>
              </p>

              <CostDisclosure value={form.costs} errors={errors} onChange={(costs) => update({ costs })} />
            </div>
          </Section>

          {main.length > 0 && (
            <details className="group rounded-xl border border-border bg-card shadow-sm" open={Boolean(errors.search) || Object.keys(errors).some((k) => k.startsWith('search.')) || undefined}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-lab" />Pengaturan cari parameter</span>
                  <span className="block truncate text-2xs text-muted-foreground">{optimizeSummary(form.optimize)}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <OptimizePanel
                  template={template}
                  value={form.optimize}
                  errors={errors}
                  onChange={(optimize) => update({ optimize, trialsTouched: form.trialsTouched || optimize.nTrials !== form.optimize.nTrials })}
                />
                {moreTrials && <p className="pt-2 text-2xs text-warn">Lebih banyak dari default {form.timeframe} ({tfDef.nTrials} percobaan) — optimize jauh lebih lama.</p>}
              </div>
            </details>
          )}
        </div>

        {/* Right: parameters */}
        <div className="space-y-4">
          {main.length > 0 && (
            <Section
              title="Parameter utama"
              icon={<SlidersHorizontal className="h-4 w-4 text-lab" />}
              description="12 parameter yang paling berpengaruh. Default = 4H-ETH-Basic (setting live ETH 4H); koin/TF lain biasanya butuh nilai berbeda."
              action={<ParamSummary template={template} values={form.params} onChange={(params) => update({ params })} />}
            >
              <MainParams template={template} values={form.params} errors={errors} onChange={(params) => update({ params })} />
            </Section>
          )}
          <Section
            title="Parameter lanjutan"
            description={`${advancedCount} parameter lain, dikelompokkan. Biasanya tidak perlu diubah.`}
            action={main.length === 0 ? <ParamSummary template={template} values={form.params} onChange={(params) => update({ params })} /> : undefined}
          >
            <AdvancedParams template={template} values={form.params} errors={errors} onChange={(params) => update({ params })} />
          </Section>
        </div>
      </div>

      <RunActionBar
        summary={
          <>
            {activePreset && <span className="text-lab">{activePreset.name} · </span>}
            <span className="font-mono">{form.symbol}</span> · <span className="font-mono">{form.timeframe}</span> · {presetLabel}
            {changed > 0 ? <span className="text-warn"> · {changed} parameter diubah</span> : <span className="text-muted-foreground"> · default template</span>}
          </>
        }
        submitError={submitError}
        pendingMode={pendingMode}
        disabled={createRun.isPending}
        nTrials={form.optimize.nTrials}
        estimates={{ backtest: estBacktest.data, validate: estValidate.data, optimize: estOptimize.data }}
        estimating={estValidate.isFetching || estOptimize.isFetching}
        ack={ack}
        onAck={setAck}
        onSubmit={submit}
      />
    </div>
  )
}
