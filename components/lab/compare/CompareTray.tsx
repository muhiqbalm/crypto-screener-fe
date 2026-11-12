'use client'

import Link from 'next/link'
import { Columns3, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/lab/Section'
import { MAX_COMPARE, compareHref } from '@/lib/lab/planning'

/** Floating bar shown while runs are ticked for comparison. */
export function CompareTray({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  if (ids.length === 0) return null
  return (
    <div className="sticky bottom-3 z-30 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 py-2 pl-5 pr-2 text-sm shadow-lg backdrop-blur-md">
        <span>
          <span className="num font-semibold">{ids.length}</span>/{MAX_COMPARE} uji dipilih
          {ids.length < 2 && <span className="text-muted-foreground"> · pilih 1 lagi</span>}
        </span>
        <Button size="sm" variant="ghost" className="h-9 w-9 rounded-full p-0" onClick={onClear} aria-label="Hapus pilihan">
          <X className="h-4 w-4" />
        </Button>
        <Button asChild size="sm" className="h-10 gap-2 rounded-full px-4 text-sm" disabled={ids.length < 2}>
          <Link href={compareHref(ids)} aria-disabled={ids.length < 2} onClick={(e) => ids.length < 2 && e.preventDefault()}>
            <Columns3 className="h-4 w-4" />
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
    <Checkbox
      checked={checked}
      disabled={disabled && !checked}
      onChange={() => onToggle(id)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={label}
      title={disabled && !checked ? `Maksimal ${MAX_COMPARE} uji` : 'Pilih untuk dibandingkan'}
    />
  )
}
