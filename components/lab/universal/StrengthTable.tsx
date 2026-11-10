'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { signClass } from '@/components/lab/LabBadges'
import { Sparkline } from '@/components/lab/universal/Sparkline'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatScore, formatTimestamp } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/lab/form'
import { useRefreshStrength, useStrength } from '@/lib/queries/universal'
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

type Filter = 'all' | 'up' | 'portfolio'

const COLS: { key: StrengthSortKey; label: string; title?: string; hide?: string }[] = [
  { key: 'rank', label: '#', title: 'Peringkat skor momentum gabungan (hanya koin layak)' },
  { key: 'symbol', label: 'Koin' },
  { key: 'ret_1d_pct', label: '1H', title: 'Perubahan 1 hari', hide: 'hidden md:table-cell' },
  { key: 'ret_7d_pct', label: '7H', title: 'Perubahan 7 hari' },
  { key: 'ret_30d_pct', label: '30H', title: 'Perubahan 30 hari', hide: 'hidden sm:table-cell' },
  { key: 'ret_90d_pct', label: '90H', title: 'Perubahan 90 hari', hide: 'hidden lg:table-cell' },
  { key: 'vol_ann_pct', label: 'Volatilitas', title: 'Volatilitas 30 hari, disetahunkan', hide: 'hidden lg:table-cell' },
  { key: 'ema_dist_pct', label: 'Tren', title: 'Posisi harga vs EMA tren (50 hari)' },
  { key: 'funding_7d_apr_pct', label: 'Funding', title: 'Rata-rata funding 7 hari, disetahunkan (positif = long bayar)', hide: 'hidden xl:table-cell' },
  { key: 'target_weight_pct', label: 'Bobot Universal', title: 'Bobot target Universal v0 (default) di candle terakhir', hide: 'hidden md:table-cell' },
]

const th = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'

export function StrengthTable() {
  const q = useStrength()
  const refresh = useRefreshStrength()
  const [sort, setSort] = useState<{ key: StrengthSortKey; desc: boolean }>({ key: 'rank', desc: false })
  const [filter, setFilter] = useState<Filter>('all')
  const rows = useMemo(() => {
    const all = q.data?.rows ?? []
    const f = filter === 'up' ? all.filter((r) => r.trend === 'up') : filter === 'portfolio' ? all.filter((r) => r.in_portfolio) : all
    return sortStrength(f, sort.key, sort.desc)
  }, [q.data, sort, filter])
  const busy = q.data?.refresh?.status === 'queued' || q.data?.refresh?.status === 'running'

  const toggle = (key: StrengthSortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'rank' && key !== 'symbol' }))

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: () => notify.info('Refresh dijadwalkan', { description: 'Data 30 koin diperbarui di worker Lab (±1–2 menit).' }),
      onError: (e) => notify.error('Gagal menjadwalkan refresh', { description: apiErrorDetail(e) ?? undefined }),
    })

  return (
    <Section
      title="Koin Terkuat"
      description={
        q.data?.computed_at
          ? `Candle 4H terakhir: ${formatTimestamp(q.data.last_bar_close ?? q.data.last_bar).slice(0, 16)} · dihitung ${relativeTime(q.data.computed_at)} · otomatis tiap close 4H`
          : 'Dihitung otomatis setelah setiap close candle 4H.'
      }
      action={
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy || refresh.isPending} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          {busy ? 'Memperbarui…' : 'Refresh sekarang'}
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Filter">
        {([['all', 'Semua'], ['up', 'Uptrend saja'], ['portfolio', 'Dipegang Universal']] as const).map(([v, label]) => (
          <Chip key={v} active={filter === v} onClick={() => setFilter(v)} className="h-7 px-2.5">{label}</Chip>
        ))}
      </div>
      {q.isPending ? (
        <div className="space-y-2" aria-busy="true">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : q.error ? (
        <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat tabel Koin Terkuat." />
      ) : (q.data?.rows ?? []).length === 0 ? (
        <EmptyState
          title="Belum ada data kekuatan koin"
          description={busy ? 'Sedang dihitung pertama kali — halaman update otomatis.' : 'Klik "Refresh sekarang" untuk menghitung pertama kali.'}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
          <table className="w-full text-sm sm:min-w-[640px]">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} className={cn(th, c.key === 'symbol' || c.key === 'rank' ? 'text-left' : 'text-right', c.hide)} title={c.title}
                    aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
                    <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
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
                <tr key={r.symbol} className={cn(r.in_portfolio && 'bg-lab/[0.05]', !r.eligible && 'opacity-60')}>
                  <td className="px-3 py-2 font-mono text-xs font-bold tabular-nums">{r.rank ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs font-semibold">{r.symbol.replace(/USDT$/, '')}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {formatPrice(r.price)}
                      {!r.eligible && ' · belum layak'}
                    </div>
                  </td>
                  {(['ret_1d_pct', 'ret_7d_pct', 'ret_30d_pct', 'ret_90d_pct'] as const).map((k, i) => (
                    <td key={k} className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', signClass(r[k]), COLS[i + 2].hide)}>{formatPercent(r[k], 1)}</td>
                  ))}
                  <td className="hidden px-3 py-2 text-right font-mono text-xs tabular-nums lg:table-cell">{r.vol_ann_pct === null ? '—' : `${formatScore(r.vol_ann_pct, 0)}%`}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={cn('inline-flex items-center gap-1 font-mono text-xs', r.trend === 'up' ? 'text-bullish' : r.trend === 'down' ? 'text-bearish' : 'text-muted-foreground')}
                      title={r.donchian_pos !== null ? `Posisi di range 50 hari: ${Math.round(r.donchian_pos * 100)}%` : undefined}>
                      {r.trend === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : r.trend === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                      {formatPercent(r.ema_dist_pct, 1)}
                    </span>
                  </td>
                  <td className={cn('hidden px-3 py-2 text-right font-mono text-xs tabular-nums xl:table-cell', signClass(r.funding_7d_apr_pct === null ? null : -r.funding_7d_apr_pct))}>
                    {formatPercent(r.funding_7d_apr_pct, 1)}
                  </td>
                  <td className="hidden px-3 py-2 text-right font-mono text-xs tabular-nums md:table-cell">
                    {r.in_portfolio ? <span className="font-semibold text-lab">{formatScore(r.target_weight_pct, 1)}%</span> : '—'}
                  </td>
                  <td className="hidden px-3 py-2 text-right sm:table-cell"><Sparkline values={r.spark} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Skor = rata-rata momentum 7/30/90 hari yang disesuaikan volatilitas. Tren = harga di atas/bawah EMA 50 hari.
        Koin “belum layak” punya data &lt; 120 hari. Baris ungu = koin yang dipegang Universal v0 (setting default) saat ini.
        Ini peringkat relatif, bukan sinyal beli.
      </p>
    </Section>
  )
}
