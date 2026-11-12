'use client'

import { Database, TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/lab/Section'
import { PresetSelect } from '@/components/lab/PresetSelect'
import { DOWNLOAD_HINT, SymbolPicker } from '@/components/lab/SymbolPicker'
import { PERIOD_OPTIONS, type FormState, type Period } from '@/components/lab/builder/form-state'
import { cn } from '@/lib/utils/cn'
import { LIVE_PRESET_NAME, isLiveTemplate, templateDescription, templateShort } from '@/lib/lab/form'
import { LOWER_TFS, hasTimeframeData, lowerTfHint, sortTimeframes } from '@/lib/lab/timeframes'
import { formatDate } from '@/lib/utils/time'
import type { LabDataStatus, LabSymbol, LabTemplate } from '@/lib/api/types/lab'
import type { LabPreset } from '@/lib/api/types/lab-insights'

const label = 'text-sm font-semibold'
const select = 'flex h-11 w-full rounded-xl border border-input bg-transparent px-4 text-base shadow-sm'
const chip = 'h-10 min-w-14 px-4 text-sm'

function templateOption(t: LabTemplate): string {
  return isLiveTemplate(t.id) ? `${templateShort(t.id, t.name)} (strategi live)` : `${templateShort(t.id, t.name)} (riset)`
}

/** Step 1: what is tested. Defaults are filled in; usually only strategy, coin and timeframe change. */
export function StrategyStep({
  templates,
  template,
  presets,
  symbols,
  form,
  errors,
  dataRow,
  dataPending,
  autoStart,
  onTemplate,
  onPreset,
  onSymbol,
  onTimeframe,
  onPeriod,
  onDates,
}: {
  templates: LabTemplate[]
  template: LabTemplate
  presets: LabPreset[]
  symbols: LabSymbol[]
  form: FormState
  errors: Record<string, string>
  dataRow: LabDataStatus | undefined
  dataPending: boolean
  /** Start date "Otomatis" uses for this timeframe. */
  autoStart: string
  /** Kept for callers; the reason now lives in the "Apa ini?" help. */
  autoReason?: string | null
  onTemplate: (id: string) => void
  onPreset: (p: LabPreset | null) => void
  onSymbol: (s: string) => void
  onTimeframe: (tf: string) => void
  onPeriod: (p: Period) => void
  onDates: (d: { start?: string; end?: string }) => void
}) {
  const symbolInfo = symbols.find((s) => s.symbol === form.symbol)
  const live = isLiveTemplate(template.id)
  const activePreset = presets.find((p) => String(p.id) === form.presetId) ?? null
  const lowTf = lowerTfHint([form.timeframe])
  const elsewhere = activePreset && (activePreset.symbol !== form.symbol || activePreset.timeframe !== form.timeframe)
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="lab-template" className={label}>Strategi</label>
          <select id="lab-template" value={template.id} onChange={(e) => onTemplate(e.target.value)} className={select}>
            {templates.map((t) => (
              <option key={t.id} value={t.id} className="bg-popover">{templateOption(t)}</option>
            ))}
          </select>
          <p className="line-clamp-2 text-sm text-muted-foreground">{templateDescription(template)}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="lab-preset" className={label}>Mulai dari</label>
          <PresetSelect
            id="lab-preset"
            presets={presets}
            value={form.presetId}
            onChange={onPreset}
            emptyLabel={live ? `Default (= ${LIVE_PRESET_NAME}, setting live)` : 'Default strategi (setting riset)'}
          />
          {elsewhere && (
            <p className="flex items-center gap-1.5 text-sm text-warn">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              Preset ini dibuat untuk {activePreset.symbol.replace(/USDT$/, '')} {activePreset.timeframe}; hasil di sini bisa jauh beda.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <span className={label} id="lab-symbol-label">Koin</span>
          <SymbolPicker symbols={symbols} value={form.symbol} onChange={onSymbol} invalid={Boolean(errors.symbol)} />
          {errors.symbol && <p className="text-sm text-bearish">{errors.symbol}</p>}
        </div>
        <div className="space-y-2">
          <span className={label}>Timeframe</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Timeframe">
            {sortTimeframes(template.timeframes).map((tf) => {
              const noData = hasTimeframeData(symbolInfo, tf) === false
              const low = LOWER_TFS.has(tf) || tf === '1h'
              return (
                <Chip
                  key={tf}
                  active={form.timeframe === tf}
                  onClick={() => onTimeframe(tf)}
                  className={cn(chip, 'gap-1.5 font-mono', low && form.timeframe !== tf && 'border-dashed')}
                  title={[noData ? `Data ${tf} belum ada, akan diunduh saat dipakai` : null, low ? 'Timeframe kecil: biaya lebih berat' : null].filter(Boolean).join(' · ') || undefined}
                >
                  {tf}
                  {noData && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="data belum ada" />}
                </Chip>
              )
            })}
          </div>
          {lowTf && <p className="text-sm text-warn">{lowTf}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <span className={label}>Periode</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Periode">
          {PERIOD_OPTIONS.map((p) => (
            <Chip key={p.id} active={form.period === p.id} onClick={() => onPeriod(p.id)} className={chip}>
              {p.label}
            </Chip>
          ))}
        </div>
        {form.period === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-1 sm:max-w-md">
            <div className="space-y-1">
              <label htmlFor="lab-start" className="text-sm text-muted-foreground">Mulai</label>
              <Input id="lab-start" type="date" value={form.start} onChange={(e) => onDates({ start: e.target.value })} className={cn('h-10 px-3 text-sm', errors.start && 'border-bearish')} />
            </div>
            <div className="space-y-1">
              <label htmlFor="lab-end" className="text-sm text-muted-foreground">Sampai (kosong = terbaru)</label>
              <Input id="lab-end" type="date" value={form.end} onChange={(e) => onDates({ end: e.target.value })} className={cn('h-10 px-3 text-sm', errors.end && 'border-bearish')} />
            </div>
          </div>
        )}
        {(errors.start || errors.end) && <p className="text-sm text-bearish">{errors.end ?? errors.start}</p>}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            {form.period === 'auto'
              ? `${formatDate(autoStart)} sampai data terbaru`
              : form.start
                ? `${formatDate(form.start)} sampai ${form.end ? formatDate(form.end) : 'data terbaru'}`
                : 'Seluruh data yang tersedia'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-4 w-4" aria-hidden="true" />
            {symbolInfo && !symbolInfo.has_data
              ? DOWNLOAD_HINT
              : dataPending
                ? 'cek data…'
                : dataRow
                  ? `${dataRow.rows.toLocaleString('en-US')} candle tersedia`
                  : 'data diunduh saat dipakai'}
          </span>
        </p>
      </div>
    </div>
  )
}
