'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bookmark, RefreshCw, Search, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Segmented } from '@/components/ui/segmented'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { MODE_LABEL, VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { CompareCheckbox, CompareTray } from '@/components/lab/compare/CompareTray'
import { ApiError } from '@/lib/api/errors'
import { formatPercent, formatScore, valueOrDash } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { checkLabel } from '@/lib/lab/form'
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

const th = 'px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap'
const td = 'px-3 py-2'

function dd(v: number | null): string {
  return v === null ? '—' : `−${formatScore(Math.abs(v), 1)}%`
}

function pf(r: LabBoardRow): string {
  const v = r.holdout.profit_factor
  if (v !== null) return formatScore(v)
  return (r.holdout.trades ?? 0) > 0 && (r.holdout.net_return_pct ?? 0) > 0 ? '∞' : '—'
}

/** Check-name copy for the "why it failed" hint. */
const FAILED_COPY = (names: string[]) => names.map((n) => checkLabel({ name: n, label: n, value: null, threshold: null, passed: false })).join(', ')

export function LeaderboardView() {
  const templatesQ = useLabTemplates()
  const [templateId, setTemplateId] = useState<string>('')
  const [tf, setTf] = useState<string>('')
  const [verdict, setVerdict] = useState<VerdictFilter>('all')
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
  const tfs = sortTimeframes(Array.from(new Set(templates.flatMap((t) => t.timeframes))))
  const warning = boardSnoopingWarning(summary)
  const top = rows.find((r) => r.rank === 1)

  return (
    <div className="space-y-6">
      <Section
        title="Filter"
        action={
          <Button variant="ghost" size="sm" onClick={() => boardQ.refetch()} disabled={boardQ.isFetching} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', boardQ.isFetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          {templates.length > 1 && (
            <select aria-label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-2 text-xs">
              <option value="" className="bg-popover">Semua strategi</option>
              {templates.map((t) => <option key={t.id} value={t.id} className="bg-popover">{t.name}</option>)}
            </select>
          )}
          <div className="relative lg:w-40">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin" aria-label="Filter koin" className="h-8 pl-8 font-mono text-xs" />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Filter timeframe">
            <Chip active={tf === ''} onClick={() => setTf('')} className="h-7 px-2.5">Semua TF</Chip>
            {tfs.map((x) => <Chip key={x} active={tf === x} onClick={() => setTf(x)} className="h-7 px-2.5 font-mono">{x}</Chip>)}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Filter rapor">
            {([['all', 'Semua rapor'], ['PASS', 'LOLOS'], ['FAIL', 'GAGAL']] as const).map(([v, l]) => (
              <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)} className="h-7 px-2.5">{l}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Filter mode">
            {(['all', 'validate', 'optimize'] as const).map((m) => (
              <Chip key={m} active={mode === m} onClick={() => setMode(m)} className="h-7 px-2.5">{m === 'all' ? 'Semua mode' : MODE_LABEL[m]}</Chip>
            ))}
          </div>
          <Segmented<LabBoardSort>
            aria-label="Urutkan"
            className="lg:ml-auto"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'oos_pf', label: 'PF holdout' },
              { value: 'oos_sharpe', label: 'Sharpe holdout' },
              { value: 'oos_net', label: 'Return holdout' },
            ]}
          />
        </div>
      </Section>

      <Section
        title="Peringkat"
        icon={<Trophy className="h-4 w-4 text-lab" />}
        description={
          boardQ.data
            ? `${summary.pass} LOLOS dari ${summary.runs} run validasi/optimize. LOLOS selalu di atas GAGAL; hanya yang LOLOS diberi peringkat. Semua angka dari holdout (ujian terkunci).`
            : undefined
        }
      >
        {warning && (
          <p role="note" className="mb-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {warning}
              {top && top.snooping !== 'low' && (
                <> Juara #1 (<span className="num">{top.symbol} {top.timeframe}</span>) berasal dari {attemptsLabel(top.attempts)} untuk koin ini.</>
              )}
            </span>
          </p>
        )}
        {boardQ.isPending ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : boardQ.error ? (
          <ErrorPanel kind={boardQ.error instanceof ApiError ? boardQ.error.kind : 'server'} onRetry={() => boardQ.refetch()} messageOverride="Gagal memuat peringkat dari server Lab." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-8 w-8" />}
            title="Belum ada run validasi yang selesai"
            description="Peringkat hanya berisi run Validasi / Cari parameter (yang punya holdout). Jalankan dari Uji strategi atau Scan."
            action={<Button asChild size="sm"><Link href="/lab/scan">Buka scan</Link></Button>}
          />
        ) : (
          <div className="-mx-4 max-h-[640px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-card">
                <tr>
                  <th className={cn(th, 'w-8 pr-0')}><span className="sr-only">Pilih</span></th>
                  <th className={cn(th, 'text-left')}>#</th>
                  <th className={cn(th, 'text-left')}>Koin · TF</th>
                  <th className={cn(th, 'text-left')}>Rapor</th>
                  <th className={cn(th, 'text-right', sort === 'oos_pf' && 'text-foreground')}>PF</th>
                  <th className={cn(th, 'text-right', sort === 'oos_sharpe' && 'text-foreground')}>Sharpe</th>
                  <th className={cn(th, 'text-right', sort === 'oos_net' && 'text-foreground')}>Return</th>
                  <th className={cn(th, 'text-right')}>Max DD</th>
                  <th className={cn(th, 'text-right')}>Trade</th>
                  <th className={cn(th, 'text-right')} title="Return holdout kalau biaya 2× lipat">Biaya 2×</th>
                  <th className={cn(th, 'text-right')} title="Selisih return tanpa biaya vs dengan biaya (poin persen)">Beban biaya</th>
                  <th className={cn(th, 'text-left')} title="Berapa kali koin + strategi ini sudah dicoba (semua TF)">Percobaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => {
                  const pass = r.verdict === 'PASS'
                  const id = String(r.run_id)
                  return (
                    <tr key={id} className={cn('hover:bg-accent/40', pass ? 'bg-bullish/[0.04]' : 'opacity-60')}>
                      <td className={cn(td, 'w-8 pr-0')}>
                        <CompareCheckbox id={id} checked={picked.includes(id)} disabled={picked.length >= MAX_COMPARE} onToggle={(x) => setPicked(toggleId(picked, x))} label={`Bandingkan ${r.symbol} ${r.timeframe}`} />
                      </td>
                      <td className={cn(td, 'num text-xs font-bold')}>{r.rank ?? <span className="font-normal text-muted-foreground">—</span>}</td>
                      <td className={td}>
                        <Link href={`/lab/runs/${encodeURIComponent(id)}`} className="font-mono text-xs font-semibold hover:underline">
                          {r.symbol} <span className="text-muted-foreground">{r.timeframe}</span>
                        </Link>
                        <span className="block text-3xs text-muted-foreground">
                          {MODE_LABEL[r.mode]}
                          {r.scan_id !== null && <> · <Link href={`/lab/scan?id=${encodeURIComponent(String(r.scan_id))}`} className="hover:underline">scan #{String(r.scan_id)}</Link></>}
                        </span>
                        {(r.preset || (r.saved_as ?? []).length > 0) && (
                          <span className="flex flex-wrap items-center gap-1 text-3xs text-lab">
                            <Bookmark className="h-2.5 w-2.5" aria-hidden="true" />
                            <span className="num">{[r.preset?.name, ...(r.saved_as ?? []).map((n) => `→ ${n}`)].filter(Boolean).join(' · ')}</span>
                          </span>
                        )}
                      </td>
                      <td className={td} title={r.failed_checks.length ? `Gagal: ${FAILED_COPY(r.failed_checks)}` : undefined}>
                        <VerdictBadge verdict={r.verdict} />
                        {!pass && r.failed_checks.length > 0 && <span className="block max-w-[140px] truncate text-3xs text-muted-foreground">{FAILED_COPY(r.failed_checks)}</span>}
                      </td>
                      <td className={cn(td, 'num text-right text-xs', sort === 'oos_pf' && 'font-semibold')}>{pf(r)}</td>
                      <td className={cn(td, 'num text-right text-xs', sort === 'oos_sharpe' && 'font-semibold')}>{r.holdout.sharpe === null ? '—' : formatScore(r.holdout.sharpe)}</td>
                      <td className={cn(td, 'num text-right text-xs', signClass(r.holdout.net_return_pct), sort === 'oos_net' && 'font-semibold')}>{formatPercent(r.holdout.net_return_pct, 1)}</td>
                      <td className={cn(td, 'num text-right text-xs text-bearish')}>{dd(r.holdout.max_dd_pct)}</td>
                      <td className={cn(td, 'num text-right text-xs')}>{valueOrDash(r.holdout.trades)}</td>
                      <td className={cn(td, 'num text-right text-xs', signClass(r.holdout.stress_net_return_pct))}>{formatPercent(r.holdout.stress_net_return_pct, 1)}</td>
                      <td className={cn(td, 'num text-right text-xs')}>{r.holdout.cost_drag_pct === null ? '—' : `${formatScore(r.holdout.cost_drag_pct, 1)} pp`}</td>
                      <td className={td}>
                        <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-3xs', SNOOP_STYLE[r.snooping])} title="Run validasi/optimize, timeframe dan percobaan parameter untuk koin + strategi ini">
                          {r.snooping !== 'low' && <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />}
                          <span className="num">{attemptsLabel(r.attempts)}</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <CompareTray ids={picked} onClear={() => setPicked([])} />
      </Section>
    </div>
  )
}
