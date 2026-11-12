'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Activity, History, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { InfoTip } from '@/components/ui/info-tip'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { ExchangeLabel } from '@/components/trading/ExchangeLabel'
import { LiveHistoryNote } from '@/components/bot/LiveHistoryNote'
import { SideBadge } from '@/components/trading/SideBadge'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { useOpenPositions, usePositionsHistory } from '@/lib/queries/positions'
import { coinOf, formatPercent, formatPrice, formatQty, formatUsdSigned } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { ApiError } from '@/lib/api/errors'
import type { ClosedPositionResponse, OpenPositionResponse } from '@/lib/api/types/credentials'

const DASH = '—'

function num(v: number | null | undefined, formatter: (n: number) => string): string {
  return v == null ? DASH : formatter(v)
}

function PnlCell({ value, pct }: { value: number | null; pct?: number | null }) {
  if (value == null) return <span className="font-mono text-[14px] text-muted-foreground">{DASH}</span>
  const colorClass = value > 0 ? 'text-bullish' : value < 0 ? 'text-bearish' : 'text-foreground'
  return (
    <div className={`text-right ${colorClass}`}>
      <p className="num text-[15px] font-semibold">{formatUsdSigned(value)}</p>
      {pct != null && <p className="font-mono text-[13px] tabular-nums opacity-75">{formatPercent(pct)}</p>}
    </div>
  )
}

/** Coin + exchange in one cell (avatar, coin, exchange under it); the raw symbol stays in the tooltip. */
function CoinCell({ symbol, exchange }: { symbol: string; exchange: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5" title={symbol}>
      <CoinAvatar symbol={symbol} size="sm" />
      <div className="min-w-0 leading-tight">
        <p className="text-base font-bold">{coinOf(symbol)}</p>
        <ExchangeLabel exchange={exchange} className="text-2xs text-muted-foreground" />
      </div>
    </div>
  )
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const missingKey = error instanceof ApiError && error.kind === 'not_found'
  return missingKey ? (
    <EmptyState
      title="Belum ada API key exchange"
      description="Posisi dibaca dari exchange memakai API key akunmu."
      action={
        <Button asChild size="sm" variant="outline">
          <Link href="/settings">Buka Akun & koneksi</Link>
        </Button>
      }
    />
  ) : (
    <ErrorState compact error={error} onRetry={onRetry} message="Posisi belum bisa dimuat." />
  )
}

const OPEN_COLUMNS: ResponsiveColumn<OpenPositionResponse>[] = [
  { key: 'koin', header: 'Koin', mobile: 'title', cell: (p) => <CoinCell symbol={p.symbol} exchange={p.exchange} /> },
  { key: 'arah', header: 'Arah', mobile: 'badge', cell: (p) => <SideBadge side={p.side} /> },
  // Phone card order = column order: result and liquidation first (audit P1).
  {
    key: 'upnl',
    header: <Term k="upnl" short />,
    mobileLabel: 'Untung/rugi',
    align: 'right', className: 'px-3', headerClassName: 'px-3',
    mobile: 'field',
    mobileSpan: 'full',
    cell: (p) => <PnlCell value={p.unrealized_pnl} pct={p.unrealized_pnl_pct} />,
  },
  {
    key: 'likuidasi',
    header: <Term k="liq_price" short />,
    mobileLabel: 'Likuidasi',
    align: 'right', className: 'px-3', headerClassName: 'px-3',
    mobile: 'field',
    cell: (p) => <span className="num text-[14px]">{num(p.liquidation_price, formatPrice)}</span>,
  },
  {
    key: 'lev',
    header: <Term k="leverage" short noTip />,
    mobileLabel: 'Leverage',
    align: 'center', className: 'px-3', headerClassName: 'px-3',
    mobile: 'field',
    cell: (p) =>
      p.leverage == null ? (
        <span className="text-muted-foreground">{DASH}</span>
      ) : (
        <Badge variant="muted" size="xs">
          {p.leverage}×
        </Badge>
      ),
  },
  { key: 'jumlah', header: 'Jumlah', align: 'right', className: 'px-3', headerClassName: 'px-3', mobile: 'field', cell: (p) => <span className="num text-[14px]">{formatQty(p.quantity)}</span> },
  {
    key: 'entry',
    header: (
      <Term k="entry" noTip>
        Harga masuk
      </Term>
    ),
    mobileLabel: 'Harga masuk',
    align: 'right', className: 'px-3', headerClassName: 'px-3',
    mobile: 'field',
    cell: (p) => <span className="num text-[14px]">{formatPrice(p.entry_price)}</span>,
  },
  {
    key: 'mark',
    header: <Term k="mark_price">Harga acuan</Term>,
    mobileLabel: 'Harga acuan',
    align: 'right', className: 'px-3', headerClassName: 'px-3',
    mobile: 'field',
    cell: (p) => <span className="num text-[14px]">{num(p.mark_price, formatPrice)}</span>,
  },
]

function pnlOf(p: ClosedPositionResponse): number {
  return (p.exit_price - p.entry_price) * p.quantity * (p.side === 'long' ? 1 : -1)
}

const HISTORY_COLUMNS: ResponsiveColumn<ClosedPositionResponse>[] = [
  { key: 'koin', header: 'Koin', mobile: 'title', cell: (p) => <CoinCell symbol={p.symbol} exchange={p.exchange} /> },
  { key: 'arah', header: 'Arah', mobile: 'badge', cell: (p) => <SideBadge side={p.side} /> },
  {
    key: 'pnl',
    header: <Term k="realized_pnl" short />,
    mobileLabel: 'Untung/rugi',
    align: 'right',
    mobile: 'field',
    mobileSpan: 'full',
    cell: (p) => <PnlCell value={pnlOf(p)} />,
  },
  { key: 'entry', header: 'Harga masuk', align: 'right', mobile: 'field', cell: (p) => <span className="num text-[14px]">{formatPrice(p.entry_price)}</span> },
  { key: 'exit', header: 'Harga keluar', align: 'right', mobile: 'field', cell: (p) => <span className="num text-[14px]">{formatPrice(p.exit_price)}</span> },
  { key: 'jumlah', header: 'Jumlah', align: 'right', mobile: 'field', cell: (p) => <span className="num text-[14px]">{formatQty(p.quantity)}</span> },
  { key: 'buka', header: 'Dibuka (WIB)', mobile: 'hidden', cell: (p) => <span className="num whitespace-nowrap text-[14px] text-muted-foreground">{formatTime(p.opened_at, { zone: false })}</span> },
  { key: 'tutup', header: 'Ditutup (WIB)', mobile: 'field', mobileSpan: 'full', cell: (p) => <span className="num whitespace-nowrap text-[14px] text-muted-foreground">{formatTime(p.closed_at, { zone: false })}</span> },
]

function SectionTitle({
  icon,
  title,
  count,
  sub,
  onRefresh,
  busy,
  label,
}: {
  icon: React.ReactNode
  title: string
  count: number | null
  sub: React.ReactNode
  onRefresh: () => void
  busy: boolean
  label: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-semibold">{title}</h3>
            {count !== null && (
              <Badge variant="muted" size="xs">
                {count}
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={busy} className="h-7 gap-1.5 text-[14px] text-muted-foreground hover:text-foreground" aria-label={label}>
        <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
        {busy ? 'Memuat…' : 'Muat ulang'}
      </Button>
    </div>
  )
}

function OpenPositions() {
  const { data, isPending, error, refetch, isFetching, dataUpdatedAt } = useOpenPositions()
  const rows = data ?? []
  return (
    <div className="space-y-3">
      <SectionTitle
        icon={<Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
        title="Posisi terbuka"
        count={!isPending && !error ? rows.length : null}
        sub={
          <>
            Dari exchange, diperbarui otomatis tiap 15 detik{dataUpdatedAt ? ` · terakhir ${formatAge(dataUpdatedAt, { seconds: true })}` : ''}
          </>
        }
        onRefresh={() => refetch()}
        busy={isFetching || isPending}
        label="Muat ulang posisi terbuka"
      />
      {isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : error ? (
        <LoadError error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <ResponsiveTable
            rows={rows}
            columns={OPEN_COLUMNS}
            mobileFields={6}
            rowKey={(p, i) => `${p.exchange}-${p.symbol}-${i}`}
            caption="Posisi terbuka di exchange"
            empty={<EmptyState icon={<Activity className="h-8 w-8" aria-hidden="true" />} title="Tidak ada posisi terbuka" />}
          />
          {rows.length > 0 && (
            <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
              Persen untung/rugi berjalan dibanding nilai posisi saat masuk (harga masuk × jumlah), tanpa leverage.
              <InfoTip title="Untung/rugi berjalan">
                Angka dolar dari exchange di harga acuan (mark). Persennya dihitung server: untung/rugi ÷ (harga masuk × jumlah).
              </InfoTip>
            </p>
          )}
        </>
      )}
    </div>
  )
}

function PositionHistory() {
  const { data, isPending, error, refetch, isFetching } = usePositionsHistory()
  const rows = data ?? []
  return (
    <div className="space-y-3">
      <SectionTitle
        icon={<History className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
        title="Riwayat posisi"
        count={!isPending && !error ? rows.length : null}
        sub="Dari catatan bot (posisi yang dibuka bot), terbaru di atas"
        onRefresh={() => refetch()}
        busy={isFetching || isPending}
        label="Muat ulang riwayat posisi"
      />
      <LiveHistoryNote />
      {isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : error ? (
        <LoadError error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <ResponsiveTable
            rows={rows}
            columns={HISTORY_COLUMNS}
            mobileFields={5}
            rowKey={(p) => p.id}
            caption="Posisi yang sudah ditutup"
            empty={<EmptyState icon={<History className="h-8 w-8" aria-hidden="true" />} title="Belum ada posisi yang ditutup" />}
          />
          {rows.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              Untung/rugi tertutup adalah perkiraan dari harga masuk dan keluar, belum termasuk fee dan funding, jadi bisa beda dengan angka di
              exchange.
            </p>
          )}
        </>
      )}
    </div>
  )
}

/** Open positions (exchange, polled 15 s) and closed positions (bot records). Same queries as before. */
export function PositionsTable() {
  const [tab, setTab] = useState<'open' | 'history'>('open')
  return (
    <Card className="rounded-3xl">
      <CardHeader className="px-6 pb-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-[20px]">
            Posisi <StatusPill kind="live" size="xs" />
          </CardTitle>
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
      <CardContent className="px-6 pb-6 pt-0">{tab === 'open' ? <OpenPositions /> : <PositionHistory />}</CardContent>
    </Card>
  )
}
