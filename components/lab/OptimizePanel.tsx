'use client'

import { Input } from '@/components/ui/input'
import { Chip } from '@/components/lab/Section'
import { cn } from '@/lib/utils/cn'
import type { LabTemplate } from '@/lib/api/types/lab'
import type { LabImportanceParam } from '@/lib/api/types/lab-uji'
import {
  TRIAL_OPTIONS,
  defaultOptimizeConfig,
  paramLabel,
  type OptimizeConfig,
} from '@/lib/lab/form'
import { plateauText } from '@/lib/lab/importance'

interface Props {
  template: LabTemplate
  value: OptimizeConfig
  errors: Record<string, string>
  onChange: (v: OptimizeConfig) => void
  /** Research / runs importance per Lab key (plateau shown as reference, never applied). */
  importance?: Map<string, LabImportanceParam>
  /** Step-2 keys: searched by default. */
  importantKeys?: Set<string>
}

export function optimizeSummary(cfg: OptimizeConfig): string {
  const n = Object.values(cfg.ranges).filter((r) => r.enabled).length
  return `${cfg.nTrials} percobaan · ${n} parameter dicari`
}

/** Search set where only the given keys are enabled (template ranges). */
export function onlyKeys(template: LabTemplate, cfg: OptimizeConfig, keys: Set<string>): OptimizeConfig {
  const base = defaultOptimizeConfig(template)
  return {
    nTrials: cfg.nTrials,
    ranges: Object.fromEntries(Object.entries(base.ranges).map(([k, r]) => [k, { ...r, enabled: keys.has(k) }])),
  }
}

/** "Cari setting terbaik" settings: trial count and which params are searched over which range. */
export function OptimizePanel({ template, value, errors, onChange, importance, importantKeys }: Props) {
  const main = template.params.filter((p) => p.tunable === true)
  const all = main.every((p) => value.ranges[p.key]?.enabled)
  const setRange = (key: string, patch: Partial<OptimizeConfig['ranges'][string]>) =>
    onChange({ ...value, ranges: { ...value.ranges, [key]: { ...value.ranges[key], ...patch } } })

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">Jumlah percobaan</div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jumlah percobaan">
          {TRIAL_OPTIONS.map((n) => (
            <Chip key={n} active={value.nTrials === n} onClick={() => onChange({ ...value, nTrials: n })}>
              {n}
            </Chip>
          ))}
        </div>
        <p className="text-2xs text-muted-foreground">
          Makin banyak kombinasi dicoba, makin besar peluang juaranya cuma kebetulan. Hasilnya tetap diuji sekali di data baru (holdout).
        </p>
      </div>

      {main.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Parameter yang dicari &amp; rentangnya</span>
            <span className="flex flex-wrap gap-3">
              {importantKeys && importantKeys.size > 0 && (
                <button type="button" className="cursor-pointer text-2xs text-lab hover:underline" onClick={() => onChange(onlyKeys(template, value, importantKeys))}>
                  Hanya parameter penting
                </button>
              )}
              <button
                type="button"
                className="cursor-pointer text-2xs text-lab hover:underline"
                onClick={() => {
                  if (all) onChange({ ...value, ranges: Object.fromEntries(Object.entries(value.ranges).map(([k, r]) => [k, { ...r, enabled: false }])) })
                  else onChange({ ...defaultOptimizeConfig(template), nTrials: value.nTrials })
                }}
              >
                {all ? 'Kosongkan' : 'Pilih semua'}
              </button>
            </span>
          </div>
          <ul className="divide-y divide-border/50 rounded-2xl border border-border">
            {main.map((p) => {
              const r = value.ranges[p.key] ?? { enabled: false, min: String(p.min ?? ''), max: String(p.max ?? '') }
              const err = errors[`search.${p.key}`]
              const plateau = plateauText(importance?.get(p.key))
              return (
                <li key={p.key} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id={`opt-${p.key}`}
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => setRange(p.key, { enabled: e.target.checked })}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-lab"
                    />
                    <label htmlFor={`opt-${p.key}`} className="min-w-0 flex-1 text-sm">
                      {paramLabel(p)}
                      {importantKeys?.has(p.key) && <span className="ml-1.5 rounded-full bg-lab/10 px-1.5 py-px text-2xs font-medium text-lab">penting</span>}
                      {plateau && <span className="num block text-2xs text-muted-foreground">rentang stabil di riset: {plateau}</span>}
                    </label>
                    <span className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="any"
                        aria-label={`Min ${paramLabel(p)}`}
                        value={r.min}
                        disabled={!r.enabled}
                        onChange={(e) => setRange(p.key, { min: e.target.value })}
                        className={cn('h-10 w-20 rounded-xl px-2 text-right font-mono text-2xs', err && 'border-bearish')}
                      />
                      <span className="text-2xs text-muted-foreground">–</span>
                      <Input
                        type="number"
                        step="any"
                        aria-label={`Maks ${paramLabel(p)}`}
                        value={r.max}
                        disabled={!r.enabled}
                        onChange={(e) => setRange(p.key, { max: e.target.value })}
                        className={cn('h-10 w-20 rounded-xl px-2 text-right font-mono text-2xs', err && 'border-bearish')}
                      />
                    </span>
                  </div>
                  {err && <p className="mt-1 pl-6 text-2xs text-bearish">{err}</p>}
                </li>
              )
            })}
          </ul>
          {errors.search && <p className="text-2xs text-bearish">{errors.search}</p>}
          <p className="text-2xs text-muted-foreground">
            Hanya parameter yang ditandai bisa dicari. Parameter lain (mis. dari riset) diubah manual di atas.
          </p>
        </div>
      )}
    </div>
  )
}
