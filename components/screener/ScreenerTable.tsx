'use client'

import * as React from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChangeCell } from '@/components/screener/ChangeCell'
import { SignalBadge } from '@/components/screener/SignalBadge'
import { TierBadge } from '@/components/screener/TierBadge'
import { TrackRecordHint } from '@/components/screener/TrackRecordHint'
import { CoinAvatar } from '@/components/market/ui'
import { Term } from '@/components/ui/term'
import { compositeKey, tierKey } from '@/lib/screener/track-record'
import { scoreFraction, scorePosition } from '@/lib/screener/factors'
import { koinHref } from '@/lib/lab/outlook'
import {
  coinOf,
  formatPrice,
  formatVolume,
  formatFunding,
  formatScore,
  valueOrDash,
} from '@/lib/utils/format'
import { useColumnVisibility } from '@/lib/utils/use-column-visibility'
import type { AssetDetail } from '@/lib/api/types/screener'
import type { ScreenerFilterState } from '@/components/screener/ScreenerFilters'

// ---------------------------------------------------------------------------
// Column definitions (plain Indonesian; score shown as a position among the coins)
// ---------------------------------------------------------------------------

type Pos = { pos: number; n: number }

function buildColumns(positions: Map<string, Pos>): ColumnDef<AssetDetail>[] {
  return [
    {
      id: 'rank',
      accessorKey: 'rank',
      header: '#',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums text-muted-foreground">{valueOrDash(getValue<number | null>())}</span>
      ),
    },
    {
      id: 'symbol',
      accessorKey: 'symbol',
      header: 'Koin',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex items-center gap-3">
          <CoinAvatar symbol={row.original.symbol} />
          <span className="flex flex-col">
            <Link href={koinHref(row.original.symbol)} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold hover:underline">
              {coinOf(row.original.symbol)}
            </Link>
            <span className="num text-2xs text-muted-foreground sm:hidden">{formatPrice(row.original.price)}</span>
          </span>
        </span>
      ),
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue) return true
        return row.original.symbol.toLowerCase().includes(filterValue.toLowerCase())
      },
    },
    {
      id: 'price',
      accessorKey: 'price',
      header: 'Harga',
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-mono tabular-nums">{formatPrice(getValue<number | null>())}</span>,
    },
    {
      id: 'change_24h',
      accessorKey: 'change_24h',
      header: '24 jam',
      enableSorting: true,
      cell: ({ getValue }) => <ChangeCell value={getValue<number | null>()} />,
    },
    {
      id: 'volume_24h',
      accessorKey: 'volume_24h',
      header: 'Volume 24 jam',
      enableSorting: true,
      cell: ({ getValue }) => <span className="font-mono tabular-nums">{formatVolume(getValue<number | null>())}</span>,
    },
    {
      id: 'funding_rate',
      accessorKey: 'funding_rate',
      header: 'Funding',
      enableSorting: false,
      cell: ({ getValue }) => <span className="num">{formatFunding(getValue<number | null>())}</span>,
    },
    {
      id: 'signal',
      accessorKey: 'signal',
      header: () => <Term k="screener_signal" short />,
      enableSorting: false,
      cell: ({ getValue, row }) => (
        <span className="inline-flex items-center gap-1">
          <SignalBadge signal={getValue<AssetDetail['signal']>()} />
          <TrackRecordHint k={compositeKey(row.original)} symbol={row.original.symbol} />
        </span>
      ),
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue || filterValue === 'ALL') return true
        return row.original.signal === filterValue
      },
    },
    {
      id: 'composite_score',
      accessorKey: 'composite_score',
      header: 'Posisi skor',
      enableSorting: true,
      cell: ({ row }) => {
        const p = positions.get(row.original.symbol) ?? null
        const frac = scoreFraction(p)
        return p ? (
          <span className="inline-flex items-center gap-1.5" title={`Skor ${formatScore(row.original.composite_score, 4)}`}>
            <span className="relative h-2 w-14 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-full bg-info" style={{ width: `${Math.round((frac ?? 0) * 100)}%` }} />
            </span>
            <span className="num text-sm">ke-{p.pos}<span className="text-muted-foreground">/{p.n}</span></span>
          </span>
        ) : <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'tier',
      accessorKey: 'tier',
      header: 'Kelompok',
      enableSorting: false,
      cell: ({ getValue, row }) => (
        <span className="inline-flex items-center gap-1">
          <TierBadge tier={getValue<AssetDetail['tier']>()} />
          <TrackRecordHint k={tierKey(row.original)} symbol={row.original.symbol} />
        </span>
      ),
      filterFn: (row, _columnId, filterValue: string) => {
        if (!filterValue || filterValue === 'ALL') return true
        return row.original.tier === filterValue
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScreenerTableProps {
  data: AssetDetail[]
  filters: ScreenerFilterState
  /** Row click; defaults to opening the coin page /koin/[simbol]. */
  onSelectAsset?: (asset: AssetDetail) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreenerTable({ data, filters, onSelectAsset }: ScreenerTableProps) {
  const visibleColumns = useColumnVisibility()
  const router = useRouter()
  const open = onSelectAsset ?? ((a: AssetDetail) => router.push(koinHref(a.symbol)))
  const columns = React.useMemo(() => {
    const m = new Map<string, Pos>()
    for (const a of data) {
      const p = scorePosition(a, data)
      if (p) m.set(a.symbol, p)
    }
    return buildColumns(m)
  }, [data])

  // Build TanStack column visibility state from the Set<ColumnId> (Req 14.1–14.3)
  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const state: VisibilityState = {}
    for (const col of columns) {
      const id = col.id as string
      state[id] = visibleColumns.has(id as Parameters<typeof visibleColumns.has>[0])
    }
    return state
  }, [visibleColumns, columns])

  // Build columnFilters from the ScreenerFilterState (Req 6.7–6.13)
  const columnFilters = React.useMemo<ColumnFiltersState>(() => {
    const filters_: ColumnFiltersState = []

    if (filters.symbol.trim()) {
      filters_.push({ id: 'symbol', value: filters.symbol.trim() })
    }
    if (filters.signal !== 'ALL') {
      filters_.push({ id: 'signal', value: filters.signal })
    }
    if (filters.tier !== 'ALL') {
      filters_.push({ id: 'tier', value: filters.tier })
    }

    return filters_
  }, [filters])

  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    // We manage sorting externally to implement the custom cycle
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Disable TanStack's built-in sort toggle so we can override it
    enableSortingRemoval: true,
    manualSorting: false,
  })

  /**
   * Custom sort-cycle handler: unsorted → desc → asc → unsorted (Req 6.4–6.6)
   * TanStack Table's default cycle is: none → asc → desc → none.
   * We override it by inspecting the current state and computing the next state.
   */
  function handleSortToggle(columnId: string) {
    setSorting((prev) => {
      const existing = prev.find((s) => s.id === columnId)

      if (!existing) {
        // unsorted → desc
        return [{ id: columnId, desc: true }]
      }
      if (existing.desc) {
        // desc → asc
        return [{ id: columnId, desc: false }]
      }
      // asc → unsorted
      return []
    })
  }

  return (
    <Table className="text-sm">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => {
              const isSortable = header.column.getCanSort()
              const sortDir = header.column.getIsSorted() // false | "asc" | "desc"

              // aria-sort value (Req 15.7–15.8)
              const ariaSort: React.AriaAttributes['aria-sort'] =
                sortDir === 'asc'
                  ? 'ascending'
                  : sortDir === 'desc'
                    ? 'descending'
                    : 'none'

              return (
                <TableHead
                  key={header.id}
                  // Req 15.6 — scope="col" on every <th>
                  scope="col"
                  aria-sort={isSortable ? ariaSort : undefined}
                  className="select-none"
                >
                  {header.isPlaceholder ? null : isSortable ? (
                    <button
                      type="button"
                      onClick={() => handleSortToggle(header.column.id)}
                      className="-mx-1 inline-flex min-h-8 items-center gap-1 rounded px-1 uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon direction={sortDir} />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-muted-foreground"
            >
              Tidak ada koin yang cocok dengan filter.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            // Req 6.15 — hover:bg-muted/50 (already in shadcn TableRow, but
            // we add it explicitly here for clarity and spec compliance)
            <TableRow
              key={row.id}
              onClick={() => open(row.original)}
              // Keyboard access: rows open the coin page like a link.
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  open(row.original)
                }
              }}
              aria-label={`Halaman koin ${coinOf(row.original.symbol)}`}
              className="cursor-pointer"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Sort icon helper
// ---------------------------------------------------------------------------

function SortIcon({
  direction,
}: {
  direction: false | 'asc' | 'desc'
}) {
  if (direction === 'asc') {
    return <ArrowUp className="h-3.5 w-3.5 text-foreground" aria-hidden />
  }
  if (direction === 'desc') {
    return <ArrowDown className="h-3.5 w-3.5 text-foreground" aria-hidden />
  }
  return (
    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
  )
}
