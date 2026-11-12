'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Bookmark, CheckCircle2, ClipboardCheck, Columns3, LineChart, Plus, Table2, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { ErrorState } from '@/components/shell/states'
import { EmptyState } from '@/components/lab/Section'
import { Panel, StrategyChip, VerdictPill } from '@/components/lab/run/v2-ui'
import { MODE_COPY, STATUS_COPY } from '@/components/lab/run/copy'
import { COMPARE_COLORS, CompareEquityChart, type CompareSeries } from '@/components/lab/compare/CompareEquityChart'
import { useTheme } from 'next-themes'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { formatDate } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { checkLabel, checkReason, checkValueText, templateShort } from '@/lib/lab/form'
import { snoopingWarning } from '@/lib/lab/timeframes'
import { MAX_COMPARE, bestIndex, compareHref, compareRows, normaliseEquity, parseCompareIds, type CompareMetricRow } from '@/lib/lab/planning'
import { useLabRuns } from '@/lib/queries/lab'
import { useCompareRuns } from '@/lib/queries/lab-insights'
import type { LabCheck, LabRunDetail } from '@/lib/api/types/lab'

function fmt(row: CompareMetricRow, v: number | null): string {
  if (v === null) return '—'
  const k = row.key.split('.')[1]
  if (k === 'max_dd_pct') return formatPct(-Math.abs(v))
  if (k === 'net_return_pct') return formatPct(v, { signed: true })
  if (k === 'cost_drag_pct') return `${formatNumber(v, { digits: 1 })} poin %`
  if (k === 'trades') return formatNumber(v, { digits: 0 })
  return formatNumber(v)
}

/** Every run is named with its strategy: "Donchian · ETH 4h #12". */
const runLabel = (r: Pick<LabRunDetail, 'id' | 'symbol' | 'timeframe' | 'template_id'>) =>
  `${templateShort(r.template_id)} · ${r.symbol.replace(/USDT$/, '')} ${r.timeframe} #${r.id}`

export function CompareView() {
  const router = useRouter()
  const search = useSearchParams()
  const ids = parseCompareIds(search.get('ids'))
  const { details, equity } = useCompareRuns(ids)
  const recent = useLabRuns(100)
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'light' ? COMPARE_COLORS.light : COMPARE_COLORS.dark

  const runs = details.map((d) => d.data).filter((r): r is LabRunDetail => Boolean(r))
  const allLoaded = details.every((d) => !d.isPending)
  const eqKey = equity.map((e) => e.dataUpdatedAt).join(',')
  const runKey = runs.map((r) => r.id).join(',')
  const series: CompareSeries[] = useMemo(
    () =>
      runs.map((r, i) => ({ key: String(r.id), label: runLabel(r), points: normaliseEquity(equity[i]?.data ?? []) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runKey, eqKey],
  )

  const go = (next: string[]) => router.replace(next.length ? compareHref(next) : '/lab/compare')
  const addable = (recent.data ?? []).filter((r) => r.status === 'done' && !ids.includes(String(r.id)) && r.template_id !== 'universal_v0')

  const addPicker = ids.length < MAX_COMPARE && (
    <select
      aria-label="Tambah uji untuk dibandingkan"
      value=""
      onChange={(e) => e.target.value && go([...ids, e.target.value])}
      className="h-10 rounded-xl border border-input bg-transparent px-3 text-sm"
    >
      <option value="" className="bg-popover">+ Tambah uji…</option>
      {addable.slice(0, 60).map((r) => (
        <option key={String(r.id)} value={String(r.id)} className="bg-popover">
          {runLabel(r)} · {MODE_COPY[r.mode]}{r.verdict ? ` · ${r.verdict === 'PASS' ? 'Lolos' : 'Gagal'}` : ''}
        </option>
      ))}
    </select>
  )

  if (ids.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<Columns3 className="h-8 w-8" />}
          title="Pilih 2–4 uji untuk dibandingkan"
          description="Centang uji di Riwayat atau Peringkat, lalu klik Bandingkan. Atau tambah langsung di sini."
          action={<div className="flex flex-wrap justify-center gap-2">{addPicker}<Button asChild variant="outline" className="h-10 rounded-full px-4"><Link href="/lab/hasil">Buka Riwayat</Link></Button></div>}
        />
      </Panel>
    )
  }

  const failed = details.find((d) => d.error)
  // Only PASS runs can be "best" in a row: a failing run is never shown as the winner.
  const passMask = runs.map((r) => r.verdict === 'PASS')
  const rows = compareRows(runs)
  const best = (row: CompareMetricRow) => (passMask.some(Boolean) ? bestIndex({ ...row, values: row.values.map((v, i) => (passMask[i] ? v : null)) }) : null)
  const checkNames = Array.from(new Set(runs.flatMap((r) => (r.checks ?? []).map((c) => c.name))))

  return (
    <div className="space-y-6">
      <Panel
        title="Uji yang dibandingkan"
        icon={Columns3}
        tone="lab"
        description="Maks. 4. Nilai terbaik hanya ditandai di antara yang Lolos."
        aside={addPicker || undefined}
      >
        {failed && <ErrorState error={failed.error} title="Sebagian uji gagal dimuat" onRetry={() => failed.refetch()} compact />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ids.map((id, i) => {
            const r = details[i]?.data
            if (!r) return details[i]?.isPending ? <Skeleton key={id} className="h-44 rounded-2xl" /> : null
            const warn = snoopingWarning(r.snooping)
            const head = (r.oos_metrics ?? (r.mode === 'backtest' ? r.metrics : null)) as Record<string, unknown> | null
            const net = typeof head?.net_return_pct === 'number' ? head.net_return_pct : null
            return (
              <div key={id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-background/40 p-4 sm:p-5" style={{ borderTopColor: colors[i % colors.length], borderTopWidth: 3 }}>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/lab/runs/${encodeURIComponent(id)}`} className="num inline-flex min-w-0 items-center gap-2.5 text-base font-semibold hover:underline">
                    <CoinAvatar symbol={r.symbol} size="sm" />
                    <span>
                      {r.symbol.replace(/USDT$/, '')} <span className="font-normal text-muted-foreground">{r.timeframe} #{r.id}</span>
                    </span>
                  </Link>
                  <button type="button" onClick={() => go(ids.filter((x) => x !== id))} aria-label={`Hapus uji #${id} dari perbandingan`} className="-m-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StrategyChip templateId={r.template_id} />
                  {r.status === 'done' ? <VerdictPill verdict={r.verdict} /> : <span className="text-sm text-muted-foreground">{STATUS_COPY[r.status]}</span>}
                </div>
                <div>
                  <p className="eyebrow">{r.oos_metrics ? 'Hasil bersih data baru' : 'Hasil bersih seluruh periode'}</p>
                  <p className={cn('num display mt-1 text-3xl font-extrabold', signClass(net))}>{net === null ? '—' : formatPct(net, { signed: true })}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-2xs text-muted-foreground">{MODE_COPY[r.mode]}</span>
                  {r.preset && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-lab/30 bg-lab/10 px-2.5 py-0.5 text-2xs text-lab">
                      <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="num">{r.preset.name}</span>
                    </span>
                  )}
                  {(r.saved_as ?? []).map((n) => <span key={n} className="num rounded-full border border-border px-2.5 py-0.5 text-2xs text-muted-foreground">→ {n}</span>)}
                </div>
                <p className="num text-2xs text-muted-foreground">{r.start ? formatDate(r.start) : 'awal data'} s/d {r.end ? formatDate(r.end) : 'terbaru'}{r.holdout_start ? ` · data baru sejak ${formatDate(r.holdout_start)}` : ''}</p>
                {warn && <p className="flex items-start gap-1.5 text-2xs text-warn"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.snooping?.validated_runs_all_tf} uji · {r.snooping?.timeframes_tested.length} timeframe sudah dicoba untuk koin ini</p>}
              </div>
            )
          })}
        </div>
      </Panel>

      {allLoaded && runs.length > 0 && (
        <>
          <Panel title="Angka" icon={Table2} description="Seluruh periode vs data baru (dikunci, tak pernah dipakai menyetel).">
            <div className="-mx-5 overflow-x-auto sm:mx-0 sm:rounded-2xl sm:border sm:border-border">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Angka</th>
                    {runs.map((r, i) => (
                      <th key={String(r.id)} className="h-12 px-4 text-right text-xs font-semibold text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} aria-hidden="true" />
                          <span className="num">{runLabel(r)}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(['full', 'holdout'] as const).map((g) => [
                    <tr key={g} className="bg-muted/20">
                      <td colSpan={runs.length + 1} className={cn('h-[52px] px-4 text-2xs font-bold uppercase tracking-wide', g === 'holdout' ? 'text-lab' : 'text-muted-foreground')}>
                        {g === 'full' ? 'Seluruh periode' : 'Data baru (holdout)'}
                      </td>
                    </tr>,
                    ...rows.filter((r) => r.group === g).map((row) => {
                      const b = best(row)
                      return (
                        <tr key={row.key}>
                          <td className="h-[52px] px-4">{row.label}</td>
                          {row.values.map((v, i) => (
                            <td key={i} className={cn('num h-[52px] px-4 text-right', b === i && 'font-bold text-foreground', b !== i && 'text-muted-foreground', row.key.endsWith('max_dd_pct') && v !== null && 'text-bearish')}>
                              {fmt(row, v)}
                              {b === i && <span className="sr-only"> (terbaik di antara yang Lolos)</span>}
                            </td>
                          ))}
                        </tr>
                      )
                    }),
                  ])}
                </tbody>
              </table>
            </div>
          </Panel>

          {checkNames.length > 0 && (
            <Panel title="Rapor uji" icon={ClipboardCheck} tone="bullish" description="Semua syarat harus terpenuhi supaya Lolos.">
              <div className="-mx-5 overflow-x-auto sm:mx-0 sm:rounded-2xl sm:border sm:border-border">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="h-12 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Syarat</th>
                      {runs.map((r) => <th key={String(r.id)} className="num h-12 px-4 text-left text-xs font-semibold text-muted-foreground">{runLabel(r)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {checkNames.map((name) => {
                      const first = runs.flatMap((r) => r.checks ?? []).find((c) => c.name === name) as LabCheck
                      return (
                        <tr key={name}>
                          <td className="h-[52px] px-4">{checkLabel(first)}</td>
                          {runs.map((r) => {
                            const c = (r.checks ?? []).find((x) => x.name === name)
                            if (!c) return <td key={String(r.id)} className="h-[52px] px-4 text-muted-foreground">—</td>
                            return (
                              <td key={String(r.id)} className="h-[52px] px-4" title={checkReason(c)}>
                                <span className={cn('inline-flex items-center gap-1.5 font-semibold', c.passed ? 'text-bullish' : 'text-bearish')}>
                                  {c.passed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                                  {c.passed ? 'Lolos' : 'Gagal'}
                                </span>
                                <span className="num ml-2 text-2xs text-muted-foreground">{checkValueText(c)}</span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel title="Kurva modal" icon={LineChart} description="Semua kurva mulai dari 0% supaya periode berbeda tetap bisa dibandingkan.">
            {series.every((x) => x.points.length === 0) ? (
              equity.some((e) => e.isPending && e.fetchStatus !== 'idle') ? <Skeleton className="h-[300px] w-full rounded-2xl" /> : <EmptyState title="Kurva modal tidak tersedia" description="Uji yang belum selesai tidak punya kurva." />
            ) : (
              <CompareEquityChart series={series} />
            )}
          </Panel>
        </>
      )}
      {ids.length === 1 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Plus className="h-4 w-4" aria-hidden="true" />Tambah minimal satu uji lagi untuk membandingkan.</p>
      )}
    </div>
  )
}
