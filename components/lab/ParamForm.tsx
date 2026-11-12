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
    <span className={cn('inline-flex items-center rounded-full bg-warn/15 px-1.5 py-px text-3xs font-semibold text-warn', className)}>
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
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
          {live ? `Sama dengan ${LIVE_PRESET_NAME} (setting live)` : 'Default strategi (setting riset)'}
        </span>
      ) : (
        <ChangedBadge count={changed} className="px-2 py-0.5 text-2xs" />
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onChange(initialParamValues(template))}
        disabled={changed === 0}
        className="h-7 gap-1.5 px-2 text-xs"
      >
        <RotateCcw className="h-3.5 w-3.5" />
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {main.map((p) =>
        p.type === 'int' || p.type === 'float' ? (
          <ParamSlider key={p.key} spec={p} value={values[p.key]} error={errors[p.key]} onChange={(v) => set(p.key, v)} />
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
    return <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada parameter yang cocok.</p>
  }
  const forceOpen = query.trim() !== '' || onlyChanged
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
      {groups.map((g) => {
        const changed = g.params.filter((p) => isChanged(p, values[p.key])).length
        const hasError = g.params.some((p) => errors[p.key])
        return (
          <details key={`${g.group}|${forceOpen}`} className="group" open={forceOpen || hasError || undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{groupLabel(g.group)}</span>
                <span className="text-xs text-muted-foreground">{g.params.length} parameter</span>
                {changed > 0 && <ChangedBadge count={changed} />}
                {hasError && <span className="text-2xs text-bearish">ada error</span>}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-1 gap-3 bg-muted/10 px-3 pb-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
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
        <p className="text-xs text-muted-foreground">{templateDefaultsCopy(props.template.id)}</p>
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
      <span className="inline-flex items-center gap-0.5 rounded-full border border-warn/30 bg-warn/10 px-1.5 py-px text-3xs font-medium text-warn">
        <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
        berpengaruh, tidak stabil
      </span>
    )
  }
  if (row.label === LABEL_NONE) return <span className="text-3xs text-muted-foreground">tidak berpengaruh (riset)</span>
  return null
}

export function ParamSlider({
  spec,
  value,
  error,
  onChange,
  idPrefix = 'param',
}: {
  spec: LabParamSpec
  value: ParamFormValue | undefined
  error?: string
  onChange: (v: ParamFormValue) => void
  idPrefix?: string
}) {
  const id = `${idPrefix}-${spec.key}`
  const min = spec.min ?? 0
  const max = spec.max ?? Math.max(1, Number(spec.default) * 2)
  const step = spec.step ?? (spec.type === 'int' ? 1 : 0.1)
  const num = Number(value)
  const sliderValue = Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : Number(spec.default)
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${paramLabel(spec)} (geser)`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-lab"
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
          className={cn('h-8 w-20 shrink-0 px-2 text-right font-mono text-xs tabular-nums', error && 'border-bearish')}
        />
      </div>
      {error ? (
        <p id={`${id}-err`} className="text-2xs text-bearish">{error}</p>
      ) : (
        <p className="num text-3xs text-muted-foreground">
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
      <div className="flex items-center gap-2 text-xs">
        <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c)} aria-label={paramLabel(spec)} />
        <span className="text-muted-foreground">{value === true ? 'aktif' : 'mati'}</span>
      </div>
    )
  }

  if (spec.type === 'bool') {
    return (
      <div className={cn('flex items-center justify-between gap-3 rounded-md border px-3 py-2', changed ? 'border-warn/40 bg-warn/5' : 'border-border')}>
        <label htmlFor={id} className="min-w-0 text-xs font-medium">
          {paramLabel(spec)}
          {changed && <span className="ml-1.5 align-middle"><ChangedBadge /></span>}
          {tag && <span className="ml-1.5 align-middle"><ImportanceTag row={tag} /></span>}
          {help && <span className="mt-0.5 block text-3xs font-normal leading-snug text-muted-foreground">{help}</span>}
        </label>
        <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c)} />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {bare ? (
        <p className="num text-3xs text-muted-foreground">default {fmtDefault(spec)}</p>
      ) : (
        <>
          <label htmlFor={id} className="flex items-start justify-between gap-2 text-xs font-medium">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              {paramLabel(spec)}
              {changed && <ChangedBadge />}
              {tag && <ImportanceTag row={tag} />}
            </span>
            <span className="num shrink-0 text-3xs font-normal text-muted-foreground">default {fmtDefault(spec)}</span>
          </label>
          {help && <p className="text-3xs leading-snug text-muted-foreground">{help}</p>}
        </>
      )}
      {spec.type === 'choice' ? (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(
            'flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
          className={cn('h-8 font-mono text-xs tabular-nums', error && 'border-bearish')}
        />
      )}
      {error && <p id={`${id}-err`} className="text-2xs text-bearish">{error}</p>}
    </div>
  )
}
