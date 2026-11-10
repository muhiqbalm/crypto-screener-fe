'use client'

import { ChevronDown, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import type { LabParamSpec, LabTemplate } from '@/lib/api/types/lab'
import {
  PARAM_COPY,
  changedKeys,
  groupLabel,
  initialParamValues,
  paramLabel,
  splitParams,
  type ParamFormValue,
  type ParamFormValues,
} from '@/lib/lab/form'

interface ParamFormProps {
  template: LabTemplate
  values: ParamFormValues
  errors: Record<string, string>
  onChange: (values: ParamFormValues) => void
}

function isChanged(spec: LabParamSpec, value: ParamFormValue | undefined): boolean {
  if (spec.type === 'int' || spec.type === 'float') return Number(value) !== Number(spec.default)
  if (spec.type === 'bool') return (value === true) !== (spec.default === true)
  return String(value) !== String(spec.default)
}

function ChangedBadge({ count, className }: { count?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-warn/15 px-1.5 py-px text-[10px] font-semibold text-warn', className)}>
      {count !== undefined ? `${count} diubah` : 'diubah'}
    </span>
  )
}

/**
 * Header line: how many params differ from the live defaults + reset.
 */
export function ParamSummary({ template, values, onChange }: Omit<ParamFormProps, 'errors'>) {
  const changed = changedKeys(template, values).length
  return (
    <div className="flex flex-wrap items-center gap-2">
      {changed === 0 ? (
        <span className="inline-flex items-center rounded-full bg-bullish/10 px-2 py-0.5 text-[11px] font-medium text-bullish">
          Sama dengan live ETH 4H
        </span>
      ) : (
        <ChangedBadge count={changed} className="px-2 py-0.5 text-[11px]" />
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
        Reset ke default live
      </Button>
    </div>
  )
}

/** The 12 tunable params as slider + number cards. */
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

/** All non-tunable params, one collapsible group each. */
export function AdvancedParams({ template, values, errors, onChange }: ParamFormProps) {
  const { advanced } = splitParams(template)
  const set = (key: string, v: ParamFormValue) => onChange({ ...values, [key]: v })
  if (advanced.length === 0) return null
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
      {advanced.map((g) => {
        const changed = g.params.filter((p) => isChanged(p, values[p.key])).length
        const hasError = g.params.some((p) => errors[p.key])
        return (
          <details key={g.group} className="group" open={hasError || undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <span className="font-medium">{groupLabel(g.group)}</span>
                <span className="text-xs text-muted-foreground">{g.params.length} param</span>
                {changed > 0 && <ChangedBadge count={changed} />}
                {hasError && <span className="text-[11px] text-bearish">ada error</span>}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-1 gap-3 bg-muted/10 px-3 pb-3 pt-1 sm:grid-cols-2 lg:grid-cols-3">
              {g.params.map((p) => (
                <ParamField key={p.key} spec={p} value={values[p.key]} error={errors[p.key]} onChange={(v) => set(p.key, v)} />
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

/**
 * Full editor (main + advanced). Templates without `tunable` flags show
 * everything as advanced groups.
 */
export function ParamForm(props: ParamFormProps) {
  const { main } = splitParams(props.template)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Nilai default = setting strategi live ETH 4H.</p>
        <ParamSummary template={props.template} values={props.values} onChange={props.onChange} />
      </div>
      {main.length > 0 && <MainParams {...props} />}
      <AdvancedParams {...props} />
    </div>
  )
}

function fmtDefault(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'on' : 'off'
  return String(v)
}

function ParamSlider({
  spec,
  value,
  error,
  onChange,
}: {
  spec: LabParamSpec
  value: ParamFormValue | undefined
  error?: string
  onChange: (v: ParamFormValue) => void
}) {
  const id = `param-${spec.key}`
  const changed = isChanged(spec, value)
  const copy = PARAM_COPY[spec.key]
  const min = spec.min ?? 0
  const max = spec.max ?? Math.max(1, Number(spec.default) * 2)
  const step = spec.step ?? (spec.type === 'int' ? 1 : 0.1)
  const num = Number(value)
  const sliderValue = Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : Number(spec.default)

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 transition-colors',
        changed ? 'border-warn/40 bg-warn/5' : 'border-border/60',
        error && 'border-bearish/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium leading-tight">
          {paramLabel(spec)}
        </label>
        {changed && <ChangedBadge />}
      </div>
      {copy?.help && <p className="text-[11px] leading-snug text-muted-foreground">{copy.help}</p>}
      <div className="mt-auto flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${paramLabel(spec)} (slider)`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-violet-500"
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
        <p id={`${id}-err`} className="text-[11px] text-bearish">{error}</p>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          default {fmtDefault(spec.default)} · {min}–{max}
        </p>
      )}
    </div>
  )
}

function ParamField({
  spec,
  value,
  error,
  onChange,
}: {
  spec: LabParamSpec
  value: ParamFormValue | undefined
  error?: string
  onChange: (v: ParamFormValue) => void
}) {
  const id = `param-${spec.key}`
  const changed = isChanged(spec, value)

  if (spec.type === 'bool') {
    return (
      <div className={cn('flex items-center justify-between gap-3 rounded-md border px-3 py-2', changed ? 'border-warn/40 bg-warn/5' : 'border-border/50')}>
        <label htmlFor={id} className="text-xs font-medium">
          {paramLabel(spec)}
          {changed && <span className="ml-1.5 align-middle"><ChangedBadge /></span>}
        </label>
        <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c)} />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-xs font-medium">
        <span className="flex items-center gap-1.5">
          {paramLabel(spec)}
          {changed && <ChangedBadge />}
        </span>
        <span className="shrink-0 font-mono text-[10px] font-normal text-muted-foreground">default {fmtDefault(spec.default)}</span>
      </label>
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
            <option key={c} value={c} className="bg-popover">{c}</option>
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
      {error && <p id={`${id}-err`} className="text-[11px] text-bearish">{error}</p>}
    </div>
  )
}
