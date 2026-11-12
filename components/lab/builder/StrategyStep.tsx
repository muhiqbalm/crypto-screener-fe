'use client'

import { Database } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/lab/Section'
import { PresetSelect } from '@/components/lab/PresetSelect'
import { DOWNLOAD_HINT, SymbolPicker } from '@/components/lab/SymbolPicker'
import { PERIOD_OPTIONS, type FormState, type Period } from '@/components/lab/builder/form-state'
import { cn } from '@/lib/utils/cn'
import { LIVE_PRESET_NAME, isLiveTemplate, templateDefaultsCopy, templateDescription, templateShort } from '@/lib/lab/form'
import { LOWER_TFS, hasTimeframeData, lowerTfHint, sortTimeframes } from '@/lib/lab/timeframes'
import { formatDate } from '@/lib/utils/time'
import type { LabDataStatus, LabSymbol, LabTemplate } from '@/lib/api/types/lab'
import type { LabPreset } from '@/lib/api/types/lab-insights'

const label = 'text-xs font-medium'

function templateOption(t: LabTemplate): string {
  return isLiveTemplate(t.id) ? `${templateShort(t.id, t.name)} (strategi live)` : `${templateShort(t.id, t.name)} (riset)`
}

/** Step 1: what is tested. Defaults are filled in; only the strategy, coin and timeframe usually change. */
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
  autoReason,
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
  autoReason: string | null
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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="lab-template" className={label}>Strategi</label>
          <select
            id="lab-template"
            value={template.id}
            onChange={(e) => onTemplate(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id} className="bg-popover">{templateOption(t)}</option>
            ))}
          </select>
          <p className="text-2xs leading-snug text-muted-foreground">{templateDescription(template)}</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lab-preset" className={label}>Mulai dari</label>
          <PresetSelect
            id="lab-preset"
            presets={presets}
            value={form.presetId}
            onChange={onPreset}
            emptyLabel={live ? `Default (= ${LIVE_PRESET_NAME}, setting live)` : 'Default strategi (setting riset)'}
          />
          <p className="text-2xs leading-snug text-muted-foreground">
            {activePreset
              ? `${activePreset.name}: setting khusus ${activePreset.symbol.replace(/USDT$/, '')} ${activePreset.timeframe}.${activePreset.symbol !== form.symbol || activePreset.timeframe !== form.timeframe ? ' Dipakai di koin atau timeframe lain, jadi hasilnya bisa jauh berbeda.' : ''}`
              : templateDefaultsCopy(template.id)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className={label} id="lab-symbol-label">Koin (Binance perpetual)</span>
          <SymbolPicker symbols={symbols} value={form.symbol} onChange={onSymbol} invalid={Boolean(errors.symbol)} />
          {errors.symbol && <p className="text-2xs text-bearish">{errors.symbol}</p>}
        </div>
        <div className="space-y-1.5">
          <span className={label}>Timeframe</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Timeframe">
            {sortTimeframes(template.timeframes).map((tf) => {
              const noData = hasTimeframeData(symbolInfo, tf) === false
              const low = LOWER_TFS.has(tf) || tf === '1h'
              return (
                <Chip
                  key={tf}
                  active={form.timeframe === tf}
                  onClick={() => onTimeframe(tf)}
                  className={cn('min-w-12 gap-1 font-mono', low && form.timeframe !== tf && 'border-dashed')}
                  title={[noData ? `Data ${tf} belum ada, akan diunduh saat dipakai` : null, low ? 'Timeframe kecil: biaya lebih berat' : null].filter(Boolean).join(' · ') || undefined}
                >
                  {tf}
                  {noData && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="data belum ada" />}
                </Chip>
              )
            })}
          </div>
          <p className="text-2xs text-muted-foreground">Bot live memakai 4h. Timeframe 1h ke bawah (garis putus-putus) membuat biaya lebih berat.</p>
          {lowTf && <p className="text-2xs text-warn">{lowTf}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className={label}>Periode</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Periode">
          {PERIOD_OPTIONS.map((p) => (
            <Chip key={p.id} active={form.period === p.id} onClick={() => onPeriod(p.id)}>
              {p.label}
            </Chip>
          ))}
        </div>
        {form.period === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1 sm:max-w-md">
            <div className="space-y-1">
              <label htmlFor="lab-start" className="text-2xs text-muted-foreground">Mulai</label>
              <Input id="lab-start" type="date" value={form.start} onChange={(e) => onDates({ start: e.target.value })} className={cn('h-8 px-2 text-xs', errors.start && 'border-bearish')} />
            </div>
            <div className="space-y-1">
              <label htmlFor="lab-end" className="text-2xs text-muted-foreground">Sampai (kosong = terbaru)</label>
              <Input id="lab-end" type="date" value={form.end} onChange={(e) => onDates({ end: e.target.value })} className={cn('h-8 px-2 text-xs', errors.end && 'border-bearish')} />
            </div>
          </div>
        )}
        {(errors.start || errors.end) && <p className="text-2xs text-bearish">{errors.end ?? errors.start}</p>}
        <p className="text-2xs text-muted-foreground">
          {form.period === 'auto'
            ? `Otomatis untuk ${form.timeframe}: mulai ${formatDate(autoStart)} sampai data terbaru.${autoReason ? ` ${autoReason}` : ''}`
            : form.start
              ? `Mulai ${formatDate(form.start)} sampai ${form.end ? formatDate(form.end) : 'data terbaru'}.`
              : 'Seluruh data yang tersedia.'}
        </p>
      </div>

      <p className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
        <Database className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {symbolInfo && !symbolInfo.has_data
            ? DOWNLOAD_HINT
            : dataPending
              ? 'Cek data…'
              : dataRow
                ? `${dataRow.rows.toLocaleString('en-US')} candle tersedia · ${formatDate(dataRow.first)} s/d ${formatDate(dataRow.last)}`
                : `Data ${form.timeframe} untuk ${form.symbol} akan diunduh saat dipakai (±1 menit).`}
        </span>
      </p>
    </div>
  )
}
