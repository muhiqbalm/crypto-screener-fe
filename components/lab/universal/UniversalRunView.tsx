'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Ban, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { Chip, EmptyState, Eyebrow, Section } from '@/components/lab/Section'
import { ModeBadge, StatusBadge, signClass } from '@/components/lab/LabBadges'
import { ChecksList, HoldoutWarning, VerdictBanner } from '@/components/lab/HonestyReport'
import { EquityChart } from '@/components/lab/EquityChart'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatScore, formatTimestamp, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { isActiveStatus, relativeTime } from '@/lib/lab/form'
import { useCancelLabJob, useLabJob, useLabRun, useLabRunEquity, useLabRunTrades } from '@/lib/queries/lab'
import { useCreateUniversalWatch, useUniversalContrib } from '@/lib/queries/universal'
import type { LabMetrics, LabRunDetail } from '@/lib/api/types/lab'
import type { UniversalContribRow, UniversalParams, UniversalTrade } from '@/lib/api/types/universal'

function num(m: LabMetrics | Record<string, unknown> | null | undefined, k: string): number | null {
  const v = m?.[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function obj(m: unknown, k: string): Record<string, unknown> | null {
  if (!m || typeof m !== 'object') return null
  const v = (m as Record<string, unknown>)[k]
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}
const fmtDd = (v: number | null) => (v === null ? '—' : `−${formatScore(Math.abs(v), 1)}%`)

const KPIS: { label: string; key: string; fmt: (v: number | null) => string; cls?: (v: number | null) => string }[] = [
  { label: 'Net return', key: 'net_return_pct', fmt: (v) => formatPercent(v, 1), cls: signClass },
  { label: 'CAGR', key: 'cagr_pct', fmt: (v) => formatPercent(v, 1), cls: signClass },
  { label: 'Max drawdown', key: 'max_dd_pct', fmt: fmtDd, cls: (v) => (v === null ? '' : 'text-bearish') },
  { label: 'Sharpe', key: 'sharpe', fmt: (v) => formatScore(v) },
  { label: 'Profit factor', key: 'profit_factor', fmt: (v) => formatScore(v) },
  { label: 'Trade (episode)', key: 'trades', fmt: (v) => (v === null ? '—' : String(Math.round(v))) },
  { label: 'Turnover / th', key: 'turnover_per_year', fmt: (v) => (v === null ? '—' : `${formatScore(v, 0)}×`) },
  { label: 'Eksposur rata2', key: 'avg_gross_exposure', fmt: (v) => (v === null ? '—' : `${formatScore(v * 100, 0)}%`) },
]

function Kpis({ run }: { run: LabRunDetail }) {
  const oos = run.oos_metrics
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {KPIS.map((k) => {
        const is = num(run.metrics, k.key)
        const ho = oos ? num(oos, k.key) : null
        return (
          <div key={k.key} className="flex flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm">
            <Eyebrow>{k.label}</Eyebrow>
            {oos ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div><div className="text-[10px] text-muted-foreground">In-sample</div><div className={cn('font-mono text-sm tabular-nums', k.cls?.(is))}>{k.fmt(is)}</div></div>
                <div><div className="text-[10px] font-medium text-lab">Holdout</div><div className={cn('font-mono text-base font-bold tabular-nums', k.cls?.(ho))}>{k.fmt(ho)}</div></div>
              </div>
            ) : <div className={cn('mt-2 font-mono text-lg font-bold tabular-nums', k.cls?.(is))}>{k.fmt(is)}</div>}
          </div>
        )
      })}
    </div>
  )
}

function Benchmarks({ run }: { run: LabRunDetail }) {
  const b = obj(run.metrics, 'benchmarks')
  if (!b) return null
  const full = obj(b, 'full_range')
  const hold = obj(b, 'holdout')
  const full_m = obj(run.metrics, 'full_range') ?? run.metrics
  const rows: [string, Record<string, unknown> | null, Record<string, unknown> | null][] = [
    ['Universal v0 (setelah biaya)', full_m, run.oos_metrics],
    ['BTC beli & tahan', obj(full, 'btc_buy_hold'), obj(hold, 'btc_buy_hold')],
    ['Semua koin bobot sama', obj(full, 'equal_weight'), obj(hold, 'equal_weight')],
  ]
  return (
    <Section title="Pembanding" description="Konteks, bukan syarat lolos. Pembanding tanpa biaya.">
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>{['', 'Net (seluruh)', 'DD (seluruh)', 'Net (holdout)', 'DD (holdout)'].map((h, i) => <th key={i} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map(([label, f, h]) => (
              <tr key={label}>
                <td className="px-3 py-2 text-xs">{label}</td>
                <td className={cn('px-3 py-2 text-right font-mono text-xs', signClass(num(f, 'net_return_pct')))}>{formatPercent(num(f, 'net_return_pct'), 1)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-bearish">{fmtDd(num(f, 'max_dd_pct'))}</td>
                <td className={cn('px-3 py-2 text-right font-mono text-xs', signClass(num(h, 'net_return_pct')))}>{h ? formatPercent(num(h, 'net_return_pct'), 1) : '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-bearish">{h ? fmtDd(num(h, 'max_dd_pct')) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

interface Fold { test_start: string; test_end: string; test: Record<string, number | null>; best_params?: Record<string, unknown> | null }

function Robustness({ run }: { run: LabRunDetail }) {
  const wf = obj(run.metrics, 'walk_forward') as { scheme?: string; folds?: Fold[]; oos_compounded_net_pct?: number; consistency?: number } | null
  const mc = obj(run.metrics, 'monte_carlo')
  if (!wf && !mc) return null
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {wf && (
        <Section title="Walk-forward" description={`${wf.scheme ?? ''} · gabungan ${formatPercent(wf.oos_compounded_net_pct ?? null, 1)} · ${wf.consistency !== undefined && wf.consistency !== null ? Math.round(wf.consistency * 100) : '—'}% jendela untung`}>
          <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="border-b border-border/60 bg-muted/30">
                <tr>{['Jendela uji', 'Net', 'DD', 'PF', 'Trade'].map((h, i) => <th key={h} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(wf.folds ?? []).map((f) => (
                  <tr key={f.test_start} title={f.best_params ? JSON.stringify(f.best_params) : undefined}>
                    <td className="px-3 py-1.5 font-mono text-[11px]">{f.test_start.slice(0, 10)} → {f.test_end.slice(0, 10)}</td>
                    <td className={cn('px-3 py-1.5 text-right font-mono text-xs', signClass(f.test.net_return_pct))}>{formatPercent(f.test.net_return_pct, 1)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-bearish">{fmtDd(f.test.max_dd_pct)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{formatScore(f.test.profit_factor)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{valueOrDash(f.test.trades)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {mc && (
        <Section title="Monte Carlo" description={`Block bootstrap return harian, ${valueOrDash(mc.n_simulations)} jalur. Batas lolos: DD 95% lebih dangkal dari −50%.`}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['DD realisasi', fmtDd(num(mc, 'original_dd'))],
              ['DD median', fmtDd(num(mc, 'median_dd'))],
              ['DD 95%', fmtDd(num(mc, 'dd_p95'))],
              ['DD 99%', fmtDd(num(mc, 'dd_p99'))],
              ['Peluang DD > 50%', num(mc, 'prob_dd_beyond_50pct') === null ? '—' : `${formatScore((num(mc, 'prob_dd_beyond_50pct') ?? 0) * 100, 0)}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border/60 p-2"><dt className="text-[11px] text-muted-foreground">{k}</dt><dd className="font-mono font-semibold text-bearish">{v}</dd></div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  )
}

function ContribTable({ rows }: { rows: UniversalContribRow[] }) {
  if (rows.length === 0) return <EmptyState title="Tidak ada kontribusi" />
  const max = Math.max(...rows.map((r) => Math.abs(r.pnl ?? 0)), 1)
  return (
    <div className="-mx-4 max-h-[520px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 border-b border-border/60 bg-card">
          <tr>{['Koin', 'P&L (USDT)', '', 'Trade', 'Winrate', 'Biaya', 'Funding'].map((h, i) => <th key={i} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i === 0 || i === 2 ? 'text-left' : 'text-right')}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((r) => (
            <tr key={r.symbol}>
              <td className="px-3 py-1.5 font-mono text-xs font-semibold">{r.symbol.replace(/USDT$/, '')}</td>
              <td className={cn('px-3 py-1.5 text-right font-mono text-xs tabular-nums', signClass(r.pnl))}>{formatScore(r.pnl, 0)}</td>
              <td className="w-32 px-3 py-1.5">
                <div className="h-2 rounded-full bg-muted">
                  <div className={cn('h-2 rounded-full', (r.pnl ?? 0) >= 0 ? 'bg-bullish' : 'bg-bearish')} style={{ width: `${(Math.abs(r.pnl ?? 0) / max) * 100}%` }} />
                </div>
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-xs">{r.trades}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs">{r.win_rate_pct === null ? '—' : `${formatScore(r.win_rate_pct, 0)}%`}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">{formatScore((r.fees ?? 0) + (r.slippage ?? 0), 0)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">{formatScore(r.funding, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Contributions({ run, enabled }: { run: LabRunDetail; enabled: boolean }) {
  const q = useUniversalContrib(run.id, enabled)
  const [seg, setSeg] = useState<'full' | 'holdout'>('full')
  if (!enabled) return null
  const rows = (seg === 'holdout' ? q.data?.holdout : q.data?.full) ?? []
  return (
    <Section title="Kontribusi per koin" description="P&L tiap koin setelah fee, slippage dan funding."
      action={q.data?.holdout ? (
        <div className="flex gap-1">
          <Chip active={seg === 'full'} onClick={() => setSeg('full')} className="h-7 px-2.5">Seluruh periode</Chip>
          <Chip active={seg === 'holdout'} onClick={() => setSeg('holdout')} className="h-7 px-2.5">Holdout</Chip>
        </div>
      ) : undefined}>
      {q.isPending ? <Skeleton className="h-48 w-full" /> : <ContribTable rows={rows} />}
    </Section>
  )
}

function Trades({ run, enabled }: { run: LabRunDetail; enabled: boolean }) {
  const q = useLabRunTrades(run.id, enabled)
  if (!enabled) return null
  const trades = ((q.data ?? []) as unknown as UniversalTrade[]).slice(-300).reverse()
  return (
    <Section title="Trade (episode per koin)" description="300 terakhir. Satu trade = satu koin dari masuk portofolio sampai keluar; P&L termasuk semua rebalance di antaranya.">
      {q.isPending ? <Skeleton className="h-48 w-full" /> : trades.length === 0 ? <EmptyState title="Tidak ada trade" /> : (
        <div className="-mx-4 max-h-[480px] overflow-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="sticky top-0 border-b border-border/60 bg-card">
              <tr>{['Koin', 'Arah', 'Masuk', 'Keluar', 'Harga masuk', 'Harga keluar', 'P&L', '% equity'].map((h, i) => <th key={h} className={cn('px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', i >= 4 ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {trades.map((t, i) => (
                <tr key={`${t.symbol}-${t.entry_time}-${i}`}>
                  <td className="px-3 py-1.5 font-mono text-xs font-semibold">{t.symbol.replace(/USDT$/, '')}</td>
                  <td className={cn('px-3 py-1.5 text-xs font-bold uppercase', t.side === 'long' ? 'text-bullish' : 'text-bearish')}>{t.side}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px]">{t.entry_time.slice(0, 16).replace('T', ' ')}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{t.exit_reason === 'open_at_end' ? 'masih terbuka' : t.exit_time.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs">{formatPrice(t.entry_price)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs">{formatPrice(t.exit_price)}</td>
                  <td className={cn('px-3 py-1.5 text-right font-mono text-xs', signClass(t.pnl))}>{formatScore(t.pnl, 0)}</td>
                  <td className={cn('px-3 py-1.5 text-right font-mono text-xs', signClass(t.pnl_pct))}>{formatPercent(t.pnl_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

export function UniversalRunView({ id }: { id: string }) {
  const router = useRouter()
  const { data: run, isPending, error, refetch } = useLabRun(id)
  const cancel = useCancelLabJob()
  const watch = useCreateUniversalWatch()
  const active = isActiveStatus(run?.status)
  const job = useLabJob(run?.job_id, active)
  const done = run?.status === 'done'
  const equity = useLabRunEquity(id, Boolean(done))

  const back = (
    <Link href="/lab/universal" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Universal v0</Link>
  )
  if (isPending) return <div className="space-y-4" aria-busy="true"><Skeleton className="h-10 w-64" /><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-80 w-full rounded-xl" /></div>
  if (error || !run) {
    return <div className="space-y-4">{back}<Section><ErrorPanel kind={error instanceof ApiError ? error.kind : 'server'} onRetry={() => refetch()} messageOverride="Gagal memuat run." /></Section></div>
  }
  const p = job.data?.progress as { stage?: string; done?: number; total?: number } | null | undefined
  const pct = p?.total ? Math.min(100, Math.round(((p.done ?? 0) / p.total) * 100)) : null
  const params = (run.best_params ?? run.params) as UniversalParams

  const startWatch = () =>
    watch.mutate(
      { name: `Universal dari run #${run.id}`, params, costs: run.costs, autopaper: true, telegram: false, run_id: run.id },
      {
        onSuccess: () => { notify.success('Paper trading dimulai'); router.push('/lab/universal') },
        onError: (e) => notify.error('Gagal membuat watch', { description: apiErrorDetail(e) ?? undefined }),
      },
    )

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><ModeBadge mode={run.mode} /><StatusBadge status={run.status} /><span className="text-xs text-muted-foreground">{relativeTime(run.created_at)}</span></div>
          <h1 className="text-2xl font-extrabold tracking-tight">Universal v0 · run #{String(run.id)}</h1>
          <p className="text-sm text-muted-foreground">
            Top-{String(params.top_n)}{params.allow_short ? ` + short ${String(params.bottom_n)}` : ' long-only'} · rebalance {String(params.rebalance)} · target vol {String(params.target_vol_pct)}%/th ·
            {' '}{Array.isArray(params.symbols) && params.symbols.length ? `${params.symbols.length} koin` : `${valueOrDash(num(obj(run.metrics, 'data'), 'n_symbols'))} koin`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {active && run.job_id !== null && run.job_id !== undefined && (
            <Button variant="outline" size="sm" onClick={() => cancel.mutate(run.job_id!)} disabled={cancel.isPending}><Ban />Batalkan</Button>
          )}
          {done && <Button size="sm" onClick={startWatch} disabled={watch.isPending}><Bot />Pantau (paper)</Button>}
        </div>
      </div>

      {active && (
        <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.07] p-4" role="status">
          <div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-sky-500" />{run.status === 'queued' ? 'Menunggu antrian…' : `${p?.stage ?? 'Memproses'}…`}</div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full bg-sky-500', pct === null && 'w-1/3 animate-pulse')} style={pct !== null ? { width: `${pct}%` } : undefined} /></div>
        </div>
      )}
      {run.status === 'error' && (
        <p className="flex items-start gap-2 rounded-lg border border-bearish/40 bg-bearish/10 px-4 py-3 text-sm text-bearish"><AlertTriangle className="mt-0.5 h-4 w-4" />{run.error}</p>
      )}

      <VerdictBanner verdict={run.verdict} mode={run.mode} status={run.status} checks={run.checks} />
      <HoldoutWarning touches={run.holdout_touches} />
      {done && <Kpis run={run} />}
      {done && (
        <Section title="Kurva equity portofolio" description={run.holdout_start ? `Holdout terkunci mulai ${formatTimestamp(run.holdout_start).slice(0, 10)} — tidak pernah dilihat saat memilih parameter.` : 'Seluruh periode.'}>
          {equity.isPending ? <Skeleton className="h-[320px] w-full" /> : equity.data && equity.data.length ? <EquityChart points={equity.data} holdoutStart={run.holdout_start} /> : <EmptyState title="Belum ada kurva" />}
        </Section>
      )}
      {done && run.checks.length > 0 && <Section title="Rapor kejujuran" description="Cek dan ambang yang sama persis dengan run koin tunggal."><ChecksList checks={run.checks} /></Section>}
      {done && <Benchmarks run={run} />}
      {done && <Robustness run={run} />}
      <Contributions run={run} enabled={Boolean(done)} />
      <Trades run={run} enabled={Boolean(done)} />
      {done && (
        <p className="text-[11px] text-muted-foreground">
          Catatan: universe = koin yang datanya ada sekarang (survivorship bias — koin yang sudah mati/delisting tidak ikut), jadi hasil historis cenderung terlalu bagus.
          Biaya: fee {run.costs.commission_pct}% + slippage {run.costs.slippage_pct}% per sisi{run.costs.funding ? ' + funding nyata' : ''}. Modal awal {formatPrice(num(run.params, 'initial_capital'))} USDT.
        </p>
      )}
    </div>
  )
}
