'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, Archive, CheckCircle2, FlaskConical, Grid3x3, ListChecks, RefreshCw, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KpiTile } from '@/components/ui/kpi'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Chip } from '@/components/lab/Section'
import { CompareCheckbox, CompareTray } from '@/components/lab/compare/CompareTray'
import { MODE_COPY, STATUS_COPY } from '@/components/lab/run/copy'
import { StrategyChip, VerdictPill } from '@/components/lab/run/v2-ui'
import { MAX_COMPARE, toggleId } from '@/lib/lab/planning'
import { formatAge, formatTime } from '@/lib/utils/time'
import { formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { useLabRuns, useLabScans, useLabTemplates } from '@/lib/queries/lab'
import { isActiveStatus, templateShort } from '@/lib/lab/form'
import { sortTimeframes } from '@/lib/lab/timeframes'
import type { LabRunMode, LabScanDetail, LabStatus } from '@/lib/api/types/lab'
import type { LabRunListItem } from '@/lib/api/types/lab-uji'

type Kind = 'all' | LabRunMode | 'scan'
type Outcome = 'all' | 'PASS' | 'FAIL' | 'none' | 'active'

export type HistoryEntry =
  | { kind: 'run'; key: string; at: string; templateId: string; run: LabRunListItem }
  | { kind: 'scan'; key: string; at: string; templateId: string; scan: LabScanDetail }

/**
 * One list for "Riwayat": single runs, plus one row per scan ("Banyak koin") instead of one row
 * per scan cell. Universal (archive) runs are left out. Newest first.
 */
export function historyEntries(runs: LabRunListItem[], scans: LabScanDetail[]): HistoryEntry[] {
  const out: HistoryEntry[] = []
  for (const r of runs) {
    if (r.template_id === 'universal_v0' || (r.scan_id !== null && r.scan_id !== undefined)) continue
    out.push({ kind: 'run', key: `run-${r.id}`, at: r.created_at, templateId: r.template_id, run: r })
  }
  for (const s of scans) {
    out.push({ kind: 'scan', key: `scan-${s.id}`, at: s.created_at ?? '', templateId: s.template_id ?? '', scan: s })
  }
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

function scanCounts(s: LabScanDetail) {
  const rows = s.rows ?? []
  return {
    coins: new Set(rows.map((r) => r.symbol)).size,
    tfs: sortTimeframes(Array.from(new Set(rows.map((r) => r.timeframe)))),
    pass: rows.filter((r) => r.verdict === 'PASS').length,
    total: rows.length,
  }
}

function entryStatus(e: HistoryEntry): LabStatus {
  return e.kind === 'run' ? e.run.status : e.scan.status
}

function matches(e: HistoryEntry, f: { q: string; tpl: string; kind: Kind; outcome: Outcome }): boolean {
  const q = f.q.trim().toUpperCase()
  if (q) {
    const syms = e.kind === 'run' ? [e.run.symbol] : (e.scan.rows ?? []).map((r) => r.symbol)
    if (!syms.some((s) => s.includes(q))) return false
  }
  if (f.tpl && e.templateId !== f.tpl) return false
  if (f.kind !== 'all') {
    if (f.kind === 'scan' ? e.kind !== 'scan' : e.kind !== 'run' || e.run.mode !== f.kind) return false
  }
  if (f.outcome !== 'all') {
    const status = entryStatus(e)
    if (f.outcome === 'active') return isActiveStatus(status)
    if (e.kind === 'scan') {
      const c = scanCounts(e.scan)
      if (f.outcome === 'PASS') return c.pass > 0
      if (f.outcome === 'FAIL') return status === 'done' && c.pass === 0
      return false
    }
    if (f.outcome === 'none') return status === 'done' && !e.run.verdict
    return e.run.verdict === f.outcome
  }
  return true
}

function ResultCell({ e }: { e: HistoryEntry }) {
  const status = entryStatus(e)
  if (e.kind === 'scan') {
    const c = scanCounts(e.scan)
    return (
      <span className="inline-flex flex-wrap items-baseline gap-1.5 text-sm">
        <span className={cn('num display text-lg font-extrabold', c.pass > 0 ? 'text-bullish' : 'text-muted-foreground')}>{c.pass}</span>
        <span className="text-muted-foreground">
          Lolos dari <span className="num">{c.total}</span>
        </span>
        {status !== 'done' && <span className="text-2xs text-info">· {STATUS_COPY[status]}</span>}
      </span>
    )
  }
  const r = e.run
  if (r.status !== 'done') {
    return <span className={cn('text-sm font-semibold', r.status === 'error' ? 'text-bearish' : r.status === 'running' ? 'text-info' : 'text-muted-foreground')}>{STATUS_COPY[r.status]}</span>
  }
  if (r.verdict) return <VerdictPill verdict={r.verdict} />
  if (r.mode === 'backtest') {
    return (
      <span className="text-sm">
        <span className={cn('num font-semibold', signClass(r.net_return_pct))}>{formatPct(r.net_return_pct, { signed: true })}</span>
        <span className="text-muted-foreground"> tanpa rapor</span>
      </span>
    )
  }
  return <span className="text-sm text-muted-foreground">Tanpa rapor</span>
}

const KINDS: [Kind, string][] = [
  ['all', 'Semua jenis'],
  ['validate', MODE_COPY.validate],
  ['optimize', MODE_COPY.optimize],
  ['backtest', MODE_COPY.backtest],
  ['scan', 'Banyak koin'],
]
const OUTCOMES: [Outcome, string][] = [
  ['all', 'Semua hasil'],
  ['PASS', 'Lolos'],
  ['FAIL', 'Gagal'],
  ['none', 'Tanpa rapor'],
  ['active', 'Sedang berjalan'],
]

/** Hasil uji → Riwayat: every test with its strategy, newest first; scans grouped as one row. */
export function RunsTable() {
  const router = useRouter()
  const runsQ = useLabRuns(200)
  const scansQ = useLabScans()
  const templatesQ = useLabTemplates()
  const [q, setQ] = useState('')
  const [tpl, setTpl] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [outcome, setOutcome] = useState<Outcome>('all')
  const [picked, setPicked] = useState<string[]>([])

  const all = useMemo(() => historyEntries(runsQ.data ?? [], scansQ.data ?? []), [runsQ.data, scansQ.data])
  const rows = useMemo(() => all.filter((e) => matches(e, { q, tpl, kind, outcome })), [all, q, tpl, kind, outcome])
  const active = all.filter((e) => isActiveStatus(entryStatus(e))).length
  const withReport = all.filter((e) => matches(e, { q: '', tpl: '', kind: 'all', outcome: 'PASS' }) || matches(e, { q: '', tpl: '', kind: 'all', outcome: 'FAIL' })).length
  const passed = all.filter((e) => matches(e, { q: '', tpl: '', kind: 'all', outcome: 'PASS' })).length
  const templates = templatesQ.data ?? []
  const nameOf = (id: string) => templateShort(id, templates.find((t) => t.id === id)?.name)
  const fullName = (id: string) => templates.find((t) => t.id === id)?.name
  const hrefOf = (e: HistoryEntry) =>
    e.kind === 'run' ? `/lab/runs/${encodeURIComponent(String(e.run.id))}` : `/lab/scan?id=${encodeURIComponent(String(e.scan.id))}`

  const columns: ResponsiveColumn<HistoryEntry>[] = [
    {
      key: 'pick',
      header: <span className="sr-only">Pilih untuk dibandingkan</span>,
      mobile: 'hidden',
      className: 'w-8 pr-0',
      cell: (e) =>
        e.kind === 'run' && e.run.status === 'done' ? (
          <CompareCheckbox
            id={String(e.run.id)}
            checked={picked.includes(String(e.run.id))}
            disabled={picked.length >= MAX_COMPARE}
            onToggle={(id) => setPicked(toggleId(picked, id))}
            label={`Bandingkan uji ${e.run.symbol} ${e.run.timeframe}`}
          />
        ) : null,
    },
    {
      key: 'what',
      header: 'Koin · TF',
      mobile: 'title',
      cell: (e) =>
        e.kind === 'run' ? (
          <span className="inline-flex items-center gap-2.5">
            <CoinAvatar symbol={e.run.symbol} size="sm" />
            <span className="num text-base font-semibold">
              {e.run.symbol.replace(/USDT$/, '')} <span className="font-normal text-muted-foreground">{e.run.timeframe}</span>
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-base font-semibold">
            <Grid3x3 className="h-4 w-4 shrink-0 text-lab" aria-hidden="true" />
            <span className="num">
              {scanCounts(e.scan).coins} koin × {scanCounts(e.scan).tfs.join(', ') || '—'}
            </span>
          </span>
        ),
    },
    { key: 'result', header: 'Hasil', mobile: 'badge', cell: (e) => <ResultCell e={e} /> },
    {
      key: 'strategy',
      header: 'Strategi',
      mobile: 'field',
      cell: (e) => (e.templateId ? <StrategyChip templateId={e.templateId} name={fullName(e.templateId)} /> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'kind',
      header: 'Jenis',
      mobile: 'field',
      cell: (e) => (
        <span className="text-sm text-muted-foreground">
          {e.kind === 'run' ? MODE_COPY[e.run.mode] : `Banyak koin · ${e.scan.mode === 'optimize' ? MODE_COPY.optimize : MODE_COPY.validate}`}
        </span>
      ),
    },
    {
      key: 'when',
      header: 'Waktu',
      mobile: 'field',
      align: 'right',
      cell: (e) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground" title={formatTime(e.at, { year: true })}>
          {formatAge(e.at)}
        </span>
      ),
    },
  ]

  const loading = runsQ.isPending || scansQ.isPending
  const error = runsQ.error ?? scansQ.error

  return (
    <div className="space-y-6">
      {!loading && !error && all.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
          <KpiTile label="Uji tercatat" value={all.length} icon={ListChecks} tone="brand" hint="uji banyak koin dihitung satu" />
          <KpiTile label="Ada yang Lolos" value={passed} icon={CheckCircle2} tone="bullish" toneValue hint={`dari ${withReport} uji yang punya rapor`} />
          <KpiTile label="Sedang berjalan" value={active} icon={Activity} tone="info" toneValue={active > 0} hint={active > 0 ? 'daftar memperbarui diri' : 'tidak ada antrian'} />
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative lg:w-52">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari koin" aria-label="Cari koin" className="h-11 pl-10 text-base" />
        </div>
        {templates.length > 1 && (
          <select aria-label="Strategi" value={tpl} onChange={(e) => setTpl(e.target.value)} className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm">
            <option value="" className="bg-popover">Semua strategi</option>
            {templates.map((t) => <option key={t.id} value={t.id} className="bg-popover">{nameOf(t.id)}</option>)}
          </select>
        )}
        <select aria-label="Jenis uji" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm">
          {KINDS.map(([v, l]) => <option key={v} value={v} className="bg-popover">{l}</option>)}
        </select>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter hasil">
          {OUTCOMES.map(([v, l]) => (
            <Chip key={v} active={outcome === v} onClick={() => setOutcome(v)} className="h-10 px-4 text-sm">{l}</Chip>
          ))}
        </div>
        <Button variant="ghost" onClick={() => { void runsQ.refetch(); void scansQ.refetch() }} disabled={runsQ.isFetching || scansQ.isFetching} className="h-10 gap-2 rounded-full px-4 text-sm lg:ml-auto">
          <RefreshCw className={cn('h-4 w-4', (runsQ.isFetching || scansQ.isFetching) && 'animate-spin')} aria-hidden="true" />
          Muat ulang
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">Klik baris untuk rapornya. Centang 2–4 uji untuk dibandingkan.</p>

      {loading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState error={error} title="Riwayat uji gagal dimuat" onRetry={() => { void runsQ.refetch(); void scansQ.refetch() }} />
      ) : (
        <ResponsiveTable
          rows={rows}
          columns={columns}
          rowKey={(e) => e.key}
          onRowClick={(e) => router.push(hrefOf(e))}
          rowLabel={(e) => (e.kind === 'run' ? `Buka uji ${e.run.symbol} ${e.run.timeframe}` : `Buka uji banyak koin #${e.scan.id}`)}
          caption="Riwayat uji"
          empty={
            all.length === 0 ? (
              <EmptyState
                icon={<FlaskConical className="h-8 w-8" />}
                title="Belum ada uji"
                description="Mulai dengan Uji jujur memakai setting default. Hasilnya jadi patokan sebelum mengubah parameter."
                action={<Button asChild size="sm"><Link href="/lab">Mulai uji</Link></Button>}
              />
            ) : (
              <EmptyState
                title="Tidak ada uji yang cocok"
                action={<Button variant="outline" size="sm" onClick={() => { setQ(''); setTpl(''); setKind('all'); setOutcome('all') }}>Hapus filter</Button>}
              />
            )
          }
        />
      )}

      <p className="flex items-center gap-2 text-2xs text-muted-foreground">
        <Archive className="h-4 w-4" aria-hidden="true" />
        Arsip:{' '}
        <Link href="/lab/universal" className="font-medium text-info hover:underline">Universal v0</Link>
        (strategi multi-koin yang sudah dihentikan).
      </p>
      <CompareTray ids={picked} onClear={() => setPicked([])} />
    </div>
  )
}
