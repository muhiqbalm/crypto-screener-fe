'use client'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import { useTradeLog } from '@/lib/queries/webhook'
import { formatTimestamp, formatPrice } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { TradeStatusIcon } from './TradeStatusIcon'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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

function SideBadge({ side }: { side: TradeLogResponse['side'] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[11px] font-semibold uppercase tracking-wide px-2 py-0',
        side === 'long'
          ? 'bg-bullish/15 text-bullish border-bullish/25'
          : 'bg-bearish/15 text-bearish border-bearish/25'
      )}
    >
      {side}
    </Badge>
  )
}

export function SignalLogsTable() {
  const { data, isPending } = useTradeLog()

  const prevLengthRef = useRef<number | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    const currentLength = data.length
    if (prevLengthRef.current !== null && currentLength > prevLengthRef.current && data[0]) {
      notify.info(`New signal received: ${data[0].symbol}`)
    }
    prevLengthRef.current = currentLength
  }, [data])

  const handleRowClick = (row: TradeLogResponse) => {
    if (row.status !== 'failed') return
    setExpandedRowId(prev => (prev === row.id ? null : row.id))
  }

  const count = data?.length ?? 0

  return (
    <Card className="overflow-hidden">
      <div className="h-0.5 w-full bg-muted" />
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Signal Logs</CardTitle>
          {!isPending && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              {count}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Auto-refreshes every 15 s
        </p>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground pl-6">Timestamp</TableHead>
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Symbol</TableHead>
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Action</TableHead>
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Side</TableHead>
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Fill Price</TableHead>
                <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right pr-6">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && <SkeletonRows />}

              {!isPending && data && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Activity className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground">No signals recorded yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!isPending && data && data.length > 0 && data.map(row => (
                <Fragment key={row.id}>
                  <TableRow
                    onClick={() => handleRowClick(row)}
                    className={cn(
                      'transition-colors duration-150 border-b border-border/50 last:border-0',
                      row.status === 'failed' && 'cursor-pointer hover:bg-bearish/8',
                      row.status !== 'failed' && 'hover:bg-muted/30',
                    )}
                    aria-expanded={row.status === 'failed' ? expandedRowId === row.id : undefined}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground py-3 pl-6">
                      {formatTimestamp(row.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold py-3">
                      {row.symbol}
                    </TableCell>
                    <TableCell className="capitalize text-xs text-muted-foreground py-3">
                      {row.action}
                    </TableCell>
                    <TableCell className="py-3">
                      <SideBadge side={row.side} />
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <TradeStatusIcon status={row.status} />
                        <span className="capitalize text-xs">{row.status}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs py-3">
                      {formatPrice(row.fill_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs py-3 pr-6">
                      {row.filled_quantity != null ? row.filled_quantity.toString() : '—'}
                    </TableCell>
                  </TableRow>

                  {row.status === 'failed' && expandedRowId === row.id && (
                    <TableRow key={`${row.id}-error`} className="bg-bearish/5 border-b border-bearish/15">
                      <TableCell colSpan={7} className="px-6 py-3 text-xs text-bearish">
                        <span className="font-semibold">Error: </span>
                        {row.error_details ?? 'No error details available.'}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
