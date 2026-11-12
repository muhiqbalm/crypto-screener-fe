'use client'

import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils/cn'
import { COST_LIMITS, type CostFormValues } from '@/lib/lab/form'

interface CostInputsProps {
  value: CostFormValues
  errors: Record<string, string>
  onChange: (v: CostFormValues) => void
}

export function costSummary(c: CostFormValues): string {
  return `Fee ${c.commission_pct}% · slippage ${c.slippage_pct}% per transaksi · funding ${c.funding ? 'dihitung' : 'tidak dihitung'}`
}

const FIELDS = [
  ['commission_pct', 'Fee per transaksi (%)', 'Biaya exchange tiap beli atau jual.'],
  ['slippage_pct', 'Slippage per transaksi (%)', 'Selisih harga eksekusi dengan harga sinyal.'],
] as const

/** Fee, slippage and funding inputs. Limits match the backend (fee <= 1 %, slippage <= 2 %). */
export function CostInputs({ value, errors, onChange }: CostInputsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map(([key, label, help]) => (
          <div key={key} className="space-y-1">
            <label htmlFor={`cost-${key}`} className="text-xs font-medium">{label}</label>
            <Input
              id={`cost-${key}`}
              type="number"
              step="0.01"
              min={0}
              max={COST_LIMITS[key]}
              inputMode="decimal"
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={`cost-${key}-hint`}
              className={cn('h-8 font-mono text-xs tabular-nums', errors[key] && 'border-bearish')}
            />
            {errors[key] ? (
              <p id={`cost-${key}-hint`} className="text-2xs text-bearish">{errors[key]}</p>
            ) : (
              <p id={`cost-${key}-hint`} className="text-3xs text-muted-foreground">{help} Maksimal {COST_LIMITS[key]}%.</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
        <label htmlFor="cost-funding" className="text-xs font-medium">
          Hitung funding
          <span className="block text-3xs font-normal text-muted-foreground">Biaya berkala antara long dan short di perpetual.</span>
        </label>
        <Switch id="cost-funding" checked={value.funding} onCheckedChange={(c) => onChange({ ...value, funding: c })} />
      </div>
    </div>
  )
}

/** Collapsed "Biaya" block with a one-line summary. Opens itself on error. */
export function CostDisclosure(props: CostInputsProps) {
  const hasError = Boolean(props.errors.commission_pct || props.errors.slippage_pct)
  return (
    <details className="group rounded-lg border border-border" open={hasError || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-xs font-medium">Biaya</span>
          <span className="block truncate text-2xs text-muted-foreground">{costSummary(props.value)}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="px-3 pb-3">
        <CostInputs {...props} />
      </div>
    </details>
  )
}
