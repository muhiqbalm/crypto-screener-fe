'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Columns3, Grid3X3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shell/states'
import { EmptyState, Section } from '@/components/lab/Section'
import { VerdictBadge } from '@/components/ui/verdict-badge'
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
import { sortScanRows, templateShort } from '@/lib/lab/form'
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
    <div className="space-y-1">
      <div className="flex justify-between text-2xs text-muted-foreground">
        <span>{scan.status === 'done' ? 'Selesai' : 'Progres'}</span>
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
  pass: 'bg-bullish/20 ring-1 ring-bullish/50',
  fail: 'bg-bearish/15',
  pending: 'bg-muted/50',
  error: 'bg-warn/15',
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
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs" aria-label="Peta hasil: Lolos atau Gagal per koin dan timeframe">
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
                  const tone = scanCellTone(r)
                  const content = (
                    <div className="flex h-12 w-20 flex-col items-center justify-center gap-0.5 sm:w-24">
                      <span className={cn('text-2xs font-semibold', tone === 'pass' && 'text-bullish', tone === 'fail' && 'text-bearish', tone === 'error' && 'text-warn', tone === 'pending' && 'text-muted-foreground')}>
                        {cellWord(r)}
                      </span>
                      {r.status === 'done' && <span className="num text-3xs text-muted-foreground">PF {formatNumber(r.oos_profit_factor)}</span>}
                    </div>
                  )
                  return (
                    <td key={tf} className={cn('rounded-md p-0', TONE_CLASS[tone])}>
                      {r.run_id !== null && r.run_id !== undefined ? (
                        <Link href={`/lab/runs/${encodeURIComponent(String(r.run_id))}`} className="block rounded-md hover:opacity-80" aria-label={`${s} ${tf}: ${cellWord(r)}, PF data baru ${formatNumber(r.oos_profit_factor)}`}>
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
        {(
          [
            ['pass', 'Lolos'],
            ['fail', 'Gagal'],
            ['pending', 'Belum selesai / tanpa rapor'],
            ['error', 'Error / dibatalkan'],
          ] as const
        ).map(([t, l]) => (
          <span key={t} className="flex items-center gap-1">
            <span className={cn('inline-block h-3 w-4 rounded-sm', TONE_CLASS[t])} aria-hidden="true" />
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
    <th className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', right ? 'text-right' : 'text-left')}>
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
      >
        {label}
        {sort.key === key ? sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  )
  return (
    <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 border-b border-border bg-card">
          <tr>
            {head('symbol', 'Koin', false)}
            <th className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">
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
            <tr key={`${r.symbol}-${r.timeframe}`} className="hover:bg-accent/40">
              <td className="px-3 py-2">
                {r.run_id !== null && r.run_id !== undefined ? (
                  <Link href={`/lab/runs/${encodeURIComponent(String(r.run_id))}`} className="font-mono text-xs font-semibold hover:underline">
                    {r.symbol} <span className="text-muted-foreground">{r.timeframe}</span>
                  </Link>
                ) : (
                  <span className="font-mono text-xs font-semibold">{r.symbol} <span className="text-muted-foreground">{r.timeframe}</span></span>
                )}
                {r.preset && <span className="block font-mono text-3xs text-lab">{r.preset.name}</span>}
              </td>
              <td className="px-3 py-2">
                {r.status === 'done' ? <VerdictBadge verdict={r.verdict} emptyLabel="Tanpa rapor" /> : <span className="text-xs text-muted-foreground">{STATUS_COPY[r.status as LabStatus] ?? r.status}</span>}
              </td>
              <td className="num px-3 py-2 text-right text-xs">{formatNumber(r.oos_profit_factor)}</td>
              <td className={cn('num px-3 py-2 text-right text-xs', signClass(r.oos_net_return_pct))}>{formatPct(r.oos_net_return_pct, { signed: true })}</td>
              <td className="num px-3 py-2 text-right text-xs text-bearish">
                {r.oos_max_dd_pct === null || r.oos_max_dd_pct === undefined ? '—' : formatPct(-Math.abs(r.oos_max_dd_pct))}
              </td>
              <td className="num px-3 py-2 text-right text-xs">{formatNumber(r.trades, { digits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ScanResults({ id }: { id: string }) {
  const { data: scan, isPending, error, refetch, isFetching } = useLabScan(id)
  const templatesQ = useLabTemplates()
  const rows = scan?.rows ?? []
  const passes = rows.filter((r) => r.verdict === 'PASS').length
  const strategy = scan?.template_id ? templateShort(scan.template_id, templatesQ.data?.find((t) => t.id === scan.template_id)?.name) : null

  return (
    <Section
      id="hasil-scan"
      title={<>Hasil uji banyak koin <span className="num text-xs font-normal text-muted-foreground">#{id}</span></>}
      icon={<Grid3X3 className="h-4 w-4 text-lab" />}
      description={
        scan
          ? `${strategy ? `${strategy} · ` : ''}${scan.mode === 'optimize' ? 'Cari setting terbaik' : 'Uji jujur'} · ${passes} dari ${rows.length} kombinasi Lolos. Lolos di atas, lalu PF data baru tertinggi.`
          : undefined
      }
      action={
        <>
          {scan && <span className="text-2xs text-muted-foreground">{STATUS_COPY[scan.status]}</span>}
          {scan && (scan.status === 'queued' || scan.status === 'running') && <CancelScanButton id={id} />}
          {passes >= 2 && (
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Link href={compareHref(sortScanRows(rows).filter((r) => r.verdict === 'PASS' && r.run_id !== null).slice(0, 4).map((r) => String(r.run_id)))}>
                <Columns3 className="h-3.5 w-3.5" />
                Bandingkan Lolos teratas
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-1.5 text-xs" aria-label="Muat ulang hasil">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </>
      }
    >
      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : error || !scan ? (
        <ErrorState error={error} title="Hasil uji banyak koin gagal dimuat" onRetry={() => refetch()} compact />
      ) : (
        <div className="space-y-5">
          {scan.status !== 'done' && <ScanProgress scan={scan} />}
          {rows.length === 0 ? (
            <EmptyState title="Belum ada hasil" description="Baris muncul satu per satu saat kombinasi selesai diuji." />
          ) : (
            <div className="grid items-start gap-5 2xl:grid-cols-[auto_minmax(0,1fr)]">
              <ScanHeatmap rows={rows} />
              <ScanTable rows={rows} />
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
