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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          Koin <span className="num font-normal text-muted-foreground">({selected.length} dipilih)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {groups.map((p) => (
            <Chip key={p.label} active={sameSet(selected, p.list)} onClick={() => onChange(p.list)} className="h-9 px-3.5 text-sm">
              {p.label}
            </Chip>
          ))}
          {selected.length > 0 && (
            <Chip onClick={() => onChange([])} className="h-9 px-3.5 text-sm">
              <X className="h-4 w-4" /> Kosongkan
            </Chip>
          )}
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin…" aria-label="Cari koin" className="h-11 pl-10 text-base" />
      </div>
      <div className="flex max-h-56 flex-wrap gap-2 overflow-auto rounded-2xl border border-border p-3">
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
                'num inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors cursor-pointer',
                on ? 'border-lab/50 bg-lab/15 text-lab' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {s.symbol.replace(/USDT$/, '')}
              {!s.has_data && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-label="belum ada data" />}
            </button>
          )
        })}
        {visible.length === 0 && <p className="w-full py-3 text-center text-sm text-muted-foreground">Koin tidak ditemukan</p>}
      </div>
      <p className="text-2xs text-muted-foreground">Titik abu-abu = data belum ada, diunduh saat dipakai (±1 menit per koin).</p>
      {error && <p className="text-sm text-bearish">{error}</p>}
    </div>
  )
}
