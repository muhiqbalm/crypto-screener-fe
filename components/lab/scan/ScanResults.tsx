'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Columns3, Grid3X3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import { EmptyState } from '@/components/lab/Section'
import { Panel, StrategyChip, VerdictPill } from '@/components/lab/run/v2-ui'
import { STATUS_COPY } from '@/components/lab/run/copy'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { useLabScan, useLabTemplates } from '@/lib/queries/lab'
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
import type { LabScanDetail, LabScanRow, LabStatus } from '@/lib/api/types/lab'

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
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{scan.status === 'done' ? 'Selesai' : 'Progres'}</span>
        <span className="num font-semibold text-foreground">
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="h-full rounded-full bg-lab transition-all" style={{ width: `${pct}%` }} />
      </div>
      {line && <p className="num text-sm text-muted-foreground">{line}</p>}
    </div>
  )
}

function CancelScanButton({ id }: { id: string }) {
  const cancel = useCancelLabScan()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 rounded-full px-4 text-sm text-bearish" disabled={cancel.isPending}>
          <Ban className="h-4 w-4" />
          Batalkan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan uji banyak koin #{id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Kombinasi yang masih antri langsung dibatalkan; yang sedang berjalan dihentikan dalam ±10 detik. Hasil yang sudah selesai tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Jangan</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              cancel.mutate(id, {
                onSuccess: (r) => notify.info(`${r.cancelled} dibatalkan, ${r.cancelling} sedang dihentikan`),
                onError: () => notify.error('Gagal membatalkan'),
              })
            }
          >
            Batalkan uji
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export type CellTone = 'pass' | 'fail' | 'pending' | 'error'

/** Heatmap cell colour = verdict (the word is printed in the cell too; colour is never the only signal). */
export function scanCellTone(r: Pick<LabScanRow, 'status' | 'verdict'>): CellTone {
  if (r.status === 'error' || r.status === 'cancelled') return 'error'
  if (r.status !== 'done') return 'pending'
  return r.verdict === 'PASS' ? 'pass' : r.verdict === 'FAIL' ? 'fail' : 'pending'
}

const TONE_CLASS: Record<CellTone, string> = {
  pass: 'bg-bullish/20 ring-1 ring-inset ring-bullish/60',
  fail: 'bg-bearish/15 ring-1 ring-inset ring-bearish/25',
  pending: 'bg-muted/60',
  error: 'bg-warn/15 ring-1 ring-inset ring-warn/30',
}
const TONE_TEXT: Record<CellTone, string> = {
  pass: 'text-bullish',
  fail: 'text-bearish',
  pending: 'text-muted-foreground',
  error: 'text-warn',
}

function cellWord(r: LabScanRow): string {
  const tone = scanCellTone(r)
  if (tone === 'pass') return 'Lolos'
  if (tone === 'fail') return 'Gagal'
  return STATUS_COPY[r.status as LabStatus] ?? r.status
}

function ScanHeatmap({ rows }: { rows: LabScanRow[] }) {
  const symbols = Array.from(new Set(rows.map((r) => r.symbol)))
  const tfs = Array.from(new Set(rows.map((r) => r.timeframe)))
  const at = (s: string, tf: string) => rows.find((r) => r.symbol === s && r.timeframe === tf)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1.5" aria-label="Peta hasil: Lolos atau Gagal per koin dan timeframe">
          <thead>
            <tr>
              <th />
              {tfs.map((tf) => (
                <th key={tf} className="num px-1 pb-1 text-center text-sm font-semibold text-muted-foreground">{tf}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((s) => (
              <tr key={s}>
                <th scope="row" className="num pr-3 text-left text-[15px] font-semibold">{s.replace(/USDT$/, '')}</th>
                {tfs.map((tf) => {
                  const r = at(s, tf)
                  if (!r) return <td key={tf} className="h-16 w-24 rounded-2xl bg-muted/20 sm:w-28" />
                  const tone = scanCellTone(r)
                  const content = (
                    <div className="flex h-16 w-24 flex-col items-center justify-center gap-0.5 sm:w-28">
                      <span className={cn('text-[15px] font-bold', TONE_TEXT[tone])}>{cellWord(r)}</span>
                      {r.status === 'done' && <span className="num text-[13px] text-muted-foreground">PF {formatNumber(r.oos_profit_factor)}</span>}
                    </div>
                  )
                  return (
                    <td key={tf} className={cn('rounded-2xl p-0', TONE_CLASS[tone])}>
                      {r.run_id !== null && r.run_id !== undefined ? (
                        <Link
                          href={`/lab/runs/${encodeURIComponent(String(r.run_id))}`}
                          className="block rounded-2xl transition-[transform,background-color] hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5"
                          aria-label={`${s} ${tf}: ${cellWord(r)}, PF data baru ${formatNumber(r.oos_profit_factor)}`}
                        >
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground" aria-label="Legenda">
        {(
          [
            ['pass', 'Lolos'],
            ['fail', 'Gagal'],
            ['pending', 'Belum selesai / tanpa rapor'],
            ['error', 'Error / dibatalkan'],
          ] as const
        ).map(([t, l]) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={cn('inline-block h-3.5 w-5 rounded-md', TONE_CLASS[t])} aria-hidden="true" />
            {l}
          </span>
        ))}
        <span>Angka = PF di data baru.</span>
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
    <th className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground', right ? 'text-right' : 'text-left')}>
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
      >
        {label}
        {sort.key === key ? sort.desc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </th>
  )
  return (
    <div className="max-h-[640px] overflow-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-[15px]">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr>
            {head('symbol', 'Koin', false)}
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => setSort({ key: 'default', desc: true })}>
                Rapor {sort.key === 'default' && '↓'}
              </button>
            </th>
            {head('pf', 'PF data baru')}
            {head('net', 'Hasil data baru')}
            {head('dd', 'Turun terdalam')}
            {head('trades', 'Trade')}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {sorted.map((r) => (
            <tr key={`${r.symbol}-${r.timeframe}`} className="h-[56px] hover:bg-accent/40">
              <td className="px-4 py-2.5">
                {r.run_id !== null && r.run_id !== undefined ? (
                  <Link href={`/lab/runs/${encodeURIComponent(String(r.run_id))}`} className="num font-semibold hover:underline">
                    {r.symbol.replace(/USDT$/, '')} <span className="font-normal text-muted-foreground">{r.timeframe}</span>
                  </Link>
                ) : (
                  <span className="num font-semibold">{r.symbol.replace(/USDT$/, '')} <span className="font-normal text-muted-foreground">{r.timeframe}</span></span>
                )}
                {r.preset && <span className="block truncate text-[13px] text-lab">{r.preset.name}</span>}
              </td>
              <td className="px-4 py-2.5">
                {r.status === 'done' ? <VerdictPill verdict={r.verdict} /> : <span className="text-sm text-muted-foreground">{STATUS_COPY[r.status as LabStatus] ?? r.status}</span>}
              </td>
              <td className="num px-4 py-2.5 text-right font-semibold">{formatNumber(r.oos_profit_factor)}</td>
              <td className={cn('num px-4 py-2.5 text-right font-semibold', signClass(r.oos_net_return_pct))}>{formatPct(r.oos_net_return_pct, { signed: true })}</td>
              <td className="num px-4 py-2.5 text-right text-bearish">
                {r.oos_max_dd_pct === null || r.oos_max_dd_pct === undefined ? '—' : formatPct(-Math.abs(r.oos_max_dd_pct))}
              </td>
              <td className="num px-4 py-2.5 text-right">{formatNumber(r.trades, { digits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Deck-style count bar (Lolos / Gagal / belum / error) with the counts as the legend. */
function ScanTally({ rows }: { rows: LabScanRow[] }) {
  const n: Record<CellTone, number> = { pass: 0, fail: 0, pending: 0, error: 0 }
  for (const r of rows) n[scanCellTone(r)] += 1
  const total = rows.length || 1
  const parts = (
    [
      ['pass', 'Lolos', 'bg-bullish'],
      ['fail', 'Gagal', 'bg-bearish/80'],
      ['pending', 'Belum / tanpa rapor', 'bg-muted-foreground/40'],
      ['error', 'Error', 'bg-warn/80'],
    ] as const
  ).filter(([t]) => n[t] > 0)
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <span className="num text-4xl font-bold tracking-tight text-bullish sm:text-5xl">{n.pass}</span>
        <span className="pb-1 text-lg text-muted-foreground">
          dari <span className="num font-semibold text-foreground">{rows.length}</span> kombinasi Lolos
        </span>
      </div>
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={parts.map(([t, l]) => `${l} ${n[t]}`).join(', ')}>
        {parts.map(([t, , bg]) => (
          <span key={t} className={cn('h-full first:rounded-l-full last:rounded-r-full', bg)} style={{ width: `${(n[t] / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground" aria-hidden="true">
        {parts.map(([t, l, bg]) => (
          <span key={t} className="inline-flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', bg)} />
            {l} <span className="num font-semibold text-foreground">{n[t]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function ScanResults({ id }: { id: string }) {
  const { data: scan, isPending, error, refetch, isFetching } = useLabScan(id)
  const templatesQ = useLabTemplates()
  const rows = scan?.rows ?? []
  const passes = rows.filter((r) => r.verdict === 'PASS').length
  const templateName = scan?.template_id ? templatesQ.data?.find((t) => t.id === scan.template_id)?.name : null

  return (
    <Panel
      id="hasil-scan"
      title={<>Hasil uji banyak koin <span className="num text-base font-normal text-muted-foreground">#{id}</span></>}
      icon={Grid3X3}
      description={scan ? 'Lolos di atas, lalu PF data baru tertinggi.' : undefined}
      aside={
        <>
          {scan?.template_id && <StrategyChip templateId={scan.template_id} name={templateName} />}
          {scan && (
            <span className="inline-flex h-7 items-center rounded-full border border-border px-3 text-[13px] font-medium">
              {scan.mode === 'optimize' ? 'Cari setting terbaik' : 'Uji jujur'} · {STATUS_COPY[scan.status]}
            </span>
          )}
          {scan && (scan.status === 'queued' || scan.status === 'running') && <CancelScanButton id={id} />}
          {passes >= 2 && (
            <Button asChild variant="outline" className="h-10 gap-2 rounded-full px-4 text-sm">
              <Link href={compareHref(sortScanRows(rows).filter((r) => r.verdict === 'PASS' && r.run_id !== null).slice(0, 4).map((r) => String(r.run_id)))}>
                <Columns3 className="h-4 w-4" />
                Bandingkan Lolos teratas
              </Link>
            </Button>
          )}
          <Button variant="ghost" onClick={() => refetch()} disabled={isFetching} className="h-10 w-10 rounded-full p-0" aria-label="Muat ulang hasil">
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </>
      }
    >
      {isPending ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : error || !scan ? (
        <ErrorState error={error} title="Hasil uji banyak koin gagal dimuat" onRetry={() => refetch()} compact />
      ) : (
        <div className="space-y-6">
          {scan.status !== 'done' && <ScanProgress scan={scan} />}
          {rows.length === 0 ? (
            <EmptyState title="Belum ada hasil" description="Baris muncul satu per satu saat kombinasi selesai diuji." />
          ) : (
            <>
              <ScanTally rows={rows} />
              <div className="grid items-start gap-6 2xl:grid-cols-[auto_minmax(0,1fr)]">
                <ScanHeatmap rows={rows} />
                <ScanTable rows={rows} />
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  )
}
