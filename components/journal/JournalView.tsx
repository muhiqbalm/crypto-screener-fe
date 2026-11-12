'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Coins, Gauge, Layers, LineChart as LineChartIcon, ListOrdered, RefreshCw, Scale, Target, TrendingDown, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { StatusPill } from '@/components/ui/status-pill'
import { Switch } from '@/components/ui/switch'
import { Term } from '@/components/ui/term'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { BigNumber, CardLink, CountUp, DeckCard, Ring, SectionHead, signTone } from '@/components/lab/arena/deck'
import { PaperAccountsSection } from '@/components/journal/PaperAccountsSection'
import { SimpleLineChart } from '@/components/journal/LineChart'
import { TradeSheet } from '@/components/journal/TradeSheet'
import { SideBadge } from '@/components/trading/SideBadge'
import { cn } from '@/lib/utils/cn'
import { coinOf, formatCount, formatNumber, formatPct, formatR, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatTime, formatTimeframe } from '@/lib/utils/time'
import {
  COMPARE_LABEL,
  JOURNAL_MAX,
  JOURNAL_PAGE,
  JOURNAL_SOURCE_LABEL,
  compareRows,
  exitReasonLabel,
  isLiveSource,
  normalizeBreakdown,
  winratePct,
  type NormalizedBreakdown,
} from '@/lib/lab/paper'
import { REVIEW_MIN_TRADES } from '@/lib/lab/arena'
import { useJournalList, useJournalStatsFor, usePaperAccounts, useWatchCompare } from '@/lib/queries/paper'
import { useLabWatches } from '@/lib/queries/lab-live'
import type { JournalEntry, JournalFilters, JournalSource, JournalStats } from '@/lib/api/types/lab'

const SOURCE_OPTIONS: { value: JournalSource | ''; label: string }[] = [
  { value: '', label: 'Semua paper' },
  { value: 'paper_manual', label: 'Simulasi manual' },
  { value: 'paper_auto', label: 'Simulasi otomatis' },
  { value: 'bot', label: 'Bot live saja (uang asli)' },
]
const selectCls = 'flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-[15px]'
const EMPTY: JournalFilters = { account_id: '', source: '', symbol: '', from: '', to: '' }

// ── answer + numbers (bento) ────────────────────────────────────────────────

function answerOf(s: JournalStats, live: boolean): string {
  const who = live ? 'Bot live (uang asli)' : 'Paper'
  if (!s.trades) return `${who}: belum ada transaksi tertutup untuk filter ini.`
  const small = !live && s.trades < REVIEW_MIN_TRADES ? ` Di bawah ${REVIEW_MIN_TRADES} transaksi: belum bisa dinilai.` : ''
  return `${who}: ${formatCount(s.trades)} transaksi tertutup.${small}`
}

function Numbers({ s, live, perAccount }: { s: JournalStats; live: boolean; perAccount: boolean }) {
  const wr = winratePct(s.winrate)
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      <DeckCard
        hero
        icon={Wallet}
        iconTone={live ? 'warn' : 'lab'}
        eyebrow={live ? 'Hasil bersih · uang asli' : 'Hasil bersih · simulasi'}
        action={<StatusPill kind={live ? 'live' : 'paper'} />}
        className="col-span-2 lg:row-span-2"
      >
        <div className={cn('font-display text-[48px] font-bold leading-none tracking-tight tabular-nums sm:text-[56px]', signClass(s.net_pnl))}>
          <CountUp value={s.net_pnl ?? 0} format={(v) => formatUsdSigned(v)} />
        </div>
        <p className="mt-4 text-lg font-medium leading-snug">{answerOf(s, live)}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Setelah fee dan funding.{live ? '' : ' Transaksi bot live tidak pernah ikut dihitung.'}</p>
        <CardLink href="#transaksi" className="mt-5">Lihat transaksi</CardLink>
      </DeckCard>
      <DeckCard icon={Target} iconTone="info" title="Persentase menang">
        <div className="flex items-center gap-4">
          <Ring value={wr ?? 0} max={100} tone={wr !== null && wr >= 50 ? 'bullish' : 'warn'} size={76} label={wr === null ? 'tidak tersedia' : `${Math.round(wr)}% menang`}>
            <span className="font-display text-lg font-bold tabular-nums">{wr === null ? '—' : `${Math.round(wr)}%`}</span>
          </Ring>
          <span className="text-[13px] text-muted-foreground">transaksi yang untung</span>
        </div>
      </DeckCard>
      <DeckCard icon={Gauge} iconTone="lab" title={<Term k="r_multiple" />}>
        <BigNumber label="Rata-rata per transaksi" value={formatR(s.avg_r)} tone={signTone(s.avg_r)} size="lg" hint="1R = jarak masuk ke SL" />
      </DeckCard>
      <DeckCard icon={Scale} iconTone="info" title={<Term k="profit_factor" short />}>
        <BigNumber label="Untung ÷ rugi" value={s.profit_factor === null ? '—' : formatNumber(s.profit_factor)} tone={s.profit_factor === null ? undefined : s.profit_factor >= 1 ? 'bullish' : 'bearish'} size="lg" />
      </DeckCard>
      <DeckCard icon={TrendingDown} iconTone="bearish" title={<Term k="max_drawdown" short />}>
        <BigNumber
          label={perAccount ? 'Dari modal akun' : 'Turun terdalam'}
          value={s.max_dd_pct === null ? '—' : formatPct(-Math.abs(s.max_dd_pct), { digits: 1 })}
          tone={s.max_dd_pct ? 'bearish' : undefined}
          size="lg"
          hint={perAccount ? undefined : 'pilih satu akun'}
        />
      </DeckCard>
    </div>
  )
}

/** Horizontal bars instead of a table: who made / lost the most. */
function BarList({ title, icon, rows }: { title: string; icon: typeof Wallet; rows: NormalizedBreakdown[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.net_pnl ?? 0)))
  return (
    <DeckCard icon={icon} iconTone="info" title={title}>
      {rows.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">Tidak tersedia.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const v = r.net_pnl ?? 0
            return (
              <li key={r.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="truncate font-semibold">{r.key}</span>
                  <span className={cn('shrink-0 font-semibold tabular-nums', signClass(v))}>{formatUsdSigned(v)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={cn('h-full rounded-full', v >= 0 ? 'bg-bullish' : 'bg-bearish')} style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
                </div>
                <div className="text-[13px] text-muted-foreground">
                  {formatCount(r.trades)} transaksi · menang {r.winrate === null ? '—' : formatPct(r.winrate, { digits: 0 })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </DeckCard>
  )
}

function Charts({ s, perAccount }: { s: JournalStats; perAccount: boolean }) {
  const bySymbol = normalizeBreakdown(s.by_symbol, 'symbol').map((r) => ({ ...r, key: coinOf(r.key) }))
  const bySource = normalizeBreakdown(s.by_source, 'source').map((r) => ({ ...r, key: JOURNAL_SOURCE_LABEL[r.key] ?? r.key }))
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <DeckCard icon={LineChartIcon} iconTone="lab" title={perAccount ? 'Kurva modal akun' : 'Hasil kumulatif (USDT)'} className="lg:col-span-2">
        {s.equity_curve?.length ? (
          <SimpleLineChart points={s.equity_curve} label={perAccount ? 'Kurva modal akun paper' : 'Hasil kumulatif transaksi paper'} className="h-[280px] lg:h-[420px]" />
        ) : (
          <p className="text-[15px] text-muted-foreground">Tidak tersedia: belum ada transaksi tertutup.</p>
        )}
      </DeckCard>
      <div className="grid gap-5">
        <BarList title="Per koin" icon={Coins} rows={bySymbol} />
        <BarList title="Per sumber" icon={Layers} rows={bySource} />
      </div>
    </div>
  )
}

// ── trades ──────────────────────────────────────────────────────────────────

const TRADE_COLUMNS: ResponsiveColumn<JournalEntry>[] = [
  {
    key: 'coin',
    header: 'Koin',
    mobile: 'title',
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-display text-base font-semibold">{coinOf(r.symbol)}</span>
        <SideBadge side={r.side} />
      </span>
    ),
  },
  {
    key: 'source',
    header: 'Sumber',
    mobile: 'badge',
    cell: (r) =>
      isLiveSource(r.source) ? (
        <StatusPill kind="live" size="xs" />
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <StatusPill kind="paper" size="xs" />
          <span className="hidden text-2xs text-muted-foreground md:inline">{r.source === 'paper_manual' ? 'manual' : 'otomatis'}</span>
        </span>
      ),
  },
  {
    key: 'pnl',
    header: 'Hasil bersih',
    mobile: 'field',
    align: 'right',
    className: 'py-4',
    cell: (r) => <span className={cn('text-[15px] font-semibold tabular-nums', signClass(r.pnl))}>{formatUsdSigned(r.pnl)}</span>,
  },
  {
    key: 'r',
    header: <Term k="r_multiple" short />,
    mobileLabel: 'R',
    mobile: 'field',
    align: 'right',
    cell: (r) => <span className={cn('text-[15px] tabular-nums', signClass(r.r_multiple))}>{r.r_multiple === null ? '—' : formatR(r.r_multiple)}</span>,
  },
  {
    key: 'closed',
    header: 'Ditutup',
    mobile: 'field',
    mobileSpan: 'full',
    cell: (r) => <span className="whitespace-nowrap text-[15px] tabular-nums">{r.exit_time ? formatTime(r.exit_time) : 'masih terbuka'}</span>,
  },
  {
    key: 'reason',
    header: 'Alasan keluar',
    mobile: 'hidden',
    cell: (r) => <span className="text-[15px]">{exitReasonLabel(r.exit_reason)}</span>,
  },
  {
    key: 'notes',
    header: 'Catatan',
    mobile: 'hidden',
    cell: (r) => (
      <span className="block max-w-[16rem] truncate text-[14px] text-muted-foreground">
        {[r.notes, ...(r.tags ?? []).map((t) => `#${t}`)].filter(Boolean).join(' ') || '—'}
      </span>
    ),
  },
]

// ── paper vs test, per watch ────────────────────────────────────────────────

function fmtCompare(v: unknown, metric: string): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number' && metric === 'winrate') return formatPct(winratePct(v), { digits: 1 })
  if (typeof v === 'number' && metric.endsWith('_pct')) return formatPct(v, { digits: 2, signed: true })
  if (typeof v === 'number') return Number.isInteger(v) ? formatCount(v) : formatNumber(v)
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  return String(v)
}

function PaperVsTest() {
  const watchesQ = useLabWatches()
  const [watchId, setWatchId] = useState<string | null>(null)
  const effective = watchId ?? (watchesQ.data?.[0]?.id !== undefined ? String(watchesQ.data[0].id) : null)
  const q = useWatchCompare(effective)
  const rows = compareRows(q.data)
  return (
    <details className="rounded-xl border bg-card px-4 py-3 sm:px-5">
      <summary className="cursor-pointer select-none text-sm font-semibold tracking-tight">Bandingkan paper dengan hasil uji, per pantauan</summary>
      <div className="mt-3 space-y-3">
        {watchesQ.isPending ? (
          <LoadingState rows={2} />
        ) : watchesQ.isError ? (
          <ErrorState error={watchesQ.error} onRetry={() => watchesQ.refetch()} title="Daftar pantauan tidak bisa dimuat" compact />
        ) : !effective ? (
          <p className="text-xs text-muted-foreground">Belum ada pantauan. Mulai dari Preset (Pantau atau Mulai paper).</p>
        ) : (
          <>
            <div className="max-w-sm space-y-1">
              <Label htmlFor="cmp-watch" className="text-xs">Pantauan</Label>
              <select id="cmp-watch" value={effective} onChange={(e) => setWatchId(e.target.value)} className={selectCls}>
                {(watchesQ.data ?? []).map((w) => (
                  <option key={String(w.id)} value={String(w.id)} className="bg-popover">
                    {coinOf(w.symbol)} {formatTimeframe(w.timeframe)} · pantau #{String(w.id)}
                  </option>
                ))}
              </select>
            </div>
            {q.isPending ? (
              <LoadingState rows={3} />
            ) : q.isError || !q.data ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} title="Perbandingan tidak bisa dimuat" compact />
            ) : rows ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-3xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1 text-left font-semibold">Ukuran</th>
                    <th className="py-1 text-right font-semibold">Paper</th>
                    <th className="py-1 text-right font-semibold">Uji</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.metric} className="border-b last:border-0">
                      <td className="py-1.5">{COMPARE_LABEL[r.metric] ?? r.metric}</td>
                      <td className="num py-1.5 text-right font-semibold">{fmtCompare(r.paper, r.metric)}</td>
                      <td className="num py-1.5 text-right">{fmtCompare(r.backtest, r.metric)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-muted-foreground">Perbandingan tidak tersedia untuk pantauan ini.</p>
            )}
            <p className="text-3xs text-muted-foreground">Selisih besar antara paper dan uji = tanda uji terlalu optimis (slippage, fill, atau terlalu pas dengan masa lalu).</p>
          </>
        )}
      </div>
    </details>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

/**
 * Paper berjalan → Jurnal. Paper only by default: imported live-bot trades appear only when
 * the switch is on (marked LIVE) and never count in the paper statistics. Newest first.
 * `?account_id=<n>` pre-filters one account (links from Klasemen). Needs a Suspense boundary.
 */
export function JournalView() {
  const accountsQ = usePaperAccounts()
  const accountParam = useSearchParams().get('account_id') ?? ''
  const linked = /^\d{1,9}$/.test(accountParam) ? accountParam : ''
  const [draft, setDraft] = useState<JournalFilters>({ ...EMPTY, account_id: linked })
  const [filters, setFilters] = useState<JournalFilters>(linked ? { account_id: linked } : {})
  const [includeLive, setIncludeLive] = useState(false)
  const [limit, setLimit] = useState(JOURNAL_PAGE)
  const [openId, setOpenId] = useState<string | null>(null)
  const liveOnly = filters.source === 'bot'
  const statsQ = useJournalStatsFor(filters)
  const listQ = useJournalList(filters, { includeLive, limit })
  const rows = useMemo(() => listQ.data ?? [], [listQ.data])
  const open = rows.find((r) => String(r.id) === openId) ?? null

  const apply = () => {
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, v]) => v)) as JournalFilters)
    setLimit(JOURNAL_PAGE)
  }

  return (
    <div className="space-y-8">
      {statsQ.isPending ? (
        <LoadingState rows={3} />
      ) : statsQ.isError || !statsQ.data ? (
        <ErrorState error={statsQ.error} onRetry={() => statsQ.refetch()} title="Ringkasan jurnal tidak bisa dimuat" />
      ) : (
        <Numbers s={statsQ.data} live={liveOnly} perAccount={Boolean(filters.account_id)} />
      )}

      <details open={Boolean(Object.keys(filters).length)} className="rounded-3xl border bg-card px-6 py-4">
        <summary className="cursor-pointer select-none text-[17px] font-semibold tracking-tight">
          Filter{Object.keys(filters).length ? ' (aktif)' : ''}
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="f-account" className="text-sm">Akun simulasi</Label>
            <select id="f-account" value={String(draft.account_id ?? '')} onChange={(e) => setDraft({ ...draft, account_id: e.target.value })} className={selectCls}>
              <option value="" className="bg-popover">Semua akun</option>
              {(accountsQ.data ?? []).map((a) => (
                <option key={String(a.id)} value={String(a.id)} className="bg-popover">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-source" className="text-sm">Sumber</Label>
            <select id="f-source" value={draft.source ?? ''} onChange={(e) => setDraft({ ...draft, source: e.target.value as JournalSource | '' })} className={selectCls}>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-popover">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-symbol" className="text-sm">Koin</Label>
            <Input id="f-symbol" value={draft.symbol ?? ''} onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })} placeholder="ETHUSDT" className="h-11 rounded-xl text-[15px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-from" className="text-sm">Dari tanggal</Label>
            <Input id="f-from" type="date" value={draft.from ?? ''} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="h-11 rounded-xl px-3 text-[15px]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-to" className="text-sm">Sampai tanggal</Label>
            <Input id="f-to" type="date" value={draft.to ?? ''} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="h-11 rounded-xl px-3 text-[15px]" />
          </div>
          <div className="flex items-end gap-2">
            <Button className="h-11 flex-1 rounded-full" onClick={apply}>
              Terapkan
            </Button>
            <Button
              variant="ghost"
              className="h-11 rounded-full"
              onClick={() => {
                setDraft(EMPTY)
                setFilters({})
                setLimit(JOURNAL_PAGE)
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </details>

      {statsQ.data && statsQ.data.trades > 0 && <Charts s={statsQ.data} perAccount={Boolean(filters.account_id)} />}

      <section className="space-y-4">
        <SectionHead
          id="transaksi"
          icon={ListOrdered}
          title="Transaksi"
          sub={listQ.data ? `${formatCount(rows.length)} transaksi, terbaru di atas. Ketuk untuk detail dan catatan.` : 'Terbaru di atas.'}
          action={
            <Button variant="outline" onClick={() => listQ.refetch()} disabled={listQ.isFetching} className="gap-1.5 rounded-full">
              <RefreshCw className={cn('h-4 w-4', listQ.isFetching && 'animate-spin')} aria-hidden="true" />
              Muat ulang
            </Button>
          }
        />
        <div className="space-y-4">
          {!liveOnly && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-5 py-3.5">
              <Switch id="incl-live" checked={includeLive} onCheckedChange={setIncludeLive} disabled={Boolean(filters.source)} />
              <Label htmlFor="incl-live" className="cursor-pointer text-[15px]">
                Tampilkan juga <Term k="live_bot_trades" variant="underline">transaksi bot live</Term> (uang asli)
              </Label>
              <span className="text-[13px] text-muted-foreground">
                {filters.source ? 'Hanya untuk sumber "Semua paper".' : includeLive ? 'Ditandai LIVE; tetap tidak dihitung di statistik paper.' : 'Mati: hanya paper.'}
              </span>
            </div>
          )}
          {listQ.isPending ? (
            <LoadingState rows={6} />
          ) : listQ.isError ? (
            <ErrorState error={listQ.error} onRetry={() => listQ.refetch()} title="Daftar transaksi tidak bisa dimuat" compact />
          ) : (
            <ResponsiveTable
              rows={rows}
              columns={TRADE_COLUMNS}
              rowKey={(r) => String(r.id)}
              onRowClick={(r) => setOpenId(String(r.id))}
              rowLabel={(r) => `Detail transaksi ${coinOf(r.symbol)} ${formatTime(r.exit_time)}`}
              caption="Transaksi di jurnal, terbaru di atas"
              empty={<EmptyState title="Belum ada transaksi untuk filter ini" description="Coba reset filter, atau tunggu sinyal paper berikutnya." />}
            />
          )}
          {rows.length >= limit && limit < JOURNAL_MAX && (
            <div className="flex justify-center">
              <Button variant="outline" className="rounded-full" onClick={() => setLimit((l) => Math.min(JOURNAL_MAX, l + JOURNAL_PAGE))} disabled={listQ.isFetching}>
                {listQ.isFetching ? 'Memuat…' : `Tampilkan ${JOURNAL_PAGE} lagi`}
              </Button>
            </div>
          )}
        </div>
      </section>

      <PaperAccountsSection />
      <PaperVsTest />
      <TradeSheet entry={open} onClose={() => setOpenId(null)} />
    </div>
  )
}
