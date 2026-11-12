'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, RefreshCw, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState } from '@/components/lab/Section'
import { CoinAvatar, TitledPanel } from '@/components/market/ui'
import { signClass } from '@/components/lab/LabBadges'
import { Sparkline } from '@/components/market/Sparkline'
import { InfoTip } from '@/components/ui/info-tip'
import { Freshness } from '@/components/ui/freshness'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatScore } from '@/lib/utils/format'
import { termLabel } from '@/lib/glossary'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { coinLabel, koinHref } from '@/lib/lab/outlook'
import { useIsLabAdmin, useKoinStrength, useRefreshKoinStrength } from '@/lib/queries/outlook'
import type { StrengthRow } from '@/lib/api/types/universal'

export type StrengthSortKey =
  | 'rank'
  | 'symbol'
  | 'ret_1d_pct'
  | 'ret_7d_pct'
  | 'ret_30d_pct'
  | 'ret_90d_pct'
  | 'vol_ann_pct'
  | 'ema_dist_pct'
  | 'funding_7d_apr_pct'
  | 'target_weight_pct'

/** Nulls always sort last, whatever the direction. */
export function sortStrength(rows: StrengthRow[], key: StrengthSortKey, desc: boolean): StrengthRow[] {
  const out = [...rows]
  out.sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1
    if (vb === null || vb === undefined) return -1
    const c = typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number)
    return desc ? -c : c
  })
  return out
}

type Filter = 'all' | 'up' | 'down'

const COLS: { key: StrengthSortKey; label: string; hide?: string; right?: boolean }[] = [
  { key: 'rank', label: '#' },
  { key: 'symbol', label: 'Koin' },
  { key: 'ret_1d_pct', label: '1 hari', hide: 'hidden md:table-cell', right: true },
  { key: 'ret_7d_pct', label: '7 hari', right: true },
  { key: 'ret_30d_pct', label: '30 hari', hide: 'hidden sm:table-cell', right: true },
  { key: 'ret_90d_pct', label: '90 hari', hide: 'hidden lg:table-cell', right: true },
  { key: 'vol_ann_pct', label: 'Gejolak/thn', hide: 'hidden lg:table-cell', right: true },
  { key: 'ema_dist_pct', label: 'Tren', right: true },
  { key: 'funding_7d_apr_pct', label: termLabel('funding_apr_7d'), hide: 'hidden xl:table-cell', right: true },
]

const th = 'eyebrow px-4 py-3'
const td = 'px-4 py-3.5'

export function StrengthTable() {
  const q = useKoinStrength()
  const admin = useIsLabAdmin()
  const refresh = useRefreshKoinStrength()
  const [sort, setSort] = useState<{ key: StrengthSortKey; desc: boolean }>({ key: 'rank', desc: false })
  const [filter, setFilter] = useState<Filter>('all')
  const all = useMemo(() => q.data?.rows ?? [], [q.data])
  const rows = useMemo(() => {
    const f = filter === 'all' ? all : all.filter((r) => r.trend === filter)
    return sortStrength(f, sort.key, sort.desc)
  }, [all, sort, filter])
  const busy = q.data?.refresh?.status === 'queued' || q.data?.refresh?.status === 'running'
  const eligible = all.filter((r) => r.eligible).length

  const toggle = (key: StrengthSortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'rank' && key !== 'symbol' }))

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: () => notify.info('Pembaruan dijadwalkan', { description: 'Dihitung ulang di worker Lab (±1–2 menit).' }),
      onError: (e) => notify.error('Gagal menjadwalkan', { description: apiErrorDetail(e) ?? undefined }),
    })

  const top = sortStrength(all.filter((r) => r.eligible), 'rank', false).slice(0, 3)

  return (
    <TitledPanel
      title="Terkuat"
      icon={Trophy}
      action={admin ? (
        <Button variant="outline" onClick={onRefresh} disabled={busy || refresh.isPending} className="h-9 gap-2 rounded-full px-4 text-sm">
          <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
          {busy ? 'Memperbarui…' : 'Perbarui sekarang'}
        </Button>
      ) : undefined}
    >
      {top.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Paling kuat sekarang</span>
          {top.map((r, i) => (
            <Link key={r.symbol} href={koinHref(r.symbol)} className="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-base font-semibold hover:bg-muted/50">
              <CoinAvatar symbol={r.symbol} />
              <span className="num text-2xs text-muted-foreground">#{r.rank ?? i + 1}</span>{coinLabel(r.symbol)}
            </Link>
          ))}
          <span className="text-2xs text-muted-foreground">dari {eligible} koin · bukan perintah beli</span>
        </div>
      )}
      <Freshness className="mb-3" dataLabel="Data close 4H" dataAt={q.data?.last_bar_close ?? null} updatedAt={q.data?.computed_at} timeframe="4h" nextDelayMin={4} />
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter">
        {([['all', 'Semua'], ['up', 'Tren naik'], ['down', 'Tren turun']] as const).map(([v, label]) => (
          <Chip key={v} active={filter === v} onClick={() => setFilter(v)} className="h-9 px-4 text-sm">{label}</Chip>
        ))}
      </div>
      {q.isPending ? (
        <div className="space-y-2" aria-busy="true">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
      ) : q.error ? (
        <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat peringkat Terkuat." />
      ) : all.length === 0 ? (
        <EmptyState
          title="Belum ada data peringkat"
          description={busy ? 'Sedang dihitung pertama kali — halaman update otomatis.' : 'Data dihitung otomatis setelah setiap close candle 4 jam.'}
        />
      ) : (
        <div className="-mx-6 overflow-x-auto sm:mx-0 sm:rounded-2xl sm:border sm:border-border/60">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className={cn(th, c.right ? 'text-right' : 'text-left', c.hide)}
                    aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
                    <button type="button" onClick={() => toggle(c.key)} className="inline-flex min-h-8 items-center gap-1 uppercase hover:text-foreground">
                      {c.label}
                      {sort.key === c.key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
                <th className={cn(th, 'hidden text-right sm:table-cell')}>30 hari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((r) => (
                <tr key={r.symbol} className={cn('transition-colors hover:bg-muted/30', !r.eligible && 'opacity-60')}>
                  <td className={cn(td, 'num text-sm font-bold text-muted-foreground')}>{r.rank ?? '—'}</td>
                  <td className={td}>
                    <Link href={koinHref(r.symbol)} className="flex items-center gap-3 hover:underline">
                      <CoinAvatar symbol={r.symbol} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{coinLabel(r.symbol)}</span>
                        <span className="num block text-2xs text-muted-foreground">
                          {formatPrice(r.price)}
                          {!r.eligible && ' · data < 120 hari'}
                        </span>
                      </span>
                    </Link>
                  </td>
                  {(['ret_1d_pct', 'ret_7d_pct', 'ret_30d_pct', 'ret_90d_pct'] as const).map((k, i) => (
                    <td key={k} className={cn(td, 'num text-right text-sm font-medium', signClass(r[k]), COLS[i + 2].hide)}>{formatPercent(r[k], 1)}</td>
                  ))}
                  <td className={cn(td, 'num hidden text-right text-sm lg:table-cell')}>{r.vol_ann_pct === null ? '—' : `${formatScore(r.vol_ann_pct, 0)}%`}</td>
                  <td className={cn(td, 'text-right')}>
                    <span className={cn('num inline-flex items-center gap-1 text-sm font-medium', r.trend === 'up' ? 'text-bullish' : r.trend === 'down' ? 'text-bearish' : 'text-muted-foreground')}>
                      {r.trend === 'up' ? <TrendingUp className="h-4 w-4" aria-label="naik" /> : r.trend === 'down' ? <TrendingDown className="h-4 w-4" aria-label="turun" /> : null}
                      {formatPercent(r.ema_dist_pct, 1)}
                    </span>
                  </td>
                  <td className={cn(td, 'num hidden text-right text-sm xl:table-cell', signClass(r.funding_7d_apr_pct === null ? null : -r.funding_7d_apr_pct))}>
                    {formatPercent(r.funding_7d_apr_pct, 1)}
                    {r.funding_7d_apr_pct !== null && <span className="text-2xs font-normal text-muted-foreground">/thn</span>}
                  </td>
                  <td className={cn(td, 'hidden text-right sm:table-cell')}><Sparkline values={r.spark} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
        <InfoTip label="Cara membaca Terkuat">
          Skor = rata-rata momentum 7, 30 dan 90 hari yang disesuaikan gejolak harga. Tren = harga dibanding rata-rata
          harga 50 hari. Funding 7 hari ditulis per tahun (positif = long membayar). Koin dengan data kurang dari 120 hari
          tidak diberi peringkat.
        </InfoTip>
        <span>Momentum 7/30/90 hari, disesuaikan gejolak. Klik koin untuk rencananya.</span>
      </div>
      <p className="mt-1 hidden text-2xs text-muted-foreground xl:block">
        Funding positif (merah) = long membayar, jadi biaya untuk long. Negatif (hijau) = long dibayar.
      </p>
    </TitledPanel>
  )
}
