'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Grid3X3, Loader2, Radar, RefreshCw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { CostDisclosure } from '@/components/lab/CostInputs'
import { ParamForm } from '@/components/lab/ParamForm'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { RunStateChip, StatusBadge, signClass } from '@/components/lab/LabBadges'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { useCreateLabScan, useLabScan, useLabScans, useLabSymbols, useLabTemplates } from '@/lib/queries/lab'
import {
  DEFAULT_COSTS,
  MAJORS,
  MEMES,
  SCAN_WARN_THRESHOLD,
  TRIAL_OPTIONS,
  buildScanRequest,
  changedKeys,
  combinationCount,
  estimateMinutes,
  initialParamValues,
  isLargeScan,
  isLiveDefault,
  pickAvailable,
  relativeTime,
  sortScanRows,
  topN,
  validateCosts,
  validateParams,
  type CostFormValues,
  type ParamFormValues,
  type TrialCount,
} from '@/lib/lab/form'
import type { LabId, LabScanDetail, LabScanMode, LabScanRow, LabTemplate } from '@/lib/api/types/lab'

export function ScanView() {
  const router = useRouter()
  const search = useSearchParams()
  const scanId = search.get('id')

  return (
    <div className="space-y-6">
      <ScanBuilder onCreated={(id) => router.push(`/lab/scan?id=${encodeURIComponent(String(id))}`)} />
      {scanId && <ScanResults id={scanId} />}
      <RecentScans activeId={scanId} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function ScanBuilder({ onCreated }: { onCreated: (id: LabId) => void }) {
  const templatesQ = useLabTemplates()
  const symbolsQ = useLabSymbols()
  const createScan = useCreateLabScan()

  const [templateId, setTemplateId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [tfs, setTfs] = useState<string[]>(['4h'])
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<LabScanMode>('validate')
  const [nTrials, setNTrials] = useState<TrialCount>(30)
  const [costs, setCosts] = useState<CostFormValues>({ ...DEFAULT_COSTS })
  const [params, setParams] = useState<ParamFormValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const templates = templatesQ.data ?? []
  const symbols = useMemo(() => symbolsQ.data ?? [], [symbolsQ.data])
  const template: LabTemplate | undefined = templates.find((t) => t.id === templateId) ?? templates[0]

  // Initialise params once a template is known (render-time adjustment).
  if (template && (params === null || templateId !== template.id)) {
    setTemplateId(template.id)
    setParams(initialParamValues(template))
  }

  if (templatesQ.isPending || symbolsQ.isPending) return <Skeleton className="h-96 w-full rounded-xl" />
  const loadErr = templatesQ.error ?? symbolsQ.error
  if (loadErr)
    return (
      <Section>
        <ErrorPanel
          kind={loadErr instanceof ApiError ? loadErr.kind : 'server'}
          onRetry={() => {
            void templatesQ.refetch()
            void symbolsQ.refetch()
          }}
          messageOverride="Gagal memuat template / daftar koin dari server Lab."
        />
      </Section>
    )
  if (!template || symbols.length === 0 || !params)
    return (
      <Section>
        <EmptyState title="Belum ada template atau daftar koin" description="Server Lab belum mengirim data ini." />
      </Section>
    )

  const names = symbols.map((s) => s.symbol)
  const term = q.trim().toUpperCase()
  const visible = symbols.filter((s) => s.symbol.includes(term))
  const combos = combinationCount(selected.length, tfs.length)
  const large = isLargeScan(combos, mode)
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const presets: { label: string; list: string[] }[] = [
    { label: 'Top 10', list: topN(names, 10) },
    { label: `Top ${Math.min(29, names.length)}`, list: topN(names, 29) },
    { label: 'Majors', list: pickAvailable(MAJORS, names) },
    { label: 'Meme', list: pickAvailable(MEMES, names) },
  ].filter((p) => p.list.length > 0)
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
  const changed = changedKeys(template, params).length

  const submit = () => {
    const errs = { ...validateParams(template, params), ...validateCosts(costs) }
    if (selected.length === 0) errs.symbols = 'Pilih minimal 1 koin'
    if (tfs.length === 0) errs.timeframes = 'Pilih minimal 1 timeframe'
    setErrors(errs)
    setSubmitError(null)
    if (Object.keys(errs).length > 0) {
      notify.error('Masih ada input yang belum valid')
      return
    }
    createScan.mutate(
      buildScanRequest({ template, symbols: selected, timeframes: tfs, params: isLiveDefault(template, params) ? null : params, costs, mode, nTrials }),
      {
        onSuccess: (res) => {
          notify.success('Scan masuk antrian', { description: `${combos} kombinasi` })
          onCreated(res.scan_id)
        },
        onError: (err) => {
          const d = apiErrorDetail(err)
          setSubmitError(d ?? 'Server Lab menolak atau tidak bisa dihubungi.')
          notify.error('Gagal membuat scan', { description: d ?? undefined })
        },
      },
    )
  }

  return (
    <Section title="Atur scan" icon={<Radar className="h-4 w-4 text-lab" />} description="Uji strategi yang sama di banyak koin × timeframe sekaligus.">
      <div className="space-y-5">
        {/* Symbols */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">
              Koin <span className="font-mono text-muted-foreground">({selected.length} dipilih)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Chip key={p.label} active={sameSet(selected, p.list)} onClick={() => setSelected(p.list)} className="h-7 px-2.5">
                  {p.label}
                </Chip>
              ))}
              {selected.length > 0 && (
                <Chip onClick={() => setSelected([])} className="h-7 px-2.5">
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
                  onClick={() => setSelected(toggle(selected, s.symbol))}
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
          {errors.symbols && <p className="text-2xs text-bearish">{errors.symbols}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Timeframe</span>
            <div className="flex flex-wrap gap-1.5">
              {template.timeframes.map((tf) => (
                <Chip key={tf} active={tfs.includes(tf)} onClick={() => setTfs(toggle(tfs, tf))} className="min-w-12 font-mono">
                  {tf}
                </Chip>
              ))}
            </div>
            {errors.timeframes && <p className="text-2xs text-bearish">{errors.timeframes}</p>}
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium">Mode</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Mode scan">
              <Chip active={mode === 'validate'} onClick={() => setMode('validate')}>Validasi</Chip>
              <Chip active={mode === 'optimize'} onClick={() => setMode('optimize')}>Cari parameter terbaik</Chip>
            </div>
            {mode === 'optimize' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-2xs text-muted-foreground">Percobaan per kombinasi:</span>
                {TRIAL_OPTIONS.map((n) => (
                  <Chip key={n} active={nTrials === n} onClick={() => setNTrials(n)} className="h-7 px-2.5">
                    {n} <span className="text-3xs opacity-70">±{estimateMinutes(n)} mnt</span>
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </div>

        <CostDisclosure value={costs} errors={errors} onChange={setCosts} />

        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-xs font-medium">Parameter</span>
              <span className="block text-2xs text-muted-foreground">{changed === 0 ? 'Default live ETH 4H' : `${changed} diubah dari default live`}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-3 pb-3">
            <ParamForm template={template} values={params} errors={errors} onChange={setParams} />
          </div>
        </details>

        <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="font-mono text-lg font-bold">{combos}</span> kombinasi{' '}
            <span className="text-muted-foreground">({selected.length} koin × {tfs.length} timeframe)</span>
            {mode === 'optimize' && combos > 0 && (
              <span className="block text-2xs text-muted-foreground">Perkiraan ±{estimateMinutes(nTrials) * combos} mnt total kalau dijalankan berurutan.</span>
            )}
            {large && (
              <p role="alert" className="mt-1 flex items-start gap-1.5 text-xs text-warn">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                Banyak kombinasi (&gt; {SCAN_WARN_THRESHOLD[mode]}): lama, dan makin banyak yang diuji makin besar peluang ada yang LOLOS karena kebetulan.
              </p>
            )}
            {submitError && <p role="alert" className="mt-1 text-xs text-bearish">{submitError}</p>}
          </div>
          <Button onClick={submit} disabled={createScan.isPending || combos === 0} className="gap-1.5 sm:min-w-40">
            {createScan.isPending ? <Loader2 className="animate-spin" /> : <Radar />}
            Jalankan scan
          </Button>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function ScanProgress({ scan }: { scan: LabScanDetail }) {
  const total = scan.progress?.total ?? 0
  const done = scan.progress?.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-2xs text-muted-foreground">
        <span>{scan.status === 'done' ? 'Selesai' : 'Progress'}</span>
        <span className="font-mono">
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="h-full rounded-full bg-lab transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Diverging buckets around PF = 1 (neutral grey midpoint). */
export function pfBucket(pf: number | null | undefined): number | null {
  if (pf === null || pf === undefined || !Number.isFinite(pf)) return null
  if (pf < 0.8) return -2
  if (pf < 1) return -1
  if (pf < 1.2) return 0
  if (pf < 1.6) return 1
  return 2
}

const BUCKET_CLASS: Record<number, string> = {
  [-2]: 'bg-bearish/35',
  [-1]: 'bg-bearish/15',
  0: 'bg-muted/70',
  1: 'bg-bullish/20',
  2: 'bg-bullish/40',
}

function ScanHeatmap({ rows }: { rows: LabScanRow[] }) {
  const symbols = Array.from(new Set(rows.map((r) => r.symbol)))
  const tfs = Array.from(new Set(rows.map((r) => r.timeframe)))
  const at = (s: string, tf: string) => rows.find((r) => r.symbol === s && r.timeframe === tf)
  return (
    <div className="space-y-2">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="border-separate border-spacing-1 text-xs" aria-label="Heatmap profit factor holdout">
          <thead>
            <tr>
              <th />
              {tfs.map((tf) => (
                <th key={tf} className="px-1 pb-1 text-center font-mono text-2xs font-medium text-muted-foreground">{tf}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((s) => (
              <tr key={s}>
                <th scope="row" className="pr-2 text-left font-mono text-2xs font-semibold">{s.replace(/USDT$/, '')}</th>
                {tfs.map((tf) => {
                  const r = at(s, tf)
                  if (!r) return <td key={tf} className="h-12 w-20 rounded-md bg-muted/20" />
                  const b = r.status === 'done' ? pfBucket(r.oos_profit_factor) : null
                  const content = (
                    <div className="flex h-12 w-20 flex-col items-center justify-center gap-0.5 sm:w-24">
                      {r.status !== 'done' ? (
                        <span className="text-3xs text-muted-foreground">{r.status === 'running' ? 'jalan…' : r.status === 'queued' ? 'antri' : r.status}</span>
                      ) : (
                        <>
                          <span className="font-mono text-sm font-bold tabular-nums">{formatScore(r.oos_profit_factor)}</span>
                          {r.verdict === 'PASS' ? (
                            <span className="rounded bg-bullish px-1 text-3xs font-bold leading-4 text-bullish-foreground">LOLOS</span>
                          ) : (
                            <span className="text-3xs text-muted-foreground">PF</span>
                          )}
                        </>
                      )}
                    </div>
                  )
                  return (
                    <td key={tf} className={cn('rounded-md p-0 transition-opacity', b !== null ? BUCKET_CLASS[b] : 'bg-muted/30', r.verdict === 'PASS' && 'ring-2 ring-bullish/60')}>
                      {r.run_id !== null && r.run_id !== undefined ? (
                        <Link href={`/lab/runs/${encodeURIComponent(String(r.run_id))}`} className="block rounded-md hover:opacity-80" title={`${s} ${tf} — PF holdout ${formatScore(r.oos_profit_factor)}`}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground" aria-label="Legenda">
        <span>PF holdout:</span>
        {[
          [-2, '< 0.8'],
          [-1, '0.8–1'],
          [0, '1–1.2'],
          [1, '1.2–1.6'],
          [2, '≥ 1.6'],
        ].map(([b, l]) => (
          <span key={l} className="flex items-center gap-1">
            <span className={cn('inline-block h-3 w-4 rounded-sm', BUCKET_CLASS[b as number])} aria-hidden="true" />
            {l}
          </span>
        ))}
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded-sm ring-2 ring-bullish/60" aria-hidden="true" />LOLOS</span>
      </div>
    </div>
  )
}

type SortKey = 'default' | 'symbol' | 'pf' | 'net' | 'dd' | 'trades'

export function sortScanTable(rows: LabScanRow[], key: SortKey, desc: boolean): LabScanRow[] {
  if (key === 'default') return sortScanRows(rows)
  const val = (r: LabScanRow): number | string | null =>
    key === 'symbol' ? `${r.symbol} ${r.timeframe}` : key === 'pf' ? r.oos_profit_factor : key === 'net' ? r.oos_net_return_pct : key === 'dd' ? r.oos_max_dd_pct : r.trades
  return [...rows].sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    const c = typeof va === 'string' ? va.localeCompare(String(vb)) : va - (vb as number)
    return desc ? -c : c
  })
}

function ScanTable({ rows }: { rows: LabScanRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'default', desc: true })
  const sorted = useMemo(() => sortScanTable(rows, sort.key, sort.desc), [rows, sort])
  const head = (key: SortKey, label: string, right = true) => (
    <th className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', right ? 'text-right' : 'text-left')}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
      >
        {label}
        {sort.key === key ? sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  )
  return (
    <div className="-mx-4 max-h-[560px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr>
            {head('symbol', 'Koin', false)}
            <th className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              <button type="button" className="hover:text-foreground cursor-pointer" onClick={() => setSort({ key: 'default', desc: true })}>
                Hasil {sort.key === 'default' && '↓'}
              </button>
            </th>
            {head('pf', 'PF holdout')}
            {head('net', 'Return holdout')}
            {head('dd', 'Max DD')}
            {head('trades', 'Trade')}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map((r) => (
            <tr key={`${r.symbol}-${r.timeframe}`} className="hover:bg-accent/40">
              <td className="px-3 py-2">
                {r.run_id !== null && r.run_id !== undefined ? (
                  <Link href={`/lab/runs/${encodeURIComponent(String(r.run_id))}`} className="font-mono text-xs font-semibold hover:underline">
                    {r.symbol} <span className="text-muted-foreground">{r.timeframe}</span>
                  </Link>
                ) : (
                  <span className="font-mono text-xs font-semibold">{r.symbol} <span className="text-muted-foreground">{r.timeframe}</span></span>
                )}
              </td>
              <td className="px-3 py-2"><RunStateChip status={r.status} verdict={r.verdict} mode="validate" /></td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{formatScore(r.oos_profit_factor)}</td>
              <td className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', signClass(r.oos_net_return_pct))}>{formatPercent(r.oos_net_return_pct, 1)}</td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-bearish">
                {r.oos_max_dd_pct === null || r.oos_max_dd_pct === undefined ? '—' : `−${formatScore(Math.abs(r.oos_max_dd_pct), 1)}%`}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{valueOrDash(r.trades)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScanResults({ id }: { id: string }) {
  const { data: scan, isPending, error, refetch, isFetching } = useLabScan(id)
  const rows = scan?.rows ?? []
  const passes = rows.filter((r) => r.verdict === 'PASS').length

  return (
    <Section
      title={<>Hasil scan <span className="font-mono text-xs font-normal text-muted-foreground">#{id}</span></>}
      icon={<Grid3X3 className="h-4 w-4 text-lab" />}
      description={scan ? `${passes} dari ${rows.length} kombinasi LOLOS · diurutkan LOLOS dulu, lalu PF holdout.` : undefined}
      action={
        <>
          {scan && <StatusBadge status={scan.status} />}
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </>
      }
    >
      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : error || !scan ? (
        <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat hasil scan." />
      ) : (
        <div className="space-y-5">
          {scan.status !== 'done' && <ScanProgress scan={scan} />}
          {rows.length === 0 ? (
            <EmptyState title="Belum ada hasil" description="Baris muncul seiring kombinasi selesai diuji." />
          ) : (
            <div className="grid items-start gap-5 xl:grid-cols-[auto_minmax(0,1fr)]">
              <ScanHeatmap rows={rows} />
              <ScanTable rows={rows} />
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

function RecentScans({ activeId }: { activeId: string | null }) {
  const { data, isPending, error, refetch } = useLabScans()
  const scans = data ?? []
  return (
    <Section title="Scan sebelumnya">
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat daftar scan." />
      ) : scans.length === 0 ? (
        <EmptyState title="Belum ada scan" description="Pilih koin dan timeframe di atas, lalu klik Jalankan scan." />
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border">
          {scans.map((s) => {
            const passes = (s.rows ?? []).filter((r) => r.verdict === 'PASS').length
            return (
              <li key={String(s.id)}>
                <Link
                  href={`/lab/scan?id=${encodeURIComponent(String(s.id))}`}
                  className={cn('flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs hover:bg-accent/50', String(s.id) === activeId && 'bg-accent/60')}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-semibold">#{String(s.id)}</span>
                    {s.mode && <span className="text-muted-foreground">{s.mode === 'optimize' ? 'Optimize' : 'Validasi'}</span>}
                    {s.created_at && <span className="text-muted-foreground" title={formatTimestamp(s.created_at)}>{relativeTime(s.created_at)}</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">{s.progress?.done ?? 0}/{s.progress?.total ?? 0}</span>
                    {passes > 0 && <span className="font-semibold text-bullish">{passes} LOLOS</span>}
                    <StatusBadge status={s.status} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
