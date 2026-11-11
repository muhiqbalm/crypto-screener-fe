import type { LabParamValue } from '@/lib/api/types/lab'
import { fmtVal } from './format'

export function ParamDiffTable({ rows, emptyText }: { rows: { key: string; label: string; def: LabParamValue; value: LabParamValue }[]; emptyText: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Parameter</th>
            <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground">Default live</th>
            <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground">Dipakai</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2">
                <div className="text-sm">{r.label}</div>
                <div className="font-mono text-3xs text-muted-foreground">{r.key}</div>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{fmtVal(r.def)}</td>
              <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-warn">{fmtVal(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
