'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, RefreshCw, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { MODE_LABEL, RunStateChip, signClass } from '@/components/lab/LabBadges'
import { CompareCheckbox, CompareTray } from '@/components/lab/compare/CompareTray'
import { MAX_COMPARE, toggleId } from '@/lib/lab/planning'
import { formatPercent, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import { useLabRuns } from '@/lib/queries/lab'
import { isActiveStatus, relativeTime } from '@/lib/lab/form'
import type { LabRunMode, LabRunSummary } from '@/lib/api/types/lab'

type VerdictFilter = 'all' | 'PASS' | 'FAIL' | 'none'
type ModeFilter = 'all' | LabRunMode

function filterRuns(rows: LabRunSummary[], f: { q: string; mode: ModeFilter; verdict: VerdictFilter }): LabRunSummary[] {
  const q = f.q.trim().toUpperCase()
  return rows.filter(
    (r) =>
      (!q || r.symbol.toUpperCase().includes(q)) &&
      (f.mode === 'all' || r.mode === f.mode) &&
      (f.verdict === 'all' || (f.verdict === 'none' ? !r.verdict : r.verdict === f.verdict)),
  )
}

const th = 'px-3 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground'
const td = 'px-3 py-2.5'

export function RunsTable() {
  const router = useRouter()
  const { data, isPending, error, refetch, isFetching } = useLabRuns(50)
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<ModeFilter>('all')
  const [verdict, setVerdict] = useState<VerdictFilter>('all')
  const [picked, setPicked] = useState<string[]>([])
  const rows = useMemo(
    () => filterRuns([...(data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)), { q, mode, verdict }),
    [data, q, mode, verdict],
  )
  const total = data?.length ?? 0
  const active = (data ?? []).filter((r) => isActiveStatus(r.status)).length
  const go = (r: LabRunSummary) =>
    router.push(`/lab/${r.template_id === 'universal_v0' ? 'universal/runs' : 'runs'}/${encodeURIComponent(String(r.id))}`)

  return (
    <Section
      title="Riwayat run"
      description={active > 0 ? `${active} run masih jalan — update otomatis tiap 3 detik.` : '50 run terakhir. Klik baris untuk lihat detail.'}
      action={
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      {total > 0 && (
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative lg:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin" aria-label="Filter koin" className="h-8 pl-8 font-mono text-xs" />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Filter mode">
            {(['all', 'backtest', 'validate', 'optimize'] as const).map((m) => (
              <Chip key={m} active={mode === m} onClick={() => setMode(m)} className="h-7 px-2.5">
                {m === 'all' ? 'Semua mode' : MODE_LABEL[m]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 lg:ml-auto" aria-label="Filter rapor">
            {([['all', 'Semua'], ['PASS', 'LOLOS'], ['FAIL', 'GAGAL'], ['none', 'Tanpa rapor']] as const).map(([v, label]) => (
              <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)} className="h-7 px-2.5">
                {label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : error ? (
        <ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat daftar run dari server Lab." />
      ) : total === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-8 w-8" />}
          title="Belum ada run"
          description="Mulai dengan Validasi pakai setting default — hasilnya jadi patokan sebelum mengubah parameter."
          action={
            <Button size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Atur run di atas
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Tidak ada run yang cocok"
          action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setMode('all'); setVerdict('all') }}>Hapus filter</Button>}
        />
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
          <table className="w-full text-sm sm:min-w-[560px]">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th className={cn(th, 'w-8 pr-0')}><span className="sr-only">Pilih untuk dibandingkan</span></th>
                <th className={th}>Koin</th>
                <th className={cn(th, 'hidden sm:table-cell')}>Mode</th>
                <th className={th}>Hasil</th>
                <th className={cn(th, 'text-right')} title="Net return in-sample">Net (IS)</th>
                <th className={cn(th, 'hidden text-right sm:table-cell')}>PF</th>
                <th className={cn(th, 'hidden text-right md:table-cell')}>Max DD</th>
                <th className={cn(th, 'hidden text-right md:table-cell')}>Trade</th>
                <th className={cn(th, 'text-right')}>Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((r) => (
                <tr
                  key={String(r.id)}
                  tabIndex={0}
                  role="link"
                  aria-label={`Run ${r.symbol} ${r.timeframe}`}
                  onClick={() => go(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      go(r)
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                >
                  <td className={cn(td, 'w-8 pr-0')}>
                    {r.status === 'done' && r.template_id !== 'universal_v0' && (
                      <CompareCheckbox
                        id={String(r.id)}
                        checked={picked.includes(String(r.id))}
                        disabled={picked.length >= MAX_COMPARE}
                        onToggle={(id) => setPicked(toggleId(picked, id))}
                        label={`Bandingkan run ${r.symbol} ${r.timeframe}`}
                      />
                    )}
                  </td>
                  <td className={td}>
                    <span className="font-mono text-xs font-semibold">{r.symbol}</span>{' '}
                    <span className="font-mono text-xs text-muted-foreground">{r.timeframe}</span>
                    <span className="block text-3xs text-muted-foreground sm:hidden">{MODE_LABEL[r.mode]}</span>
                  </td>
                  <td className={cn(td, 'hidden text-xs text-muted-foreground sm:table-cell')}>{MODE_LABEL[r.mode]}</td>
                  <td className={td}><RunStateChip status={r.status} verdict={r.verdict} mode={r.mode} /></td>
                  <td className={cn(td, 'text-right font-mono text-xs tabular-nums', signClass(r.net_return_pct))}>{formatPercent(r.net_return_pct, 1)}</td>
                  <td className={cn(td, 'hidden text-right font-mono text-xs tabular-nums sm:table-cell')}>{formatScore(r.profit_factor)}</td>
                  <td className={cn(td, 'hidden text-right font-mono text-xs tabular-nums text-bearish md:table-cell')}>
                    {r.max_dd_pct === null ? '—' : `−${formatScore(Math.abs(r.max_dd_pct), 1)}%`}
                  </td>
                  <td className={cn(td, 'hidden text-right font-mono text-xs tabular-nums md:table-cell')}>{valueOrDash(r.trades)}</td>
                  <td className={cn(td, 'whitespace-nowrap text-right text-xs text-muted-foreground')} title={formatTimestamp(r.created_at)}>
                    {relativeTime(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CompareTray ids={picked} onClear={() => setPicked([])} />
    </Section>
  )
}
