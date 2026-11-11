'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Loader2, Radar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/segmented'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { CostDisclosure } from '@/components/lab/CostInputs'
import { ParamForm } from '@/components/lab/ParamForm'
import { PresetSelect } from '@/components/lab/PresetSelect'
import { RuntimeEstimate } from '@/components/lab/RuntimeEstimate'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { ScanSymbolPicker } from '@/components/lab/scan/ScanSymbolPicker'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { notify } from '@/lib/utils/toast'
import { lowerTfHint, missingDataCount, sortTimeframes } from '@/lib/lab/timeframes'
import { estimateLevel, needsAck, tfDefault } from '@/lib/lab/planning'
import { useCreateLabScan, useLabSymbols, useLabTemplates } from '@/lib/queries/lab'
import { useBestPresets, useLabEstimate, useLabPresets, useLabRunDefaults } from '@/lib/queries/lab-insights'
import {
  DATE_PRESETS,
  DEFAULT_COSTS,
  SCAN_WARN_THRESHOLD,
  TRIAL_OPTIONS,
  buildScanRequest,
  changedKeys,
  combinationCount,
  initialParamValues,
  isLargeScan,
  isLiveDefault,
  presetRange,
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

  const templates = templatesQ.data ?? []
  const symbols = useMemo(() => symbolsQ.data ?? [], [symbolsQ.data])
  const template: LabTemplate | undefined = templates.find((t) => t.id === templateId) ?? templates[0]
  const presets = (presetsQ.data ?? []).filter((p) => p.template_id === template?.id)
  const preset: LabPreset | null = presets.find((p) => String(p.id) === presetId) ?? null

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
  if (!template || symbols.length === 0 || !params)
    return (
      <Section>
        <EmptyState title="Belum ada template atau daftar koin" description="Server Lab belum mengirim data ini." />
      </Section>
    )

  const combos = combinationCount(selected.length, tfs.length)
  const large = isLargeScan(combos, mode)
  const changed = changedKeys(template, params).length
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
      notify.error('Masih ada input yang belum valid')
      return
    }
    createScan.mutate(
      buildScanRequest({
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
      }),
      {
        onSuccess: (res) => {
          notify.success('Scan masuk antrian', { description: `${combos} kombinasi` })
          setAck(false)
          onCreated(res.scan_id)
        },
        onError: (err) => {
          const d = apiErrorDetail(err)
          setSubmitError(d ?? 'Server Lab menolak atau tidak bisa dihubungi.')
          notify.error('Gagal membuat scan', { description: d ?? undefined })
        },
      },
    )
  }

  return (
    <Section title="Atur scan" icon={<Radar className="h-4 w-4 text-lab" />} description={`Uji ${template.name} di banyak koin × timeframe sekaligus. Tiap koin/TF biasanya butuh parameter sendiri — pakai preset per koin/TF kalau sudah ada.`}>
      <div className="space-y-5">
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
            <span className="text-xs font-medium">Mode</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Mode scan">
              <Chip active={mode === 'validate'} onClick={() => setMode('validate')}>Validasi</Chip>
              <Chip active={mode === 'optimize'} onClick={() => setMode('optimize')}>Cari parameter terbaik</Chip>
            </div>
            {mode === 'optimize' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-2xs text-muted-foreground">Percobaan per kombinasi:</span>
                {TRIAL_OPTIONS.map((n) => (
                  <Chip key={n} active={effTrials === n} onClick={() => setNTrials(n)} className="h-7 px-2.5">
                    {n}
                  </Chip>
                ))}
                {nTrials !== null && (
                  <button type="button" onClick={() => setNTrials(null)} className="text-2xs text-muted-foreground underline cursor-pointer">ikut default TF</button>
                )}
              </div>
            )}
            {trialsOverride && mode === 'optimize' && <p className="text-2xs text-warn">Lebih banyak percobaan dari default timeframe terendah — job jadi lebih lama.</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium">Periode</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Periode scan">
            <Chip active={period === 'auto'} onClick={() => setPeriod('auto')} title="15m: 2 tahun, 30m: 3 tahun, 1h ke atas: sejak 2020">Otomatis per TF</Chip>
            {DATE_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
              <Chip key={p.id} active={period === p.id} onClick={() => setPeriod(p.id as Period)}>{p.label}</Chip>
            ))}
          </div>
          <p className="text-2xs text-muted-foreground">
            {period === 'auto'
              ? tfs.map((tf) => `${tf}: mulai ${tfDefault(tf, defaults).start}`).join(' · ') || 'Pilih timeframe.'
              : `Semua timeframe mulai ${fixedStart}.`}
          </p>
          {lowTfOverride && <p className="text-2xs text-warn">Periode lebih panjang dari default untuk timeframe kecil — scan jauh lebih lama. Cek perkiraan waktu di bawah.</p>}
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">Sumber parameter</span>
            <Segmented<ParamSource>
              aria-label="Sumber parameter"
              size="xs"
              value={source}
              onChange={setSource}
              options={[
                { value: 'default', label: 'Atur manual' },
                { value: 'preset', label: 'Satu preset' },
                { value: 'best', label: 'Preset terbaik per koin/TF' },
              ]}
            />
          </div>
          {source === 'preset' && (
            <div className="space-y-1">
              <PresetSelect presets={presets} value={presetId} onChange={(p) => setPresetId(p ? String(p.id) : null)} emptyLabel="— pilih preset —" />
              <p className="text-2xs text-muted-foreground">
                Parameter preset dipakai untuk semua koin × TF. Preset dibuat untuk satu koin/TF; di koin/TF lain hasilnya bisa jauh berbeda.
              </p>
              {errors.preset && <p className="text-2xs text-bearish">{errors.preset}</p>}
            </div>
          )}
          {source === 'best' && (
            <p className="text-2xs text-muted-foreground">
              Tiap sel memakai preset LOLOS terbaik untuk koin+TF itu (atau 4H-ETH-Basic untuk ETH 4H); preset GAGAL tidak pernah dipilih. Sel tanpa preset memakai parameter di bawah.
              {selected.length > 0 && tfs.length > 0 && bestQ.data && (
                <span className="num font-medium text-foreground"> {bestHits} dari {combos} sel punya preset.</span>
              )}
            </p>
          )}
          {source !== 'preset' && (
            <details className="group rounded-lg border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-xs font-medium">{source === 'best' ? 'Parameter untuk sel tanpa preset' : 'Parameter'}</span>
                  <span className="block text-2xs text-muted-foreground">{changed === 0 ? 'Default template (= 4H-ETH-Basic)' : `${changed} diubah dari default`}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-3 pb-3">
                <ParamForm template={template} values={params} errors={errors} onChange={setParams} />
              </div>
            </details>
          )}
        </div>

        <CostDisclosure value={costs} errors={errors} onChange={setCosts} />

        <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-mono text-lg font-bold">{combos}</span> kombinasi{' '}
              <span className="text-muted-foreground">({selected.length} koin × {tfs.length} timeframe)</span>
              {large && (
                <p role="alert" className="mt-1 flex items-start gap-1.5 text-xs text-warn">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  Banyak kombinasi (&gt; {SCAN_WARN_THRESHOLD[mode]}): lama, dan makin banyak yang diuji makin besar peluang ada yang LOLOS karena kebetulan.
                </p>
              )}
              {submitError && <p role="alert" className="mt-1 text-xs text-bearish">{submitError}</p>}
            </div>
            <Button onClick={submit} disabled={createScan.isPending || combos === 0 || blockedByAck} className="gap-1.5 sm:min-w-40">
              {createScan.isPending ? <Loader2 className="animate-spin" /> : <Radar />}
              Jalankan scan
            </Button>
          </div>
          {combos > 0 && (
            <RuntimeEstimate estimate={estimateQ.data} loading={estimateQ.isFetching} scan ack={ack} onAck={setAck} />
          )}
          {combos > 0 && estimateQ.data && (
            <p className="text-2xs text-muted-foreground">
              Scan jalan di belakang ({estimateQ.data.queue.scan_slots} sel sekaligus) supaya server live tetap ringan; run tunggal dari Uji strategi tetap didahulukan. Bisa dibatalkan kapan saja.
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}
