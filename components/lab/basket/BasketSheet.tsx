'use client'

import Link from 'next/link'
import { BookOpen, CalendarClock, Coins, FileText, GitCompareArrows, History, ListChecks, Scale } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { StatusPill } from '@/components/ui/status-pill'
import { Sparkline } from '@/components/ui/sparkline'
import { Term } from '@/components/ui/term'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { CoinAvatar } from '@/components/lab/arena/deck'
import { CoinStatusPill, GateChecklist, OutcomePill, PrePaperHint } from '@/components/lab/basket/BasketBits'
import { cn } from '@/lib/utils/cn'
import { formatCount, formatNumber, formatPct, formatPrice, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatTime, formatTimeframe } from '@/lib/utils/time'
import { exitReasonLabel } from '@/lib/lab/paper'
import { INVALID_REASON_COPY, OUTCOME_COPY, basketAnswer, fidelityText, prePaperHint, sizingText, skipReasonLabel, sortCoins } from '@/lib/lab/basket'
import { useBasketDetail } from '@/lib/queries/basket'
import type { BasketCheckpoint, BasketRow } from '@/lib/api/types/basket'

function Stat({ label, value, hint, className }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card p-3">
      <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('num mt-1 text-lg font-semibold', className)}>{value}</div>
      {hint && <div className="mt-0.5 text-[13px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function H({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
      <Icon className="h-4 w-4 text-info" aria-hidden="true" />
      {children}
    </h3>
  )
}

const pfText = (v: number | null, inf: boolean) => (inf ? '∞ (tanpa rugi)' : v === null ? '—' : formatNumber(v))

function CheckpointResult({ c }: { c: BasketCheckpoint }) {
  return (
    <div className="space-y-2 rounded-2xl border p-3 text-[14px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          Checkpoint {c.checkpoint} · {formatTime(c.at, { time: false })}
        </span>
        <OutcomePill status={c.verdict} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[13px]">
        <div>
          <dt className="text-muted-foreground">PF paper ({formatCount(c.trades)} transaksi)</dt>
          <dd className="num font-semibold">{pfText(c.pf, c.pf_infinite)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">PF engine (bar yang sama)</dt>
          <dd className="num font-semibold">{pfText(c.engine_pf, c.fidelity.engine_pf_infinite)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Turun terdalam / batas</dt>
          <dd className="num font-semibold">
            {formatPct(c.dd_pct, { digits: 1 })} / {c.dd_limit_pct === null ? 'tidak tersedia' : formatPct(c.dd_limit_pct, { digits: 1 })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sinyal engine diikuti</dt>
          <dd className="num font-semibold">
            {formatCount(c.fidelity.matched)}/{formatCount(c.fidelity.expected)}
          </dd>
        </div>
      </dl>
      {c.invalid_reasons.length > 0 && (
        <p className="text-[13px] text-warn">Tidak sah karena: {c.invalid_reasons.map((r) => INVALID_REASON_COPY[r] ?? r).join(', ')}.</p>
      )}
    </div>
  )
}

/**
 * Detail of one basket: the pre-registered outcome first, then the checkpoint conditions,
 * every coin (with the "position from before paper" note), paper-vs-engine fidelity, the frozen
 * reference numbers, recent trades and the rules. Summary from the list row; curve, trades and
 * the skip log load on open.
 */
export function BasketSheet({ row, onClose }: { row: BasketRow | null; onClose: () => void }) {
  const q = useBasketDetail(row ? row.basket.id : null)
  const d = q.data
  const b = row?.basket
  const s = row?.stats
  const x = row?.expect
  const ev = row?.evaluation
  const a = row ? basketAnswer(row) : null
  return (
    <Sheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {row && b && ev && a && (
          <div className="space-y-6 p-5 pt-12 sm:p-6 sm:pt-12">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="num text-xl font-bold">{b.name}</SheetTitle>
                <StatusPill kind="paper" />
                <OutcomePill status={ev.status} />
              </div>
              <SheetDescription className="text-[13px] text-muted-foreground">
                {b.template_label} · {formatTimeframe(b.timeframe)} · {formatCount(b.n_coins)} koin · {sizingText(b.sizing, b.label)} · mulai {formatTime(b.created_at)}
              </SheetDescription>
              <p className="text-[17px] font-semibold leading-snug">{a.text}</p>
              <p className="text-[13px] text-muted-foreground">{OUTCOME_COPY[ev.status].hint}</p>
            </header>

            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="Hasil" value={formatPct(s?.return_pct ?? null, { digits: 2, signed: true })} className={signClass(s?.return_pct ?? null)} hint={s ? `ekuitas ${formatPrice(s.equity)}` : undefined} />
              <Stat label={<Term k="max_drawdown" short noTip />} value={s?.max_dd_pct === null || s?.max_dd_pct === undefined ? 'tidak tersedia' : formatPct(-Math.abs(s.max_dd_pct), { digits: 1 })} />
              <Stat label="Posisi terbuka" value={`${formatCount(row.open_positions)} dari ${formatCount(b.n_coins)}`} hint={`${formatCount(row.gate.coins)} koin sudah bertransaksi`} />
              <Stat label="Berjalan" value={`${formatNumber(row.gate.days, { digits: 1 })} hari`} hint={`batas akhir ${formatTime(ev.deadline, { time: false })}`} />
            </div>
            {d?.curve && d.curve.length > 1 && (
              <div className="rounded-2xl border p-3">
                <div className="mb-1 text-[13px] text-muted-foreground">Kurva modal akun basket</div>
                <Sparkline data={d.curve.map((p) => p.equity)} tone="auto" height={72} area label={`Kurva modal ${b.name}`} />
              </div>
            )}

            <section className="space-y-3">
              <H icon={ListChecks}>
                <Term k="basket_checkpoint" />
              </H>
              <GateChecklist gate={row.gate} />
              {ev.next && (
                <p className="flex items-start gap-2 text-[14px]">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                  {ev.next.due
                    ? `Checkpoint ${ev.next.checkpoint} dijadwalkan ${formatTime(ev.next.due, { time: false })} (Senin).`
                    : `Checkpoint ${ev.next.checkpoint} paling cepat ${formatTime(ev.next.earliest, { time: false })}, setelah semua syarat terpenuhi.`}
                </p>
              )}
              {ev.checkpoints.map((c) => (
                <CheckpointResult key={c.checkpoint} c={c} />
              ))}
            </section>

            <section className="space-y-3">
              <H icon={Coins}>Per koin</H>
              <ul className="divide-y rounded-2xl border">
                {sortCoins(row.coins).map((c) => {
                  const hint = c.status === 'menunggu_sinyal_baru' ? prePaperHint(c.strategy_position, b.timeframe) : null
                  return (
                    <li key={c.symbol} className="space-y-1.5 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <CoinAvatar coin={c.coin} size={36} />
                          <span className="font-semibold">{c.coin}</span>
                          <span className="text-[13px] tabular-nums text-muted-foreground">
                            {formatCount(c.trades)} transaksi
                            {c.trades > 0 && (
                              <>
                                {' · '}
                                <span className={signClass(c.pnl)}>{formatUsdSigned(c.pnl)}</span>
                              </>
                            )}
                          </span>
                        </span>
                        <CoinStatusPill status={c.status} />
                      </div>
                      {c.open_position && (
                        <p className="text-[13px] text-muted-foreground">
                          {c.open_position.side === 'long' ? 'LONG' : 'SHORT'} sejak {formatTime(c.open_position.entry_time)} di {formatPrice(c.open_position.entry_price)}
                          {c.open_position.unrealized_pnl !== null && (
                            <>
                              {' · berjalan '}
                              <span className={signClass(c.open_position.unrealized_pnl)}>{formatUsdSigned(c.open_position.unrealized_pnl)}</span>
                            </>
                          )}
                        </p>
                      )}
                      <PrePaperHint text={hint} />
                      {c.error && <p className="text-[13px] text-warn">Error terakhir saat menghitung sinyal: {c.error}</p>}
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="space-y-2">
              <H icon={GitCompareArrows}>
                <Term k="basket_fidelity" />
              </H>
              <p className="text-[14px]">{fidelityText(row.fidelity)}</p>
              {(d?.fidelity.missed ?? []).length > 0 && (
                <ul className="space-y-1 text-[13px] text-muted-foreground">
                  {(d?.fidelity.missed ?? []).slice(0, 8).map((m) => (
                    <li key={`${m.symbol}-${m.signal_time}`}>
                      Tidak diikuti: {m.coin} {m.side === 'long' ? 'LONG' : 'SHORT'} {formatTime(m.signal_time)} · {skipReasonLabel(m.reason)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {x && (
              <section className="space-y-2">
                <H icon={Scale}>Acuan backtest (dibekukan)</H>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <Stat label="Transaksi/bulan" value={formatNumber(x.trades_per_month, { digits: 1 })} />
                  <Stat label={<Term k="profit_factor" short noTip />} value={formatNumber(x.profit_factor)} />
                  <Stat label="Turun terdalam" value={formatPct(x.max_dd_pct, { digits: 1 })} />
                  <Stat label="Lama pegang" value={`${formatNumber(x.avg_hold_days, { digits: 1 })} hari`} />
                  <Stat label="30 transaksi dalam" value={x.days_to_30_median ? `±${formatNumber(x.days_to_30_median, { digits: 0 })} hari` : '—'} />
                  <Stat label={<Term k="win_rate" short noTip />} value={formatPct(x.win_rate_pct, { digits: 0 })} />
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Backtest {formatTime(x.start, { time: false, year: true })} – {formatTime(x.end, { time: false, year: true })}, ukuran yang sama dengan paper. Dipakai untuk batas
                  turun terdalam dan perkiraan waktu, bukan untuk memilih koin.
                </p>
                {x.contaminated && (
                  <p className="text-[13px] text-warn">Periode acuan ini sudah pernah dilihat saat riset (tidak bersih): anggap petunjuk, bukan target.</p>
                )}
              </section>
            )}

            {d && d.trades.length > 0 && (
              <section className="space-y-2">
                <H icon={History}>Transaksi terakhir</H>
                <ul className="divide-y rounded-2xl border text-[13px]">
                  {d.trades.slice(0, 10).map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{t.symbol.replace(/USDT$/, '')}</span>
                        <DirectionBadge direction={t.side} size="xs" />
                        <span className="text-muted-foreground">{formatTime(t.exit_time)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground">{exitReasonLabel(t.exit_reason)}</span>
                        <span className={cn('num font-semibold', signClass(t.pnl))}>{formatUsdSigned(t.pnl)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <details className="rounded-2xl border px-4 py-3 text-[14px]">
              <summary className="cursor-pointer select-none font-semibold">
                Aturan uji (<Term k="praregistrasi" />)
              </summary>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
                <li>Koin tetap selama uji; hanya sinyal baru setelah paper dimulai yang diikuti.</li>
                <li>
                  {sizingText(b.sizing, b.label)}; notional total maks. {formatNumber(b.sizing.gross_cap_x, { digits: 1 })}× saldo; rem darurat −{formatNumber(b.sizing.kill_dd_pct, { digits: 0 })}% dari puncak.
                </li>
                <li>Checkpoint 1: ≥ 30 transaksi, ≥ 28 hari, ≥ 8 koin, ≥ 10 hari entry. Gagal kalau PF &lt; 1.0, lulus kalau PF ≥ 1.2.</li>
                <li>Checkpoint 2 (kalau lanjut): ≥ 60 transaksi dan ≥ 56 hari; lulus kalau PF ≥ 1.2.</li>
                <li>Lulus berarti paper diteruskan, bukan izin live.</li>
                <li className="flex items-start gap-1.5">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Dokumen: <span className="num">{b.prereg?.doc ?? 'docs/riset-2026-11-12/08-praregistrasi-basket.md'}</span>
                    {b.prereg?.commit ? ` · dikunci di commit ${b.prereg.commit}` : ''}
                  </span>
                </li>
              </ul>
            </details>

            {row.account && (
              <nav className="flex flex-wrap gap-2 border-t pt-4 text-[13px]" aria-label={`Tautan ${b.name}`}>
                <Link href={`/journal?account_id=${row.account.id}`} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 hover:bg-accent">
                  <BookOpen className="h-4 w-4" aria-hidden="true" /> Jurnal akun basket
                </Link>
              </nav>
            )}
            {q.isError && <p className="text-[13px] text-warn">Rincian (kurva, transaksi) tidak bisa dimuat saat ini.</p>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
