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
import { ExchangeLabel } from '@/components/trading/ExchangeLabel'
import { SideBadge } from '@/components/trading/SideBadge'
import { Segmented } from '@/components/ui/segmented'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { useOpenPositions, usePositionsHistory } from '@/lib/queries/positions'
import { formatPrice, formatPercent, formatQty, formatTimestamp, formatUsdSigned } from '@/lib/utils/format'
import { ApiError } from '@/lib/api/errors'
import type { OpenPositionResponse, ClosedPositionResponse } from '@/lib/api/types/credentials'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DASH = '—'

function num(v: number | null | undefined, formatter: (n: number) => string): string {
  return v == null ? DASH : formatter(v)
}

function LeverageBadge({ leverage }: { leverage: number | null }) {
  if (leverage == null) return <span className="text-muted-foreground">{DASH}</span>
  return (
    <Badge variant="muted" size="xs">
      {leverage}×
    </Badge>
  )
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
      <p className="font-mono text-xs font-semibold tabular-nums">{formatUsdSigned(value)}</p>
      {pct != null && (
        <p className="font-mono text-2xs tabular-nums opacity-75">{formatPercent(pct)}</p>
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
              <h3 className="text-sm font-semibold">Posisi terbuka</h3>
              {!isPending && !error && (
                <Badge variant="muted" size="xs">
                  {count}
                </Badge>
              )}
            </div>
            <p className="text-2xs text-muted-foreground">Live — diperbarui otomatis tiap 15 detik</p>
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
          {isFetching ? 'Memuat…' : 'Muat ulang'}
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
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground text-right">Harga likuidasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <SkeletonRows cols={9} />}

            {!isPending && error && (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <ErrorState
                    compact
                    kind={apiError?.kind ?? 'server'}
                    message={apiError?.kind === 'not_found' ? 'Belum ada API key exchange. Tambahkan di Pengaturan.' : undefined}
                    onRetry={() => refetch()}
                  />
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && count === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="p-3">
                  <EmptyState icon={<Activity className="h-8 w-8" aria-hidden="true" />} title="Tidak ada posisi terbuka" className="border-0" />
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && data && data.length > 0 && data.map((pos: OpenPositionResponse, i: number) => (
              <TableRow
                key={`${pos.exchange}-${pos.symbol}-${i}`}
                className="hover:bg-muted/30 transition-colors duration-150 border-b border-border last:border-0"
              >
                <TableCell className="font-mono text-sm font-semibold py-3">{pos.symbol}</TableCell>
                <TableCell className="py-3"><ExchangeLabel exchange={pos.exchange} /></TableCell>
                <TableCell className="py-3"><SideBadge side={pos.side} /></TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatPrice(pos.entry_price)}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3">{num(pos.mark_price, formatPrice)}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatQty(pos.quantity)}</TableCell>
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
              <h3 className="text-sm font-semibold">Riwayat posisi</h3>
              {!isPending && !error && (
                <Badge variant="muted" size="xs">
                  {count}
                </Badge>
              )}
            </div>
            <p className="text-2xs text-muted-foreground">Posisi yang sudah ditutup, terbaru di atas</p>
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
          {isFetching ? 'Memuat…' : 'Muat ulang'}
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
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Dibuka</TableHead>
              <TableHead scope="col" className="text-xs font-medium text-muted-foreground">Ditutup</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <SkeletonRows cols={9} />}

            {!isPending && error && (
              <TableRow>
                <TableCell colSpan={9} className="p-0">
                  <ErrorState
                    compact
                    kind={apiError?.kind ?? 'server'}
                    message={apiError?.kind === 'not_found' ? 'Belum ada API key exchange. Tambahkan di Pengaturan.' : undefined}
                    onRetry={() => refetch()}
                  />
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && count === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="p-3">
                  <EmptyState icon={<History className="h-8 w-8" aria-hidden="true" />} title="Belum ada posisi yang ditutup" className="border-0" />
                </TableCell>
              </TableRow>
            )}

            {!isPending && !error && data && data.length > 0 && data.map((pos: ClosedPositionResponse) => {
              const pnl = (pos.exit_price - pos.entry_price) * pos.quantity * (pos.side === 'long' ? 1 : -1)
              return (
                <TableRow
                  key={pos.id}
                  className="hover:bg-muted/30 transition-colors duration-150 border-b border-border last:border-0"
                >
                  <TableCell className="font-mono text-sm font-semibold py-3">{pos.symbol}</TableCell>
                  <TableCell className="py-3"><ExchangeLabel exchange={pos.exchange} /></TableCell>
                  <TableCell className="py-3"><SideBadge side={pos.side} /></TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatPrice(pos.entry_price)}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatPrice(pos.exit_price)}</TableCell>
                  <TableCell className="py-3"><PnlCell value={pnl} /></TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums py-3">{formatQty(pos.quantity)}</TableCell>
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
          <CardTitle className="text-base">Posisi</CardTitle>
          <Segmented
            aria-label="Tampilan posisi"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'open', label: 'Terbuka', icon: <Activity aria-hidden="true" /> },
              { value: 'history', label: 'Riwayat', icon: <History aria-hidden="true" /> },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {tab === 'open' ? <OpenPositionsTable /> : <PositionHistoryTable />}
      </CardContent>
    </Card>
  )
}
