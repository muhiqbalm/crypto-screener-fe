import { formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { paramLabel } from '@/lib/lab/form'
import type { LabRunDetail, LabTemplate } from '@/lib/api/types/lab'
import { fmtVal } from './format'

export function SensitivityTab({ run, template }: { run: LabRunDetail; template: LabTemplate | undefined }) {
  const s = run.sensitivity
  if (!s || !s.params?.length) return <p className="py-6 text-center text-sm text-muted-foreground">Cek ketahanan setting hanya ada di Uji jujur dan Cari setting terbaik.</p>
  const labelOf = (k: string) => {
    const spec = template?.params.find((p) => p.key === k)
    return spec ? paramLabel(spec) : k
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Tiap parameter digeser ±10–20% di data latih. Ketahanan {s.threshold ?? 0.5} ke bawah berarti hasilnya gampang berubah (rapuh). {s.unstable} dari {s.params.length} parameter rapuh.
      </p>
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              {['Parameter', 'Nilai', 'Ketahanan', 'Status'].map((h, i) => (
                <th key={h} className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', i > 0 ? 'text-right' : 'text-left')}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {s.params.map((p) => (
              <tr key={p.param}>
                <td className="px-3 py-2 text-sm">{labelOf(p.param)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{fmtVal(p.base ?? undefined)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{formatNumber(p.stability)}</td>
                <td className={cn('px-3 py-2 text-right text-xs font-semibold', p.fragile ? 'text-bearish' : 'text-bullish')}>{p.fragile ? 'Rapuh' : 'Tahan'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
