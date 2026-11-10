'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, Eyebrow, Section } from '@/components/lab/Section'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { notify } from '@/lib/utils/toast'
import { formatTimestamp } from '@/lib/utils/format'
import { useCreateUniversalRun, useUniversalSchema } from '@/lib/queries/universal'
import type { LabRunMode, LabParamValue } from '@/lib/api/types/lab'
import type { UniversalParamSpec, UniversalParams } from '@/lib/api/types/universal'

type FormValues = Record<string, string | boolean>

export function toForm(params: UniversalParamSpec[], values: Record<string, unknown>): FormValues {
  const out: FormValues = {}
  for (const p of params) {
    const v = values[p.key] ?? p.default
    out[p.key] = p.type === 'bool' ? Boolean(v) : String(v)
  }
  return out
}

/** Form strings -> typed params; returns per-key errors (Indonesian). */
export function parseUniversalForm(params: UniversalParamSpec[], f: FormValues): { params: UniversalParams; errors: Record<string, string> } {
  const out: UniversalParams = {}
  const errors: Record<string, string> = {}
  for (const p of params) {
    const raw = f[p.key]
    if (p.type === 'bool') {
      out[p.key] = Boolean(raw)
      continue
    }
    if (p.type === 'choice') {
      out[p.key] = String(raw)
      continue
    }
    const n = Number(String(raw).replace(',', '.'))
    if (String(raw).trim() === '' || !Number.isFinite(n)) {
      errors[p.key] = 'Harus angka'
      continue
    }
    if (p.type === 'int' && !Number.isInteger(n)) {
      errors[p.key] = 'Harus bilangan bulat'
      continue
    }
    if (p.min !== null && p.min !== undefined && n < p.min) errors[p.key] = `Minimal ${p.min}`
    else if (p.max !== null && p.max !== undefined && n > p.max) errors[p.key] = `Maksimal ${p.max}`
    out[p.key] = n as LabParamValue
  }
  const s = out.mom_short_days as number, m = out.mom_mid_days as number, l = out.mom_long_days as number
  if (!errors.mom_mid_days && !errors.mom_long_days && !(s < m && m < l)) errors.mom_mid_days = 'Harus pendek < menengah < panjang'
  return { params: out, errors }
}

const MODES: { id: LabRunMode; label: string; help: string }[] = [
  { id: 'validate', label: 'Validasi (rapor jujur)', help: 'Holdout terkunci + walk-forward + Monte Carlo + biaya 2×. ±30 detik.' },
  { id: 'backtest', label: 'Backtest cepat', help: 'Seluruh periode, tanpa rapor. Bukan bukti.' },
  { id: 'optimize', label: 'Optimize', help: 'Cari parameter di data pengembangan saja, lalu uji sekali di holdout. Risiko overfitting.' },
]

export function UniversalBuilder() {
  const router = useRouter()
  const schema = useUniversalSchema()
  const create = useCreateUniversalRun()
  const [values, setValues] = useState<FormValues | null>(null)
  const [mode, setMode] = useState<LabRunMode>('validate')
  const [trials, setTrials] = useState(30)
  const [costs, setCosts] = useState({ commission_pct: '0.05', slippage_pct: '0.05', funding: true })

  const specs = useMemo(() => schema.data?.params ?? [], [schema.data])
  const form = values ?? (schema.data ? toForm(specs, schema.data.defaults) : null)
  const groups = useMemo(() => {
    const g: { name: string; items: UniversalParamSpec[] }[] = []
    for (const p of specs) {
      const last = g.find((x) => x.name === p.group)
      if (last) last.items.push(p)
      else g.push({ name: p.group, items: [p] })
    }
    return g
  }, [specs])

  if (schema.isPending) return <Skeleton className="h-96 w-full rounded-xl" />
  if (schema.error || !schema.data || !form) {
    return <ErrorPanel kind={schema.error instanceof ApiError ? schema.error.kind : 'server'} onRetry={() => schema.refetch()} messageOverride="Gagal memuat skema Universal v0." />
  }
  const { params, errors } = parseUniversalForm(specs, form)
  const commission = Number(costs.commission_pct)
  const slippage = Number(costs.slippage_pct)
  const costErr = !(commission >= 0 && commission <= 1) || !(slippage >= 0 && slippage <= 2)
  const set = (k: string, v: string | boolean) => setValues({ ...form, [k]: v })
  const lock = schema.data.holdout_lock

  const submit = () => {
    if (Object.keys(errors).length || costErr) return
    create.mutate(
      {
        params,
        costs: { commission_pct: commission, slippage_pct: slippage, funding: costs.funding },
        mode,
        ...(mode === 'optimize' ? { n_trials: trials } : {}),
      },
      {
        onSuccess: (r) => router.push(`/lab/universal/runs/${encodeURIComponent(String(r.run_id))}`),
        onError: (e) => notify.error('Run ditolak server', { description: apiErrorDetail(e) ?? 'Server Lab tidak bisa dihubungi.' }),
      },
    )
  }

  return (
    <Section
      title="Uji Universal v0"
      description={`Satu aturan untuk ${schema.data.universe.length} koin perp yang datanya tersedia. Semua biaya (fee, slippage, funding) ikut dihitung.`}
      action={
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setValues(null)}>
          <RotateCcw className="h-3.5 w-3.5" />
          Default
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Eyebrow>Mode</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)} title={m.help}>{m.label}</Chip>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{MODES.find((m) => m.id === mode)?.help}</p>
          {mode === 'optimize' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Percobaan:</span>
              {[10, 30, 60].map((n) => <Chip key={n} active={trials === n} onClick={() => setTrials(n)} className="h-7 px-2.5">{n}</Chip>)}
            </div>
          )}
          {lock && mode !== 'backtest' && (
            <p className="flex items-center gap-1.5 text-xs text-lab">
              <Lock className="h-3.5 w-3.5" />
              Holdout terkunci mulai {formatTimestamp(lock.holdout_start).slice(0, 10)} · sudah dilihat {lock.touches}×
            </p>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => (
            <fieldset key={g.name} className="space-y-3 rounded-lg border border-border/60 p-3">
              <legend className="px-1 text-xs font-semibold">{g.name}</legend>
              {g.items.map((p) => (
                <div key={p.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5">
                  <Label htmlFor={`u-${p.key}`} className="text-xs font-normal" title={p.help}>{p.label}</Label>
                  {p.type === 'bool' ? (
                    <Switch id={`u-${p.key}`} checked={Boolean(form[p.key])} onCheckedChange={(v) => set(p.key, v)} />
                  ) : p.type === 'choice' ? (
                    <div className="flex gap-1">
                      {(p.choices ?? []).map((c) => (
                        <Chip key={c} active={form[p.key] === c} onClick={() => set(p.key, c)} className="h-7 px-2.5 font-mono">{c}</Chip>
                      ))}
                    </div>
                  ) : (
                    <Input id={`u-${p.key}`} inputMode="decimal" value={String(form[p.key])} onChange={(e) => set(p.key, e.target.value)}
                      aria-invalid={Boolean(errors[p.key])} className="h-8 w-24 text-right font-mono text-xs" />
                  )}
                  {(errors[p.key] || p.help) && (
                    <p className={errors[p.key] ? 'col-span-2 text-[11px] text-bearish' : 'col-span-2 text-[11px] text-muted-foreground'}>{errors[p.key] ?? p.help}</p>
                  )}
                </div>
              ))}
            </fieldset>
          ))}
          <fieldset className="space-y-3 rounded-lg border border-border/60 p-3">
            <legend className="px-1 text-xs font-semibold">Biaya</legend>
            {(['commission_pct', 'slippage_pct'] as const).map((k) => (
              <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <Label htmlFor={`u-${k}`} className="text-xs font-normal">{k === 'commission_pct' ? 'Fee per sisi (%)' : 'Slippage per sisi (%)'}</Label>
                <Input id={`u-${k}`} inputMode="decimal" value={costs[k]} onChange={(e) => setCosts({ ...costs, [k]: e.target.value })} className="h-8 w-24 text-right font-mono text-xs" />
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <Label htmlFor="u-funding" className="text-xs font-normal">Hitung funding</Label>
              <Switch id="u-funding" checked={costs.funding} onCheckedChange={(v) => setCosts({ ...costs, funding: v })} />
            </div>
            {costErr && <p className="text-[11px] text-bearish">Fee 0–1%, slippage 0–2%.</p>}
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={create.isPending || Object.keys(errors).length > 0 || costErr}>
            <Play />
            {create.isPending ? 'Mengirim…' : mode === 'validate' ? 'Jalankan validasi' : mode === 'optimize' ? 'Jalankan optimize' : 'Jalankan backtest'}
          </Button>
          <p className="text-xs text-muted-foreground">Paper/riset saja — tidak ada order nyata.</p>
        </div>
      </div>
    </Section>
  )
}
