'use client'

import { forwardRef } from 'react'
import { ChevronDown, Loader2, Play, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/lab/Section'
import { AdvancedParams, ParamSummary } from '@/components/lab/ParamForm'
import { CostInputs, costSummary } from '@/components/lab/CostInputs'
import { OptimizePanel, optimizeSummary } from '@/components/lab/OptimizePanel'
import { cn } from '@/lib/utils/cn'
import type { CostFormValues, OptimizeConfig, ParamFormValues } from '@/lib/lab/form'
import type { LabTemplate } from '@/lib/api/types/lab'
import type { LabImportanceParam } from '@/lib/api/types/lab-uji'

function Block({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      <div>
        <h3 className="text-xs font-semibold">{title}</h3>
        {description && <p className="text-2xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * "Lanjutan": everything that is not in steps 1-3. Searchable params (all except step 2, with
 * their importance tag), costs, "Cari setting terbaik" settings and the quick test (no report).
 * Controlled open state so the "N parameter lanjutan diubah · lihat" badge can open it.
 */
export const AdvancedPanel = forwardRef<HTMLElement, {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQuery: (q: string) => void
  onlyChanged: boolean
  onOnlyChanged: (v: boolean) => void
  template: LabTemplate
  values: ParamFormValues
  errors: Record<string, string>
  onParams: (values: ParamFormValues) => void
  hiddenKeys: Set<string>
  hiddenChanged: number
  importance: Map<string, LabImportanceParam>
  costs: CostFormValues
  onCosts: (c: CostFormValues) => void
  optimize: OptimizeConfig
  onOptimize: (cfg: OptimizeConfig) => void
  importantKeys: Set<string>
  onQuickTest: () => void
  quickPending: boolean
  disabled: boolean
}>(function AdvancedPanel(props, ref) {
  const {
    open, onOpenChange, query, onQuery, onlyChanged, onOnlyChanged, template, values, errors, onParams, hiddenKeys,
    hiddenChanged, importance, costs, onCosts, optimize, onOptimize, importantKeys, onQuickTest, quickPending, disabled,
  } = props
  const costError = Boolean(errors.commission_pct || errors.slippage_pct)
  return (
    <section ref={ref} aria-label="Lanjutan" className="scroll-mt-20 rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="lab-advanced"
        onClick={() => onOpenChange(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-lab" aria-hidden="true" />
            Lanjutan
            {hiddenChanged > 0 && (
              <span className="rounded-full bg-warn/15 px-1.5 py-px text-3xs font-semibold text-warn">{hiddenChanged} diubah</span>
            )}
            {costError && <span className="text-2xs font-normal text-bearish">biaya belum valid</span>}
          </span>
          <span className="block text-2xs text-muted-foreground">
            {hiddenKeys.size} parameter lain · biaya · pengaturan Cari setting terbaik · uji cepat
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id="lab-advanced" className="space-y-4 px-4 pb-5 sm:px-5">
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  placeholder="Cari parameter, mis. stop, EMA, volume"
                  aria-label="Cari parameter"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Chip active={onlyChanged} onClick={() => onOnlyChanged(!onlyChanged)} className="h-8 shrink-0">
                Yang diubah saja{hiddenChanged > 0 ? ` (${hiddenChanged})` : ''}
              </Chip>
            </div>
            <ParamSummary template={template} values={values} onChange={onParams} />
            <AdvancedParams
              template={template}
              values={values}
              errors={errors}
              onChange={onParams}
              keys={hiddenKeys}
              query={query}
              onlyChanged={onlyChanged}
              importance={importance}
            />
          </div>

          <Block title="Biaya" description={costSummary(costs)}>
            <CostInputs value={costs} errors={errors} onChange={onCosts} />
          </Block>

          <Block title="Pengaturan Cari setting terbaik" description={optimizeSummary(optimize)}>
            <OptimizePanel template={template} value={optimize} errors={errors} onChange={onOptimize} importance={importance} importantKeys={importantKeys} />
          </Block>

          <Block title="Uji cepat (tanpa rapor)" description="Menjalankan strategi di seluruh data lama tanpa data baru (holdout). Untuk coba-coba, bukan bukti.">
            <Button type="button" variant="outline" size="sm" onClick={onQuickTest} disabled={disabled} className="gap-1.5">
              {quickPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Jalankan uji cepat
            </Button>
          </Block>
        </div>
      )}
    </section>
  )
})
