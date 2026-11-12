'use client'

import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Segmented } from '@/components/ui/segmented'
import { ChangedBadge, ParamField, ParamSlider, isChanged } from '@/components/lab/ParamForm'
import { cn } from '@/lib/utils/cn'
import { choiceLabel, paramLabel, paramShortHelp, type ParamFormValue, type ParamFormValues } from '@/lib/lab/form'
import {
  LABEL_STABLE,
  LABEL_UNSTABLE,
  insidePlateau,
  plateauText,
  sidesOf,
  sidesPatch,
  stabilityDetail,
  type Sides,
  type StepParam,
} from '@/lib/lab/importance'
import type { LabParamValue } from '@/lib/api/types/lab'
import type { LabImportance } from '@/lib/api/types/lab-uji'

const SIDES_LABEL: Record<Sides, string> = { both: 'Long & short', long: 'Long saja', short: 'Short saja' }

function valueLabel(key: string, v: LabParamValue): string {
  if (key === 'sides' && (v === 'both' || v === 'long' || v === 'short')) return SIDES_LABEL[v]
  if (typeof v === 'boolean' || v === 'True' || v === 'False') return v === true || v === 'True' ? 'aktif' : 'mati'
  return choiceLabel(key, String(v))
}

function StabilityChip({ row, measured }: { row: StepParam; measured: boolean }) {
  if (!measured) {
    return <span className="inline-flex items-center rounded-full border border-border px-1.5 py-px text-3xs text-muted-foreground">belum diukur</span>
  }
  if (row.label === LABEL_STABLE) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-1.5 py-px text-3xs font-medium text-info">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        penting &amp; stabil
      </span>
    )
  }
  if (row.label === LABEL_UNSTABLE) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-1.5 py-px text-3xs font-medium text-warn">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        penting tapi tidak stabil
      </span>
    )
  }
  return null
}

function InfluenceBar({ row, total }: { row: StepParam; total: number }) {
  if (row.relative === null || !row.importance) return null
  const pct = Math.round(row.relative * 100)
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Pengaruh ${pct}% dari parameter terkuat, peringkat ${row.importance.rank} dari ${total}`}>
      <span className="w-14 shrink-0 text-3xs text-muted-foreground">Pengaruh</span>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-lab" style={{ width: `${pct}%` }} />
      </span>
      <span className="num shrink-0 text-3xs text-muted-foreground">#{row.importance.rank} dari {total}</span>
    </div>
  )
}

function ParamCard({
  row,
  importance,
  values,
  errors,
  onChange,
}: {
  row: StepParam
  importance: LabImportance
  values: ParamFormValues
  errors: Record<string, string>
  onChange: (values: ParamFormValues) => void
}) {
  const measured = importance.source !== 'template'
  const spec = row.specs[0]
  const composite = row.specs.length > 1
  const changed = row.specs.some((s) => isChanged(s, values[s.key]))
  const error = row.specs.map((s) => errors[s.key]).find(Boolean)
  const set = (key: string, v: ParamFormValue) => onChange({ ...values, [key]: v })
  const title = row.key === 'sides' ? 'Arah posisi' : composite ? row.specs.map(paramLabel).join(' + ') : paramLabel(spec)
  const help = row.key === 'sides' ? 'Boleh long, short, atau keduanya.' : paramShortHelp(spec)
  const plateau = plateauText(row.importance, (v) => valueLabel(row.key, v))
  const inside = composite ? null : insidePlateau(row.importance, values[spec.key])
  const detail = row.importance && measured ? stabilityDetail(row.importance, importance) : null

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 transition-colors',
        changed ? 'border-warn/40 bg-warn/5' : row.label === LABEL_UNSTABLE ? 'border-warn/25' : 'border-border',
        error && 'border-bearish/60',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <span className="text-sm font-medium leading-tight">
          {composite ? title : <label htmlFor={`imp-${spec.key}`}>{title}</label>}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          {changed && <ChangedBadge />}
          <StabilityChip row={row} measured={measured} />
        </span>
      </div>
      {help && <p className="text-2xs leading-snug text-muted-foreground">{help}</p>}
      {row.label === LABEL_UNSTABLE && (
        <p className="text-2xs leading-snug text-warn">Berpengaruh, tapi arahnya beda-beda antar koin atau tahun. Ubah hanya kalau ada alasan, lalu uji jujur.</p>
      )}
      <InfluenceBar row={row} total={importance.params.length} />
      <div className="mt-auto pt-1">
        {row.key === 'sides' ? (
          <Segmented<Sides>
            aria-label="Arah posisi"
            size="xs"
            value={sidesOf(values)}
            onChange={(s) => onChange({ ...values, ...sidesPatch(s) })}
            options={(['both', 'long', 'short'] as const).map((s) => ({ value: s, label: SIDES_LABEL[s] }))}
          />
        ) : composite ? (
          <div className="space-y-2">
            {row.specs.map((s) => (
              <ParamField key={s.key} spec={s} value={values[s.key]} error={errors[s.key]} onChange={(v) => set(s.key, v)} idPrefix="imp" />
            ))}
          </div>
        ) : spec.type === 'int' || spec.type === 'float' ? (
          <ParamSlider spec={spec} value={values[spec.key]} error={errors[spec.key]} onChange={(v) => set(spec.key, v)} idPrefix="imp" />
        ) : (
          <ParamField spec={spec} value={values[spec.key]} error={errors[spec.key]} onChange={(v) => set(spec.key, v)} idPrefix="imp" bare />
        )}
      </div>
      {(plateau || detail) && (
        <div className="space-y-0.5 border-t border-border/60 pt-2 text-3xs leading-snug text-muted-foreground">
          {plateau && (
            <p>
              {row.importance?.recommended?.range ? 'Rentang stabil di riset' : 'Pilihan stabil di riset'}:{' '}
              <span className="num font-medium text-foreground">{plateau}</span>
              {inside === false && <span className="text-warn"> · nilai sekarang di luar rentang</span>}
              {inside === true && <span> · nilai sekarang di dalam rentang</span>}
            </p>
          )}
          {detail && <p>{detail}</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Step 2: the 1-5 params that matter (importance), each with an Indonesian label, one line of
 * explanation, an influence bar and its basis. Never changes a value by itself.
 */
export function ImportantParams({
  step,
  importance,
  values,
  errors,
  onChange,
}: {
  step: StepParam[]
  importance: LabImportance
  values: ParamFormValues
  errors: Record<string, string>
  onChange: (values: ParamFormValues) => void
}) {
  if (step.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
        {importance.source === 'template'
          ? 'Strategi ini tidak punya parameter utama. Semua parameter ada di Lanjutan.'
          : `Menurut ${importance.basis}, tidak ada parameter yang terbukti berpengaruh di ${importance.timeframe}. Uji jujur dengan default saja; semua parameter tetap bisa diubah di Lanjutan.`}
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {step.map((row) => (
        <ParamCard key={row.key} row={row} importance={importance} values={values} errors={errors} onChange={onChange} />
      ))}
    </div>
  )
}
