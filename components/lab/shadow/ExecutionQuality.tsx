'use client'

import { useState } from 'react'
import { AlertTriangle, Gauge } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { ErrorState, EmptyState, LoadingState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { SideBadge } from '@/components/trading/SideBadge'
import { ApiError } from '@/lib/api/errors'
import { formatPrice, formatTimestamp, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/lab/form'
import { SAMPLE_COPY, hitCi, hitPct } from '@/lib/lab/ledger'
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

const th = 'px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground'

/** Cost bps (+ = paid more): negative is good, so the colour is inverted. */
function costClass(v: number | null | undefined) {
  return v === null || v === undefined ? '' : signClass(-v)
}

function SampleWarning({ r }: { r: ShadowReport }) {
  const n = r.actual.n_counted
  if (n >= r.thresholds.min_n_ok) return null
  return (
    <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
      <p>
        <b className="text-warn">
          {n < r.thresholds.min_n_any ? `Baru ${n} sinyal live: ini anekdot, bukan bukti.` : `Baru ${n} sinyal: sampel kecil.`}
        </b>{' '}
        Butuh minimal {r.thresholds.min_n_any} sinyal untuk melihat arah, idealnya {r.thresholds.min_n_ok}+ di berbagai kondisi pasar,
        sebelum mempertimbangkan ganti eksekusi. Satu sinyal bisa terisi atau meleset hanya karena kebetulan arah 5 menit pertama.
      </p>
    </div>
  )
}

function Tiles({ r, cell }: { r: ShadowReport; cell: ShadowCell | undefined }) {
  const a = r.actual
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile
        label="Sinyal live"
        value={a.n_counted.toLocaleString('id-ID')}
        hint={`${a.n_open} open · ${a.n_close} close${a.n_off_close ? ` · ${a.n_off_close} di luar close (tidak dihitung)` : ''}`}
      />
      <StatTile
        label="Slippage aktual"
        value={a.n_with_fill ? bps(a.mean_slippage_bps) : 'Belum ada fill'}
        valueClassName={costClass(a.mean_slippage_bps)}
        hint={
          a.n_with_fill
            ? `${a.n_with_fill} fill vs close bar · impact ${bps(a.mean_impact_bps)}`
            : `Drift close → alert ${bps(a.mean_drift_bps)} (proxy)`
        }
      />
      <StatTile
        label="Latensi alert"
        value={duration(a.median_latency_s)}
        hint={a.latency_upper_bound ? 'Median · batas atas (waktu log setelah order)' : 'Median · close bar → webhook diterima'}
      />
      <StatTile
        label="Fill rate limit"
        value={cell && cell.n ? hitPct(cell.fill_rate) : '—'}
        hint={cell ? `${kLabel(cell.k)} · ${ttlLabel(cell.ttl_min)} · n=${cell.n}${cell.n >= r.thresholds.min_n_any ? ` · ${hitCi(cell.fill_ci as [number, number])}` : ''}` : 'Belum ada hasil'}
      />
      <StatTile
        label="Rata-rata hemat"
        value={cell && cell.n ? bps(cell.mean_saving_bps) : '—'}
        valueClassName={signClass(cell?.mean_saving_bps)}
        hint={cell && cell.n ? `Terisi ${bps(cell.mean_saving_filled_bps)} · tidak terisi (dikejar) ${bps(cell.mean_saving_missed_bps)}` : 'Termasuk selisih fee taker − maker'}
      />
    </div>
  )
}

function Grid({
  r,
  k,
  ttl,
  onPick,
}: {
  r: ShadowReport
  k: number
  ttl: number
  onPick: (k: number, ttl: number) => void
}) {
  const { ks, ttls_min } = r.settings
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
      <table className="w-full text-sm sm:min-w-[620px]">
        <thead className="border-b border-border/60 bg-muted/30">
          <tr>
            <th className={cn(th, 'text-left')}>Harga limit</th>
            {ttls_min.map((t) => (
              <th key={t} className={cn(th, 'text-right')} title="Berapa lama limit dibiarkan sebelum dikejar dengan market order">
                {ttlLabel(t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {ks.map((kk) => (
            <tr key={kk}>
              <td className="px-3 py-2 text-xs font-medium">
                {kLabel(kk)}
                {kk < 0 && <div className="text-3xs text-muted-foreground">sisi agresif, sering ditolak post-only</div>}
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
                      className={cn(
                        'num w-full rounded-md px-2 py-1 text-right text-xs hover:bg-accent/50',
                        active && 'bg-brand/10 ring-1 ring-brand/40',
                      )}
                      title={c ? `${c.filled} terisi · ${c.missed} tidak terisi · ${c.postonly} ditolak post-only` : undefined}
                    >
                      {c && c.n ? (
                        <>
                          <div className="font-semibold">{hitPct(c.fill_rate)}</div>
                          <div className={cn('text-3xs', signClass(c.mean_saving_bps))}>{bps(c.mean_saving_bps)}</div>
                        </>
                      ) : (
                        <span className="text-3xs text-muted-foreground">—</span>
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

function SignalRow({ s, k, ttl }: { s: ShadowSignal; k: number; ttl: number }) {
  const res = pickResult(s, k, ttl)
  const oc = res ? OUTCOME_COPY[res.outcome] : null
  return (
    <tr className={cn(s.off_close ? 'opacity-60' : '')}>
      <td className="num whitespace-nowrap px-3 py-2 text-xs">
        {formatTimestamp(s.bar_close_ts).slice(0, 16)}
        <div className="text-3xs text-muted-foreground">close {s.tf.toUpperCase()}</div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-semibold">{s.symbol.replace(/USDT$/, '')}</span>
          <SideBadge side={s.side} />
          <span className="text-2xs text-muted-foreground">{s.action === 'open' ? 'Open' : 'Close'}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {s.off_close ? <Badge variant="warn" size="xs">di luar close bar</Badge> : null}
          {s.status !== 'done' && <Badge variant="muted" size="xs">{STATUS_COPY[s.status]}</Badge>}
        </div>
      </td>
      <td className="num px-3 py-2 text-right text-xs">
        {formatPrice(s.bar_close_px)}
        <div className="text-3xs text-muted-foreground" title="Waktu dari close bar sampai alert tercatat">{duration(s.latency_s)}</div>
      </td>
      <td className="num px-3 py-2 text-right text-xs">
        {s.fill_price ? (
          <>
            {formatPrice(s.fill_price)}
            <div className={cn('text-3xs', costClass(s.slippage_bps))} title="Slippage vs close bar (+ = lebih mahal)">
              slip {bps(s.slippage_bps)}
            </div>
          </>
        ) : (
          <>
            <span className="text-muted-foreground" title={s.statuses.join(', ')}>Tidak ada fill</span>
            <div className={cn('text-3xs', costClass(s.drift_bps))} title="Harga trade publik pertama setelah alert vs close bar (proxy market order)">
              proxy {bps(s.drift_bps)}
            </div>
          </>
        )}
      </td>
      <td className="num hidden px-3 py-2 text-right text-xs sm:table-cell">{formatPrice(res?.limit_px)}</td>
      <td className="px-3 py-2">
        {res && oc ? (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant={oc.tone} size="sm">{oc.label}</Badge>
            {res.outcome === 'filled' && <span className="num text-3xs text-muted-foreground">dalam {duration(res.time_to_fill_s)}</span>}
            {res.data_basis === 'klines_1m' && <span className="text-3xs text-warn" title="aggTrades belum tersedia; waktu fill dari candle 1 menit">perkiraan 1m</span>}
          </div>
        ) : (
          <span className="text-3xs text-muted-foreground">{s.status === 'error' ? (s.error ?? 'gagal') : 'menunggu'}</span>
        )}
      </td>
      <td className={cn('num px-3 py-2 text-right text-xs font-semibold', signClass(res?.saving_bps))}>
        {bps(res?.saving_bps)}
        {res?.ref_basis === 'proxy' && <div className="text-3xs font-normal text-muted-foreground">vs proxy</div>}
      </td>
      <td className="num hidden px-3 py-2 text-right text-xs md:table-cell"
        title="Pergerakan harga searah order setelah alert: + = harga lari menjauh dari limit (biaya kesempatan)">
        {res ? (
          <>
            <span className={costClass(res.runaway_end_bps)}>{bps(res.runaway_end_bps)}</span>
            <div className="text-3xs text-muted-foreground">maks {bps(res.runaway_max_bps)}</div>
          </>
        ) : '—'}
      </td>
    </tr>
  )
}

function Signals({ r, k, ttl }: { r: ShadowReport; k: number; ttl: number }) {
  if (r.signals.length === 0)
    return (
      <EmptyState
        title="Belum ada sinyal live"
        description="Begitu webhook TradingView masuk, worker Lab mencatatnya beberapa menit kemudian dan menilai limit bayangan setelah jendelanya lewat."
      />
    )
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
      <table className="w-full text-sm sm:min-w-[860px]">
        <thead className="border-b border-border/60 bg-muted/30">
          <tr>
            <th className={cn(th, 'text-left')}>Sinyal</th>
            <th className={cn(th, 'text-left')}>Koin</th>
            <th className={cn(th, 'text-right')} title="Close candle yang memicu alert, dan latensinya">Close bar</th>
            <th className={cn(th, 'text-right')}>Fill market</th>
            <th className={cn(th, 'hidden text-right sm:table-cell')}>Limit</th>
            <th className={cn(th, 'text-left')}>Limit bayangan</th>
            <th className={cn(th, 'text-right')} title="Hemat (+) atau rugi (−) vs fill market, termasuk selisih fee; tidak terisi = dikejar market di akhir jendela">
              Hemat / rugi
            </th>
            <th className={cn(th, 'hidden text-right md:table-cell')}>Harga lari</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {r.signals.map((s) => (
            <SignalRow key={s.id} s={s} k={k} ttl={ttl} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Notes({ r }: { r: ShadowReport }) {
  return (
    <ul className="list-disc space-y-1 pl-4 text-2xs leading-relaxed text-muted-foreground">
      <li>
        <b>Hanya pengukuran.</b> Eksekusi live tetap market order; limit di sini tidak pernah dikirim ke exchange. Data pasar publik
        Binance USD-M (aggTrades + candle 1 menit).
      </li>
      <li>
        Limit dipasang saat alert diterima di <code>close − arah × k × ATR(14)</code>, post-only. Dihitung terisi hanya jika ada trade
        publik yang <b>menembus</b> harga limit (bukan sekadar menyentuh), jadi posisi antrean tidak menguntungkan hasil.
      </li>
      <li>
        Hemat = selisih harga vs fill market + selisih fee ({r.settings.taker_bps} − {r.settings.maker_bps} = {r.settings.fee_diff_bps} bps).
        Jika tidak terisi, dianggap dikejar market order di akhir jendela. Tanpa fill aktual, pembandingnya trade publik pertama setelah
        alert (proxy, tanpa slippage tambahan).
      </li>
      <li>
        Belum dihitung: efek ke hasil trade setelah entry (limit cenderung terisi saat harga bergerak melawan sinyal), dan ukuran order
        besar yang bisa menggeser harga.
      </li>
      {r.actual.latency_upper_bound && (
        <li>Latensi saat ini dari waktu log trade_logs, yang ditulis setelah order selesai, jadi angka itu batas atas.</li>
      )}
    </ul>
  )
}

/**
 * "Kualitas eksekusi" on /lab/signals: actual slippage of live webhook signals and what a
 * shadow post-only limit would have done. Read-only; data from GET /api/v1/lab/shadow.
 */
export function ExecutionQuality() {
  const q = useShadowReport()
  const [pick, setPick] = useState<{ k: number; ttl: number } | null>(null)
  const r = q.data
  const choice = pick ?? (r ? defaultChoice(r.settings.ks, r.settings.ttls_min) : { k: 0, ttl: 240 })
  const cell = r ? pickCell(r.grid, choice.k, choice.ttl) : undefined
  return (
    <Section
      id="kualitas-eksekusi"
      icon={<Gauge className="h-4 w-4 text-lab" />}
      title="Kualitas eksekusi"
      description={
        <>
          Sinyal webhook live: seberapa jauh fill market dari close candle, dan apa jadinya kalau entry pakai limit (maker).
          {r?.last_cycle?.finished && <> · diperbarui {relativeTime(r.last_cycle.finished)}</>}
        </>
      }
      action={
        r && (
          <>
            <Segmented
              aria-label="Harga limit"
              size="xs"
              value={String(choice.k)}
              onChange={(v) => setPick({ ...choice, k: Number(v) })}
              options={r.settings.ks.map((k) => ({ value: String(k), label: kLabel(k) }))}
            />
            <Segmented
              aria-label="Masa berlaku limit"
              size="xs"
              value={String(choice.ttl)}
              onChange={(v) => setPick({ ...choice, ttl: Number(v) })}
              options={r.settings.ttls_min.map((t) => ({ value: String(t), label: ttlLabel(t) }))}
            />
          </>
        )
      }
    >
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.error || !r ? (
        <ErrorState
          kind={q.error instanceof ApiError ? q.error.kind : 'server'}
          onRetry={() => q.refetch()}
          message="Gagal memuat kualitas eksekusi."
        />
      ) : (
        <div className="space-y-4">
          <SampleWarning r={r} />
          <Tiles r={r} cell={cell} />
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold">Fill rate dan rata-rata hemat per harga limit × masa berlaku</h3>
              {cell && <Badge variant={SAMPLE_COPY[cell.sample].tone} size="sm">{SAMPLE_COPY[cell.sample].label}</Badge>}
            </div>
            <Grid r={r} k={choice.k} ttl={choice.ttl} onPick={(k, ttl) => setPick({ k, ttl })} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold">
              Per sinyal · limit {kLabel(choice.k).toLowerCase()} · {ttlLabel(choice.ttl)}
            </h3>
            <Signals r={r} k={choice.k} ttl={choice.ttl} />
          </div>
          <Notes r={r} />
        </div>
      )}
    </Section>
  )
}

