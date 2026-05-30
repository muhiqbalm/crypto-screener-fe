'use client'
import { useEffect, useRef, useState } from 'react'
import { useTradeLog } from '@/lib/queries/webhook'
import { formatTimestamp, formatPrice } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { TradeStatusIcon } from './TradeStatusIcon'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils/cn'
import type { TradeLogResponse } from '@/lib/api/types/trades'

// ---------------------------------------------------------------------------
// Skeleton rows shown while the query is pending (Req 11.11)
// ---------------------------------------------------------------------------
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-14" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Side badge: bullish for long, bearish for short (Req 11.4–11.5)
// ---------------------------------------------------------------------------
function SideBadge({ side }: { side: TradeLogResponse['side'] }) {
  if (side === 'long') {
    return (
      <Badge
        variant="outline"
        className="bg-bullish/20 text-bullish border-bullish/30 text-xs font-semibold uppercase tracking-wide"
      >
        Long
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="bg-bearish/20 text-bearish border-bearish/30 text-xs font-semibold uppercase tracking-wide"
    >
      Short
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SignalLogsTable() {
  const { data, isPending } = useTradeLog()

  // Track previous data length to detect new entries (Req 11.10)
  const prevLengthRef = useRef<number>(0)

  // Track which failed row is expanded (Req 11.9)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Emit toast when new entries arrive
  useEffect(() => {
    if (!data) return
    const currentLength = data.length
    if (currentLength > prevLengthRef.current && data[0]) {
      notify.info(`New signal received: ${data[0].symbol}`)
    }
    prevLengthRef.current = currentLength
  }, [data])

  const handleRowClick = (row: TradeLogResponse) => {
    if (row.status !== 'failed') return
    setExpandedRowId(prev => (prev === row.id ? null : row.id))
  }

  return (
    <div className="w-full overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Timestamp</TableHead>
            <TableHead scope="col">Symbol</TableHead>
            <TableHead scope="col">Action</TableHead>
            <TableHead scope="col">Side</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Fill Price</TableHead>
            <TableHead scope="col">Qty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Pending state: 5 skeleton rows (Req 11.11) */}
          {isPending && <SkeletonRows />}

          {/* Empty state (Req 11.12) */}
          {!isPending && data && data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-muted-foreground"
              >
                No signals recorded yet
              </TableCell>
            </TableRow>
          )}

          {/* Data rows */}
          {!isPending && data && data.length > 0 && data.map(row => (
            <>
              <TableRow
                key={row.id}
                onClick={() => handleRowClick(row)}
                className={cn(
                  'transition-colors duration-200',
                  row.status === 'failed' &&
                    'cursor-pointer hover:bg-bearish/10',
                  row.status !== 'failed' && 'hover:bg-muted/50',
                )}
                aria-expanded={
                  row.status === 'failed' ? expandedRowId === row.id : undefined
                }
              >
                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {formatTimestamp(row.created_at)}
                </TableCell>
                <TableCell className="font-semibold">
                  {row.symbol}
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {row.action}
                </TableCell>
                <TableCell>
                  <SideBadge side={row.side} />
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    <TradeStatusIcon status={row.status} />
                    <span className="capitalize text-xs">{row.status}</span>
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatPrice(row.fill_price)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.filled_quantity != null
                    ? row.filled_quantity.toString()
                    : '—'}
                </TableCell>
              </TableRow>

              {/* Inline expand panel for failed rows (Req 11.9) */}
              {row.status === 'failed' && expandedRowId === row.id && (
                <TableRow key={`${row.id}-error`} className="bg-bearish/5">
                  <TableCell
                    colSpan={7}
                    className="px-4 py-3 text-xs text-bearish"
                  >
                    <span className="font-semibold">Error details: </span>
                    {row.error_details ?? 'No error details available.'}
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
