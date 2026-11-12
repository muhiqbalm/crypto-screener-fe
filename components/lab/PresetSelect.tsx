'use client'

import type { LabPreset } from '@/lib/api/types/lab-insights'

/** Native select of named presets (grouped by coin), e.g. 4H-ETH-Basic, 1H-BTC-Opt1. */
export function PresetSelect({
  id,
  presets,
  value,
  onChange,
  emptyLabel = '— tanpa preset —',
}: {
  id?: string
  presets: LabPreset[]
  value: string | null
  onChange: (p: LabPreset | null) => void
  emptyLabel?: string
}) {
  const coins = Array.from(new Set(presets.map((p) => p.symbol)))
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(presets.find((p) => String(p.id) === e.target.value) ?? null)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm shadow-sm"
    >
      <option value="" className="bg-popover">{emptyLabel}</option>
      {coins.map((c) => (
        <optgroup key={c} label={c.replace(/USDT$/, '')} className="bg-popover">
          {presets
            .filter((p) => p.symbol === c)
            .map((p) => (
              <option key={String(p.id)} value={String(p.id)} className="bg-popover">
                {p.name}
                {p.live_reference ? ' · setting live' : p.verdict === 'PASS' ? ' · Lolos' : p.verdict === 'FAIL' ? ' · Gagal' : ' · tanpa rapor'}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}

export function presetTone(p: Pick<LabPreset, 'live_reference' | 'verdict'>): string {
  if (p.live_reference) return 'border-lab/30 bg-lab/10 text-lab'
  if (p.verdict === 'PASS') return 'border-bullish/30 bg-bullish/10 text-bullish'
  if (p.verdict === 'FAIL') return 'border-bearish/30 bg-bearish/10 text-bearish'
  return 'border-border bg-muted/40 text-muted-foreground'
}
