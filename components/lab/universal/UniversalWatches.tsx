'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bell, BellOff, Bot, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Eyebrow, Section } from '@/components/lab/Section'
import { signClass } from '@/components/lab/LabBadges'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatPrice, formatScore } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/lab/form'
import {
  useCreateUniversalWatch,
  useDeleteUniversalWatch,
  usePatchUniversalWatch,
  useUniversalRebalances,
  useUniversalWatches,
} from '@/lib/queries/universal'
import type { LabId } from '@/lib/api/types/lab'
import type { UniversalWatch } from '@/lib/api/types/universal'

const ACTION_LABEL: Record<string, string> = { open: 'BUKA', add: 'TAMBAH', reduce: 'KURANGI', close: 'TUTUP' }

function Rebalances({ watchId }: { watchId: LabId }) {
  const q = useUniversalRebalances(watchId)
  if (q.isPending) return <Skeleton className="h-24 w-full" />
  const rows = q.data ?? []
  if (rows.length === 0) return <p className="text-2xs text-muted-foreground">Belum ada rebalance.</p>
  return (
    <div className="max-h-72 space-y-2 overflow-auto">
      {rows.map((r) => (
        <div key={String(r.id)} className="rounded-lg border border-border/60 p-2 text-2xs">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-mono">{formatTime(r.bar, { year: true })}</span>
            <span className="text-muted-foreground">{r.equity !== null ? `modal ${formatPrice(r.equity)} USDT` : r.note}</span>
          </div>
          {r.orders.length === 0 ? (
            <p className="mt-1 text-muted-foreground">Tidak ada order (target: {r.targets.map((t) => t.symbol.replace(/USDT$/, '')).join(', ') || 'kosong'}).</p>
          ) : (
            <ul className="mt-1 space-y-0.5 font-mono">
              {r.orders.map((o, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className={cn('font-semibold', o.action === 'close' || o.action === 'reduce' ? 'text-bearish' : 'text-bullish')}>{ACTION_LABEL[o.action] ?? o.action}</span>
                  <span>{o.symbol.replace(/USDT$/, '')}</span>
                  <span className="text-muted-foreground">{o.side} {formatScore(o.weight_from, 1)}% → {formatScore(o.weight_to, 1)}% @ {formatPrice(o.price)}</span>
                  {typeof o.pnl === 'number' && <span className={signClass(o.pnl)}>{o.pnl >= 0 ? '+' : ''}{formatScore(o.pnl, 2)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

function WatchCard({ w }: { w: UniversalWatch }) {
  const patch = usePatchUniversalWatch()
  const del = useDeleteUniversalWatch()
  const [showLog, setShowLog] = useState(false)
  const acct = w.account
  const ret = acct && acct.starting_balance ? ((acct.equity / acct.starting_balance) - 1) * 100 : null
  const toggle = (body: { autopaper?: boolean; telegram?: boolean }) =>
    patch.mutate({ id: w.id, body }, { onError: (e) => notify.error('Gagal menyimpan', { description: apiErrorDetail(e) ?? undefined }) })

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-lab" />{w.name || `Universal #${w.id}`}</div>
          <div className="text-2xs text-muted-foreground">
            Rebalance {String(w.params.rebalance ?? '1d')} · top-{String(w.params.top_n ?? 5)}{w.params.allow_short ? ` + short ${String(w.params.bottom_n)}` : ''} ·
            dibuat {relativeTime(w.created_at)}
            {w.run_id ? <> · dari <Link className="underline" href={`/lab/universal/runs/${encodeURIComponent(String(w.run_id))}`}>run #{String(w.run_id)}</Link></> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id={`ap-${w.id}`} checked={w.autopaper} disabled={!w.account_id || patch.isPending} onCheckedChange={(v) => toggle({ autopaper: v })} />
            <Label htmlFor={`ap-${w.id}`} className="text-2xs">Auto paper</Label>
          </div>
          {w.telegram ? (
            <div className="flex items-center gap-2">
              {/* Lab Telegram stays off (CEO): an old flag can only be switched off here, never on. */}
              <Switch id={`tg-${w.id}`} checked disabled={patch.isPending} onCheckedChange={() => toggle({ telegram: false })} />
              <Label htmlFor={`tg-${w.id}`} className="flex items-center gap-1 text-2xs"><Bell className="h-3 w-3" aria-hidden="true" />Tanda Telegram lama (alert tetap mati)</Label>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-2xs text-muted-foreground"><BellOff className="h-3 w-3" aria-hidden="true" />Telegram mati</span>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-2xs text-bearish" disabled={del.isPending}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Hentikan
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hentikan pantauan Universal ini?</AlertDialogTitle>
                <AlertDialogDescription>Posisi paper yang masih terbuka tidak ditutup otomatis. Riwayat dan akun simulasinya tetap ada.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => del.mutate(w.id)}>Hentikan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {w.state?.error && (
        <p className="flex items-start gap-2 rounded-lg border border-bearish/40 bg-bearish/10 px-3 py-2 text-2xs text-bearish"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w.state.error}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Eyebrow>Akun paper</Eyebrow>
          {acct ? (
            <>
              <div className="font-mono text-lg font-bold tabular-nums">{formatPrice(acct.equity)} <span className="text-2xs font-normal text-muted-foreground">USDT</span></div>
              <div className={cn('font-mono text-2xs', signClass(ret))}>{formatPercent(ret, 2)} sejak mulai · realized {formatScore(acct.realized_pnl, 2)}</div>
              <Link href={`/journal?source=paper_auto&account_id=${encodeURIComponent(String(acct.id))}`} className="text-2xs underline text-muted-foreground">Lihat jurnal</Link>
            </>
          ) : <p className="text-2xs text-muted-foreground">Tanpa akun paper (sinyal saja).</p>}
        </div>
        <div className="space-y-1">
          <Eyebrow>Target saat ini</Eyebrow>
          {(w.state?.targets ?? []).length === 0 ? (
            <p className="text-2xs text-muted-foreground">{w.state ? 'Kosong — tidak ada koin yang lolos filter tren (cash).' : 'Menunggu evaluasi pertama…'}</p>
          ) : (
            <ul className="space-y-0.5 font-mono text-2xs">
              {w.state!.targets.map((t) => (
                <li key={t.symbol} className="flex justify-between gap-3"><span>{t.symbol.replace(/USDT$/, '')}</span><span className={t.weight_pct >= 0 ? 'text-bullish' : 'text-bearish'}>{formatScore(t.weight_pct, 1)}%</span></li>
              ))}
            </ul>
          )}
          {w.state && <p className="text-2xs text-muted-foreground">Rebalance berikut: {formatTime(w.state.next_rebalance)}</p>}
        </div>
        <div className="space-y-1">
          <Eyebrow>Posisi terbuka</Eyebrow>
          {(acct?.open_positions ?? []).length === 0 ? <p className="text-2xs text-muted-foreground">Tidak ada.</p> : (
            <ul className="space-y-0.5 font-mono text-2xs">
              {acct!.open_positions.map((p) => (
                <li key={String(p.id)} className="flex justify-between gap-3">
                  <span>{p.symbol.replace(/USDT$/, '')} <span className="text-muted-foreground">{p.side}</span></span>
                  <span className={signClass(p.unrealized_pnl)}>{p.unrealized_pnl === null ? '—' : formatScore(p.unrealized_pnl, 2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-2xs" onClick={() => setShowLog((s) => !s)}>{showLog ? 'Sembunyikan riwayat rebalance' : 'Riwayat rebalance'}</Button>
        {showLog && <div className="mt-2"><Rebalances watchId={w.id} /></div>}
      </div>
    </div>
  )
}

export function UniversalWatches() {
  const q = useUniversalWatches()
  const create = useCreateUniversalWatch()
  const startDefault = () =>
    create.mutate(
      { name: 'Universal v0 (default)', params: {}, costs: { commission_pct: 0.05, slippage_pct: 0.05, funding: true }, autopaper: true, telegram: false },
      {
        onSuccess: () => notify.success('Paper Universal dimulai', { description: 'Akun simulasi 10,000 USDT dibuat. Rebalance pertama setelah data diperbarui (±2 menit).' }),
        onError: (e) => notify.error('Gagal membuat watch', { description: apiErrorDetail(e) ?? undefined }),
      },
    )
  return (
    <Section
      title="Pantauan paper (arsip)"
      description="Pantauan lama tetap berjalan sampai dihentikan: tiap candle 4H tutup Lab menghitung ulang, dan saat jadwal rebalance akun simulasi diatur ke bobot target. Alert Telegram dari Lab mati."
      action={
        <Button size="sm" onClick={startDefault} disabled={create.isPending} className="h-8 gap-1.5 text-2xs">
          <Plus className="h-3.5 w-3.5" />Mulai (setting default)
        </Button>
      }
    >
      {q.isPending ? <Skeleton className="h-40 w-full" /> : q.error ? (
        <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat watch Universal." />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState title="Tidak ada pantauan Universal" description="Strategi ini sudah diarsipkan. Tidak ada order nyata." />
      ) : (
        <div className="space-y-3">{q.data!.map((w) => <WatchCard key={String(w.id)} w={w} />)}</div>
      )}
    </Section>
  )
}
