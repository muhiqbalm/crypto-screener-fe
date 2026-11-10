'use client'

import { RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { ExchangeLabel } from '@/components/trading/ExchangeLabel'
import { useBalance } from '@/lib/queries/credentials'
import { formatAmount, formatUsd, isUsdStable } from '@/lib/utils/format'
import type { ExchangeBalanceResponse } from '@/lib/api/types/credentials'

// ---------------------------------------------------------------------------
// Single asset row
// ---------------------------------------------------------------------------

function AssetRow({ item }: { item: ExchangeBalanceResponse }) {
  const usedPct = item.total > 0 ? (item.used / item.total) * 100 : 0

  return (
    <div className="group flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-muted/40">
      {/* Currency + account type */}
      <div className="w-28 shrink-0">
        <p className="font-mono text-sm font-semibold leading-none">{item.currency}</p>
        <p className="mt-0.5 text-2xs text-muted-foreground capitalize">{item.account_type}</p>
      </div>

      {/* Usage bar */}
      <div className="flex-1 hidden sm:block">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/40 transition-all duration-500"
            style={{ width: `${Math.min(usedPct, 100)}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Values */}
      <div className="flex items-center gap-6 text-right shrink-0">
        <div className="w-24">
          <p className="truncate font-mono text-sm font-semibold tabular-nums text-bullish">{formatAmount(item.free, item.currency)}</p>
        </div>
        <div className="w-24 hidden md:block">
          <p className="truncate font-mono text-sm font-semibold tabular-nums text-bearish">{formatAmount(item.used, item.currency)}</p>
        </div>
        <div className="w-28">
          <p className="truncate font-mono text-sm font-semibold tabular-nums">{formatAmount(item.total, item.currency)}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-exchange card
// ---------------------------------------------------------------------------

function ExchangeBalanceCard({
  exchange,
  items,
}: {
  exchange: string
  items: ExchangeBalanceResponse[]
}) {
  // Wallet amounts are in each currency's own unit (backend returns raw
  // balances, not USD values), so only USD stablecoins can be summed.
  const total = items.filter((i) => isUsdStable(i.currency)).reduce((sum, i) => sum + i.total, 0)
  const assetCount = items.length

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              <ExchangeLabel exchange={exchange} className="text-base font-semibold" />
            </CardTitle>
            <Badge variant="muted" size="xs">
              {assetCount} aset
            </Badge>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold tabular-nums">{formatUsd(total)}</p>
            <p className="text-2xs text-muted-foreground">total stablecoin (USD)</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada aset</p>
        ) : (
          <div>
            {/* Column header */}
            <div className="flex items-center gap-4 px-3 pb-1">
              <span className="w-28 text-2xs font-medium text-muted-foreground uppercase tracking-wider">Aset</span>
              <span className="flex-1 hidden sm:block" />
              <div className="flex items-center gap-6 text-right shrink-0">
                <span className="w-24 text-2xs font-medium text-muted-foreground uppercase tracking-wider">Free</span>
                <span className="w-24 hidden md:block text-2xs font-medium text-muted-foreground uppercase tracking-wider">Terpakai</span>
                <span className="w-28 text-2xs font-medium text-muted-foreground uppercase tracking-wider">Total</span>
              </div>
            </div>
            {items.map((item, i) => (
              <AssetRow
                key={`${item.exchange}-${item.currency}-${item.account_type}-${i}`}
                item={item}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Portfolio summary strip
// ---------------------------------------------------------------------------

function PortfolioSummary({
  total,
  exchangeCount,
  onRefresh,
  isFetching,
}: {
  total: number
  exchangeCount: number
  onRefresh: () => void
  isFetching: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">Total stablecoin (USD)</p>
          <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">{formatUsd(total)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{exchangeCount} exchange terhubung</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="gap-1.5 transition-colors duration-200"
          aria-label="Refresh balance"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {isFetching ? 'Memuat…' : 'Muat ulang'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function BalanceSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary strip skeleton */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-4 shadow-xs">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-36" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      {/* Exchange cards skeleton */}
      {[0, 1].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-7 w-28" />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-1 space-y-1">
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex items-center gap-4 px-3 py-2.5">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-1.5 flex-1 hidden sm:block" />
                <div className="flex gap-6">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20 hidden md:block" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main BalanceCard component
// ---------------------------------------------------------------------------

export function BalanceCard() {
  const { data, isPending, error, refetch, isFetching } = useBalance()

  if (isPending) return <BalanceSkeleton />

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorPanel
            kind={(error as { kind?: string }).kind === 'not_found' ? 'not_found' : 'server'}
            onRetry={() => refetch()}
            messageOverride={
              (error as { kind?: string }).kind === 'not_found'
                ? 'Belum ada API key exchange. Tambahkan di Pengaturan.'
                : undefined
            }
          />
        </CardContent>
      </Card>
    )
  }

  const balances = data?.balances ?? []

  if (balances.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyPanel message="Belum ada data saldo. Pastikan API key exchange sudah diisi dan punya izin baca." />
        </CardContent>
      </Card>
    )
  }

  // Group by exchange
  const byExchange = balances.reduce<Record<string, ExchangeBalanceResponse[]>>((acc, item) => {
    const key = item.exchange.toLowerCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const grandTotal = balances.filter((i) => isUsdStable(i.currency)).reduce((sum, i) => sum + i.total, 0)
  const exchangeCount = Object.keys(byExchange).length

  return (
    <div className="space-y-4">
      <PortfolioSummary
        total={grandTotal}
        exchangeCount={exchangeCount}
        onRefresh={refetch}
        isFetching={isFetching}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Object.entries(byExchange).map(([exchange, items]) => (
          <ExchangeBalanceCard key={exchange} exchange={exchange} items={items} />
        ))}
      </div>
    </div>
  )
}
