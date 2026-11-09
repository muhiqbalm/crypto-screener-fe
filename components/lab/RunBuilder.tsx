'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FlaskConical, Loader2, Play, ShieldCheck, Sparkles, Database } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { ParamForm } from '@/components/lab/ParamForm'
import { CostInputs } from '@/components/lab/CostInputs'
import { SymbolPicker } from '@/components/lab/SymbolPicker'
import { ApiError } from '@/lib/api/errors'
import { notify } from '@/lib/utils/toast'
import { formatTimestamp } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import {
  useCreateLabRun,
  useLabDataStatus,
  useLabRun,
  useLabSymbols,
  useLabTemplates,
} from '@/lib/queries/lab'
import {
  DEFAULT_COSTS,
  buildRunRequest,
  costsToForm,
  initialParamValues,
  validateRunForm,
  type CostFormValues,
  type ParamFormValues,
} from '@/lib/lab/form'
import type { LabRunDetail, LabRunMode, LabSymbol, LabTemplate } from '@/lib/api/types/lab'

interface FormState {
  templateId: string
  symbol: string
  timeframe: string
  start: string
  end: string
  params: ParamFormValues
  costs: CostFormValues
}

function pickTimeframe(t: LabTemplate, preferred?: string): string {
  if (preferred && t.timeframes.includes(preferred)) return preferred
  if (t.timeframes.includes('4h')) return '4h'
  return t.timeframes[0] ?? ''
}

function initialForm(
  templates: LabTemplate[],
  symbols: LabSymbol[],
  prefill: LabRunDetail | null,
  useBest: boolean,
): FormState {
  const template = (prefill && templates.find((t) => t.id === prefill.template_id)) || templates[0]
  const symbolNames = symbols.map((s) => s.symbol)
  const symbol =
    prefill && symbolNames.includes(prefill.symbol)
      ? prefill.symbol
      : symbolNames.includes('ETHUSDT')
        ? 'ETHUSDT'
        : (symbolNames[0] ?? '')
  const overrides = prefill ? (useBest && prefill.best_params ? prefill.best_params : prefill.params) : null
  return {
    templateId: template.id,
    symbol,
    timeframe: pickTimeframe(template, prefill?.timeframe),
    start: prefill?.start ?? '',
    end: prefill?.end ?? '',
    params: initialParamValues(template, overrides),
    costs: prefill ? costsToForm(prefill.costs) : { ...DEFAULT_COSTS },
  }
}

const MODES: { mode: LabRunMode; label: string; hint: string; Icon: typeof Play }[] = [
  { mode: 'backtest', label: 'Backtest', hint: 'Cepat, in-sample saja. Bukan bukti.', Icon: Play },
  { mode: 'validate', label: 'Validate', hint: 'Walk-forward + OOS + holdout → verdict PASS/FAIL.', Icon: ShieldCheck },
  { mode: 'optimize', label: 'Optimize', hint: 'Cari parameter terbaik di IS, lalu diuji di OOS.', Icon: Sparkles },
]

export function RunBuilder() {
  const router = useRouter()
  const search = useSearchParams()
  const fromId = search.get('from')
  const useBest = search.get('use') === 'best'

  const templatesQ = useLabTemplates()
  const symbolsQ = useLabSymbols()
  const prefillQ = useLabRun(fromId)
  const dataStatusQ = useLabDataStatus()
  const createRun = useCreateLabRun()

  const [form, setForm] = useState<FormState | null>(null)
  const [formKey, setFormKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingMode, setPendingMode] = useState<LabRunMode | null>(null)

  const templates = templatesQ.data ?? []
  const symbols = symbolsQ.data ?? []
  const prefillReady = !fromId || prefillQ.isSuccess || prefillQ.isError
  const desiredKey = `${fromId ?? ''}|${useBest ? 'best' : 'params'}`

  // Initialise (or re-initialise when ?from changes) during render rather than
  // in an effect — same pattern as Navbar's route-change reset.
  if (templates.length > 0 && symbolsQ.isSuccess && prefillReady && formKey !== desiredKey) {
    setFormKey(desiredKey)
    setForm(initialForm(templates, symbols, prefillQ.data ?? null, useBest))
    setErrors({})
  }

  if (templatesQ.isPending || symbolsQ.isPending || (fromId && prefillQ.isPending)) {
    return (
      <Card className="border-border/60">
        <CardContent className="space-y-3 p-6" aria-busy="true">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  const loadErr = templatesQ.error ?? symbolsQ.error
  if (loadErr) {
    return (
      <Card className="border-border/60">
        <ErrorPanel
          kind={loadErr instanceof ApiError ? loadErr.kind : 'server'}
          onRetry={() => {
            void templatesQ.refetch()
            void symbolsQ.refetch()
          }}
          messageOverride="Gagal memuat template / daftar symbol dari server Lab."
        />
      </Card>
    )
  }

  if (templates.length === 0 || symbols.length === 0) {
    return (
      <Card className="border-border/60">
        <EmptyPanel
          message={
            templates.length === 0
              ? 'Backend belum punya template strategi.'
              : 'Backend belum punya daftar symbol.'
          }
        />
      </Card>
    )
  }

  if (!form) return null

  const template = templates.find((t) => t.id === form.templateId) ?? templates[0]
  const symbolInfo = symbols.find((s) => s.symbol === form.symbol)
  const dataRow = dataStatusQ.data?.find((d) => d.symbol === form.symbol && d.timeframe === form.timeframe)
  const update = (patch: Partial<FormState>) => setForm({ ...form, ...patch })

  const submit = (mode: LabRunMode) => {
    const state = { ...form, template }
    const errs = validateRunForm(state)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      notify.error('Masih ada input yang belum valid', { description: 'Cek field yang ditandai merah.' })
      return
    }
    setPendingMode(mode)
    createRun.mutate(buildRunRequest(state, mode), {
      onSuccess: (res) => {
        notify.success('Run masuk antrian', { description: `ID ${res.run_id}` })
        router.push(`/lab/runs/${encodeURIComponent(res.run_id)}`)
      },
      onError: () => notify.error('Gagal membuat run', { description: 'Server Lab menolak atau tidak bisa dihubungi.' }),
      onSettled: () => setPendingMode(null),
    })
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <FlaskConical className="h-4 w-4 text-violet-400" />
          Run builder
        </CardTitle>
        {prefillQ.data && fromId && (
          <p className="text-[11px] text-sky-400">
            Diisi dari run {prefillQ.data.id}
            {useBest && prefillQ.data.best_params ? ' (parameter terbaik hasil optimize)' : ''}.
          </p>
        )}
        {fromId && prefillQ.isError && (
          <p className="text-[11px] text-amber-400">Run {fromId} tidak bisa dimuat — form pakai default live.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Market */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1 lg:col-span-2">
            <label htmlFor="lab-template" className="text-xs font-medium">Template</label>
            <select
              id="lab-template"
              value={template.id}
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value) ?? templates[0]
                update({ templateId: t.id, params: initialParamValues(t), timeframe: pickTimeframe(t, form.timeframe) })
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-popover">{t.name}</option>
              ))}
            </select>
            {template.description && <p className="text-[11px] text-muted-foreground">{template.description}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="lab-symbol" className="text-xs font-medium">Symbol (perp)</label>
            <SymbolPicker symbols={symbols} value={form.symbol} onChange={(s) => update({ symbol: s })} invalid={Boolean(errors.symbol)} />
            {errors.symbol && <p className="text-[11px] text-rose-400">{errors.symbol}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="lab-tf" className="text-xs font-medium">Timeframe</label>
            <select
              id="lab-tf"
              value={form.timeframe}
              onChange={(e) => update({ timeframe: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {template.timeframes.map((tf) => (
                <option key={tf} value={tf} className="bg-popover">
                  {tf}
                  {symbolInfo && symbolInfo.timeframes.length > 0 && !symbolInfo.timeframes.includes(tf) ? ' (belum ada data)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="lab-start" className="text-xs font-medium">Mulai</label>
              <Input id="lab-start" type="date" value={form.start} onChange={(e) => update({ start: e.target.value })} className={cn('px-2 text-xs', errors.start && 'border-rose-500')} />
            </div>
            <div className="space-y-1">
              <label htmlFor="lab-end" className="text-xs font-medium">Sampai</label>
              <Input id="lab-end" type="date" value={form.end} onChange={(e) => update({ end: e.target.value })} className={cn('px-2 text-xs', errors.end && 'border-rose-500')} />
            </div>
            {(errors.start || errors.end) && (
              <p className="col-span-2 text-[11px] text-rose-400">{errors.end ?? errors.start}</p>
            )}
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          {dataStatusQ.isPending
            ? 'Cek data lokal…'
            : dataStatusQ.isError
              ? 'Status data tidak bisa dimuat.'
              : dataRow
                ? `Data ${dataRow.symbol} ${dataRow.timeframe}: ${dataRow.rows.toLocaleString('id-ID')} candle, ${formatTimestamp(dataRow.first)} → ${formatTimestamp(dataRow.last)}. Tanggal kosong = pakai semua data.`
                : `Belum ada data lokal untuk ${form.symbol} ${form.timeframe}.`}
        </p>

        {/* Params */}
        <ParamForm template={template} values={form.params} errors={errors} onChange={(params) => update({ params })} />

        {/* Costs */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Biaya trading</h3>
          <CostInputs value={form.costs} errors={errors} onChange={(costs) => update({ costs })} />
        </div>

        {/* Modes */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODES.map(({ mode, label, hint, Icon }) => (
            <Button
              key={mode}
              type="button"
              variant={mode === 'validate' ? 'default' : 'outline'}
              onClick={() => submit(mode)}
              disabled={createRun.isPending}
              className="h-auto flex-col items-start gap-0.5 py-2.5 text-left whitespace-normal"
            >
              <span className="flex items-center gap-1.5 font-bold">
                {pendingMode === mode ? <Loader2 className="animate-spin" /> : <Icon />}
                {label}
              </span>
              <span className="text-[11px] font-normal opacity-75">{hint}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
