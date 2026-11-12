'use client'

import Link from 'next/link'
import { BookOpen, Bookmark, CandlestickChart } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { DriftPill, PaperProgress } from '@/components/lab/arena/PaperBits'
import { SideBadge } from '@/components/trading/SideBadge'
import { cn } from '@/lib/utils/cn'
import { formatNumber, formatPct, formatPrice, formatR, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { CHECK_COPY, arenaLinks, checkValues, driftPlain, isRunning, lastActionLabel } from '@/lib/lab/arena'
import type { ArenaRow } from '@/lib/api/types/arena'
import { PrePaperHint } from '@/components/lab/basket/BasketBits'
import { prePaperHint } from '@/lib/lab/basket'

function Stat({ label, value, hint, className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-2.5">
      <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('num mt-0.5 text-sm font-semibold', className)}>{value}</div>
      {hint && <div className="mt-0.5 text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Detail of one paper preset: plain answer, key numbers, every "Sesuai uji?" check, test reference, links. */
export function PaperDetailSheet({ row, reviewN, onClose }: { row: ArenaRow | null; reviewN: number; onClose: () => void }) {
  const s = row?.stats
  const bt = row?.backtest
  const p = row?.open_position
  const sp = row?.watch.strategy_position
  const links = row ? arenaLinks(row) : null
  return (
    <Sheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {row && s && links && (
          <div className="space-y-5 p-5 pt-12">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="num text-lg font-bold">{row.preset.name}</SheetTitle>
                <StatusPill kind="paper" />
                <DriftPill status={row.drift.status} />
              </div>
              <SheetDescription className="text-sm text-foreground">{driftPlain(row, reviewN)}</SheetDescription>
              {!isRunning(row) && (
                <p className="text-xs text-warn">Paper otomatis untuk preset ini sedang mati: tidak ada posisi baru sampai dinyalakan lagi dari Chart.</p>
              )}
            </header>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Hasil bersih" value={formatPct(s.return_pct, { digits: 2, signed: true })} className={signClass(s.return_pct)} hint={`Ekuitas ${formatUsd(s.equity)}`} />
              <Stat label={<Term k="max_drawdown" short noTip />} value={s.max_dd_pct === null ? 'tidak tersedia' : formatPct(-Math.abs(s.max_dd_pct), { digits: 1 })} />
              <div className="col-span-2 rounded-lg border bg-card p-2.5">
                <div className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Term k="paper_progress" />
                </div>
                <PaperProgress n={s.n_closed} of={reviewN} />
              </div>
              <Stat
                label={<Term k="win_rate" short noTip />}
                value={s.win_rate_pct === null ? 'tidak tersedia' : formatPct(s.win_rate_pct, { digits: 0 })}
                hint={s.win_rate_ci_pct ? `rentang wajar ${formatNumber(s.win_rate_ci_pct[0], { digits: 0 })}–${formatPct(s.win_rate_ci_pct[1], { digits: 0 })}` : undefined}
              />
              <Stat label="Rata-rata R" value={formatR(s.avg_r)} className={signClass(s.avg_r)} />
              <Stat
                label={<Term k="sharpe" short noTip />}
                value={s.sharpe === null ? 'belum cukup data' : formatNumber(s.sharpe)}
                hint={s.sharpe === null ? `butuh 30 hari data, baru ${s.sharpe_days} hari` : undefined}
              />
              <Stat label="Berjalan" value={`${formatNumber(s.days_running, { digits: 1 })} hari`} hint={`sejak ${formatTime(row.account.created_at)}`} />
            </div>

            <section className="space-y-1.5">
              <h3 className="text-sm font-semibold">Posisi sekarang</h3>
              {p ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <SideBadge side={p.side} />
                  <span>masuk di <span className="num">{formatPrice(p.entry_price)}</span></span>
                  <span className={cn('num', signClass(p.unrealized_pnl))}>untung/rugi berjalan {formatUsdSigned(p.unrealized_pnl)}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada posisi terbuka.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Aksi terakhir: {lastActionLabel(row.last_action)}
                {row.last_action && ` · ${formatAge(row.last_action.time)}`}. Sinyal dicek {formatAge(row.watch.last_eval_at)}.
              </p>
              <PrePaperHint text={prePaperHint(sp, row.preset.timeframe)} />
              {row.watch.error && <p className="text-xs text-warn">Error terakhir saat menghitung sinyal: {row.watch.error}</p>}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                <Term k="drift" /> per cek
              </h3>
              {row.drift.checks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada cek: preset ini tidak menyimpan hasil uji.</p>
              ) : (
                <ul className="space-y-2">
                  {row.drift.checks.map((c) => {
                    const v = checkValues(c)
                    const copy = CHECK_COPY[c.key]
                    return (
                      <li key={c.key} className="rounded-lg border p-2.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{copy?.label ?? c.label}</span>
                          <DriftPill status={c.status} size="xs" />
                        </div>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">{copy?.what}</p>
                        <dl className="mt-1.5 grid grid-cols-3 gap-2">
                          <div>
                            <dt className="text-[13px] text-muted-foreground">Paper</dt>
                            <dd className="num">{v.observed}</dd>
                          </div>
                          <div>
                            <dt className="text-[13px] text-muted-foreground">Uji</dt>
                            <dd className="num">{v.expected}</dd>
                          </div>
                          <div>
                            <dt className="text-[13px] text-muted-foreground">Rentang wajar</dt>
                            <dd className="num">{v.range}</dd>
                          </div>
                        </dl>
                      </li>
                    )
                  })}
                </ul>
              )}
              {row.stats.n_closed_manual > 0 && (
                <p className="text-[13px] text-muted-foreground">
                  {row.stats.n_closed_manual} transaksi manual di akun ini tidak dihitung di cek (ekuitas tetap ikut).
                </p>
              )}
            </section>

            <section className="space-y-1 text-xs text-muted-foreground">
              <h3 className="text-sm font-semibold text-foreground">Acuan: hasil uji preset</h3>
              {bt ? (
                <>
                  <p>
                    <Term k="holdout" short /> {formatTime(bt.start, { time: false, year: true })} – {formatTime(bt.end, { time: false, year: true })}:{' '}
                    {bt.trades} transaksi ({formatNumber(bt.trades_per_month, { digits: 1 })}/bulan), menang {formatPct(bt.win_rate_pct, { digits: 0 })}, hasil
                    bersih {formatPct(bt.net_return_pct, { signed: true })}, turun terdalam {formatPct(bt.max_dd_pct === null ? null : -Math.abs(bt.max_dd_pct))}.
                  </p>
                  {bt.contaminated && (
                    <p className="text-warn">Data uji ini sudah sering dilihat saat riset, jadi acuannya lemah: anggap petunjuk, bukan target.</p>
                  )}
                </>
              ) : (
                <p>Preset ini tidak menyimpan hasil uji, jadi tidak ada acuan pembanding.</p>
              )}
            </section>

            <nav className="flex flex-wrap gap-2 border-t pt-4 text-xs" aria-label={`Tautan ${row.preset.name}`}>
              <Link href={links.preset} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 hover:bg-accent">
                <Bookmark className="h-3.5 w-3.5" aria-hidden="true" /> Buka preset
              </Link>
              <Link href={links.journal} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 hover:bg-accent">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Jurnal akun ini
              </Link>
              <Link href={links.watch} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 hover:bg-accent">
                <CandlestickChart className="h-3.5 w-3.5" aria-hidden="true" /> Lihat di Chart
              </Link>
            </nav>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
