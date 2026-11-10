'use client'

import { Input } from '@/components/ui/input'
import { Chip } from '@/components/lab/Section'
import { cn } from '@/lib/utils/cn'
import type { LabTemplate } from '@/lib/api/types/lab'
import {
  TRIAL_OPTIONS,
  defaultOptimizeConfig,
  estimateMinutes,
  paramLabel,
  type OptimizeConfig,
} from '@/lib/lab/form'

interface Props {
  template: LabTemplate
  value: OptimizeConfig
  errors: Record<string, string>
  onChange: (v: OptimizeConfig) => void
}

export function optimizeSummary(cfg: OptimizeConfig): string {
  const n = Object.values(cfg.ranges).filter((r) => r.enabled).length
  return `${cfg.nTrials} percobaan · ${n} parameter · ±${estimateMinutes(cfg.nTrials)} mnt`
}

export function OptimizePanel({ template, value, errors, onChange }: Props) {
  const main = template.params.filter((p) => p.tunable === true)
  const all = main.every((p) => value.ranges[p.key]?.enabled)
  const setRange = (key: string, patch: Partial<OptimizeConfig['ranges'][string]>) =>
    onChange({ ...value, ranges: { ...value.ranges, [key]: { ...value.ranges[key], ...patch } } })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-medium">Jumlah percobaan</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jumlah percobaan optimize">
          {TRIAL_OPTIONS.map((n) => (
            <Chip key={n} active={value.nTrials === n} onClick={() => onChange({ ...value, nTrials: n })}>
              {n}
              <span className="text-3xs opacity-70">±{estimateMinutes(n)} mnt</span>
            </Chip>
          ))}
        </div>
        <p className="text-2xs text-muted-foreground">
          Makin banyak percobaan makin teliti, tapi juga makin besar risiko &quot;kebetulan bagus&quot;. Hasilnya tetap diuji di holdout.
        </p>
      </div>

      {main.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">Parameter yang dicari &amp; rentangnya</span>
            <button
              type="button"
              className="text-2xs text-lab hover:underline cursor-pointer"
              onClick={() => {
                if (all) onChange({ ...value, ranges: Object.fromEntries(Object.entries(value.ranges).map(([k, r]) => [k, { ...r, enabled: false }])) })
                else onChange({ ...defaultOptimizeConfig(template), nTrials: value.nTrials })
              }}
            >
              {all ? 'Kosongkan' : 'Pilih semua (rentang default)'}
            </button>
          </div>
          <ul className="divide-y divide-border/50 rounded-lg border border-border">
            {main.map((p) => {
              const r = value.ranges[p.key] ?? { enabled: false, min: String(p.min ?? ''), max: String(p.max ?? '') }
              const err = errors[`search.${p.key}`]
              return (
                <li key={p.key} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      id={`opt-${p.key}`}
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => setRange(p.key, { enabled: e.target.checked })}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-lab"
                    />
                    <label htmlFor={`opt-${p.key}`} className="min-w-0 flex-1 truncate text-xs">
                      {paramLabel(p)}
                    </label>
                    <Input
                      type="number"
                      step="any"
                      aria-label={`Min ${paramLabel(p)}`}
                      value={r.min}
                      disabled={!r.enabled}
                      onChange={(e) => setRange(p.key, { min: e.target.value })}
                      className={cn('h-7 w-16 px-1.5 text-right font-mono text-2xs', err && 'border-bearish')}
                    />
                    <span className="text-3xs text-muted-foreground">–</span>
                    <Input
                      type="number"
                      step="any"
                      aria-label={`Maks ${paramLabel(p)}`}
                      value={r.max}
                      disabled={!r.enabled}
                      onChange={(e) => setRange(p.key, { max: e.target.value })}
                      className={cn('h-7 w-16 px-1.5 text-right font-mono text-2xs', err && 'border-bearish')}
                    />
                  </div>
                  {err && <p className="mt-1 pl-6 text-2xs text-bearish">{err}</p>}
                </li>
              )
            })}
          </ul>
          {errors.search && <p className="text-2xs text-bearish">{errors.search}</p>}
        </div>
      )}
    </div>
  )
}
