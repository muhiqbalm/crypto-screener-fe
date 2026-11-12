'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bookmark, Info, RefreshCw, Search, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Chip } from '@/components/lab/Section'
import { CompareCheckbox, CompareTray } from '@/components/lab/compare/CompareTray'
import { MODE_COPY } from '@/components/lab/run/copy'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { checkLabel, templateShort } from '@/lib/lab/form'
import { sortTimeframes } from '@/lib/lab/timeframes'
import { MAX_COMPARE, attemptsLabel, boardSnoopingWarning, toggleId } from '@/lib/lab/planning'
import { useLabTemplates } from '@/lib/queries/lab'
import { useLabLeaderboard } from '@/lib/queries/lab-insights'
import type { LabBoardRow, LabBoardSort, LabSnoopLevel } from '@/lib/api/types/lab-insights'

type VerdictFilter = 'all' | 'PASS' | 'FAIL'
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
  const tfs = sortTimeframes(Array.from(new Set(templates.flatMap((t) => t.timeframes))))
  const warning = boardSnoopingWarning(summary)
  const top = rows.find((r) => r.rank === 1)

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
    { key: 'rank', header: '#', mobile: 'hidden', cell: (r) => <span className="num text-xs font-bold">{r.rank ?? <span className="font-normal text-muted-foreground">—</span>}</span> },
    {
      key: 'what',
      header: 'Strategi · koin · TF',
      mobile: 'title',
      cell: (r) => (
        <span className="block min-w-0">
          <span className="text-xs font-medium">{nameOf(r.template_id)}</span>{' '}
          <span className="num text-xs font-semibold">{r.symbol} <span className="font-normal text-muted-foreground">{r.timeframe}</span></span>
          <span className="block text-3xs text-muted-foreground">
            {r.rank ? `#${r.rank} · ` : ''}{MODE_COPY[r.mode]}
            {r.scan_id !== null && <> · banyak koin #{String(r.scan_id)}</>}
          </span>
          {(r.preset || (r.saved_as ?? []).length > 0) && (
            <span className="flex flex-wrap items-center gap-1 text-3xs text-lab">
              <Bookmark className="h-2.5 w-2.5" aria-hidden="true" />
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
        <span className="block">
          <VerdictBadge verdict={r.verdict} />
          {r.verdict !== 'PASS' && r.failed_checks.length > 0 && <span className="block max-w-[160px] truncate text-3xs text-muted-foreground">{FAILED_COPY(r.failed_checks)}</span>}
        </span>
      ),
    },
    {
      key: 'net',
      header: 'Hasil data baru',
      mobile: 'field',
      align: 'right',
      cell: (r) => <span className={cn('num text-xs', signClass(r.holdout.net_return_pct), sort === 'oos_net' && 'font-semibold')}>{formatPct(r.holdout.net_return_pct, { signed: true })}</span>,
    },
    {
      key: 'dd',
      header: 'Turun terdalam',
      mobile: 'field',
      align: 'right',
      cell: (r) => <span className="num text-xs text-bearish">{r.holdout.max_dd_pct === null ? '—' : formatPct(-Math.abs(r.holdout.max_dd_pct))}</span>,
    },
    { key: 'trades', header: 'Trade', mobile: 'field', align: 'right', cell: (r) => <span className="num text-xs">{formatNumber(r.holdout.trades, { digits: 0 })}</span> },
    { key: 'pf', header: 'PF', mobile: 'hidden', align: 'right', cell: (r) => <span className={cn('num text-xs', sort === 'oos_pf' && 'font-semibold')}>{pf(r)}</span> },
    { key: 'sharpe', header: 'Sharpe', mobile: 'hidden', align: 'right', cell: (r) => <span className={cn('num text-xs', sort === 'oos_sharpe' && 'font-semibold')}>{formatNumber(r.holdout.sharpe)}</span> },
    {
      key: 'stress',
      header: 'Biaya dobel',
      mobile: 'hidden',
      align: 'right',
      cell: (r) => <span className={cn('num text-xs', signClass(r.holdout.stress_net_return_pct))}>{formatPct(r.holdout.stress_net_return_pct, { signed: true })}</span>,
    },
    {
      key: 'drag',
      header: 'Beban biaya',
      mobile: 'hidden',
      align: 'right',
      cell: (r) => <span className="num text-xs">{r.holdout.cost_drag_pct === null ? '—' : `${formatNumber(r.holdout.cost_drag_pct, { digits: 1 })} poin %`}</span>,
    },
    {
      key: 'tries',
      header: 'Percobaan',
      mobile: 'hidden',
      cell: (r) => (
        <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-3xs', SNOOP_STYLE[r.snooping])}>
          {r.snooping !== 'low' && <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />}
          <span className="num">{attemptsLabel(r.attempts)}</span>
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        {templates.length > 1 && (
          <select aria-label="Strategi" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-xs">
            <option value="" className="bg-popover">Semua strategi</option>
            {templates.map((t) => <option key={t.id} value={t.id} className="bg-popover">{nameOf(t.id)}</option>)}
          </select>
        )}
        <div className="relative lg:w-40">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin" aria-label="Cari koin" className="h-8 pl-8 font-mono text-xs" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter timeframe">
          <Chip active={tf === ''} onClick={() => setTf('')} className="h-7 px-2.5">Semua TF</Chip>
          {tfs.map((x) => <Chip key={x} active={tf === x} onClick={() => setTf(x)} className="h-7 px-2.5 font-mono">{x}</Chip>)}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter rapor">
          {([['PASS', 'Lolos saja'], ['all', 'Semua rapor'], ['FAIL', 'Gagal saja']] as const).map(([v, l]) => (
            <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)} className="h-7 px-2.5">{l}</Chip>
          ))}
        </div>
        <select aria-label="Jenis uji" value={mode} onChange={(e) => setMode(e.target.value as ModeFilter)} className="h-8 rounded-md border border-input bg-transparent px-2 text-xs">
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
            { value: 'oos_net', label: 'Hasil' },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => boardQ.refetch()} disabled={boardQ.isFetching} className="h-8 gap-1.5 text-xs" aria-label="Muat ulang peringkat">
          <RefreshCw className={cn('h-3.5 w-3.5', boardQ.isFetching && 'animate-spin')} />
        </Button>
      </div>

      {boardQ.data && (
        <p className="text-xs text-muted-foreground">
          <Trophy className="mr-1 inline h-3.5 w-3.5 text-lab" aria-hidden="true" />
          {summary.pass} Lolos dari {summary.runs} uji. Semua angka dari data baru (holdout); hanya yang Lolos diberi peringkat.
        </p>
      )}
      {warning && (
        <p
          role="note"
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-2xs',
            top?.snooping === 'high' ? 'border-warn/40 bg-warn/10 text-warn' : 'border-border bg-muted/30 text-muted-foreground',
          )}
        >
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {warning}
            {top && top.snooping !== 'low' && (
              <> Juara #1 (<span className="num">{nameOf(top.template_id)} {top.symbol} {top.timeframe}</span>) berasal dari {attemptsLabel(top.attempts)} untuk koin ini.</>
            )}
          </span>
        </p>
      )}

      {boardQ.isPending ? (
        <LoadingState rows={6} />
      ) : boardQ.error ? (
        <ErrorState error={boardQ.error} title="Peringkat gagal dimuat" onRetry={() => boardQ.refetch()} />
      ) : (
        <ResponsiveTable
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
      )}
      <CompareTray ids={picked} onClear={() => setPicked([])} />
    </div>
  )
}
