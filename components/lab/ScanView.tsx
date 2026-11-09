'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Loader2, Radar, RefreshCw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { CostInputs } from '@/components/lab/CostInputs'
import { ParamForm } from '@/components/lab/ParamForm'
import { StatusBadge, VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatPercent, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { useCreateLabScan, useLabScan, useLabScans, useLabSymbols, useLabTemplates } from '@/lib/queries/lab'
import {
  DEFAULT_COSTS,
  SCAN_WARN_THRESHOLD,
  buildScanRequest,
  combinationCount,
  initialParamValues,
  isLargeScan,
  isLiveDefault,
  sortScanRows,
  top30Available,
  validateCosts,
  validateParams,
  type CostFormValues,
  type ParamFormValues,
} from '@/lib/lab/form'
import type { LabScanDetail, LabScanMode, LabTemplate } from '@/lib/api/types/lab'

export function ScanView() {
  const router = useRouter()
  const search = useSearchParams()
  const scanId = search.get('id')

  return (
    <div className="space-y-8">
      <ScanBuilder onCreated={(id) => router.push(`/lab/scan?id=${encodeURIComponent(id)}`)} />
      {scanId && <ScanResults id={scanId} />}
      <RecentScans activeId={scanId} />
    </div>
  )
}

function ScanBuilder({ onCreated }: { onCreated: (id: string) => void }) {
  const templatesQ = useLabTemplates()
  const symbolsQ = useLabSymbols()
  const createScan = useCreateLabScan()

  const [templateId, setTemplateId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [tfs, setTfs] = useState<string[]>(['4h'])
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<LabScanMode>('validate')
  const [costs, setCosts] = useState<CostFormValues>({ ...DEFAULT_COSTS })
  const [params, setParams] = useState<ParamFormValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const templates = templatesQ.data ?? []
  const symbols = useMemo(() => symbolsQ.data ?? [], [symbolsQ.data])
  const template: LabTemplate | undefined = templates.find((t) => t.id === templateId) ?? templates[0]

  // Initialise params once a template is known (render-time adjustment).
  if (template && (params === null || templateId !== template.id)) {
    setTemplateId(template.id)
    setParams(initialParamValues(template))
  }

  if (templatesQ.isPending || symbolsQ.isPending) return <Skeleton className="h-96 w-full" />
  const loadErr = templatesQ.error ?? symbolsQ.error
  if (loadErr)
    return (
      <Card className="border-border/60">
        <ErrorPanel
          kind={loadErr instanceof ApiError ? loadErr.kind : 'server'}
          onRetry={() => {
            void templatesQ.refetch()
            void symbolsQ.refetch()
          }}
          messageOverride="Gagal memuat template / symbol dari server Lab."
        />
      </Card>
    )
  if (!template || symbols.length === 0 || !params)
    return (
      <Card className="border-border/60">
        <EmptyPanel message="Backend belum punya template atau daftar symbol." />
      </Card>
    )

  const term = q.trim().toUpperCase()
  const visible = symbols.filter((s) => s.symbol.includes(term))
  const combos = combinationCount(selected.length, tfs.length)
  const large = isLargeScan(combos, mode)
  const top30 = top30Available(symbols.map((s) => s.symbol))
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const submit = () => {
    const errs = { ...validateParams(template, params), ...validateCosts(costs) }
    if (selected.length === 0) errs.symbols = 'Pilih minimal 1 symbol'
    if (tfs.length === 0) errs.timeframes = 'Pilih minimal 1 timeframe'
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      notify.error('Masih ada input yang belum valid')
      return
    }
    createScan.mutate(
      buildScanRequest({
        template,
        symbols: selected,
        timeframes: tfs,
        params: isLiveDefault(template, params) ? null : params,
        costs,
        mode,
      }),
      {
        onSuccess: (res) => {
          notify.success('Scan masuk antrian', { description: `${combos} kombinasi` })
          onCreated(res.scan_id)
        },
        onError: () => notify.error('Gagal membuat scan', { description: 'Server Lab menolak atau tidak bisa dihubungi.' }),
      },
    )
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <Radar className="h-4 w-4 text-violet-400" />
          Scan builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="scan-template" className="text-xs font-medium">Template</label>
            <select
              id="scan-template"
              value={template.id}
              onChange={(e) => {
                const t = templates.find((x) => x.id === e.target.value)
                if (!t) return
                setTemplateId(t.id)
                setParams(initialParamValues(t))
                setTfs((prev) => prev.filter((tf) => t.timeframes.includes(tf)))
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-popover">{t.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium">Mode</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Mode scan">
              {(['validate', 'optimize'] as const).map((m) => (
                <Button key={m} type="button" role="radio" aria-checked={mode === m} variant={mode === m ? 'default' : 'outline'} size="sm" onClick={() => setMode(m)} className="flex-1 capitalize">
                  {m}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium">Timeframe</span>
            <div className="flex flex-wrap gap-1.5">
              {template.timeframes.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  aria-pressed={tfs.includes(tf)}
                  onClick={() => setTfs(toggle(tfs, tf))}
                  className={cn(
                    'rounded-md border px-2.5 py-1 font-mono text-xs cursor-pointer',
                    tfs.includes(tf) ? 'border-violet-500/50 bg-violet-500/15 text-violet-300' : 'border-border/60 text-muted-foreground hover:bg-accent',
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
            {errors.timeframes && <p className="text-[11px] text-rose-400">{errors.timeframes}</p>}
          </div>
        </div>

        {/* Symbols */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium">
              Symbol <span className="font-mono text-muted-foreground">({selected.length} dipilih)</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(top30)} disabled={top30.length === 0}>
                Top 30 ({top30.length})
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(Array.from(new Set([...selected, ...visible.map((s) => s.symbol)])))}>
                Pilih yang tampil
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
                Kosongkan
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari symbol…" className="h-8 pl-8 font-mono text-xs" aria-label="Cari symbol" />
          </div>
          <div className="grid max-h-56 grid-cols-2 gap-1 overflow-auto rounded-lg border border-border/60 p-2 sm:grid-cols-4 lg:grid-cols-6">
            {visible.map((s) => (
              <label key={s.symbol} className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 font-mono text-[11px] hover:bg-accent">
                <input type="checkbox" checked={selected.includes(s.symbol)} onChange={() => setSelected(toggle(selected, s.symbol))} className="accent-violet-500" />
                {s.symbol}
                {!s.has_data && <span className="text-amber-400" title="Belum ada data lokal">•</span>}
              </label>
            ))}
            {visible.length === 0 && <p className="col-span-full py-2 text-center text-xs text-muted-foreground">Symbol tidak ditemukan</p>}
          </div>
          {errors.symbols && <p className="text-[11px] text-rose-400">{errors.symbols}</p>}
        </div>

        <details className="rounded-lg border border-border/60 p-3">
          <summary className="cursor-pointer text-xs font-semibold">
            Parameter {isLiveDefault(template, params) ? '(default live)' : '(sudah diubah)'}
          </summary>
          <div className="mt-3">
            <ParamForm template={template} values={params} errors={errors} onChange={setParams} />
          </div>
        </details>

        <div className="space-y-2">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Biaya trading</h3>
          <CostInputs value={costs} errors={errors} onChange={setCosts} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="font-mono font-bold">{combos}</span> kombinasi ({selected.length} symbol × {tfs.length} timeframe)
            {large && (
              <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Banyak kombinasi (&gt; {SCAN_WARN_THRESHOLD[mode]} untuk {mode}) — bisa makan waktu lama, dan makin banyak yang diuji makin besar peluang ada yang PASS karena kebetulan.
              </p>
            )}
          </div>
          <Button onClick={submit} disabled={createScan.isPending || combos === 0} className="gap-1.5">
            {createScan.isPending ? <Loader2 className="animate-spin" /> : <Radar />}
            Jalankan scan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ScanProgress({ scan }: { scan: LabScanDetail }) {
  const total = scan.progress?.total ?? 0
  const done = scan.progress?.done ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Progress</span>
        <span className="font-mono">
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ScanResults({ id }: { id: string }) {
  const { data: scan, isPending, error, refetch, isFetching } = useLabScan(id)
  const rows = useMemo(() => sortScanRows(scan?.rows ?? []), [scan?.rows])

  return (
    <Card className="border-border/60">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          Hasil scan <span className="font-mono text-xs font-normal text-muted-foreground">{id}</span>
          {scan && <StatusBadge status={scan.status} />}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : error || !scan ? (
          <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat hasil scan." />
        ) : (
          <>
            <ScanProgress scan={scan} />
            {rows.length === 0 ? (
              <EmptyPanel message="Belum ada hasil. Baris muncul seiring kombinasi selesai." />
            ) : (
              <div className="max-h-[560px] overflow-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {['Market', 'Status', 'Verdict', 'OOS PF', 'OOS return', 'OOS max DD', 'Trades', ''].map((h) => (
                        <TableHead key={h} className="text-[11px] uppercase">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={`${r.symbol}-${r.timeframe}`}>
                        <TableCell className="py-2 font-mono text-xs font-semibold">
                          {r.symbol} <span className="text-muted-foreground">{r.timeframe}</span>
                        </TableCell>
                        <TableCell className="py-2"><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="py-2"><VerdictBadge verdict={r.verdict} /></TableCell>
                        <TableCell className="py-2 font-mono text-xs tabular-nums">{formatScore(r.oos_profit_factor)}</TableCell>
                        <TableCell className={`py-2 font-mono text-xs tabular-nums ${signClass(r.oos_net_return_pct)}`}>{formatPercent(r.oos_net_return_pct)}</TableCell>
                        <TableCell className="py-2 font-mono text-xs tabular-nums text-bearish">
                          {r.oos_max_dd_pct === null || r.oos_max_dd_pct === undefined ? '—' : `${formatScore(Math.abs(r.oos_max_dd_pct))}%`}
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs tabular-nums">{valueOrDash(r.trades)}</TableCell>
                        <TableCell className="py-2 text-right">
                          {r.run_id ? (
                            <Link href={`/lab/runs/${encodeURIComponent(r.run_id)}`} className="text-xs text-sky-400 hover:underline">
                              Detail →
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RecentScans({ activeId }: { activeId: string | null }) {
  const { data, isPending, error, refetch } = useLabScans()
  const scans = data ?? []
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider">Scan sebelumnya</h2>
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat daftar scan." />
      ) : scans.length === 0 ? (
        <EmptyPanel message="Belum ada scan." />
      ) : (
        <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
          {scans.map((s) => (
            <li key={s.id}>
              <Link
                href={`/lab/scan?id=${encodeURIComponent(s.id)}`}
                className={cn('flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs hover:bg-accent/50', s.id === activeId && 'bg-accent/60')}
              >
                <span className="font-mono">{s.id}</span>
                <span className="flex items-center gap-3">
                  {s.mode && <span className="text-muted-foreground">{s.mode}</span>}
                  {s.created_at && <span className="font-mono text-muted-foreground">{formatTimestamp(s.created_at)}</span>}
                  <span className="font-mono">
                    {s.progress?.done ?? 0}/{s.progress?.total ?? 0}
                  </span>
                  <StatusBadge status={s.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
