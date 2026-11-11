'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Bookmark, CheckCircle2, Columns3, Plus, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Section } from '@/components/lab/Section'
import { ModeBadge, VerdictBadge } from '@/components/lab/LabBadges'
import { COMPARE_COLORS, CompareEquityChart, type CompareSeries } from '@/components/lab/compare/CompareEquityChart'
import { useTheme } from 'next-themes'
import { ApiError } from '@/lib/api/errors'
import { formatPercent, formatScore } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { checkLabel, checkReason } from '@/lib/lab/form'
import { snoopingWarning } from '@/lib/lab/timeframes'
import { MAX_COMPARE, bestIndex, compareHref, compareRows, normaliseEquity, parseCompareIds, type CompareMetricRow } from '@/lib/lab/planning'
import { useLabRuns } from '@/lib/queries/lab'
import { useCompareRuns } from '@/lib/queries/lab-insights'
import type { LabCheck, LabRunDetail } from '@/lib/api/types/lab'

function fmt(row: CompareMetricRow, v: number | null): string {
  if (v === null) return '—'
  const k = row.key.split('.')[1]
  if (k === 'max_dd_pct') return `−${formatScore(Math.abs(v), 1)}%`
  if (k === 'net_return_pct') return formatPercent(v, 1)
  if (k === 'cost_drag_pct') return `${formatScore(v, 1)} pp`
  if (k === 'trades') return String(Math.round(v))
  return formatScore(v)
}

const runLabel = (r: LabRunDetail) => `#${r.id} ${r.symbol.replace(/USDT$/, '')} ${r.timeframe}`

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
      aria-label="Tambah run untuk dibandingkan"
      value=""
      onChange={(e) => e.target.value && go([...ids, e.target.value])}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
    >
      <option value="" className="bg-popover">+ Tambah run…</option>
      {addable.slice(0, 60).map((r) => (
        <option key={String(r.id)} value={String(r.id)} className="bg-popover">
          #{String(r.id)} {r.symbol} {r.timeframe} · {r.mode}{r.verdict ? ` · ${r.verdict === 'PASS' ? 'LOLOS' : 'GAGAL'}` : ''}
        </option>
      ))}
    </select>
  )

  if (ids.length === 0) {
    return (
      <Section>
        <EmptyState
          icon={<Columns3 className="h-8 w-8" />}
          title="Pilih 2–4 run untuk dibandingkan"
          description="Centang run di Riwayat run atau di Peringkat, lalu klik Bandingkan. Atau tambah langsung di sini."
          action={<div className="flex flex-wrap justify-center gap-2">{addPicker}<Button asChild size="sm" variant="outline"><Link href="/lab/leaderboard">Buka peringkat</Link></Button></div>}
        />
      </Section>
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
      <Section
        title="Run yang dibandingkan"
        icon={<Columns3 className="h-4 w-4 text-lab" />}
        description="Maksimal 4. Nilai terbaik per baris hanya ditandai di antara run yang LOLOS."
        action={addPicker || undefined}
      >
        {failed && <ErrorPanel kind={failed.error instanceof ApiError ? failed.error.kind : 'server'} onRetry={() => failed.refetch()} messageOverride="Sebagian run gagal dimuat." />}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ids.map((id, i) => {
            const r = details[i]?.data
            if (!r) return details[i]?.isPending ? <Skeleton key={id} className="h-28 rounded-lg" /> : null
            const warn = snoopingWarning(r.snooping)
            return (
              <div key={id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/lab/runs/${encodeURIComponent(id)}`} className="flex items-center gap-2 hover:underline">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} aria-hidden="true" />
                    <span className="num text-sm font-semibold">{runLabel(r)}</span>
                  </Link>
                  <button type="button" onClick={() => go(ids.filter((x) => x !== id))} aria-label={`Hapus run #${id} dari perbandingan`} className="text-muted-foreground hover:text-foreground cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ModeBadge mode={r.mode} />
                  {r.status === 'done' ? <VerdictBadge verdict={r.verdict} /> : <span className="text-2xs text-muted-foreground">{r.status}</span>}
                  {r.preset && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-lab/30 bg-lab/10 px-2 py-0.5 text-2xs text-lab">
                      <Bookmark className="h-3 w-3" aria-hidden="true" />
                      <span className="num">{r.preset.name}</span>
                    </span>
                  )}
                  {(r.saved_as ?? []).map((n) => <span key={n} className="num rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">→ {n}</span>)}
                </div>
                <p className="num text-2xs text-muted-foreground">{r.start ?? 'awal data'} → {r.end ?? 'terbaru'}{r.holdout_start ? ` · holdout ${r.holdout_start.slice(0, 10)}` : ''}</p>
                {warn && <p className="flex items-start gap-1 text-2xs text-warn"><AlertTriangle className="mt-px h-3 w-3 shrink-0" />{r.snooping?.validated_runs_all_tf} run · {r.snooping?.timeframes_tested.length} TF dicoba untuk koin ini</p>}
              </div>
            )
          })}
        </div>
      </Section>

      {allLoaded && runs.length > 0 && (
        <>
          <Section title="Metrik" description="Seluruh periode vs holdout (bagian data yang dikunci, tidak pernah dilihat optimizer). Beban biaya = selisih return tanpa biaya vs dengan biaya.">
            <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Metrik</th>
                    {runs.map((r, i) => (
                      <th key={String(r.id)} className="px-3 py-2 text-right text-2xs font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} aria-hidden="true" />
                          <span className="num">{runLabel(r)}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(['full', 'holdout'] as const).map((g) => [
                    <tr key={g} className="bg-muted/20">
                      <td colSpan={runs.length + 1} className={cn('px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide', g === 'holdout' ? 'text-lab' : 'text-muted-foreground')}>
                        {g === 'full' ? 'Seluruh periode' : 'Holdout (ujian terkunci)'}
                      </td>
                    </tr>,
                    ...rows.filter((r) => r.group === g).map((row) => {
                      const b = best(row)
                      return (
                        <tr key={row.key}>
                          <td className="px-3 py-2 text-xs">{row.label}</td>
                          {row.values.map((v, i) => (
                            <td key={i} className={cn('num px-3 py-2 text-right text-xs', b === i && 'font-bold text-foreground', b !== i && 'text-muted-foreground', row.key.endsWith('max_dd_pct') && v !== null && 'text-bearish')}>
                              {fmt(row, v)}
                              {b === i && <span className="sr-only"> (terbaik di antara yang LOLOS)</span>}
                            </td>
                          ))}
                        </tr>
                      )
                    }),
                  ])}
                </tbody>
              </table>
            </div>
          </Section>

          {checkNames.length > 0 && (
            <Section title="Rapor kejujuran" description="Semua cek harus lolos supaya rapor LOLOS.">
              <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Cek</th>
                      {runs.map((r) => <th key={String(r.id)} className="num px-3 py-2 text-left text-2xs font-medium text-muted-foreground">{runLabel(r)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {checkNames.map((name) => {
                      const first = runs.flatMap((r) => r.checks ?? []).find((c) => c.name === name) as LabCheck
                      return (
                        <tr key={name}>
                          <td className="px-3 py-2 text-xs">{checkLabel(first)}</td>
                          {runs.map((r) => {
                            const c = (r.checks ?? []).find((x) => x.name === name)
                            if (!c) return <td key={String(r.id)} className="px-3 py-2 text-xs text-muted-foreground">—</td>
                            return (
                              <td key={String(r.id)} className="px-3 py-2 text-2xs" title={checkReason(c)}>
                                <span className={cn('inline-flex items-center gap-1 font-semibold', c.passed ? 'text-bullish' : 'text-bearish')}>
                                  {c.passed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                                  {c.passed ? 'Lolos' : 'Gagal'}
                                </span>
                                <span className="num ml-1.5 text-muted-foreground">{typeof c.value === 'number' ? formatScore(c.value) : String(c.value ?? '—')}</span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <Section title="Kurva equity (dinormalisasi)" description="Tiap kurva dimulai dari 0% di titik awalnya sendiri, jadi run dengan periode berbeda tetap bisa dibandingkan. Arahkan kursor untuk melihat nilai.">
            {series.every((x) => x.points.length === 0) ? (
              equity.some((e) => e.isPending && e.fetchStatus !== 'idle') ? <Skeleton className="h-[260px] w-full" /> : <EmptyState title="Belum ada kurva equity" description="Run yang belum selesai tidak punya kurva." />
            ) : (
              <CompareEquityChart series={series} />
            )}
          </Section>
        </>
      )}
      {ids.length === 1 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Plus className="h-3.5 w-3.5" />Tambah minimal satu run lagi untuk membandingkan.</p>
      )}
    </div>
  )
}
