'use client'

import { useState } from 'react'
import { AlertTriangle, Radio, Scale, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { KpiTile } from '@/components/ui/kpi'
import { SectionHeading } from '@/components/shell/page'
import { StatusPill } from '@/components/ui/status-pill'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Term } from '@/components/ui/term'
import { Freshness } from '@/components/ui/freshness'
import { ErrorState, EmptyState, LoadingState } from '@/components/shell/states'
import { formatCount, formatPrice, signClass } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { SAMPLE_COPY, hitCi, hitPct } from '@/lib/lab/ledger'
import { executionAnswer } from '@/lib/bot/execution'
import {
  OUTCOME_COPY,
  STATUS_COPY,
  bps,
  defaultChoice,
  duration,
  kLabel,
  pickCell,
  pickResult,
  ttlLabel,
} from '@/lib/lab/shadow'
import { useShadowReport } from '@/lib/queries/shadow'
import type { ShadowCell, ShadowReport, ShadowSignal } from '@/lib/api/types/shadow'

const th = 'px-3 py-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground'

/** Cost bps (+ = paid more): negative is good, so the colour is inverted. */
function costClass(v: number | null | undefined) {
  return v === null || v === undefined ? '' : signClass(-v)
}

function SampleWarning({ r }: { r: ShadowReport }) {
  const n = r.actual.n_counted
  if (n >= r.thresholds.min_n_ok || n === 0) return null
  return (
    <div className="flex gap-2.5 rounded-2xl border border-warn/30 bg-warn/[0.06] p-4 text-[14px] text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
      <p>
        <b className="text-warn">{n < r.thresholds.min_n_any ? `Baru ${n} sinyal live: anekdot, belum bukti.` : `Baru ${n} sinyal: sampel kecil.`}</b>{' '}
        Butuh minimal {r.thresholds.min_n_any} sinyal untuk melihat arah, idealnya {r.thresholds.min_n_ok}+ di berbagai kondisi pasar,
        sebelum mempertimbangkan ganti cara eksekusi.
      </p>
    </div>
  )
}

function SignalLabel({ s }: { s: ShadowSignal }) {
  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[14px] font-semibold">{s.symbol.replace(/USDT$/, '')}</span>
        <DirectionBadge direction={s.side} size="xs" />
        <span className="text-[13px] text-muted-foreground">{s.action === 'open' ? 'Buka' : 'Tutup'}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {s.off_close ? <Badge variant="warn" size="xs">di luar close candle</Badge> : null}
        {s.status !== 'done' && <Badge variant="muted" size="xs">{STATUS_COPY[s.status]}</Badge>}
      </div>
    </div>
  )
}

const closeCol: ResponsiveColumn<ShadowSignal> = {
  key: 'close',
  header: 'Close candle (WIB)',
  mobile: 'title',
  cell: (s) => (
    <div className="num whitespace-nowrap text-[14px]">
      {formatTime(s.bar_close_ts, { zone: false })}
      <div className="text-[13px] text-muted-foreground">candle {s.tf.toUpperCase()}</div>
    </div>
  ),
}

/** What actually happened to each live signal (market order). */
const ACTUAL_COLUMNS: ResponsiveColumn<ShadowSignal>[] = [
  closeCol,
  { key: 'sinyal', header: 'Sinyal', mobile: 'badge', cell: (s) => <SignalLabel s={s} /> },
  {
    key: 'harga',
    header: 'Harga close · jeda',
    align: 'right',
    mobile: 'field',
    mobileLabel: 'Harga close',
    cell: (s) => (
      <div className="num text-[14px]">
        {formatPrice(s.bar_close_px)}
        <div className="text-[13px] text-muted-foreground">jeda {duration(s.latency_s)}</div>
      </div>
    ),
  },
  {
    key: 'fill',
    header: 'Harga eksekusi · selisih',
    align: 'right',
    mobile: 'field',
    mobileLabel: 'Harga eksekusi',
    cell: (s) =>
      s.fill_price ? (
        <div className="num text-[14px]">
          {formatPrice(s.fill_price)}
          <div className={cn('text-[13px]', costClass(s.slippage_bps))}>selisih {bps(s.slippage_bps)}</div>
        </div>
      ) : (
        <div className="num text-[14px]">
          <span className="text-muted-foreground">belum tereksekusi</span>
          <div className={cn('text-[13px]', costClass(s.drift_bps))}>perkiraan {bps(s.drift_bps)}</div>
        </div>
      ),
  },
]

function simColumns(k: number, ttl: number): ResponsiveColumn<ShadowSignal>[] {
  return [
    closeCol,
    { key: 'sinyal', header: 'Sinyal', mobile: 'hidden', cell: (s) => <SignalLabel s={s} /> },
    {
      key: 'limit',
      header: 'Harga limit',
      align: 'right',
      mobile: 'field',
      cell: (s) => <span className="num text-[14px]">{formatPrice(pickResult(s, k, ttl)?.limit_px)}</span>,
    },
    {
      key: 'hasil',
      header: 'Limit bayangan',
      mobile: 'badge',
      cell: (s) => {
        const res = pickResult(s, k, ttl)
        const oc = res ? OUTCOME_COPY[res.outcome] : null
        return res && oc ? (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant={oc.tone} size="sm">
              {oc.label}
            </Badge>
            {res.outcome === 'filled' && <span className="num text-[13px] text-muted-foreground">dalam {duration(res.time_to_fill_s)}</span>}
            {res.data_basis === 'klines_1m' && <span className="text-[13px] text-warn">perkiraan dari candle 1 menit</span>}
          </div>
        ) : (
          <span className="text-[13px] text-muted-foreground">{s.status === 'error' ? (s.error ?? 'gagal dinilai') : 'menunggu'}</span>
        )
      },
    },
    {
      key: 'hemat',
      header: 'Hemat / rugi',
      align: 'right',
      mobile: 'field',
      cell: (s) => {
        const res = pickResult(s, k, ttl)
        return (
          <div className={cn('num text-[14px] font-semibold', signClass(res?.saving_bps))}>
            {bps(res?.saving_bps)}
            {res?.ref_basis === 'proxy' && <div className="text-[13px] font-normal text-muted-foreground">vs perkiraan</div>}
          </div>
        )
      },
    },
    {
      key: 'lari',
      header: <Term k="price_ran" short noTip />,
      mobileLabel: 'Harga menjauh',
      align: 'right',
      mobile: 'hidden',
      className: 'hidden md:table-cell',
      headerClassName: 'hidden md:table-cell',
      cell: (s) => {
        const res = pickResult(s, k, ttl)
        return res ? (
          <div className="num text-[14px]">
            <span className={costClass(res.runaway_end_bps)}>{bps(res.runaway_end_bps)}</span>
            <div className="text-[13px] text-muted-foreground">maks {bps(res.runaway_max_bps)}</div>
          </div>
        ) : (
          '—'
        )
      },
    },
  ]
}

function Grid({ r, k, ttl, onPick }: { r: ShadowReport; k: number; ttl: number; onPick: (k: number, ttl: number) => void }) {
  const { ks, ttls_min } = r.settings
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <caption className="sr-only">Persentase terisi dan rata-rata hemat per harga limit dan masa tunggu</caption>
        <thead className="border-b border-border/60 bg-muted/30">
          <tr>
            <th className={cn(th, 'text-left')}>Harga limit</th>
            {ttls_min.map((t) => (
              <th key={t} className={cn(th, 'text-right')}>
                tunggu {ttlLabel(t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {ks.map((kk) => (
            <tr key={kk}>
              <td className="px-3 py-2 text-[14px] font-medium">
                {kLabel(kk)}
                {kk < 0 && <div className="text-[13px] text-muted-foreground">sisi agresif, sering ditolak post-only</div>}
              </td>
              {ttls_min.map((t) => {
                const c = pickCell(r.grid, kk, t)
                const active = kk === k && t === ttl
                return (
                  <td key={t} className="px-1 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => onPick(kk, t)}
                      aria-pressed={active}
                      aria-label={c ? `${kLabel(kk)}, tunggu ${ttlLabel(t)}: ${c.filled} terisi, ${c.missed} tidak terisi, ${c.postonly} ditolak post-only` : undefined}
                      className={cn('num w-full rounded-md px-2 py-1 text-right text-[14px] hover:bg-accent/50', active && 'bg-brand/10 ring-1 ring-brand/40')}
                    >
                      {c && c.n ? (
                        <>
                          <div className="font-semibold">{hitPct(c.fill_rate)}</div>
                          <div className={cn('text-[13px]', signClass(c.mean_saving_bps))}>{bps(c.mean_saving_bps)}</div>
                        </>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LimitSimulation({ r }: { r: ShadowReport }) {
  const [pick, setPick] = useState<{ k: number; ttl: number } | null>(null)
  const choice = pick ?? defaultChoice(r.settings.ks, r.settings.ttls_min)
  const cell: ShadowCell | undefined = pickCell(r.grid, choice.k, choice.ttl)
  return (
    <details className="rounded-2xl border border-border/60 px-4 py-3">
      <summary className="cursor-pointer select-none text-[14px] font-medium">
        <Term k="limit_sim" noTip /> (lanjutan): kalau entry memakai order limit, berapa yang terisi dan berapa hemat?
      </summary>
      <div className="mt-3 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            aria-label="Harga limit"
            size="xs"
            value={String(choice.k)}
            onChange={(v) => setPick({ ...choice, k: Number(v) })}
            options={r.settings.ks.map((k) => ({ value: String(k), label: kLabel(k) }))}
          />
          <Segmented
            aria-label="Masa tunggu limit"
            size="xs"
            value={String(choice.ttl)}
            onChange={(v) => setPick({ ...choice, ttl: Number(v) })}
            options={r.settings.ttls_min.map((t) => ({ value: String(t), label: ttlLabel(t) }))}
          />
          {cell && (
            <Badge variant={SAMPLE_COPY[cell.sample].tone} size="sm">
              {SAMPLE_COPY[cell.sample].label}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Terisi"
            value={cell && cell.n ? hitPct(cell.fill_rate) : '—'}
            hint={cell ? `${kLabel(cell.k)} · tunggu ${ttlLabel(cell.ttl_min)} · n=${cell.n}${cell.n >= r.thresholds.min_n_any ? ` · ${hitCi(cell.fill_ci as [number, number])}` : ''}` : 'Belum ada hasil'}
          />
          <StatTile
            label="Rata-rata hemat"
            value={cell && cell.n ? bps(cell.mean_saving_bps) : '—'}
            valueClassName={signClass(cell?.mean_saving_bps)}
            hint={cell && cell.n ? `Terisi ${bps(cell.mean_saving_filled_bps)} · tidak terisi (dikejar) ${bps(cell.mean_saving_missed_bps)}` : 'Termasuk selisih fee taker − maker'}
          />
        </div>
        <Grid r={r} k={choice.k} ttl={choice.ttl} onPick={(k, ttl) => setPick({ k, ttl })} />
        <ResponsiveTable
          rows={r.signals}
          columns={simColumns(choice.k, choice.ttl)}
          rowKey={(s) => s.id}
          caption={`Limit bayangan per sinyal, ${kLabel(choice.k).toLowerCase()}, tunggu ${ttlLabel(choice.ttl)}`}
        />
        <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            <b>Hanya pengukuran.</b> Bot live tetap memakai market order; limit di sini tidak pernah dikirim ke exchange. Data pasar
            publik Binance USDT perpetual (transaksi dan candle 1 menit).
          </li>
          <li>
            Limit dipasang saat alert diterima di <code>close − arah × k × ATR(14)</code>, post-only. Dihitung terisi hanya jika ada
            transaksi publik yang <b>menembus</b> harga limit (bukan sekadar menyentuh).
          </li>
          <li>
            Hemat = selisih harga dibanding harga eksekusi market + selisih fee ({r.settings.taker_bps} − {r.settings.maker_bps} ={' '}
            {r.settings.fee_diff_bps} bps). Kalau tidak terisi, dianggap dikejar market order di akhir masa tunggu. Tanpa eksekusi aktual,
            pembandingnya transaksi publik pertama setelah alert (perkiraan).
          </li>
          <li>
            Belum dihitung: efek ke hasil trade setelah entry (limit cenderung terisi saat harga bergerak melawan sinyal), dan order
            besar yang bisa menggeser harga.
          </li>
        </ul>
      </div>
    </details>
  )
}

/**
 * Kualitas eksekusi (on /bot#eksekusi): how far live market fills land from the signal candle's
 * close, alert latency, and (folded) what a shadow post-only limit would have done.
 * Read-only; data from GET /api/v1/lab/shadow.
 */
export function ExecutionQuality({ id = 'eksekusi' }: { id?: string }) {
  const q = useShadowReport()
  const r = q.data
  return (
    <section id={id} className="scroll-mt-20 space-y-5" aria-labelledby={`${id}-title`}>
      <SectionHeading
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span id={`${id}-title`}>Kualitas eksekusi</span>
            <StatusPill kind="live" size="sm" />
          </span>
        }
        description="Selisih harga eksekusi bot dari close candle, dan jeda alert."
      />
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.error || !r ? (
        <ErrorState error={q.error ?? undefined} onRetry={() => q.refetch()} message="Kualitas eksekusi belum bisa dimuat." />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <KpiTile
              icon={Radio}
              label="Sinyal live"
              value={r.actual.n_counted}
              format={(n) => formatCount(Math.round(n))}
              hint={`${r.actual.n_open} buka · ${r.actual.n_close} tutup${r.actual.n_off_close ? ` · ${r.actual.n_off_close} di luar close` : ''}`}
            />
            <KpiTile
              icon={Scale}
              label={<Term k="slippage_bps" short noTip />}
              value={r.actual.n_with_fill ? bps(r.actual.mean_slippage_bps) : '—'}
              tone={r.actual.n_with_fill && r.actual.mean_slippage_bps ? (r.actual.mean_slippage_bps > 0 ? 'bearish' : 'bullish') : 'brand'}
              toneValue
              hint={r.actual.n_with_fill ? `rata-rata ${r.actual.n_with_fill} eksekusi · + = lebih mahal` : `belum ada eksekusi · perkiraan ${bps(r.actual.mean_drift_bps)}`}
            />
            <KpiTile
              icon={Timer}
              label={<Term k="alert_latency" noTip />}
              value={duration(r.actual.median_latency_s)}
              hint={r.actual.latency_upper_bound ? 'median · batas atas' : 'median · candle tutup → alert'}
            />
          </div>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{executionAnswer(r)}</p>
          <SampleWarning r={r} />
          {r.signals.length === 0 ? (
            <EmptyState
              title="Belum ada sinyal live"
              description="Begitu webhook TradingView masuk, worker Lab mencatatnya beberapa menit kemudian dan menilai limit bayangan setelah jendelanya lewat."
            />
          ) : (
            <ResponsiveTable rows={r.signals} columns={ACTUAL_COLUMNS} rowKey={(s) => s.id} caption="Eksekusi tiap sinyal live (market order)" />
          )}
          <Freshness updatedAt={r.last_cycle?.finished ?? undefined} timeframe="4h" nextDelayMin={10} />
          <LimitSimulation r={r} />
        </div>
      )}
    </section>
  )
}
