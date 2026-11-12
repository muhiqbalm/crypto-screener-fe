'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/lab/Section'
import { cn } from '@/lib/utils/cn'
import { MAJORS, MEMES, pickAvailable, topN } from '@/lib/lab/form'
import type { LabSymbol } from '@/lib/api/types/lab'

/** Multi-select coin picker with quick groups (10 teratas / semua screener / koin besar / meme). */
export function ScanSymbolPicker({
  symbols,
  selected,
  onChange,
  error,
}: {
  symbols: LabSymbol[]
  selected: string[]
  onChange: (next: string[]) => void
  error?: string
}) {
  const [q, setQ] = useState('')
  const names = symbols.map((s) => s.symbol)
  const term = q.trim().toUpperCase()
  const visible = symbols.filter((s) => s.symbol.includes(term))
  const groups: { label: string; list: string[] }[] = [
    { label: '10 teratas', list: topN(names, 10) },
    { label: names.length <= 29 ? `Semua (${names.length})` : '29 teratas', list: topN(names, 29) },
    { label: 'Koin besar', list: pickAvailable(MAJORS, names) },
    { label: 'Meme', list: pickAvailable(MEMES, names) },
  ].filter((p) => p.list.length > 0)
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium">
          Koin <span className="font-mono text-muted-foreground">({selected.length} dipilih)</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {groups.map((p) => (
            <Chip key={p.label} active={sameSet(selected, p.list)} onClick={() => onChange(p.list)} className="h-7 px-2.5">
              {p.label}
            </Chip>
          ))}
          {selected.length > 0 && (
            <Chip onClick={() => onChange([])} className="h-7 px-2.5">
              <X className="h-3 w-3" /> Kosongkan
            </Chip>
          )}
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin…" aria-label="Cari koin" className="h-8 pl-8 font-mono text-xs" />
      </div>
      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-auto rounded-lg border border-border p-2">
        {visible.map((s) => {
          const on = selected.includes(s.symbol)
          return (
            <button
              key={s.symbol}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.symbol)}
              title={s.has_data ? 'Data siap' : 'Akan diunduh saat dipakai (±1 menit)'}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-2xs transition-colors cursor-pointer',
                on ? 'border-lab/50 bg-lab/15 text-lab' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {s.symbol.replace(/USDT$/, '')}
              {!s.has_data && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="belum ada data" />}
            </button>
          )
        })}
        {visible.length === 0 && <p className="w-full py-2 text-center text-xs text-muted-foreground">Koin tidak ditemukan</p>}
      </div>
      <p className="text-2xs text-muted-foreground">Titik abu-abu = data belum ada, akan diunduh saat dipakai (±1 menit per koin).</p>
      {error && <p className="text-2xs text-bearish">{error}</p>}
    </div>
  )
}
