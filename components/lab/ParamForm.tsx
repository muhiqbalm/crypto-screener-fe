'use client'

import { AlertTriangle, ChevronDown, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import type { LabParamSpec, LabTemplate } from '@/lib/api/types/lab'
import type { LabImportanceParam } from '@/lib/api/types/lab-uji'
import {
  LIVE_PRESET_NAME,
  changedKeys,
  choiceLabel,
  groupParams,
  groupLabel,
  initialParamValues,
  isLiveTemplate,
  matchesParamQuery,
  paramHelp,
  paramLabel,
  splitParams,
  templateDefaultsCopy,
  type ParamFormValue,
  type ParamFormValues,
} from '@/lib/lab/form'
import { LABEL_NONE, LABEL_UNSTABLE } from '@/lib/lab/importance'

interface ParamFormProps {
  template: LabTemplate
  values: ParamFormValues
  errors: Record<string, string>
  onChange: (values: ParamFormValues) => void
}

export function isChanged(spec: LabParamSpec, value: ParamFormValue | undefined): boolean {
  if (spec.type === 'int' || spec.type === 'float') return Number(value) !== Number(spec.default)
  if (spec.type === 'bool') return (value === true) !== (spec.default === true)
  return String(value) !== String(spec.default)
}

export function ChangedBadge({ count, className }: { count?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-warn/15 px-2.5 py-0.5 text-[13px] font-semibold text-warn', className)}>
      {count !== undefined ? `${count} diubah` : 'diubah'}
    </span>
  )
}

/**
 * Header line: how many params differ from the defaults + reset. "Live" wording only for the
 * Rosyade family, whose defaults are the live 4H-ETH-Basic preset.
 */
export function ParamSummary({ template, values, onChange }: Omit<ParamFormProps, 'errors'>) {
  const changed = changedKeys(template, values).length
  const live = isLiveTemplate(template.id)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {changed === 0 ? (
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[13px] font-medium text-muted-foreground">
          {live ? `Sama dengan ${LIVE_PRESET_NAME} (setting live)` : 'Default strategi (setting riset)'}
        </span>
      ) : (
        <ChangedBadge count={changed} className="px-3 py-1" />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange(initialParamValues(template))}
        disabled={changed === 0}
        className="h-9 gap-1.5 rounded-full px-3 text-sm"
      >
        <RotateCcw className="h-4 w-4" />
        {live ? 'Reset ke setting live' : 'Reset ke default'}
      </Button>
    </div>
  )
}

/** The template's tunable params as slider + number cards (scan builder "Atur manual"). */
export function MainParams({ template, values, errors, onChange }: ParamFormProps) {
  const { main } = splitParams(template)
  if (main.length === 0) return null
  const set = (key: string, v: ParamFormValue) => onChange({ ...values, [key]: v })
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {main.map((p) =>
        p.type === 'int' || p.type === 'float' ? (
          <div key={p.key} className="space-y-2">
            <label htmlFor={`param-${p.key}`} className="text-[15px] font-medium">{paramLabel(p)}</label>
            <ParamSlider spec={p} value={values[p.key]} error={errors[p.key]} onChange={(v) => set(p.key, v)} />
          </div>
        ) : (
          <ParamField key={p.key} spec={p} value={values[p.key]} error={errors[p.key]} onChange={(v) => set(p.key, v)} />
        ),
      )}
    </div>
  )
}

/**
 * Params in collapsible groups. `keys` limits which params are listed (default: non-tunable),
 * `query` filters by label / key / group, `onlyChanged` lists only edited ones. Groups open
 * themselves while searching, filtering or when they hold an error.
 */
export function AdvancedParams({
  template,
  values,
  errors,
  onChange,
  keys,
  query = '',
  onlyChanged = false,
  importance,
}: ParamFormProps & {
  keys?: Set<string>
  query?: string
  onlyChanged?: boolean
  importance?: Map<string, LabImportanceParam>
}) {
  const set = (key: string, v: ParamFormValue) => onChange({ ...values, [key]: v })
  const listed = template.params.filter(
    (p) =>
      (keys ? keys.has(p.key) : p.tunable !== true) &&
      matchesParamQuery(p, query) &&
      (!onlyChanged || isChanged(p, values[p.key])),
  )
  const groups = groupParams(listed)
  if (groups.length === 0) {
    return <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-[15px] text-muted-foreground">Tidak ada parameter yang cocok.</p>
  }
  const forceOpen = query.trim() !== '' || onlyChanged
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
      {groups.map((g) => {
        const changed = g.params.filter((p) => isChanged(p, values[p.key])).length
        const hasError = g.params.some((p) => errors[p.key])
        return (
          <details key={`${g.group}|${forceOpen}`} className="group" open={forceOpen || hasError || undefined}>
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-base hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">{groupLabel(g.group)}</span>
                <span className="text-sm text-muted-foreground">{g.params.length} parameter</span>
                {changed > 0 && <ChangedBadge count={changed} />}
                {hasError && <span className="text-sm text-bearish">ada error</span>}
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-1 gap-4 bg-muted/10 px-5 pb-5 pt-2 sm:grid-cols-2 xl:grid-cols-3">
              {g.params.map((p) => (
                <ParamField
                  key={p.key}
                  spec={p}
                  value={values[p.key]}
                  error={errors[p.key]}
                  onChange={(v) => set(p.key, v)}
                  tag={importance?.get(p.key)}
                />
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

/** Full editor (tunables + the rest). Templates without `tunable` flags show everything grouped. */
export function ParamForm(props: ParamFormProps) {
  const { main } = splitParams(props.template)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{templateDefaultsCopy(props.template.id)}</p>
        <ParamSummary template={props.template} values={props.values} onChange={props.onChange} />
      </div>
      {main.length > 0 && <MainParams {...props} />}
      <AdvancedParams {...props} />
    </div>
  )
}

function fmtDefault(spec: LabParamSpec): string {
  const v = spec.default
  if (typeof v === 'boolean') return v ? 'aktif' : 'mati'
  if (spec.type === 'choice') return choiceLabel(spec.key, String(v))
  return String(v)
}

/** Small importance tag for a param listed in Lanjutan. */
function ImportanceTag({ row }: { row: LabImportanceParam }) {
  if (row.label === LABEL_UNSTABLE) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 text-[13px] font-medium text-warn">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        berpengaruh, tidak stabil
      </span>
    )
  }
  if (row.label === LABEL_NONE) return <span className="text-[13px] text-muted-foreground">tidak berpengaruh (riset)</span>
  return null
}

const trim2 = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100))

/** Chunky range track + 24px thumb (design v2). The track colour comes from inline style. */
const RANGE = cn(
  'h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
  '[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:shadow-md',
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4',
  '[&::-moz-range-thumb]:border-card [&::-moz-range-track]:bg-transparent',
)

export function ParamSlider({
  spec,
  value,
  error,
  onChange,
  idPrefix = 'param',
  safe,
}: {
  spec: LabParamSpec
  value: ParamFormValue | undefined
  error?: string
  onChange: (v: ParamFormValue) => void
  idPrefix?: string
  /** Research "safe range" (plateau): drawn on the track, the legend says whether the value is inside. */
  safe?: [number, number] | null
}) {
  const id = `${idPrefix}-${spec.key}`
  const min = spec.min ?? 0
  const max = spec.max ?? Math.max(1, Number(spec.default) * 2)
  const step = spec.step ?? (spec.type === 'int' ? 1 : 0.1)
  const num = Number(value)
  const valid = typeof value === 'string' ? value.trim() !== '' && Number.isFinite(num) : Number.isFinite(num)
  const sliderValue = valid ? Math.min(max, Math.max(min, num)) : Number(spec.default)
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100))
  const inside = safe && valid ? num >= safe[0] && num <= safe[1] : null
  const track = safe
    ? `linear-gradient(to right, var(--color-muted) ${pos(safe[0])}%, color-mix(in oklab, var(--color-bullish) 55%, var(--color-muted)) ${pos(safe[0])}%, color-mix(in oklab, var(--color-bullish) 55%, var(--color-muted)) ${pos(safe[1])}%, var(--color-muted) ${pos(safe[1])}%)`
    : undefined
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${paramLabel(spec)} (geser)`}
          className={cn(
            RANGE,
            inside === false
              ? '[&::-moz-range-thumb]:bg-warn [&::-webkit-slider-thumb]:bg-warn'
              : '[&::-moz-range-thumb]:bg-foreground [&::-webkit-slider-thumb]:bg-foreground',
          )}
          style={track ? { background: track } : undefined}
        />
        <Input
          id={id}
          type="number"
          inputMode={spec.type === 'int' ? 'numeric' : 'decimal'}
          step={step}
          min={spec.min ?? undefined}
          max={spec.max ?? undefined}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn('h-11 w-24 shrink-0 rounded-xl px-3 text-right font-mono text-base tabular-nums', error && 'border-bearish')}
        />
      </div>
      {error ? (
        <p id={`${id}-err`} className="text-sm text-bearish">{error}</p>
      ) : safe ? (
        <div className="flex items-baseline justify-between gap-2 pr-28 text-[13px] text-muted-foreground">
          <span className="num">{min}</span>
          <span className={cn('text-center font-medium', inside === false ? 'text-warn' : 'text-bullish')}>
            aman <span className="num">{trim2(safe[0])}–{trim2(safe[1])}</span>
            {inside === false && ' · di luar'}
          </span>
          <span className="num">{max}</span>
        </div>
      ) : (
        <p className="num text-[13px] text-muted-foreground">
          default {fmtDefault(spec)} · batas {min}–{max}
        </p>
      )}
    </div>
  )
}

export function ParamField({
  spec,
  value,
  error,
  onChange,
  tag,
  idPrefix = 'param',
  bare = false,
}: {
  spec: LabParamSpec
  value: ParamFormValue | undefined
  error?: string
  onChange: (v: ParamFormValue) => void
  tag?: LabImportanceParam
  idPrefix?: string
  /** Control only (the caller renders label + help, e.g. a step-2 card). */
  bare?: boolean
}) {
  const id = `${idPrefix}-${spec.key}`
  const changed = isChanged(spec, value)
  const help = paramHelp(spec)

  if (bare && spec.type === 'bool') {
    return (
      <div className="flex items-center gap-3 text-[15px]">
        <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c)} aria-label={paramLabel(spec)} />
        <span className="text-muted-foreground">{value === true ? 'aktif' : 'mati'}</span>
      </div>
    )
  }

  if (spec.type === 'bool') {
    return (
      <div className={cn('flex items-center justify-between gap-4 rounded-2xl border px-4 py-3', changed ? 'border-warn/40 bg-warn/5' : 'border-border')}>
        <label htmlFor={id} className="min-w-0 text-[15px] font-medium">
          {paramLabel(spec)}
          {changed && <span className="ml-2 align-middle"><ChangedBadge /></span>}
          {tag && <span className="ml-2 align-middle"><ImportanceTag row={tag} /></span>}
          {help && <span className="mt-1 line-clamp-2 block text-[13px] font-normal leading-snug text-muted-foreground">{help}</span>}
        </label>
        <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c)} />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {bare ? (
        <p className="num text-[13px] text-muted-foreground">default {fmtDefault(spec)}</p>
      ) : (
        <>
          <label htmlFor={id} className="flex items-start justify-between gap-2 text-[15px] font-medium">
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              {paramLabel(spec)}
              {changed && <ChangedBadge />}
              {tag && <ImportanceTag row={tag} />}
            </span>
            <span className="num shrink-0 pt-0.5 text-[13px] font-normal text-muted-foreground">default {fmtDefault(spec)}</span>
          </label>
          {help && <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{help}</p>}
        </>
      )}
      {spec.type === 'choice' ? (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(
            'flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error && 'border-bearish',
          )}
        >
          {(spec.choices ?? []).map((c) => (
            <option key={c} value={c} className="bg-popover">{choiceLabel(spec.key, c)}</option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type="number"
          inputMode={spec.type === 'int' ? 'numeric' : 'decimal'}
          step={spec.step ?? (spec.type === 'int' ? 1 : 'any')}
          min={spec.min ?? undefined}
          max={spec.max ?? undefined}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn('h-11 rounded-xl px-3 font-mono text-base tabular-nums', error && 'border-bearish')}
        />
      )}
      {error && <p id={`${id}-err`} className="text-sm text-bearish">{error}</p>}
    </div>
  )
}
