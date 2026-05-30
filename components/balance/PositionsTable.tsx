'use client'

import { useState } from 'react'
import { RefreshCw, Activity, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useOpenPositions, usePositionsHistory } from '@/lib/queries/positions'
import { formatPrice, formatPercent, formatTimestamp } from '@/lib/utils/format'
import { ApiError } from '@/lib/api/errors'
import type { OpenPositionResponse, ClosedPositionResponse } from '@/lib/api/types/credentials'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DASH = '—'

function num(v: number | null | undefined, formatter: (n: number) => string): string {
  return v == null ? DASH : formatter(v)
}

function SideBadge({ side }: { side: string }) {
  const isLong = side.toLowerCase() === 'long'
  return (
    <Badge
      variant="outline"
      className={
        isLong
          ? 'bg-bullish/15 text-bullish border-bullish/25 text-[11px] font-semibold uppercase tracking-wide px-2 py-0'
          : 'bg-bearish/15 text-bearish border-bearish/25 text-[11px] font-semibold uppercase tracking-wide px-2 py-0'
      }
    >
      {isLong ? 'Long' : 'Short'}
    </Badge>
  )
}

function LeverageBadge({ leverage }: { leverage: number | null }) {
  if (leverage == null) return <span className="text-muted-foreground">{DASH}</span>
  return (
    <Badge variant="outline" className="text-[11px] px-1.5 py-0 font-mono text-muted-foreground">
      {leverage}×
    </Badge>
  )
}

function ExchangeLabel({ exchange }: { exchange: string }) {
  const colors: Record<string, string> = {
    binance: 'text-yellow-500',
    okx: 'text-blue-400',
  }
  const color = colors[exchange.toLowerCase()] ?? 'text-muted-foreground'
  const label = exchange.charAt(0).toUpperCase() + exchange.slice(1).toLowerCase()
  return <span className={`text-xs font-medium ${color}`}>{label}</span>
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className={`h-4 ${j === 0 ? 'w-32' : 'w-16'}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// PnL cell — prominent display
// ---------------------------------------------------------------------------

function PnlCell({
  value,
  pct,
}: {
  value: number | null
  pct?: number | null
}) {
  if (value == null) return <span className="text-muted-foreground font-mono text-xs">{DASH}</span>

  const isPos = value > 0
  const isNeg = value < 0
  const colorClass = isPos ? 'text-bullish' : isNeg ? 'text-bearish' : 'text-foreground'

  return (
    <div className={`text-right ${colorClass}`}>
      <p className="font-mono text-xs font-semibold tabular-nums">{formatPrice(value)}</p>
      {pct != null && (
        <p className="font-mono text-[11px] tabular-nums opacity-75">{formatPercent(pct)}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Open Positions table
// ---------------------------------------------------------------------------

function OpenPositionsTable() {
  const { data, isPending, error, refetch, isFetching } = useOpenPositions()
  const apiError = error instanceof ApiError ? error : null
  const count = data?.length ?? 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-bullish/10">
            <Activity className="h-3.5 w-3.5 text-bullish" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Open Positions</h3>
              {!isPending && !error && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  {count}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Live — auto-refreshes every 15 s</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching || isPending}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Refresh open positions"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="w-full overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Symbol</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Exchange</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Side</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Entry</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Mark</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Qty</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-center">Lev.</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Unrealized PnL</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Liq. Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <SkeletonRows cols={9} />}

            {!isPending && error && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  {apiError?.kind === 'not_found'
                    ? 'No exchange credentials configured.'
                    : 'Failed to load positions. Please try again.'}
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && count === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">No open positions</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && data && data.length > 0 && data.map((pos: OpenPositionResponse, i: number) => (
              <TableRow
                key={`${pos.exchange}-${pos.symbol}-${i}`}
                className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/50 last:border-0"
              >
                <TableCell className="font-mono text-sm font-semibold py-3">{pos.symbol}</TableCell>
                <TableCell className="py-3"><ExchangeLabel exchange={pos.exchange} /></TableCell>
                <TableCell className="py-3"><SideBadge side={pos.side} /></TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatPrice(pos.entry_price)}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3">{num(pos.mark_price, formatPrice)}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3">{pos.quantity}</TableCell>
                <TableCell className="text-center py-3"><LeverageBadge leverage={pos.leverage} /></TableCell>
                <TableCell className="py-3">
                  <PnlCell value={pos.unrealized_pnl} pct={pos.unrealized_pnl_pct} />
                </TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3 text-bearish/70">
                  {num(pos.liquidation_price, formatPrice)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Position History table
// ---------------------------------------------------------------------------

function PositionHistoryTable() {
  const { data, isPending, error, refetch, isFetching } = usePositionsHistory()
  const apiError = error instanceof ApiError ? error : null
  const count = data?.length ?? 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Position History</h3>
              {!isPending && !error && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  {count}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Closed positions, most recent first</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching || isPending}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Refresh position history"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="w-full overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Symbol</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Exchange</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Side</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Entry</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Exit</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Realized PnL</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Qty</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Opened</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Closed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <SkeletonRows cols={9} />}

            {!isPending && error && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  {apiError?.kind === 'not_found'
                    ? 'No exchange credentials configured.'
                    : 'Failed to load position history. Please try again.'}
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && count === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">No closed positions yet</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && data && data.length > 0 && data.map((pos: ClosedPositionResponse) => {
              const pnl = (pos.exit_price - pos.entry_price) * pos.quantity * (pos.side === 'long' ? 1 : -1)
              return (
                <TableRow
                  key={pos.id}
                  className="hover:bg-muted/30 transition-colors duration-150 border-b border-border/50 last:border-0"
                >
                  <TableCell className="font-mono text-sm font-semibold py-3">{pos.symbol}</TableCell>
                  <TableCell className="py-3"><ExchangeLabel exchange={pos.exchange} /></TableCell>
                  <TableCell className="py-3"><SideBadge side={pos.side} /></TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatPrice(pos.entry_price)}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatPrice(pos.exit_price)}</TableCell>
                  <TableCell className="py-3"><PnlCell value={pnl} /></TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums py-3">{pos.quantity}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap py-3">
                    {formatTimestamp(pos.opened_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap py-3">
                    {formatTimestamp(pos.closed_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exported composite component
// ---------------------------------------------------------------------------

export function PositionsTable() {
  const [tab, setTab] = useState<'open' | 'history'>('open')

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Positions</CardTitle>
          {/* Tab switcher */}
          <div className="flex gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => setTab('open')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                tab === 'open'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={tab === 'open'}
            >
              <Activity className="h-3 w-3" aria-hidden="true" />
              Open
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                tab === 'history'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-pressed={tab === 'history'}
            >
              <History className="h-3 w-3" aria-hidden="true" />
              History
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tab === 'open' ? <OpenPositionsTable /> : <PositionHistoryTable />}
      </CardContent>
    </Card>
  )
}
