'use client'

import { RotateCcw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import type { LabParamSpec, LabTemplate } from '@/lib/api/types/lab'
import {
  groupParams,
  initialParamValues,
  isLiveDefault,
  type ParamFormValue,
  type ParamFormValues,
} from '@/lib/lab/form'

interface ParamFormProps {
  template: LabTemplate
  values: ParamFormValues
  errors: Record<string, string>
  onChange: (values: ParamFormValues) => void
}

/** Form generated from the template schema, grouped by `group`. */
export function ParamForm({ template, values, errors, onChange }: ParamFormProps) {
  const groups = groupParams(template.params)
  const atDefault = isLiveDefault(template, values)

  const set = (key: string, v: ParamFormValue) => onChange({ ...values, [key]: v })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          Nilai default = setting strategi live ETH 4H.
          {atDefault ? (
            <span className="font-mono text-emerald-400">(sedang pakai default live)</span>
          ) : (
            <span className="font-mono text-amber-400">(sudah diubah)</span>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(initialParamValues(template))}
          disabled={atDefault}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset ke default live
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground">Template ini tidak punya parameter.</p>
      )}

      {groups.map((g) => (
        <fieldset key={g.group} className="rounded-lg border border-border/60 p-3">
          <legend className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            {g.group}
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.params.map((p) => (
              <ParamField
                key={p.key}
                spec={p}
                value={values[p.key]}
                error={errors[p.key]}
                onChange={(v) => set(p.key, v)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

function rangeHint(spec: LabParamSpec): string | null {
  const parts: string[] = []
  if (spec.min !== null && spec.min !== undefined) parts.push(`min ${spec.min}`)
  if (spec.max !== null && spec.max !== undefined) parts.push(`maks ${spec.max}`)
  return parts.length ? parts.join(' · ') : null
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
  const changed =
    spec.type === 'int' || spec.type === 'float'
      ? Number(value) !== Number(spec.default)
      : String(value) !== String(spec.type === 'bool' ? spec.default === true : spec.default)
  const hint = rangeHint(spec)

  if (spec.type === 'bool') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2">
        <label htmlFor={id} className="text-xs font-medium">
          {spec.label}
          {changed && <span className="ml-1 text-amber-400">*</span>}
        </label>
        <Switch id={id} checked={value === true} onCheckedChange={(c) => onChange(c)} />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-center justify-between text-xs font-medium">
        <span>
          {spec.label}
          {changed && <span className="ml-1 text-amber-400">*</span>}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">default {String(spec.default)}</span>
      </label>
      {spec.type === 'choice' ? (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            error && 'border-rose-500',
          )}
        >
          {(spec.choices ?? []).map((c) => (
            <option key={c} value={c} className="bg-popover">
              {c}
            </option>
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
          className={cn('font-mono tabular-nums', error && 'border-rose-500')}
        />
      )}
      {error ? (
        <p id={`${id}-err`} className="text-[11px] text-rose-400">
          {error}
        </p>
      ) : (
        hint && <p className="text-[10px] font-mono text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
