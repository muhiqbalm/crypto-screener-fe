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
import {
  formatPrice,
  formatVolume,
  formatFunding,
  formatScore,
  valueOrDash,
} from '@/lib/utils/format'
import { useColumnVisibility } from '@/lib/utils/use-column-visibility'
import type { AssetDetail } from '@/lib/api/types/screener'
import type { ScreenerFilterState } from '@/components/screener/ScreenerFilters'
import { cn } from '@/lib/utils/cn'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<AssetDetail>[] = [
  {
    id: 'rank',
    accessorKey: 'rank',
    header: '#',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {valueOrDash(getValue<number | null>())}
      </span>
    ),
  },
  {
    id: 'symbol',
    accessorKey: 'symbol',
    header: 'Symbol',
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="font-semibold tracking-wide">
        {getValue<string>()}
      </span>
    ),
    // Custom filter function for case-insensitive substring match (Req 6.7–6.8)
    filterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue) return true
      return row.original.symbol
        .toLowerCase()
        .includes(filterValue.toLowerCase())
    },
  },
  {
    id: 'price',
    accessorKey: 'price',
    header: 'Price',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums">
        {formatPrice(getValue<number | null>())}
      </span>
    ),
  },
  {
    id: 'change_24h',
    accessorKey: 'change_24h',
    header: '24h %',
    enableSorting: true,
    cell: ({ getValue }) => (
      <ChangeCell value={getValue<number | null>()} />
    ),
  },
  {
    id: 'volume_24h',
    accessorKey: 'volume_24h',
    header: 'Volume',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums">
        {formatVolume(getValue<number | null>())}
      </span>
    ),
  },
  {
    id: 'funding_rate',
    accessorKey: 'funding_rate',
    header: 'Funding',
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums text-xs">
        {formatFunding(getValue<number | null>())}
      </span>
    ),
  },
  {
    id: 'signal',
    accessorKey: 'signal',
    header: 'Signal',
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalBadge signal={getValue<AssetDetail['signal']>()} />
    ),
    // Equality filter for signal (Req 6.9–6.10)
    filterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue || filterValue === 'ALL') return true
      return row.original.signal === filterValue
    },
  },
  {
    id: 'composite_score',
    accessorKey: 'composite_score',
    header: 'Score',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums">
        {formatScore(getValue<number | null>())}
      </span>
    ),
  },
  {
    id: 'tier',
    accessorKey: 'tier',
    header: 'Tier',
    enableSorting: false,
    cell: ({ getValue }) => (
      <TierBadge tier={getValue<AssetDetail['tier']>()} />
    ),
    // Equality filter for tier (Req 6.11–6.12)
    filterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue || filterValue === 'ALL') return true
      return row.original.tier === filterValue
    },
  },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScreenerTableProps {
  data: AssetDetail[]
  filters: ScreenerFilterState
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreenerTable({ data, filters }: ScreenerTableProps) {
  const visibleColumns = useColumnVisibility()

  // Build TanStack column visibility state from the Set<ColumnId> (Req 14.1–14.3)
  const columnVisibility = React.useMemo<VisibilityState>(() => {
    const state: VisibilityState = {}
    for (const col of columns) {
      const id = col.id as string
      state[id] = visibleColumns.has(id as Parameters<typeof visibleColumns.has>[0])
    }
    return state
  }, [visibleColumns])

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
    <Table>
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
                  className={cn(
                    'whitespace-nowrap select-none',
                    isSortable &&
                      'cursor-pointer transition-colors duration-200 hover:text-foreground',
                  )}
                  onClick={
                    isSortable
                      ? () => handleSortToggle(header.column.id)
                      : undefined
                  }
                >
                  {header.isPlaceholder ? null : (
                    <span className="inline-flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {isSortable && (
                        <SortIcon direction={sortDir} />
                      )}
                    </span>
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
              No results.
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            // Req 6.15 — hover:bg-muted/50 (already in shadcn TableRow, but
            // we add it explicitly here for clarity and spec compliance)
            <TableRow
              key={row.id}
              className="hover:bg-muted/50 transition-colors duration-200"
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
