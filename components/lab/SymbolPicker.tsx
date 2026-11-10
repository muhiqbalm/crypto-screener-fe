'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import type { LabSymbol } from '@/lib/api/types/lab'

interface SymbolPickerProps {
  symbols: LabSymbol[]
  value: string
  onChange: (symbol: string) => void
  invalid?: boolean
}

/** Searchable single-select for Binance perp symbols. */
export function SymbolPicker({ symbols, value, onChange, invalid }: SymbolPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const selected = symbols.find((s) => s.symbol === value)
  const term = q.trim().toUpperCase()
  const filtered = symbols.filter((s) => s.symbol.includes(term)).slice(0, 200)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="lab-symbol"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm font-mono shadow-sm hover:bg-accent cursor-pointer',
          invalid && 'border-bearish',
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>{value || 'Pilih symbol…'}</span>
        <span className="flex items-center gap-2">
          {selected && <DataTag hasData={selected.has_data} />}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-2 shadow-xl">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari, mis. SOL"
              className="h-8 pl-8 font-mono text-xs"
              aria-label="Cari symbol"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto">
            {filtered.length === 0 && (
              <li className="px-2 py-3 text-center text-xs text-muted-foreground">Symbol tidak ditemukan</li>
            )}
            {filtered.map((s) => (
              <li key={s.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.symbol === value}
                  onClick={() => {
                    onChange(s.symbol)
                    setOpen(false)
                    setQ('')
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-accent cursor-pointer',
                    s.symbol === value && 'bg-accent/70',
                  )}
                >
                  {s.symbol}
                  <DataTag hasData={s.has_data} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** "siap" when the backend already has candles; otherwise it downloads on first use. */
function DataTag({ hasData }: { hasData: boolean }) {
  return hasData ? (
    <span className="rounded-full bg-bullish/10 px-1.5 py-px font-sans text-3xs font-medium text-bullish">siap</span>
  ) : (
    <span className="font-sans text-3xs text-muted-foreground" title="Data akan diunduh saat dipakai (±1 menit)">
      diunduh ±1 mnt
    </span>
  )
}

export const DOWNLOAD_HINT = 'Data koin ini akan diunduh saat dipakai (±1 menit).'
