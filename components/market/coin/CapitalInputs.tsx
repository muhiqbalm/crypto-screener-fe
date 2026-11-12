'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { InfoTip } from '@/components/ui/info-tip'
import { parseBounded, saveInputs } from '@/lib/lab/outlook'
import { cn } from '@/lib/utils/cn'
import type { OutlookInputs, Sizing } from '@/lib/api/types/outlook'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Capital / leverage / sizing used for the dollar figures; remembered on this device. */
export function CapitalInputs({ initial, onChange }: { initial: OutlookInputs; onChange: (i: OutlookInputs) => void }) {
  const [capital, setCapital] = useState(String(initial.capital))
  const [leverage, setLeverage] = useState(String(initial.leverage))
  const [riskPct, setRiskPct] = useState(String(initial.risk_pct))
  const [sizing, setSizing] = useState<Sizing>(initial.sizing)
  const cap = parseBounded(capital, 1, 1e9)
  const lev = parseBounded(leverage, 1, 20)
  const risk = parseBounded(riskPct, 0.1, 10)
  const valid = cap !== null && lev !== null && (sizing === 'notional' || risk !== null)
  const next = useDebounced(valid ? { capital: cap as number, leverage: lev as number, sizing, risk_pct: risk ?? 1 } : null, 400)
  const key = next ? `${next.capital}|${next.leverage}|${next.sizing}|${next.risk_pct}` : ''
  useEffect(() => {
    if (!next) return
    saveInputs(next)
    onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="koin-capital" className="text-[13px]">Modal (USDT)</Label>
        <Input id="koin-capital" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)}
          aria-invalid={cap === null} className={cn('h-10 w-32 rounded-xl font-mono text-[15px]', cap === null && 'border-bearish')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="koin-lev" className="text-[13px]">Leverage</Label>
        <Input id="koin-lev" inputMode="decimal" value={leverage} onChange={(e) => setLeverage(e.target.value)}
          aria-invalid={lev === null} className={cn('h-10 w-20 rounded-xl font-mono text-[15px]', lev === null && 'border-bearish')} />
      </div>
      <div className="space-y-1">
        <span className="block text-[13px] font-medium">Ukuran posisi</span>
        <Segmented<Sizing>
          aria-label="Ukuran posisi"
          value={sizing}
          onChange={setSizing}
          options={[
            { value: 'notional', label: 'Dari modal' },
            { value: 'risk', label: 'Dari risiko' },
          ]}
        />
      </div>
      {sizing === 'risk' && (
        <div className="space-y-1">
          <Label htmlFor="koin-risk" className="text-[13px]">Siap hilang di SL (% modal)</Label>
          <Input id="koin-risk" inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)}
            aria-invalid={risk === null} className={cn('h-10 w-20 rounded-xl font-mono text-[15px]', risk === null && 'border-bearish')} />
        </div>
      )}
      <p className="basis-full text-[13px] text-muted-foreground">
        Disimpan di perangkat ini, tidak ada order yang dikirim.
        <InfoTip label="Ukuran posisi">
          Dari modal = posisi sebesar modal × leverage. Dari risiko = posisi diatur supaya rugi di SL sebesar persen modal itu.
          Default 1× (riset Lab: 2× terlalu berisiko).
        </InfoTip>
        {!valid && <span className="block text-bearish">Isi modal 1–1,000,000,000 dan leverage 1–20.</span>}
      </p>
    </div>
  )
}
