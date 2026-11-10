'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Database, Info, Loader2, Play, ShieldCheck, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { AdvancedParams, MainParams, ParamSummary } from '@/components/lab/ParamForm'
import { CostDisclosure } from '@/components/lab/CostInputs'
import { DOWNLOAD_HINT, SymbolPicker } from '@/components/lab/SymbolPicker'
import { OptimizePanel, optimizeSummary } from '@/components/lab/OptimizePanel'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { notify } from '@/lib/utils/toast'
import { formatTimestamp } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { useCreateLabRun, useLabDataStatus, useLabRun, useLabSymbols, useLabTemplates } from '@/lib/queries/lab'
import {
  DATE_PRESETS,
  DEFAULT_COSTS,
  buildRunRequest,
  changedKeys,
  costsToForm,
  defaultOptimizeConfig,
  detectPreset,
  estimateMinutes,
  initialParamValues,
  presetRange,
  splitParams,
  validateOptimize,
  validateRunForm,
  type CostFormValues,
  type DatePreset,
  type OptimizeConfig,
  type ParamFormValues,
} from '@/lib/lab/form'
import type { LabParamValue, LabRunDetail, LabRunMode, LabSymbol, LabTemplate } from '@/lib/api/types/lab'

interface FormState {
  templateId: string
  symbol: string
  timeframe: string
  preset: DatePreset
  start: string
  end: string
  params: ParamFormValues
  costs: CostFormValues
  optimize: OptimizeConfig
}

type PrefillUse = 'params' | 'best' | 'trial'

function pickTimeframe(t: LabTemplate, preferred?: string): string {
  if (preferred && t.timeframes.includes(preferred)) return preferred
  if (t.timeframes.includes('4h')) return '4h'
  return t.timeframes[0] ?? ''
}

function prefillOverrides(
  run: LabRunDetail | null,
  use: PrefillUse,
  rank: number | null,
): Record<string, LabParamValue> | null {
  if (!run) return null
  if (use === 'best' && run.best_params) return run.best_params
  if (use === 'trial' && rank !== null) {
    const t = run.top_trials?.find((x) => x.rank === rank)
    if (t) return { ...run.params, ...t.params }
  }
  return run.params
}

function initialForm(
  templates: LabTemplate[],
  symbols: LabSymbol[],
  prefill: LabRunDetail | null,
  use: PrefillUse,
  rank: number | null,
): FormState {
  const template = (prefill && templates.find((t) => t.id === prefill.template_id)) || templates[0]
  const names = symbols.map((s) => s.symbol)
  const symbol =
    prefill && names.includes(prefill.symbol) ? prefill.symbol : names.includes('ETHUSDT') ? 'ETHUSDT' : (names[0] ?? '')
  const range = prefill ? { start: prefill.start ?? '', end: prefill.end ?? '' } : presetRange('since2020')!
  return {
    templateId: template.id,
    symbol,
    timeframe: pickTimeframe(template, prefill?.timeframe),
    preset: prefill ? detectPreset(range.start, range.end) : 'since2020',
    start: range.start,
    end: range.end,
    params: initialParamValues(template, prefillOverrides(prefill, use, rank)),
    costs: prefill ? costsToForm(prefill.costs) : { ...DEFAULT_COSTS },
    optimize: defaultOptimizeConfig(template),
  }
}

const ACTIONS: { mode: LabRunMode; label: string; short: string; hint: string; Icon: typeof Play }[] = [
  { mode: 'backtest', label: 'Backtest', short: 'Backtest', hint: 'cepat, tanpa rapor', Icon: Play },
  { mode: 'validate', label: 'Validasi', short: 'Validasi', hint: 'rapor LOLOS/GAGAL', Icon: ShieldCheck },
  { mode: 'optimize', label: 'Cari Parameter Terbaik', short: 'Cari terbaik', hint: 'optimize + uji holdout', Icon: Sparkles },
]

export function RunBuilder() {
  const router = useRouter()
  const search = useSearchParams()
  const fromId = search.get('from')
  const useParam = search.get('use')
  const use: PrefillUse = useParam === 'best' ? 'best' : useParam === 'trial' ? 'trial' : 'params'
  const rankParam = search.get('rank')
  const rank = rankParam !== null && Number.isFinite(Number(rankParam)) ? Number(rankParam) : null

  const templatesQ = useLabTemplates()
  const symbolsQ = useLabSymbols()
  const prefillQ = useLabRun(fromId)
  const dataStatusQ = useLabDataStatus()
  const createRun = useCreateLabRun()

  const [form, setForm] = useState<FormState | null>(null)
  const [formKey, setFormKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingMode, setPendingMode] = useState<LabRunMode | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const templates = templatesQ.data ?? []
  const symbols = symbolsQ.data ?? []
  const prefillReady = !fromId || prefillQ.isSuccess || prefillQ.isError
  const desiredKey = `${fromId ?? ''}|${use}|${rank ?? ''}`

  // Initialise (or re-initialise when ?from changes) during render, not in an effect.
  if (templates.length > 0 && symbolsQ.isSuccess && prefillReady && formKey !== desiredKey) {
    setFormKey(desiredKey)
    setForm(initialForm(templates, symbols, prefillQ.data ?? null, use, rank))
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
    setForm({ ...form, ...patch })
  }

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
    createRun.mutate(buildRunRequest(state, mode, mode === 'optimize' ? form.optimize : null), {
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
                      update({ templateId: t.id, params: initialParamValues(t), timeframe: pickTimeframe(t, form.timeframe), optimize: defaultOptimizeConfig(t) })
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

              <div className="space-y-1.5">
                <label htmlFor="lab-symbol" className="text-xs font-medium">Koin (Binance perp)</label>
                <SymbolPicker symbols={symbols} value={form.symbol} onChange={(s) => update({ symbol: s })} invalid={Boolean(errors.symbol)} />
                {errors.symbol && <p className="text-2xs text-bearish">{errors.symbol}</p>}
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium">Timeframe</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Timeframe">
                  {template.timeframes.map((tf) => (
                    <Chip key={tf} active={form.timeframe === tf} onClick={() => update({ timeframe: tf })} className="min-w-12 font-mono">
                      {tf}
                    </Chip>
                  ))}
                </div>
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
                        update(r ? { preset: p.id, ...r } : { preset: 'custom' })
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
                      <Input id="lab-start" type="date" value={form.start} onChange={(e) => update({ start: e.target.value })} className={cn('h-8 px-2 text-xs', errors.start && 'border-bearish')} />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="lab-end" className="text-2xs text-muted-foreground">Sampai (kosong = terbaru)</label>
                      <Input id="lab-end" type="date" value={form.end} onChange={(e) => update({ end: e.target.value })} className={cn('h-8 px-2 text-xs', errors.end && 'border-bearish')} />
                    </div>
                  </div>
                )}
                {(errors.start || errors.end) && <p className="text-2xs text-bearish">{errors.end ?? errors.start}</p>}
                <p className="text-2xs text-muted-foreground">20% data terakhir dikunci sebagai holdout untuk ujian akhir.</p>
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
                <OptimizePanel template={template} value={form.optimize} errors={errors} onChange={(optimize) => update({ optimize })} />
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
              description="12 parameter yang paling berpengaruh. Default = setting live ETH 4H."
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

      {/* Sticky action bar */}
      <div className="sticky bottom-3 z-30">
        <div className="rounded-xl border border-border bg-background/90 p-3 shadow-lg backdrop-blur-md sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-semibold">
                <span className="font-mono">{form.symbol}</span> · <span className="font-mono">{form.timeframe}</span> · {presetLabel}
                {changed > 0 ? <span className="text-warn"> · {changed} parameter diubah</span> : <span className="text-muted-foreground"> · default live</span>}
              </p>
              <p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                <Info className="h-3 w-3 shrink-0" />
                Validasi &amp; optimize diuji jujur di periode holdout yang dikunci — tidak bisa diintip optimizer.
              </p>
              {submitError && <p role="alert" className="text-xs text-bearish">{submitError}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
              {ACTIONS.map(({ mode, label, short, hint, Icon }) => (
                <Button
                  key={mode}
                  type="button"
                  variant={mode === 'validate' ? 'default' : 'outline'}
                  onClick={() => submit(mode)}
                  disabled={createRun.isPending}
                  className={cn('h-auto flex-col gap-0 px-2 py-2 whitespace-normal sm:px-4', mode === 'optimize' && 'border-lab/50 text-lab hover:text-lab')}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
                    {pendingMode === mode ? <Loader2 className="animate-spin" /> : <Icon />}
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  <span className="hidden text-3xs font-normal opacity-75 sm:block">
                    {mode === 'optimize' ? `${form.optimize.nTrials} percobaan · ±${estimateMinutes(form.optimize.nTrials)} mnt` : hint}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BuilderSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]" aria-busy="true" aria-label="Memuat builder">
      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
