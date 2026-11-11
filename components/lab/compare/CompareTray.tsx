'use client'

import Link from 'next/link'
import { Columns3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MAX_COMPARE, compareHref } from '@/lib/lab/planning'

/** Floating bar shown while runs are ticked for comparison. */
export function CompareTray({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  if (ids.length === 0) return null
  return (
    <div className="sticky bottom-3 z-30 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 text-xs shadow-lg backdrop-blur-md">
        <span>
          <span className="num font-semibold">{ids.length}</span>/{MAX_COMPARE} run dipilih
          {ids.length < 2 && <span className="text-muted-foreground"> · pilih 1 lagi</span>}
        </span>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onClear} aria-label="Hapus pilihan">
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button asChild size="sm" className="h-7 gap-1.5 rounded-full" disabled={ids.length < 2}>
          <Link href={compareHref(ids)} aria-disabled={ids.length < 2} onClick={(e) => ids.length < 2 && e.preventDefault()}>
            <Columns3 className="h-3.5 w-3.5" />
            Bandingkan
          </Link>
        </Button>
      </div>
    </div>
  )
}

/** Checkbox cell used by run tables; stops the row's click-to-open. */
export function CompareCheckbox({ id, checked, disabled, onToggle, label }: { id: string; checked: boolean; disabled?: boolean; onToggle: (id: string) => void; label: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled && !checked}
      onChange={() => onToggle(id)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={label}
      title={disabled && !checked ? `Maksimal ${MAX_COMPARE} run` : 'Pilih untuk dibandingkan'}
      className="h-3.5 w-3.5 cursor-pointer accent-lab"
    />
  )
}
