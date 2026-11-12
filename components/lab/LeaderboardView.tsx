'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Bookmark, ChevronsRight, Info, RefreshCw, Search, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { BentoGrid, HeroCard } from '@/components/ui/hero-card'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Chip } from '@/components/lab/Section'
import { CompareCheckbox, CompareTray } from '@/components/lab/compare/CompareTray'
import { MODE_COPY } from '@/components/lab/run/copy'
import { HeroKpi, Panel, StrategyChip, VerdictPill } from '@/components/lab/run/v2-ui'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { signTone } from '@/components/ui/tone'
import { checkLabel, templateShort } from '@/lib/lab/form'
import { sortTimeframes } from '@/lib/lab/timeframes'
import { MAX_COMPARE, attemptsLabel, boardSnoopingWarning, toggleId } from '@/lib/lab/planning'
import { useLabTemplates } from '@/lib/queries/lab'
import { useLabLeaderboard } from '@/lib/queries/lab-insights'
import type { LabBoardRow, LabBoardSort, LabSnoopLevel } from '@/lib/api/types/lab-insights'

type VerdictFilter = 'all' | 'PASS' | 'FAIL'

const SORT_LABEL: Record<LabBoardSort, string> = { oos_pf: 'PF', oos_sharpe: 'Sharpe', oos_net: 'Hasil bersih' }
type ModeFilter = 'all' | 'validate' | 'optimize'

const SNOOP_STYLE: Record<LabSnoopLevel, string> = {
  low: 'border-border text-muted-foreground',
  medium: 'border-warn/30 bg-warn/10 text-warn',
  high: 'border-warn/50 bg-warn/15 font-semibold text-warn',
}

function pf(r: LabBoardRow): string {
  const v = r.holdout.profit_factor
  if (v !== null) return formatNumber(v)
  return (r.holdout.trades ?? 0) > 0 && (r.holdout.net_return_pct ?? 0) > 0 ? '∞' : '—'
}

const NUM_CELL = 'px-2.5'
const NUM_HEAD = 'px-2.5 whitespace-normal leading-tight'

/** Check-name copy for the "why it failed" hint. */
const FAILED_COPY = (names: string[]) => names.map((n) => checkLabel({ name: n, label: n, value: null, threshold: null, passed: false })).join(', ')

export function LeaderboardView() {
  const router = useRouter()
  const templatesQ = useLabTemplates()
  const [templateId, setTemplateId] = useState<string>('')
  const [tf, setTf] = useState<string>('')
  const [verdict, setVerdict] = useState<VerdictFilter>('PASS')
  const [mode, setMode] = useState<ModeFilter>('all')
  const [sort, setSort] = useState<LabBoardSort>('oos_pf')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const boardQ = useLabLeaderboard({
    template_id: templateId || undefined,
    timeframe: tf || undefined,
    verdict: verdict === 'all' ? undefined : verdict,
    mode: mode === 'all' ? undefined : mode,
    sort,
    limit: 1000,
  })
  const term = q.trim().toUpperCase()
  const rows = useMemo(() => (boardQ.data?.rows ?? []).filter((r) => !term || r.symbol.includes(term)), [boardQ.data, term])
  const summary = useMemo(
    () => ({
      runs: rows.length,
      pass: rows.filter((r) => r.verdict === 'PASS').length,
      trials: rows.reduce((a, r) => a + (r.trials_done ?? 0), 0),
      combinations: new Set(rows.map((r) => `${r.template_id}|${r.symbol}|${r.timeframe}`)).size,
    }),
    [rows],
  )
  const templates = templatesQ.data ?? []
  const nameOf = (id: string) => templateShort(id, templates.find((t) => t.id === id)?.name)
  const fullName = (id: string) => templates.find((t) => t.id === id)?.name
  const tfs = sortTimeframes(Array.from(new Set(templates.flatMap((t) => t.timeframes))))
  const warning = boardSnoopingWarning(summary)
  const top = rows.find((r) => r.rank === 1)

  // Scroll cue: fade on the right edge while the desktop table still has
  // columns hidden to the right (presentation only).
  const tableRef = useRef<HTMLDivElement>(null)
  const [moreRight, setMoreRight] = useState(false)
  const rowCount = rows.length
  useEffect(() => {
    const box = tableRef.current?.querySelector<HTMLElement>('[data-rt-scroll]')
    if (!box) return
    const check = () => setMoreRight(box.scrollWidth - box.clientWidth - box.scrollLeft > 4)
    box.addEventListener('scroll', check, { passive: true })
    // The observer also fires once on observe(), which is the first measurement.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(check)
    ro?.observe(box)
    return () => {
      box.removeEventListener('scroll', check)
      ro?.disconnect()
    }
  }, [rowCount, boardQ.isPending])

  const columns: ResponsiveColumn<LabBoardRow>[] = [
    {
      key: 'pick',
      header: <span className="sr-only">Pilih</span>,
      mobile: 'hidden',
      className: 'w-8 pr-0',
      cell: (r) => (
        <CompareCheckbox id={String(r.run_id)} checked={picked.includes(String(r.run_id))} disabled={picked.length >= MAX_COMPARE} onToggle={(x) => setPicked(toggleId(picked, x))} label={`Bandingkan ${r.symbol} ${r.timeframe}`} />
      ),
    },
    { key: 'rank', header: '#', mobile: 'hidden', className: 'px-3', headerClassName: 'px-3', cell: (r) => <span className={cn('num display text-lg font-extrabold', r.rank === 1 && 'text-bullish')}>{r.rank ?? <span className="text-sm font-normal text-muted-foreground">—</span>}</span> },
    {
      key: 'what',
      header: 'Koin · strategi',
      mobile: 'title',
      cell: (r) => (
        <span className="block space-y-1 sm:min-w-[190px]">
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            {/* phone card: the rank lives in the title (desktop has its own # column) */}
            {r.rank !== null && <span className={cn('num display text-lg font-extrabold sm:hidden', r.rank === 1 ? 'text-bullish' : 'text-muted-foreground')}>#{r.rank}</span>}
            <CoinAvatar symbol={r.symbol} size="sm" />
            <span className="num text-base font-semibold">{r.symbol.replace(/USDT$/, '')} <span className="font-normal text-muted-foreground">{r.timeframe}</span></span>
            <StrategyChip templateId={r.template_id} name={fullName(r.template_id)} />
          </span>
          {(r.mode !== 'validate' || r.scan_id !== null) && (
            <span className="block text-2xs text-muted-foreground">
              {MODE_COPY[r.mode]}
              {r.scan_id !== null && <> · banyak koin #{String(r.scan_id)}</>}
            </span>
          )}
          {(r.preset || (r.saved_as ?? []).length > 0) && (
            <span className="flex flex-wrap items-center gap-1.5 text-2xs text-lab">
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="num">{[r.preset?.name, ...(r.saved_as ?? []).map((n) => `→ ${n}`)].filter(Boolean).join(' · ')}</span>
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'verdict',
      header: 'Rapor',
      mobile: 'badge',
      cell: (r) => (
        <span className="block space-y-1">
          <VerdictPill verdict={r.verdict} />
          {r.verdict !== 'PASS' && r.failed_checks.length > 0 && <span className="block max-w-[160px] truncate text-2xs text-muted-foreground">{FAILED_COPY(r.failed_checks)}</span>}
        </span>
      ),
    },
    // Number columns: tighter padding and headers that may wrap to two lines,
    // so the table fits the 1,110 px content box at 1440 (audit 2026-11-13 P9).
    { key: 'pf', header: 'PF', mobile: 'field', align: 'right', className: NUM_CELL, headerClassName: NUM_HEAD, cell: (r) => <span className={cn('num', sort === 'oos_pf' && 'font-bold')}>{pf(r)}</span> },
    {
      key: 'net',
      header: 'Hasil bersih',
      mobile: 'field',
      align: 'right',
      className: NUM_CELL,
      headerClassName: NUM_HEAD,
      cell: (r) => <span className={cn('num', signClass(r.holdout.net_return_pct), sort === 'oos_net' && 'font-bold')}>{formatPct(r.holdout.net_return_pct, { signed: true })}</span>,
    },
    {
      key: 'dd',
      header: 'Turun terdalam',
      mobile: 'field',
      align: 'right',
      className: NUM_CELL,
      headerClassName: NUM_HEAD,
      cell: (r) => <span className="num text-bearish">{r.holdout.max_dd_pct === null ? '—' : formatPct(-Math.abs(r.holdout.max_dd_pct))}</span>,
    },
    { key: 'trades', header: 'Transaksi', mobile: 'field', align: 'right', className: NUM_CELL, headerClassName: NUM_HEAD, cell: (r) => <span className="num">{formatNumber(r.holdout.trades, { digits: 0 })}</span> },
    { key: 'sharpe', header: 'Sharpe', mobile: 'hidden', align: 'right', className: NUM_CELL, headerClassName: NUM_HEAD, cell: (r) => <span className={cn('num', sort === 'oos_sharpe' && 'font-bold')}>{formatNumber(r.holdout.sharpe)}</span> },
    {
      // "Beban biaya" no longer has its own column; it is in the hover title
      // here and in full on the run page.
      key: 'stress',
      header: 'Biaya dobel',
      mobile: 'hidden',
      align: 'right',
      className: NUM_CELL,
      headerClassName: NUM_HEAD,
      cell: (r) => (
        <span
          className={cn('num', signClass(r.holdout.stress_net_return_pct))}
          title={r.holdout.cost_drag_pct === null ? undefined : `Beban biaya ${formatNumber(r.holdout.cost_drag_pct, { digits: 1 })} poin %`}
        >
          {formatPct(r.holdout.stress_net_return_pct, { signed: true })}
        </span>
      ),
    },
    {
      key: 'tries',
      header: 'Percobaan',
      mobile: 'hidden',
      cell: (r) => (
        <span className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-2xs', SNOOP_STYLE[r.snooping])}>
          {r.snooping !== 'low' && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="num">{attemptsLabel(r.attempts)}</span>
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {boardQ.data && rows.length > 0 && (
        <BentoGrid>
          {top ? (
            <HeroCard span={2} glow="bullish" className="sm:p-8" aria-labelledby="board-top">
              <p className="kicker">Peringkat #1 · {SORT_LABEL[sort]} tertinggi di data baru</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <CoinAvatar symbol={top.symbol} size="lg" />
                <h2 id="board-top" className="num display text-3xl font-extrabold sm:text-4xl">
                  {top.symbol.replace(/USDT$/, '')} <span className="text-muted-foreground">{top.timeframe}</span>
                </h2>
                <StrategyChip templateId={top.template_id} name={fullName(top.template_id)} size="md" />
                <VerdictPill verdict={top.verdict} size="md" />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <HeroKpi label="PF data baru" value={top.holdout.profit_factor} format={(v) => formatNumber(v)} />
                <HeroKpi label="Hasil bersih" value={top.holdout.net_return_pct} format={(v) => formatPct(v, { signed: true })} tone={signTone(top.holdout.net_return_pct)} />
                <HeroKpi
                  label="Turun terdalam"
                  value={top.holdout.max_dd_pct === null ? null : -Math.abs(top.holdout.max_dd_pct)}
                  format={(v) => formatPct(v)}
                  tone={top.holdout.max_dd_pct === null ? undefined : 'bearish'}
                />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <span className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm', SNOOP_STYLE[top.snooping])}>
                  {top.snooping !== 'low' && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                  <span className="num">{attemptsLabel(top.attempts)}</span>
                </span>
                <Button asChild className="h-11 gap-2 rounded-full px-5 text-base font-semibold">
                  <Link href={`/lab/runs/${encodeURIComponent(String(top.run_id))}`}>
                    Buka rapor
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </HeroCard>
          ) : null}
          <Panel className={top ? 'md:col-span-2 xl:col-span-1' : 'md:col-span-2 xl:col-span-3'} bodyClassName="flex h-full flex-col">
            <p className="kicker">Ringkasan</p>
            <p className="mt-3 flex items-baseline gap-3">
              <span className="num display text-5xl font-extrabold text-bullish">{summary.pass}</span>
              <span className="text-lg text-muted-foreground">
                Lolos dari <span className="num font-semibold text-foreground">{summary.runs}</span> uji
              </span>
            </p>
            <p className="mt-2 text-base text-muted-foreground">Hanya yang Lolos diberi peringkat. Semua angka dari data baru.</p>
            {warning && (
              <p
                role="note"
                className={cn(
                  'mt-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-2xs',
                  top?.snooping === 'high' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-border bg-muted/30 text-muted-foreground',
                )}
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="line-clamp-4">{warning}</span>
              </p>
            )}
          </Panel>
        </BentoGrid>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {templates.length > 1 && (
          <select aria-label="Strategi" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm">
            <option value="" className="bg-popover">Semua strategi</option>
            {templates.map((t) => <option key={t.id} value={t.id} className="bg-popover">{nameOf(t.id)}</option>)}
          </select>
        )}
        <div className="relative lg:w-48">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin" aria-label="Cari koin" className="h-11 pl-10 text-base" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter timeframe">
          <Chip active={tf === ''} onClick={() => setTf('')} className="h-10 px-4 text-sm">Semua TF</Chip>
          {tfs.map((x) => <Chip key={x} active={tf === x} onClick={() => setTf(x)} className="num h-10 px-4 text-sm">{x}</Chip>)}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter rapor">
          {([['PASS', 'Lolos saja'], ['all', 'Semua rapor'], ['FAIL', 'Gagal saja']] as const).map(([v, l]) => (
            <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)} className="h-10 px-4 text-sm">{l}</Chip>
          ))}
        </div>
        <select aria-label="Jenis uji" value={mode} onChange={(e) => setMode(e.target.value as ModeFilter)} className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm">
          <option value="all" className="bg-popover">Semua jenis</option>
          <option value="validate" className="bg-popover">{MODE_COPY.validate}</option>
          <option value="optimize" className="bg-popover">{MODE_COPY.optimize}</option>
        </select>
        <Segmented<LabBoardSort>
          aria-label="Urutkan"
          className="lg:ml-auto"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'oos_pf', label: 'PF' },
            { value: 'oos_sharpe', label: 'Sharpe' },
            { value: 'oos_net', label: 'Hasil bersih' },
          ]}
        />
        <Button variant="ghost" onClick={() => boardQ.refetch()} disabled={boardQ.isFetching} className="h-10 w-10 rounded-full p-0" aria-label="Muat ulang peringkat">
          <RefreshCw className={cn('h-4 w-4', boardQ.isFetching && 'animate-spin')} />
        </Button>
      </div>

      {boardQ.isPending ? (
        <LoadingState rows={6} />
      ) : boardQ.error ? (
        <ErrorState error={boardQ.error} title="Peringkat gagal dimuat" onRetry={() => boardQ.refetch()} />
      ) : (
        <div ref={tableRef} className="relative">
        <ResponsiveTable
          mobileFields={4}
          rows={rows}
          columns={columns}
          rowKey={(r) => String(r.run_id)}
          onRowClick={(r) => router.push(`/lab/runs/${encodeURIComponent(String(r.run_id))}`)}
          rowLabel={(r) => `Buka uji ${r.symbol} ${r.timeframe}`}
          caption="Peringkat hasil uji di data baru"
          empty={
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title={verdict === 'PASS' ? 'Belum ada uji yang Lolos' : 'Belum ada uji jujur yang selesai'}
              description="Peringkat hanya berisi Uji jujur dan Cari setting terbaik (yang punya data baru)."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {verdict === 'PASS' && <Button variant="outline" size="sm" onClick={() => setVerdict('all')}>Tampilkan semua rapor</Button>}
                  <Button asChild size="sm"><Link href="/lab">Mulai uji</Link></Button>
                </div>
              }
            />
          }
        />
        {moreRight && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-px right-px hidden w-16 items-center justify-end rounded-r-3xl bg-gradient-to-l from-card via-card/80 to-transparent pr-2 sm:flex">
            <ChevronsRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        </div>
      )}
      <CompareTray ids={picked} onClear={() => setPicked([])} />
    </div>
  )
}
