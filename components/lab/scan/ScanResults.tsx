'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Columns3, Grid3X3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Section } from '@/components/lab/Section'
import { RunStateChip, StatusBadge, signClass } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatPercent, formatScore, valueOrDash } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { useLabScan } from '@/lib/queries/lab'
import { useCancelLabScan } from '@/lib/queries/lab-insights'
import { compareHref, formatDuration } from '@/lib/lab/planning'
import { notify } from '@/lib/utils/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { sortScanRows } from '@/lib/lab/form'
import type { LabScanDetail, LabScanRow } from '@/lib/api/types/lab'

function scanQueueLine(scan: LabScanDetail): string | null {
  const q = scan.queue
  if (!q) return null
  const parts: string[] = []
  if (q.running) parts.push(`${q.running} jalan`)
  if (q.queued) parts.push(`${q.queued} antri${q.queue_position ? ` (mulai dari posisi #${q.queue_position})` : ''}`)
  if (typeof q.eta_s === 'number') parts.push(`perkiraan selesai ${formatDuration(q.eta_s)} lagi`)
  return parts.join(' · ') || null
}

function ScanProgress({ scan }: { scan: LabScanDetail }) {
  const line = scanQueueLine(scan)
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
      {line && <p className="num text-2xs text-muted-foreground">{line}</p>}
    </div>
  )
}

function CancelScanButton({ id }: { id: string }) {
  const cancel = useCancelLabScan()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-bearish" disabled={cancel.isPending}>
          <Ban className="h-3.5 w-3.5" />
          Batalkan scan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan scan #{id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Kombinasi yang masih antri langsung dibatalkan; yang sedang jalan dihentikan dalam ±10 detik. Hasil yang sudah selesai tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Jangan</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              cancel.mutate(id, {
                onSuccess: (r) => notify.info(`${r.cancelled} dibatalkan, ${r.cancelling} sedang dihentikan`),
                onError: () => notify.error('Gagal membatalkan scan'),
              })
            }
          >
            Batalkan scan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
                {r.preset && <span className="block font-mono text-3xs text-lab" title="Parameter dari preset ini">{r.preset.name}</span>}
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

export function ScanResults({ id }: { id: string }) {
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
          {scan && (scan.status === 'queued' || scan.status === 'running') && <CancelScanButton id={id} />}
          {passes >= 2 && (
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Link href={compareHref(sortScanRows(rows).filter((r) => r.verdict === 'PASS' && r.run_id !== null).slice(0, 4).map((r) => String(r.run_id)))}>
                <Columns3 className="h-3.5 w-3.5" />
                Bandingkan LOLOS teratas
              </Link>
            </Button>
          )}
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
