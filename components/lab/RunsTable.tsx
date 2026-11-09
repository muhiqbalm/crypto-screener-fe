'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { ModeBadge, StatusBadge, VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { formatPercent, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { ApiError } from '@/lib/api/errors'
import { useLabRuns } from '@/lib/queries/lab'
import { isActiveStatus } from '@/lib/lab/form'
import type { LabRunSummary } from '@/lib/api/types/lab'

const columns: ColumnDef<LabRunSummary>[] = [
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: 'Waktu',
    cell: ({ row }) => (
      <Link href={`/lab/runs/${encodeURIComponent(row.original.id)}`} className="font-mono text-xs text-sky-400 hover:underline">
        {formatTimestamp(row.original.created_at)}
      </Link>
    ),
  },
  {
    id: 'market',
    accessorFn: (r) => `${r.symbol} ${r.timeframe}`,
    header: 'Market',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.original.symbol} <span className="text-muted-foreground">{row.original.timeframe}</span>
      </span>
    ),
  },
  { id: 'template', accessorKey: 'template_id', header: 'Template', cell: ({ getValue }) => <span className="text-xs">{getValue<string>()}</span> },
  { id: 'mode', accessorKey: 'mode', header: 'Mode', cell: ({ row }) => <ModeBadge mode={row.original.mode} /> },
  { id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: 'verdict',
    accessorFn: (r) => (r.verdict === 'PASS' ? 0 : r.verdict === 'FAIL' ? 1 : 2),
    header: 'Verdict',
    cell: ({ row }) => <VerdictBadge verdict={row.original.verdict} />,
  },
  {
    id: 'net',
    accessorKey: 'net_return_pct',
    header: 'Net return',
    sortUndefined: 'last',
    cell: ({ row }) => (
      <span className={`font-mono tabular-nums ${signClass(row.original.net_return_pct)}`}>
        {formatPercent(row.original.net_return_pct)}
      </span>
    ),
  },
  {
    id: 'pf',
    accessorKey: 'profit_factor',
    header: 'PF',
    cell: ({ row }) => <span className="font-mono tabular-nums">{formatScore(row.original.profit_factor)}</span>,
  },
  {
    id: 'dd',
    accessorKey: 'max_dd_pct',
    header: 'Max DD',
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-bearish">
        {row.original.max_dd_pct === null ? '—' : `${formatScore(Math.abs(row.original.max_dd_pct))}%`}
      </span>
    ),
  },
  {
    id: 'trades',
    accessorKey: 'trades',
    header: 'Trades',
    cell: ({ row }) => <span className="font-mono tabular-nums">{valueOrDash(row.original.trades)}</span>,
  },
]

export function RunsTable() {
  const { data, isPending, error, refetch, isFetching } = useLabRuns(50)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])
  const rows = useMemo(() => data ?? [], [data])
  const active = rows.filter((r) => isActiveStatus(r.status)).length

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Riwayat run</h2>
          <p className="text-[11px] text-muted-foreground">
            50 run terakhir.{active > 0 && ` ${active} masih jalan — update otomatis tiap 3 detik.`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorPanel
          kind={error instanceof ApiError ? error.kind : 'server'}
          onRetry={() => refetch()}
          messageOverride="Gagal memuat daftar run dari server Lab."
        />
      ) : rows.length === 0 ? (
        <EmptyPanel message="Belum ada run. Atur parameter di atas lalu klik Backtest / Validate / Optimize." />
      ) : (
        <div className="rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted()
                    return (
                      <TableHead key={h.id} className="text-[11px] uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
