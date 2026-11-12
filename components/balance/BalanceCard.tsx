'use client'

import Link from 'next/link'
import { RefreshCw, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { LiveDot } from '@/components/bot/kit/LiveDot'
import { HeroCard, IconBadge } from '@/components/bot/kit/Tiles'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { ExchangeLabel } from '@/components/trading/ExchangeLabel'
import { useBalance } from '@/lib/queries/credentials'
import { formatAmount, formatUsd, isUsdStable } from '@/lib/utils/format'
import { formatAge } from '@/lib/utils/time'
import { ApiError } from '@/lib/api/errors'
import type { ExchangeBalanceResponse } from '@/lib/api/types/credentials'

function SettingsLink() {
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/settings">Buka Akun & koneksi</Link>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// One asset: a row on wide screens, two lines on phones (nothing cut off)
// ---------------------------------------------------------------------------

function AssetRow({ item }: { item: ExchangeBalanceResponse }) {
  const usedPct = item.total > 0 ? (item.used / item.total) * 100 : 0
  return (
    <div className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-3 hover:bg-muted/40 sm:grid-cols-[7rem_minmax(0,1fr)_6.5rem_6.5rem_7.5rem]">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-none">{item.currency}</p>
        <p className="mt-0.5 text-[13px] capitalize text-muted-foreground">{item.account_type}</p>
      </div>
      <div className="hidden sm:block" aria-hidden="true">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${Math.min(usedPct, 100)}%` }} />
        </div>
      </div>
      {/* Free and margin-in-use are neutral: neither is a gain or a loss. */}
      <p className="num hidden truncate text-right text-[15px] sm:block">{formatAmount(item.free, item.currency)}</p>
      <p className="num hidden truncate text-right text-[15px] text-muted-foreground sm:block">{formatAmount(item.used, item.currency)}</p>
      <p className="num truncate text-right text-[15px] font-semibold">{formatAmount(item.total, item.currency)}</p>
      <p className="col-span-2 font-mono text-[13px] tabular-nums text-muted-foreground sm:hidden">
        Bebas {formatAmount(item.free, item.currency)} · dipakai margin {formatAmount(item.used, item.currency)}
      </p>
    </div>
  )
}

function ExchangeBalanceCard({ exchange, items }: { exchange: string; items: ExchangeBalanceResponse[] }) {
  // Wallet amounts are in each currency's own unit (backend returns raw balances, not USD
  // values), so only USD stablecoins can be summed.
  const total = items.filter((i) => isUsdStable(i.currency)).reduce((sum, i) => sum + i.total, 0)
  return (
    <Card className="overflow-hidden rounded-3xl">
      <CardHeader className="px-6 pb-3 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-[17px]">
              <ExchangeLabel exchange={exchange} className="text-[17px] font-semibold" />
            </CardTitle>
            <Badge variant="muted" size="xs">
              {items.length} aset
            </Badge>
          </div>
          <div className="text-right">
            <p className="num text-[30px] font-bold leading-none tracking-tight">{formatUsd(total)}</p>
            <p className="text-[13px] text-muted-foreground">
              <Term k="stablecoin_total" noTip />
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-5 pt-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-muted-foreground">Tidak ada aset</p>
        ) : (
          <div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-3 pb-1 text-[13px] font-medium uppercase tracking-wider text-muted-foreground sm:grid-cols-[7rem_minmax(0,1fr)_6.5rem_6.5rem_7.5rem]">
              <span>Aset</span>
              <span className="hidden sm:block" />
              <span className="hidden text-right sm:block">Bebas</span>
              <span className="hidden text-right sm:block">Dipakai margin</span>
              <span className="text-right">Total</span>
            </div>
            {items.map((item, i) => (
              <AssetRow key={`${item.exchange}-${item.currency}-${item.account_type}-${i}`} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PortfolioSummary({
  total,
  exchangeCount,
  updatedAt,
  onRefresh,
  isFetching,
}: {
  total: number
  exchangeCount: number
  updatedAt: number
  onRefresh: () => void
  isFetching: boolean
}) {
  return (
    <HeroCard glow="info" aria-label="Total stablecoin">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconBadge icon={Wallet} />
          <p className="flex items-center gap-2 text-[17px] font-semibold">
            <Term k="stablecoin_total" />
          </p>
        </div>
        <span className="inline-flex items-center gap-2">
          <LiveDot tone="ok" label="Data live dari exchange" />
          <StatusPill kind="live" size="sm" />
        </span>
      </div>
      <p className="num mt-5 text-[48px] font-bold leading-none tracking-tight sm:text-[56px]">{formatUsd(total)}</p>
      <p className="mt-3 text-[15px] text-muted-foreground">Hanya USDT, USDC dan sejenisnya; bukan ekuitas akun.</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <span className="text-[14px] text-muted-foreground">
          {exchangeCount} exchange terhubung{updatedAt ? ` · diperbarui ${formatAge(updatedAt, { seconds: true })}` : ''}
        </span>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching} className="gap-1.5 rounded-full" aria-label="Muat ulang saldo">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isFetching ? 'Memuat…' : 'Muat ulang'}
        </Button>
      </div>
    </HeroCard>
  )
}

function BalanceSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-20 w-full rounded-xl" />
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  )
}

/** Balances per exchange, read live from the exchange. Same query (useBalance) as before. */
export function BalanceCard() {
  const { data, isPending, error, refetch, isFetching, dataUpdatedAt } = useBalance()

  if (isPending) return <BalanceSkeleton />

  if (error) {
    const missingKey = error instanceof ApiError && error.kind === 'not_found'
    return (
      <Card>
        <CardContent className="pt-6">
          {missingKey ? (
            <EmptyState
              title="Belum ada API key exchange"
              description="Saldo dibaca langsung dari exchange memakai API key akunmu. Tambahkan key dulu."
              action={<SettingsLink />}
            />
          ) : (
            <ErrorState error={error} onRetry={() => refetch()} message="Saldo belum bisa dibaca dari exchange." action={<SettingsLink />} />
          )}
        </CardContent>
      </Card>
    )
  }

  const balances = data?.balances ?? []

  if (balances.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            title="Belum ada data saldo"
            description="Pastikan API key exchange sudah diisi dan punya izin membaca saldo."
            action={<SettingsLink />}
          />
        </CardContent>
      </Card>
    )
  }

  const byExchange = balances.reduce<Record<string, ExchangeBalanceResponse[]>>((acc, item) => {
    const key = item.exchange.toLowerCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const grandTotal = balances.filter((i) => isUsdStable(i.currency)).reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="space-y-4">
      <PortfolioSummary
        total={grandTotal}
        exchangeCount={Object.keys(byExchange).length}
        updatedAt={dataUpdatedAt}
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
