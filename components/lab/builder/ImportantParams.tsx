'use client'

import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Segmented } from '@/components/ui/segmented'
import { InfoTip } from '@/components/ui/info-tip'
import { ChangedBadge, ParamField, ParamSlider, isChanged } from '@/components/lab/ParamForm'
import { cn } from '@/lib/utils/cn'
import { formatNumber } from '@/lib/utils/format'
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

/** Influence like the research deck (slide 10): a thick bar and the share in %. */
function InfluenceBar({ pct, scale, tone }: { pct: number; scale: number; tone: 'stable' | 'unstable' | 'none' }) {
  const w = Math.max(3, Math.min(100, (pct / scale) * 100))
  return (
    <div className="flex items-center gap-3" role="img" aria-label={`Pengaruh ${formatNumber(pct, { digits: 1 })}% dari variasi hasil`}>
      <span className="w-16 shrink-0 text-[13px] text-muted-foreground" aria-hidden="true">Pengaruh</span>
      <span className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/70" aria-hidden="true">
        <span
          className={cn('block h-full rounded-full', tone === 'stable' ? 'bg-info' : tone === 'unstable' ? 'bg-warn' : 'bg-muted-foreground/40')}
          style={{ width: `${w}%` }}
        />
      </span>
      <span className="num w-14 shrink-0 text-right text-base font-bold" aria-hidden="true">{formatNumber(pct, { digits: 1 })}%</span>
    </div>
  )
}

function StabilityChip({ row, importance }: { row: StepParam; importance: LabImportance }) {
  if (importance.source === 'template') {
    return <span className="inline-flex h-7 items-center rounded-full border border-border px-3 text-[13px] text-muted-foreground">belum diukur</span>
  }
  const detail = row.importance ? stabilityDetail(row.importance, importance) : null
  const stable = row.label === LABEL_STABLE
  if (!stable && row.label !== LABEL_UNSTABLE) return null
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold',
          stable ? 'border-info/40 bg-info/10 text-info' : 'border-warn/40 bg-warn/10 text-warn',
        )}
      >
        {stable ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
        {stable ? 'stabil' : 'tidak stabil'}
      </span>
      <InfoTip title={stable ? 'Penting & stabil' : 'Penting tapi tidak stabil'} align="end">
        {stable
          ? 'Berpengaruh di sebagian besar koin dan tahun uji.'
          : 'Berpengaruh, tapi arahnya beda-beda antar koin atau tahun. Ubah hanya kalau ada alasan, lalu uji jujur.'}
        {detail && <span className="mt-1 block">{detail}.</span>}
      </InfoTip>
    </span>
  )
}

function ParamCard({
  row,
  importance,
  scale,
  values,
  errors,
  onChange,
}: {
  row: StepParam
  importance: LabImportance
  scale: number
  values: ParamFormValues
  errors: Record<string, string>
  onChange: (values: ParamFormValues) => void
}) {
  const spec = row.specs[0]
  const composite = row.specs.length > 1
  const changed = row.specs.some((s) => isChanged(s, values[s.key]))
  const error = row.specs.map((s) => errors[s.key]).find(Boolean)
  const set = (key: string, v: ParamFormValue) => onChange({ ...values, [key]: v })
  const title = row.key === 'sides' ? 'Arah posisi' : composite ? row.specs.map(paramLabel).join(' + ') : paramLabel(spec)
  const help = row.key === 'sides' ? 'Boleh long, short, atau keduanya.' : paramShortHelp(spec)
  const range = row.importance?.recommended?.range ?? null
  const numeric = !composite && (spec.type === 'int' || spec.type === 'float')
  const choicePlateau = !range ? plateauText(row.importance, (v) => valueLabel(row.key, v)) : null
  const pct = row.importance?.score !== null && row.importance?.score !== undefined ? row.importance.score * 100 : null
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-background/40 p-5 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg',
        changed ? 'border-warn/50' : row.label === LABEL_UNSTABLE ? 'border-warn/25' : 'border-border',
        error && 'border-bearish/60',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug">
            {composite ? title : <label htmlFor={`imp-${spec.key}`}>{title}</label>}
          </p>
          {help && <p className="line-clamp-1 text-sm text-muted-foreground">{help}</p>}
        </div>
        <span className="flex flex-wrap items-center gap-1.5">
          {changed && <ChangedBadge className="px-2 py-0.5 text-[13px]" />}
          <StabilityChip row={row} importance={importance} />
        </span>
      </div>

      {pct !== null && importance.source !== 'template' && (
        <InfluenceBar pct={pct} scale={scale} tone={row.label === LABEL_STABLE ? 'stable' : row.label === LABEL_UNSTABLE ? 'unstable' : 'none'} />
      )}

      <div>
        {row.key === 'sides' ? (
          <Segmented<Sides>
            aria-label="Arah posisi"
            value={sidesOf(values)}
            onChange={(s) => onChange({ ...values, ...sidesPatch(s) })}
            options={(['both', 'long', 'short'] as const).map((s) => ({ value: s, label: SIDES_LABEL[s] }))}
          />
        ) : composite ? (
          <div className="space-y-3">
            {row.specs.map((s) => (
              <ParamField key={s.key} spec={s} value={values[s.key]} error={errors[s.key]} onChange={(v) => set(s.key, v)} idPrefix="imp" />
            ))}
          </div>
        ) : numeric ? (
          <ParamSlider spec={spec} value={values[spec.key]} error={errors[spec.key]} onChange={(v) => set(spec.key, v)} idPrefix="imp" safe={range} />
        ) : (
          <ParamField spec={spec} value={values[spec.key]} error={errors[spec.key]} onChange={(v) => set(spec.key, v)} idPrefix="imp" bare />
        )}
      </div>

      {choicePlateau && (
        <p className="text-sm text-muted-foreground">
          Paling stabil di riset: <span className="font-semibold text-foreground">{choicePlateau}</span>
          {insidePlateau(row.importance, values[spec.key]) === false && <span className="text-warn"> · nilai sekarang di luar</span>}
        </p>
      )}
    </div>
  )
}

/**
 * Step 2: the 1-5 params that matter (importance), each a big card: name, one line, the influence
 * bar (research deck style), the control and the safe range. Never changes a value by itself.
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
      <p className="rounded-2xl border border-dashed px-5 py-6 text-base text-muted-foreground">
        {importance.source === 'template'
          ? 'Strategi ini tidak punya parameter utama. Semua parameter ada di Lanjutan.'
          : `Menurut ${importance.basis}, tidak ada parameter yang terbukti berpengaruh di ${importance.timeframe}. Uji jujur dengan default saja.`}
      </p>
    )
  }
  // Same axis idea as the research deck: 0 to the strongest shown share, rounded up to 10 %.
  const top = Math.max(0, ...step.map((r) => (r.importance?.score ?? 0) * 100))
  const scale = Math.max(10, Math.ceil(top / 10) * 10)
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {step.map((row) => (
        <ParamCard key={row.key} row={row} importance={importance} scale={scale} values={values} errors={errors} onChange={onChange} />
      ))}
    </div>
  )
}
