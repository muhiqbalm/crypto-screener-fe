'use client'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import type { CostFormValues } from '@/lib/lab/form'

interface CostInputsProps {
  value: CostFormValues
  errors: Record<string, string>
  onChange: (v: CostFormValues) => void
}

export function CostInputs({ value, errors, onChange }: CostInputsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {(
        [
          ['commission_pct', 'Komisi per sisi (%)'],
          ['slippage_pct', 'Slippage per sisi (%)'],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-1">
          <label htmlFor={`cost-${key}`} className="text-xs font-medium">
            {label}
          </label>
          <Input
            id={`cost-${key}`}
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            aria-invalid={Boolean(errors[key])}
            className={cn('font-mono tabular-nums', errors[key] && 'border-rose-500')}
          />
          {errors[key] && <p className="text-[11px] text-rose-400">{errors[key]}</p>}
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2 sm:mt-5">
        <label htmlFor="cost-funding" className="text-xs font-medium">
          Hitung funding fee
        </label>
        <Switch
          id="cost-funding"
          checked={value.funding}
          onCheckedChange={(c) => onChange({ ...value, funding: c })}
        />
      </div>
    </div>
  )
}
