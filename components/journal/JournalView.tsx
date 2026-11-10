'use client'

import { PageContainer, PageHeader } from '@/components/shell/page'
import { useState } from 'react'
import { BookOpen, Check, Loader2, Pencil, RefreshCw, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyPanel } from '@/components/shell/EmptyPanel'
import { signClass } from '@/components/lab/LabBadges'
import { PaperBadge } from '@/components/chart/PaperTradePanel'
import { PaperAccountsSection } from '@/components/journal/PaperAccountsSection'
import { SimpleLineChart } from '@/components/journal/LineChart'
import { ApiError } from '@/lib/api/errors'
import { formatPrice, formatScore, formatTimestamp, formatUsdSigned, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { COMPARE_LABEL, compareRows, normalizeBreakdown, parseTags, winratePct, type NormalizedBreakdown } from '@/lib/lab/paper'
import { useJournal, useJournalStats, usePaperAccounts, usePatchJournal, useWatchCompare } from '@/lib/queries/paper'
import { useLabWatches } from '@/lib/queries/lab-live'
import type { JournalEntry, JournalFilters, JournalSource } from '@/lib/api/types/lab'

const SOURCE_LABEL: Record<JournalSource, string> = {
  paper_manual: 'Paper manual',
  paper_auto: 'Paper auto',
  bot: 'Bot live',
}

function fmtR(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}R`
}

export function JournalView() {
  const accountsQ = usePaperAccounts()
  const [draft, setDraft] = useState<JournalFilters>({ account_id: '', source: '', symbol: '', from: '', to: '' })
  const [filters, setFilters] = useState<JournalFilters>({})

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Strategy Lab"
        eyebrowIcon={BookOpen}
        tone="lab"
        title="Jurnal trading"
        description="Semua trade paper (manual & auto-follow strategi) tercatat di sini, lengkap dengan R-multiple, catatan dan tag."
        actions={<PaperBadge />}
      />

      <PaperAccountsSection />

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <label htmlFor="f-account" className="text-xs font-medium">Akun</label>
            <select id="f-account" value={draft.account_id} onChange={(e) => setDraft({ ...draft, account_id: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
              <option value="" className="bg-popover">Semua akun</option>
              {(accountsQ.data ?? []).map((a) => (
                <option key={String(a.id)} value={String(a.id)} className="bg-popover">{a.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="f-source" className="text-xs font-medium">Sumber</label>
            <select id="f-source" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as JournalSource | '' })} className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
              <option value="" className="bg-popover">Semua</option>
              {(Object.keys(SOURCE_LABEL) as JournalSource[]).map((s) => (
                <option key={s} value={s} className="bg-popover">{SOURCE_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="f-symbol" className="text-xs font-medium">Symbol</label>
            <Input id="f-symbol" value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })} placeholder="ETHUSDT" className="h-8 font-mono text-xs" />
          </div>
          <div className="space-y-1">
            <label htmlFor="f-from" className="text-xs font-medium">Dari</label>
            <Input id="f-from" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="h-8 px-2 text-xs" />
          </div>
          <div className="space-y-1">
            <label htmlFor="f-to" className="text-xs font-medium">Sampai</label>
            <Input id="f-to" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="h-8 px-2 text-xs" />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" className="flex-1" onClick={() => setFilters(Object.fromEntries(Object.entries(draft).filter(([, v]) => v)) as JournalFilters)}>
              Terapkan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft({ account_id: '', source: '', symbol: '', from: '', to: '' })
                setFilters({})
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <StatsSection accountId={filters.account_id ? String(filters.account_id) : undefined} />
      <JournalTable filters={filters} />
      <LiveVsBacktest />
    </PageContainer>
  )
}

function StatCard({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="truncate eyebrow">{label}</div>
      <div className={cn('truncate font-mono text-xl font-bold tabular-nums', className)}>{value}</div>
      <div className="truncate text-3xs text-muted-foreground">{hint ?? '\u00a0'}</div>
    </div>
  )
}

function StatsSection({ accountId }: { accountId?: string }) {
  const q = useJournalStats(accountId)
  if (q.isPending)
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    )
  if (q.error || !q.data)
    return <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat statistik jurnal." />

  const s = q.data
  const wr = winratePct(s.winrate)
  const bySymbol = normalizeBreakdown(s.by_symbol, 'symbol')
  const bySource = normalizeBreakdown(s.by_source, 'source')

  return (
    <section className="space-y-4" aria-labelledby="stats-h">
      <h2 id="stats-h" className="text-sm font-semibold tracking-tight">
        Statistik <span className="font-mono text-xs font-normal text-muted-foreground">({s.trades} trade{accountId ? ', akun terpilih' : ', semua akun'})</span>
      </h2>
      {s.trades === 0 ? (
        <EmptyPanel message="Belum ada trade tertutup untuk dihitung." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Winrate" value={wr === null ? '—' : `${wr.toFixed(1)}%`} hint="trade untung" />
            <StatCard label="Avg R" value={fmtR(s.avg_r)} className={signClass(s.avg_r)} hint="rata-rata per trade" />
            <StatCard label="Expectancy" value={fmtR(s.expectancy_r)} className={signClass(s.expectancy_r)} hint="harapan per trade" />
            <StatCard label="Profit factor" value={formatScore(s.profit_factor)} hint="untung ÷ rugi" />
            <StatCard label="Net P&L" value={formatUsdSigned(s.net_pnl)} className={signClass(s.net_pnl)} hint="setelah biaya" />
            <StatCard label="Max DD" value={s.max_dd_pct === null ? '—' : `−${formatScore(Math.abs(s.max_dd_pct), 1)}%`} className="text-bearish" hint="turun terdalam" />
          </div>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Kurva equity paper</CardTitle>
            </CardHeader>
            <CardContent>
              {s.equity_curve?.length ? (
                <SimpleLineChart points={s.equity_curve} label="Kurva equity paper" />
              ) : (
                <EmptyPanel message="Backend belum mengirim titik equity." />
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BreakdownTable title="Per symbol" rows={bySymbol} />
            <BreakdownTable title="Per sumber" rows={bySource.map((r) => ({ ...r, key: SOURCE_LABEL[r.key as JournalSource] ?? r.key }))} />
          </div>
        </>
      )}
    </section>
  )
}

function BreakdownTable({ title, rows }: { title: string; rows: NormalizedBreakdown[] }) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada data.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {['', 'Trade', 'Winrate', 'Avg R', 'Net P&L'].map((h) => (
                  <TableHead key={h} className="text-2xs uppercase">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="py-1.5 font-mono text-xs font-semibold">{r.key}</TableCell>
                  <TableCell className="py-1.5 font-mono text-xs">{valueOrDash(r.trades)}</TableCell>
                  <TableCell className="py-1.5 font-mono text-xs">{r.winrate === null ? '—' : `${r.winrate.toFixed(1)}%`}</TableCell>
                  <TableCell className={cn('py-1.5 font-mono text-xs', signClass(r.avg_r))}>{fmtR(r.avg_r)}</TableCell>
                  <TableCell className={cn('py-1.5 font-mono text-xs', signClass(r.net_pnl))}>{formatUsdSigned(r.net_pnl)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function JournalTable({ filters }: { filters: JournalFilters }) {
  const q = useJournal(filters)
  const rows = q.data ?? []
  return (
    <Card className="border-border">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Daftar trade <span className="font-mono text-xs font-normal text-muted-foreground">({rows.length})</span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching} className="gap-1.5">
          <RefreshCw className={cn('h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : q.error ? (
          <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat jurnal." />
        ) : rows.length === 0 ? (
          <EmptyPanel message="Belum ada trade di jurnal untuk filter ini." />
        ) : (
          <div className="max-h-[640px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Entry', 'Symbol', 'Arah', 'Sumber', 'Harga entry', 'Harga exit', 'Qty', 'Fee+funding', 'P&L', 'R', 'Exit', 'Catatan & tag'].map((h) => (
                    <TableHead key={h} className="whitespace-nowrap text-2xs uppercase">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => <JournalRow key={r.id} entry={r} />)}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function JournalRow({ entry: r }: { entry: JournalEntry }) {
  const patch = usePatchJournal()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(r.notes ?? '')
  const [tags, setTags] = useState((r.tags ?? []).join(', '))
  const costs = (r.fees ?? 0) + (r.funding ?? 0)
  const hasCosts = r.fees !== null || r.funding !== null

  const save = () =>
    patch.mutate(
      { id: r.id, body: { notes, tags: parseTags(tags) } },
      {
        onSuccess: () => {
          notify.success('Catatan disimpan')
          setEditing(false)
        },
        onError: () => notify.error('Gagal menyimpan catatan'),
      },
    )

  return (
    <TableRow className="align-top">
      <TableCell className="whitespace-nowrap py-1.5 font-mono text-2xs">{formatTimestamp(r.entry_time)}</TableCell>
      <TableCell className="py-1.5 font-mono text-xs font-semibold">{r.symbol}</TableCell>
      <TableCell className={cn('py-1.5 text-xs font-bold uppercase', r.side.toLowerCase() === 'long' ? 'text-bullish' : 'text-bearish')}>{r.side}</TableCell>
      <TableCell className="whitespace-nowrap py-1.5 text-2xs">{SOURCE_LABEL[r.source] ?? r.source}</TableCell>
      <TableCell className="py-1.5 font-mono text-xs">{formatPrice(r.entry_price)}</TableCell>
      <TableCell className="py-1.5 font-mono text-xs">{r.exit_time ? formatPrice(r.exit_price) : <span className="text-info">terbuka</span>}</TableCell>
      <TableCell className="py-1.5 font-mono text-xs">{r.qty === null ? '—' : formatScore(r.qty, 4)}</TableCell>
      <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">{hasCosts ? formatUsdSigned(-Math.abs(costs)) : '—'}</TableCell>
      <TableCell className={cn('py-1.5 font-mono text-xs', signClass(r.pnl))}>{formatUsdSigned(r.pnl)}</TableCell>
      <TableCell className={cn('py-1.5 font-mono text-xs', signClass(r.r_multiple))}>{fmtR(r.r_multiple)}</TableCell>
      <TableCell className="py-1.5 text-xs">{valueOrDash(r.exit_reason)}</TableCell>
      <TableCell className="min-w-[220px] py-1.5 text-xs">
        {editing ? (
          <div className="space-y-1">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan" aria-label="Catatan" className="h-7 text-xs" />
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" aria-label="Tag" className="h-7 font-mono text-xs" />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 px-2 text-3xs" onClick={save} disabled={patch.isPending}>
                {patch.isPending ? <Loader2 className="animate-spin" /> : <Check />} Simpan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-3xs"
                onClick={() => {
                  setNotes(r.notes ?? '')
                  setTags((r.tags ?? []).join(', '))
                  setEditing(false)
                }}
              >
                <X /> Batal
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="group flex w-full items-start gap-1 text-left cursor-pointer" aria-label="Edit catatan & tag">
            <span className="flex-1">
              {r.notes ? <span>{r.notes}</span> : <span className="text-muted-foreground">—</span>}
              {(r.tags ?? []).length > 0 && (
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {(r.tags ?? []).map((t) => (
                    <span key={t} className="rounded bg-muted px-1 font-mono text-3xs">#{t}</span>
                  ))}
                </span>
              )}
            </span>
            <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-100" />
          </button>
        )}
      </TableCell>
    </TableRow>
  )
}

function fmtCompare(v: unknown, metric?: string): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number' && metric === 'winrate') return `${v.toFixed(1)}%`
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : formatScore(v)
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

function LiveVsBacktest() {
  const watchesQ = useLabWatches()
  const [watchId, setWatchId] = useState<string | null>(null)
  const effective = watchId ?? watchesQ.data?.[0]?.id ?? null
  const q = useWatchCompare(effective)
  const rows = compareRows(q.data)

  return (
    <Card className="border-border">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">Live (paper) vs backtest per watch</CardTitle>
        {(watchesQ.data ?? []).length > 0 && (
          <select
            aria-label="Pilih watch"
            value={effective ?? ''}
            onChange={(e) => setWatchId(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2 font-mono text-xs"
          >
            {(watchesQ.data ?? []).map((w) => (
              <option key={w.id} value={w.id} className="bg-popover">
                {w.symbol} {w.timeframe} · {w.template_id}
              </option>
            ))}
          </select>
        )}
      </CardHeader>
      <CardContent>
        {watchesQ.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : watchesQ.error ? (
          <ErrorPanel kind={watchesQ.error instanceof ApiError ? watchesQ.error.kind : 'server'} onRetry={() => watchesQ.refetch()} messageOverride="Gagal memuat daftar watch." />
        ) : !effective ? (
          <EmptyPanel message="Belum ada watch. Buat dari detail run di Lab (tombol &quot;Tampilkan di Chart&quot;)." />
        ) : q.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : q.error || !q.data ? (
          <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat perbandingan." />
        ) : rows ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-2xs uppercase">Metrik</TableHead>
                <TableHead className="text-right text-2xs uppercase">Paper (live)</TableHead>
                <TableHead className="text-right text-2xs uppercase">Backtest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.metric}>
                  <TableCell className="py-1.5 text-xs">{COMPARE_LABEL[r.metric] ?? r.metric}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs font-bold">{fmtCompare(r.metric === 'winrate' ? winratePct(r.paper as number) : r.paper, r.metric)}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-xs">{fmtCompare(r.metric === 'winrate' ? winratePct(r.backtest as number) : r.backtest, r.metric)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {Object.entries(q.data).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-border/30 py-1 text-xs">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-all font-mono">{fmtCompare(v)}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-2 text-3xs text-muted-foreground">
          Selisih besar antara paper dan backtest = tanda backtest terlalu optimis (slippage, fill, atau overfit).
        </p>
      </CardContent>
    </Card>
  )
}
