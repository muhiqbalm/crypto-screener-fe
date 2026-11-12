import { Eye } from 'lucide-react'
import { holdoutWarning } from '@/lib/lab/form'

/** Run detail (design v2): the "data baru sudah sering dipakai" warning as one readable line. */
export function HoldoutAlert({ touches }: { touches: number | null | undefined }) {
  const msg = holdoutWarning(touches)
  if (!msg) return null
  return (
    <div role="alert" data-testid="holdout-warning" className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-5 py-3.5 text-[15px] text-warn">
      <Eye className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{msg} Makin sering dipakai, makin kurang bisa dipercaya.</span>
    </div>
  )
}
