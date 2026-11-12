'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { AnswerCard, type AnswerTone } from '@/components/ui/answer-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { StatTile } from '@/components/ui/stat-tile'
import { StatusPill } from '@/components/ui/status-pill'
import { Switch } from '@/components/ui/switch'
import { Term } from '@/components/ui/term'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { PaperAccountsSection } from '@/components/journal/PaperAccountsSection'
import { SimpleLineChart } from '@/components/journal/LineChart'
import { TradeSheet } from '@/components/journal/TradeSheet'
import { SideBadge } from '@/components/trading/SideBadge'
import { cn } from '@/lib/utils/cn'
import { displaySymbol, formatCount, formatNumber, formatPct, formatR, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'
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
const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm'
const EMPTY: JournalFilters = { account_id: '', source: '', symbol: '', from: '', to: '' }

// ── answer ──────────────────────────────────────────────────────────────────

function answerOf(s: JournalStats, live: boolean): { tone: AnswerTone; text: string } {
  const who = live ? 'Bot live (uang asli)' : 'Paper'
  if (!s.trades) return { tone: 'menunggu', text: `${who}: belum ada transaksi tertutup untuk filter ini.` }
  const wr = winratePct(s.winrate)
  const parts = [
    `${who}: ${formatCount(s.trades)} transaksi tertutup`,
    `hasil bersih ${formatUsdSigned(s.net_pnl)}`,
    wr === null ? null : `menang ${formatPct(wr, { digits: 0 })}`,
    s.avg_r === null ? null : `rata-rata ${formatR(s.avg_r)} per transaksi`,
  ].filter(Boolean)
  const small = !live && s.trades < REVIEW_MIN_TRADES ? ` Masih di bawah ${REVIEW_MIN_TRADES} transaksi, jadi belum bisa dinilai.` : ''
  return { tone: 'info', text: `${parts.join(', ')}.${small}` }
}

// ── stats ───────────────────────────────────────────────────────────────────

function Breakdown({ title, keyLabel, rows }: { title: string; keyLabel: string; rows: NormalizedBreakdown[] }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3">
      <h3 className="mb-2 text-sm font-semibold tracking-tight">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak tersedia.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-3xs uppercase tracking-wide text-muted-foreground">
              <th className="py-1 pr-2 text-left font-semibold">{keyLabel}</th>
              <th className="py-1 pr-2 text-right font-semibold">Transaksi</th>
              <th className="py-1 pr-2 text-right font-semibold">Menang</th>
              <th className="py-1 text-right font-semibold">Hasil</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b last:border-0">
                <td className="max-w-[9rem] truncate py-1.5 pr-2 font-medium">{r.key}</td>
                <td className="num py-1.5 pr-2 text-right">{formatCount(r.trades)}</td>
                <td className="num py-1.5 pr-2 text-right">{r.winrate === null ? '—' : formatPct(r.winrate, { digits: 0 })}</td>
                <td className={cn('num py-1.5 text-right', signClass(r.net_pnl))}>{formatUsdSigned(r.net_pnl)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Stats({ s, live, perAccount }: { s: JournalStats; live: boolean; perAccount: boolean }) {
  const wr = winratePct(s.winrate)
  const bySymbol = normalizeBreakdown(s.by_symbol, 'symbol').map((r) => ({ ...r, key: displaySymbol(r.key) }))
  const bySource = normalizeBreakdown(s.by_source, 'source').map((r) => ({ ...r, key: JOURNAL_SOURCE_LABEL[r.key] ?? r.key }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Persentase menang" value={wr === null ? '—' : formatPct(wr, { digits: 1 })} hint="transaksi yang untung" />
        <StatTile
          label={<Term k="r_multiple" short />}
          value={formatR(s.avg_r)}
          valueClassName={signClass(s.avg_r)}
          hint="rata-rata per transaksi"
        />
        <StatTile label={<Term k="profit_factor" short />} value={s.profit_factor === null ? '—' : formatNumber(s.profit_factor)} hint="total untung ÷ total rugi" />
        <StatTile
          label={live ? 'Hasil bersih · LIVE' : 'Hasil bersih · PAPER'}
          value={formatUsdSigned(s.net_pnl)}
          valueClassName={signClass(s.net_pnl)}
          hint="setelah fee dan funding"
        />
        <StatTile
          label={<Term k="max_drawdown" short />}
          value={s.max_dd_pct === null ? '—' : formatPct(-Math.abs(s.max_dd_pct), { digits: 1 })}
          hint={perAccount ? 'dari modal akun' : 'pilih satu akun untuk melihatnya'}
        />
      </div>
      <p className="rounded-lg border border-dashed px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <b className="text-foreground">Cara membaca R:</b> 1R adalah jarak harga masuk ke batas rugi (SL), yaitu risiko yang dipasang. +2R berarti untung dua
        kali risiko; −1R berarti kena SL penuh. Trade bot live tidak punya R karena SL-nya tidak tercatat di sini.
      </p>
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-1 text-sm font-semibold tracking-tight">{perAccount ? 'Kurva modal akun' : 'Hasil kumulatif (USDT)'}</h3>
        {s.equity_curve?.length ? (
          <SimpleLineChart points={s.equity_curve} label={perAccount ? 'Kurva modal akun paper' : 'Hasil kumulatif transaksi paper'} />
        ) : (
          <p className="text-xs text-muted-foreground">Tidak tersedia: belum ada transaksi tertutup.</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Breakdown title="Per koin" keyLabel="Koin" rows={bySymbol} />
        <Breakdown title="Per sumber" keyLabel="Sumber" rows={bySource} />
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
        <span className="font-semibold">{displaySymbol(r.symbol)}</span>
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
    cell: (r) => <span className={cn('num font-semibold', signClass(r.pnl))}>{formatUsdSigned(r.pnl)}</span>,
  },
  {
    key: 'r',
    header: <Term k="r_multiple" short />,
    mobileLabel: 'R',
    mobile: 'field',
    align: 'right',
    cell: (r) => <span className={cn('num', signClass(r.r_multiple))}>{r.r_multiple === null ? '—' : formatR(r.r_multiple)}</span>,
  },
  {
    key: 'closed',
    header: 'Ditutup',
    mobile: 'field',
    cell: (r) => <span className="num whitespace-nowrap text-xs">{r.exit_time ? formatTime(r.exit_time) : 'masih terbuka'}</span>,
  },
  {
    key: 'reason',
    header: 'Alasan keluar',
    mobile: 'hidden',
    cell: (r) => <span className="text-xs">{exitReasonLabel(r.exit_reason)}</span>,
  },
  {
    key: 'notes',
    header: 'Catatan',
    mobile: 'hidden',
    cell: (r) => (
      <span className="block max-w-[16rem] truncate text-xs text-muted-foreground">
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
                    {displaySymbol(w.symbol)} {w.timeframe} · pantau #{String(w.id)}
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
  const answer = statsQ.data ? answerOf(statsQ.data, liveOnly) : null

  const apply = () => {
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, v]) => v)) as JournalFilters)
    setLimit(JOURNAL_PAGE)
  }

  return (
    <div className="space-y-5">
      {statsQ.isPending ? (
        <LoadingState rows={2} />
      ) : statsQ.isError ? (
        <ErrorState error={statsQ.error} onRetry={() => statsQ.refetch()} title="Ringkasan jurnal tidak bisa dimuat" />
      ) : (
        answer && (
          <AnswerCard
            tone={answer.tone}
            title={liveOnly ? 'Bot live' : 'Jurnal paper'}
            answer={answer.text}
            status={<StatusPill kind={liveOnly ? 'live' : 'paper'} />}
            evidenceHref="#transaksi"
            evidenceLabel="Lihat transaksi"
          />
        )
      )}

      <Section title="Filter" description="Statistik dan daftar di bawah selalu mengikuti filter yang sama.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1">
            <Label htmlFor="f-account" className="text-xs">Akun simulasi</Label>
            <select id="f-account" value={String(draft.account_id ?? '')} onChange={(e) => setDraft({ ...draft, account_id: e.target.value })} className={selectCls}>
              <option value="" className="bg-popover">Semua akun</option>
              {(accountsQ.data ?? []).map((a) => (
                <option key={String(a.id)} value={String(a.id)} className="bg-popover">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-source" className="text-xs">Sumber</Label>
            <select id="f-source" value={draft.source ?? ''} onChange={(e) => setDraft({ ...draft, source: e.target.value as JournalSource | '' })} className={selectCls}>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-popover">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-symbol" className="text-xs">Koin</Label>
            <Input id="f-symbol" value={draft.symbol ?? ''} onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })} placeholder="ETHUSDT" className="h-9 font-mono text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-from" className="text-xs">Dari tanggal</Label>
            <Input id="f-from" type="date" value={draft.from ?? ''} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className="h-9 px-2 text-sm" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-to" className="text-xs">Sampai tanggal</Label>
            <Input id="f-to" type="date" value={draft.to ?? ''} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className="h-9 px-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" className="h-9 flex-1" onClick={apply}>
              Terapkan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9"
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
      </Section>

      <Section title={liveOnly ? 'Statistik bot live' : 'Statistik paper'} description={liveOnly ? 'Uang asli. Tidak dicampur dengan paper.' : 'Hanya transaksi simulasi; trade bot live tidak pernah ikut dihitung.'}>
        {statsQ.isPending ? (
          <LoadingState rows={3} />
        ) : statsQ.isError || !statsQ.data ? (
          <ErrorState error={statsQ.error} onRetry={() => statsQ.refetch()} title="Statistik tidak bisa dimuat" compact />
        ) : statsQ.data.trades === 0 ? (
          <EmptyState title="Belum ada transaksi tertutup" description="Statistik muncul setelah transaksi pertama ditutup." />
        ) : (
          <Stats s={statsQ.data} live={liveOnly} perAccount={Boolean(filters.account_id)} />
        )}
      </Section>

      <Section
        id="transaksi"
        className="scroll-mt-20"
        title="Daftar transaksi"
        description={listQ.data ? `${formatCount(rows.length)} transaksi, terbaru di atas. Ketuk satu baris untuk detail dan catatan.` : 'Transaksi terbaru di atas.'}
        action={
          <Button variant="outline" size="sm" onClick={() => listQ.refetch()} disabled={listQ.isFetching} className="gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', listQ.isFetching && 'animate-spin')} aria-hidden="true" />
            Muat ulang
          </Button>
        }
      >
        <div className="space-y-3">
          {!liveOnly && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
              <Switch id="incl-live" checked={includeLive} onCheckedChange={setIncludeLive} disabled={Boolean(filters.source)} />
              <Label htmlFor="incl-live" className="cursor-pointer text-sm">
                Tampilkan juga <Term k="live_bot_trades" variant="underline" /> (uang asli)
              </Label>
              <span className="text-2xs text-muted-foreground">
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
              rowLabel={(r) => `Detail transaksi ${displaySymbol(r.symbol)} ${formatTime(r.exit_time)}`}
              caption="Transaksi di jurnal, terbaru di atas"
              empty={<EmptyState title="Belum ada transaksi untuk filter ini" description="Coba reset filter, atau tunggu sinyal paper berikutnya." />}
            />
          )}
          {rows.length >= limit && limit < JOURNAL_MAX && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => Math.min(JOURNAL_MAX, l + JOURNAL_PAGE))} disabled={listQ.isFetching}>
                {listQ.isFetching ? 'Memuat…' : `Tampilkan ${JOURNAL_PAGE} lagi`}
              </Button>
            </div>
          )}
        </div>
      </Section>

      <PaperAccountsSection />
      <PaperVsTest />
      <TradeSheet entry={open} onClose={() => setOpenId(null)} />
    </div>
  )
}
