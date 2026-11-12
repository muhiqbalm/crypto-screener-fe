'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Loader2, Radar, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/segmented'
import { ErrorState, EmptyState } from '@/components/shell/states'
import { describeError } from '@/components/shell/error-copy'
import { CostDisclosure } from '@/components/lab/CostInputs'
import { AdvancedParams, ParamSummary } from '@/components/lab/ParamForm'
import { PresetSelect } from '@/components/lab/PresetSelect'
import { RuntimeEstimate } from '@/components/lab/RuntimeEstimate'
import { Chip, Section } from '@/components/lab/Section'
import { ImportantParams } from '@/components/lab/builder/ImportantParams'
import { ScanSymbolPicker } from '@/components/lab/scan/ScanSymbolPicker'
import { MODE_COPY } from '@/components/lab/run/copy'
import { notify } from '@/lib/utils/toast'
import { formatDate } from '@/lib/utils/time'
import { lowerTfHint, missingDataCount, sortTimeframes } from '@/lib/lab/timeframes'
import { estimateLevel, needsAck, tfDefault } from '@/lib/lab/planning'
import { defaultSearchKeys, importanceByKey, localImportance, stepKeys, stepParams } from '@/lib/lab/importance'
import { useCreateLabScan, useLabImportance, useLabSymbols, useLabTemplates } from '@/lib/queries/lab'
import { useBestPresets, useLabEstimate, useLabPresets, useLabRunDefaults } from '@/lib/queries/lab-insights'
import {
  DATE_PRESETS,
  DEFAULT_COSTS,
  LIVE_PRESET_NAME,
  SCAN_WARN_THRESHOLD,
  TRIAL_OPTIONS,
  buildScanRequest,
  changedKeys,
  combinationCount,
  initialParamValues,
  isLargeScan,
  isLiveDefault,
  isLiveTemplate,
  presetRange,
  templateDefaultsCopy,
  templateDescription,
  templateShort,
  validateCosts,
  validateParams,
  type CostFormValues,
  type DatePreset,
  type ParamFormValues,
  type TrialCount,
} from '@/lib/lab/form'
import type { LabId, LabScanMode, LabTemplate } from '@/lib/api/types/lab'
import type { LabPreset } from '@/lib/api/types/lab-insights'

type ParamSource = 'default' | 'preset' | 'best'
type Period = 'auto' | Exclude<DatePreset, 'custom'>

/** "Banyak koin": one strategy on many coins x timeframes, with the same simple form as one coin. */
export function ScanBuilder({ onCreated }: { onCreated: (id: LabId) => void }) {
  const templatesQ = useLabTemplates()
  const symbolsQ = useLabSymbols()
  const defaultsQ = useLabRunDefaults()
  const presetsQ = useLabPresets()
  const createScan = useCreateLabScan()

  const [templateId, setTemplateId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [tfs, setTfs] = useState<string[]>(['4h'])
  const [mode, setMode] = useState<LabScanMode>('validate')
  const [nTrials, setNTrials] = useState<TrialCount | null>(null) // null = follow timeframe default
  const [period, setPeriod] = useState<Period>('auto')
  const [source, setSource] = useState<ParamSource>('default')
  const [presetId, setPresetId] = useState<string | null>(null)
  const [costs, setCosts] = useState<CostFormValues>({ ...DEFAULT_COSTS })
  const [params, setParams] = useState<ParamFormValues | null>(null)
  const [ack, setAck] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [query, setQuery] = useState('')

  const templates = templatesQ.data ?? []
  const symbols = useMemo(() => symbolsQ.data ?? [], [symbolsQ.data])
  const template: LabTemplate | undefined = templates.find((t) => t.id === templateId) ?? templates[0]
  const presets = (presetsQ.data ?? []).filter((p) => p.template_id === template?.id)
  const preset: LabPreset | null = presets.find((p) => String(p.id) === presetId) ?? null
  const firstTf = sortTimeframes(tfs)[0] ?? '4h'
  const importanceQ = useLabImportance(template?.id, firstTf)

  // Per-timeframe defaults: shorter history + fewer trials on 15m/30m.
  const defaults = defaultsQ.data
  const effTrials: number = nTrials ?? Math.min(...(tfs.length ? tfs : ['4h']).map((tf) => tfDefault(tf, defaults).nTrials))
  const starts = period === 'auto' ? Object.fromEntries(tfs.map((tf) => [tf, tfDefault(tf, defaults).start])) : undefined
  const fixedStart = period === 'auto' ? undefined : presetRange(period)?.start
  const estimateQ = useLabEstimate(
    template && selected.length && tfs.length
      ? { template_id: template.id, mode, symbols: selected, timeframes: tfs, starts, start: fixedStart, n_trials: mode === 'optimize' ? effTrials : undefined, scan: true }
      : null,
  )
  const bestQ = useBestPresets(template?.id ?? null, selected, tfs, source === 'best')

  if (template && (params === null || templateId !== template.id)) {
    setTemplateId(template.id)
    setParams(initialParamValues(template))
  }

  if (templatesQ.isPending || symbolsQ.isPending) return <Skeleton className="h-96 w-full rounded-xl" />
  const loadErr = templatesQ.error ?? symbolsQ.error
  if (loadErr)
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
  if (!template || symbols.length === 0 || !params)
    return <EmptyState title="Belum ada strategi atau daftar koin" description="Server Lab belum mengirim data ini." />

  const live = isLiveTemplate(template.id)
  const measured = importanceQ.data && importanceQ.data.template_id === template.id ? importanceQ.data : null
  const importance = measured ?? localImportance(template, firstTf)
  const step = stepParams(template, importance)
  const inStep = stepKeys(step)
  const hiddenKeys = new Set(template.params.filter((p) => !inStep.has(p.key)).map((p) => p.key))
  const hiddenChanged = changedKeys(template, params).filter((k) => hiddenKeys.has(k)).length
  const searchKeys = defaultSearchKeys(template, step)
  const combos = combinationCount(selected.length, tfs.length)
  const large = isLargeScan(combos, mode)
  const level = estimateLevel(estimateQ.data)
  const blockedByAck = needsAck(level) && !ack
  const bestCells = bestQ.data?.cells ?? {}
  const bestHits = Object.values(bestCells).filter(Boolean).length
  const toggleTf = (v: string) => setTfs(tfs.includes(v) ? tfs.filter((x) => x !== v) : [...tfs, v])
  const lowTfOverride = period !== 'auto' && tfs.some((tf) => (fixedStart ?? '') < tfDefault(tf, defaults).start)
  const trialsOverride = nTrials !== null && tfs.some((tf) => nTrials > tfDefault(tf, defaults).nTrials)

  const submit = () => {
    const errs = { ...(source === 'preset' ? {} : validateParams(template, params)), ...validateCosts(costs) }
    if (selected.length === 0) errs.symbols = 'Pilih minimal 1 koin'
    if (tfs.length === 0) errs.timeframes = 'Pilih minimal 1 timeframe'
    if (source === 'preset' && !preset) errs.preset = 'Pilih preset'
    setErrors(errs)
    setSubmitError(null)
    if (Object.keys(errs).length > 0) {
      if (Object.keys(errs).some((k) => hiddenKeys.has(k))) setAdvancedOpen(true)
      notify.error('Masih ada isian yang belum valid')
      return
    }
    const req = buildScanRequest({
      template,
      symbols: selected,
      timeframes: tfs,
      params: source === 'preset' || isLiveDefault(template, params) ? null : params,
      costs,
      mode,
      nTrials: effTrials,
      start: fixedStart,
      starts,
      presetId: source === 'preset' ? preset?.id : null,
      useBestPresets: source === 'best',
    })
    // Like one coin: "Cari setting terbaik" searches the params that matter (template ranges).
    if (mode === 'optimize' && searchKeys.length > 0) req.search = { params: searchKeys, ranges: {} }
    createScan.mutate(req, {
      onSuccess: (res) => {
        notify.success('Uji banyak koin masuk antrian', { description: `${combos} kombinasi` })
        setAck(false)
        onCreated(res.scan_id)
      },
      onError: (err) => {
        const d = describeError(err)
        setSubmitError(`${d.message}${d.hint ? ` ${d.hint}` : ''}`)
        notify.error('Uji banyak koin gagal dibuat', { description: d.message })
      },
    })
  }

  return (
    <Section
      title="Atur uji banyak koin"
      icon={<Radar className="h-4 w-4 text-lab" />}
      description="Satu strategi diuji di banyak koin × timeframe sekaligus. Tiap koin dan timeframe biasanya butuh setting sendiri."
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="scan-template" className="text-xs font-medium">Strategi</label>
            <select
              id="scan-template"
              value={template.id}
              onChange={(e) => {
                setTemplateId(e.target.value)
                setParams(null)
                setPresetId(null)
                setQuery('')
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-popover">
                  {templateShort(t.id, t.name)} {isLiveTemplate(t.id) ? '(strategi live)' : '(riset)'}
                </option>
              ))}
            </select>
            <p className="text-2xs leading-snug text-muted-foreground">{templateDescription(template)}</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Jenis uji</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Jenis uji">
              <Chip active={mode === 'validate'} onClick={() => setMode('validate')}>{MODE_COPY.validate}</Chip>
              <Chip active={mode === 'optimize'} onClick={() => setMode('optimize')}>{MODE_COPY.optimize}</Chip>
            </div>
            {mode === 'optimize' && (
              <div className="space-y-1.5 pt-1">
                <p className="flex items-start gap-1.5 text-2xs text-warn">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Mencari setting di banyak koin sekaligus memperbesar peluang juara kebetulan. Riset 12 Nov: setting hasil pencarian rata-rata lebih buruk di data baru daripada default.
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-2xs text-muted-foreground">Percobaan per kombinasi:</span>
                  {TRIAL_OPTIONS.map((n) => (
                    <Chip key={n} active={effTrials === n} onClick={() => setNTrials(n)} className="h-7 px-2.5">{n}</Chip>
                  ))}
                  {nTrials !== null && (
                    <button type="button" onClick={() => setNTrials(null)} className="cursor-pointer text-2xs text-muted-foreground underline">ikut default timeframe</button>
                  )}
                </div>
                {trialsOverride && <p className="text-2xs text-warn">Lebih banyak percobaan dari default timeframe terkecil, jadi lebih lama.</p>}
              </div>
            )}
            {mode === 'validate' && <p className="text-2xs text-muted-foreground">Tiap kombinasi dinilai di data barunya sendiri dan mendapat rapor Lolos/Gagal.</p>}
          </div>
        </div>

        <ScanSymbolPicker symbols={symbols} selected={selected} onChange={setSelected} error={errors.symbols} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Timeframe</span>
            <div className="flex flex-wrap gap-1.5">
              {sortTimeframes(template.timeframes).map((tf) => {
                const missing = selected.length ? missingDataCount(symbols, selected, tf) : 0
                return (
                  <Chip
                    key={tf}
                    active={tfs.includes(tf)}
                    onClick={() => toggleTf(tf)}
                    className="min-w-12 gap-1.5 font-mono"
                    title={missing ? `${missing} koin terpilih belum punya data ${tf} (akan diunduh)` : undefined}
                  >
                    {tf}
                    {missing > 0 && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="sebagian belum ada data" />}
                  </Chip>
                )
              })}
            </div>
            {lowerTfHint(tfs) && <p className="text-2xs text-warn">{lowerTfHint(tfs)}</p>}
            {errors.timeframes && <p className="text-2xs text-bearish">{errors.timeframes}</p>}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Periode</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Periode">
              <Chip active={period === 'auto'} onClick={() => setPeriod('auto')}>Otomatis</Chip>
              {DATE_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
                <Chip key={p.id} active={period === p.id} onClick={() => setPeriod(p.id as Period)}>{p.label}</Chip>
              ))}
            </div>
            <p className="text-2xs text-muted-foreground">
              {period === 'auto'
                ? tfs.map((tf) => `${tf}: mulai ${formatDate(tfDefault(tf, defaults).start)}`).join(' · ') || 'Pilih timeframe.'
                : `Semua timeframe mulai ${formatDate(fixedStart)}.`}
            </p>
            {lowTfOverride && <p className="text-2xs text-warn">Periode lebih panjang dari default timeframe kecil, jadi jauh lebih lama.</p>}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">Setting yang dipakai</span>
            <Segmented<ParamSource>
              aria-label="Setting yang dipakai"
              size="xs"
              value={source}
              onChange={setSource}
              options={[
                { value: 'default', label: 'Atur di sini' },
                { value: 'preset', label: 'Satu preset' },
                { value: 'best', label: 'Preset terbaik per koin' },
              ]}
            />
          </div>
          {source === 'preset' && (
            <div className="space-y-1">
              <PresetSelect presets={presets} value={presetId} onChange={(p) => setPresetId(p ? String(p.id) : null)} emptyLabel="— pilih preset —" />
              <p className="text-2xs text-muted-foreground">Setting preset dipakai untuk semua koin × timeframe. Di koin atau timeframe lain hasilnya bisa jauh berbeda.</p>
              {errors.preset && <p className="text-2xs text-bearish">{errors.preset}</p>}
            </div>
          )}
          {source === 'best' && (
            <p className="text-2xs text-muted-foreground">
              Tiap sel memakai preset Lolos terbaik untuk koin + timeframe itu{live ? ` (atau ${LIVE_PRESET_NAME} untuk ETH 4h)` : ''}; preset Gagal tidak pernah dipilih. Sel tanpa preset memakai setting di bawah.
              {selected.length > 0 && tfs.length > 0 && bestQ.data && <span className="num font-medium text-foreground"> {bestHits} dari {combos} sel punya preset.</span>}
            </p>
          )}
          {source !== 'preset' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-2xs text-muted-foreground">{templateDefaultsCopy(template.id)} Dasar urutan: {importance.basis} ({firstTf}).</p>
                <ParamSummary template={template} values={params} onChange={setParams} />
              </div>
              <ImportantParams step={step} importance={importance} values={params} errors={errors} onChange={setParams} />
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  aria-expanded={advancedOpen}
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <span className="text-xs font-medium">
                    Lanjutan · {hiddenKeys.size} parameter lain
                    {hiddenChanged > 0 && <span className="ml-1.5 rounded-full bg-warn/15 px-1.5 py-px text-3xs font-semibold text-warn">{hiddenChanged} diubah</span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {advancedOpen && (
                  <div className="space-y-2 px-3 pb-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari parameter" aria-label="Cari parameter" className="h-8 pl-8 text-xs" />
                    </div>
                    <AdvancedParams
                      template={template}
                      values={params}
                      errors={errors}
                      onChange={setParams}
                      keys={hiddenKeys}
                      query={query}
                      importance={importanceByKey(measured)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <CostDisclosure value={costs} errors={errors} onChange={setCosts} />

        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="num text-lg font-bold">{combos}</span> kombinasi{' '}
              <span className="text-muted-foreground">({selected.length} koin × {tfs.length} timeframe)</span>
              {large && (
                <p role="alert" className="mt-1 flex items-start gap-1.5 text-xs text-warn">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Banyak kombinasi (lebih dari {SCAN_WARN_THRESHOLD[mode]}): lama, dan makin banyak yang diuji makin besar peluang ada yang Lolos karena kebetulan.
                </p>
              )}
              {submitError && <p role="alert" className="mt-1 text-xs text-bearish">{submitError}</p>}
            </div>
            <Button onClick={submit} disabled={createScan.isPending || combos === 0 || blockedByAck} className="gap-1.5 sm:min-w-40">
              {createScan.isPending ? <Loader2 className="animate-spin" /> : <Radar />}
              Jalankan {mode === 'optimize' ? MODE_COPY.optimize.toLowerCase() : 'uji jujur'}
            </Button>
          </div>
          {combos > 0 && <RuntimeEstimate estimate={estimateQ.data} loading={estimateQ.isFetching} scan ack={ack} onAck={setAck} />}
          {combos > 0 && estimateQ.data && (
            <p className="text-2xs text-muted-foreground">
              Uji banyak koin jalan di belakang ({estimateQ.data.queue.scan_slots} sel sekaligus) supaya server tetap ringan; uji satu koin tetap didahulukan. Bisa dibatalkan kapan saja.
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}
