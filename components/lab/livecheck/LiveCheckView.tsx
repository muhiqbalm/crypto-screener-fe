'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Info, ScanSearch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { Freshness } from '@/components/ui/freshness'
import { InfoTip } from '@/components/ui/info-tip'
import { useNow } from '@/components/ui/use-now'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Chip, Section } from '@/components/lab/Section'
import { formatPrice } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { bps } from '@/lib/lab/shadow'
import { LIVECHECK_STALE_MS } from '@/lib/bot/status'
import {
  CAUSE_LABEL,
  PROBLEM,
  STATUS_COPY,
  type BarCell,
  type StatusFilter,
  type Tone,
  barCells,
  epochIso,
  exitReasonLabel,
  filterRows,
  httpLabel,
  signalLabel,
} from '@/lib/lab/livecheck'
import { useLiveCheck } from '@/lib/queries/livecheck'
import type { LiveCheckReport, LiveCheckRow, LiveCheckStatus } from '@/lib/api/types/livecheck'

/** Range options in 4H bars. 7 days is the daily check; longer ranges stay one tap away. */
export const LIVECHECK_RANGES = [
  { value: '42', label: '7 hari' },
  { value: '180', label: '30 hari' },
  { value: '270', label: '45 hari' },
  { value: '540', label: '90 hari' },
]

const CELL_BG: Record<Tone, string> = {
  bullish: 'bg-bullish/70',
  bearish: 'bg-bearish/80',
  warn: 'bg-warn/80',
  info: 'bg-info/70',
  muted: 'bg-muted-foreground/30',
}

const LEGEND: Array<{ tone: Tone; label: string }> = [
  { tone: 'bullish', label: 'Cocok' },
  { tone: 'warn', label: 'Harga beda' },
  { tone: 'bearish', label: 'Gagal / tidak terkirim' },
  { tone: 'info', label: 'Tak terduga' },
  { tone: 'muted', label: 'Menunggu / tanpa log' },
]

function StatusBadge({ s }: { s: LiveCheckStatus }) {
  const c = STATUS_COPY[s]
  return (
    <Badge variant={c.tone} size="sm">
      {c.short}
    </Badge>
  )
}

function Tiles({ r }: { r: LiveCheckReport }) {
  const c = r.summary.counts
  const days = Math.round(r.window.bars / 6)
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Sinyal strategi" value={r.summary.expected} hint={`${r.preset} · ${days} hari`} />
      <StatTile label="Cocok" value={c.cocok} valueClassName="text-bullish" hint={c.harga_beda ? `+${c.harga_beda} harga beda` : 'Tereksekusi sesuai sinyal'} />
      <StatTile label="Gagal / ditolak" value={c.gagal} valueClassName={c.gagal ? 'text-bearish' : ''} hint="Terkirim, tidak tereksekusi" />
      <StatTile label="Tidak terkirim" value={c.tidak_terkirim} valueClassName={c.tidak_terkirim ? 'text-bearish' : ''} hint="Ada sinyal, tak ada kiriman" />
      <StatTile label="Tak terduga" value={c.tak_terduga} valueClassName={c.tak_terduga ? 'text-info' : ''} hint="Kiriman tanpa sinyal strategi" />
      <StatTile
        label="Perlu dicek"
        value={r.summary.perlu_dicek}
        valueClassName={r.summary.perlu_dicek ? 'text-warn' : ''}
        hint={`${c.tanpa_log} tanpa log · ${c.menunggu} menunggu`}
      />
    </div>
  )
}

function Timeline({ cells, onPick }: { cells: BarCell[]; onPick: (open: string) => void }) {
  if (!cells.length) return null
  // Fixed-size cells that wrap, so 90 days stays readable on a phone instead of 1 px slivers.
  const size = cells.length <= 60 ? 'h-6 w-3' : cells.length <= 200 ? 'h-5 w-2' : 'h-4 w-1.5'
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-[3px] rounded-md border border-border/60 bg-muted/20 p-1.5" role="list" aria-label="Timeline candle 4H, terlama di kiri">
        {cells.map((c) => {
          const tone = c.status ? STATUS_COPY[c.status].tone : null
          const label = `${formatTime(c.open)} · ${c.status ? STATUS_COPY[c.status].label : 'tidak ada sinyal atau kiriman'}${c.perlu ? ' · perlu dicek' : ''}`
          return c.status ? (
            <button
              key={c.open}
              type="button"
              role="listitem"
              title={label}
              aria-label={label}
              onClick={() => onPick(c.open)}
              className={cn(size, 'cursor-pointer rounded-[2px] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', tone && CELL_BG[tone], c.perlu && 'ring-1 ring-inset ring-warn')}
            />
          ) : (
            <span key={c.open} role="listitem" aria-label={label} className={cn(size, 'rounded-[2px] bg-muted/40')} />
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-3xs text-muted-foreground">
        <span className="num">
          {formatTime(cells[0].open)} → {formatTime(cells[cells.length - 1].open)}
        </span>
        <span>Tiap kotak = 1 candle 4H · ketuk kotak berwarna untuk detail</span>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-3xs text-muted-foreground" aria-label="Arti warna">
        {LEGEND.map((l) => (
          <li key={l.label} className="inline-flex items-center gap-1">
            <span className={cn('h-2.5 w-2.5 rounded-[2px]', CELL_BG[l.tone])} aria-hidden="true" />
            {l.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[2px] ring-1 ring-inset ring-warn" aria-hidden="true" />
          Garis kuning = perlu dicek
        </li>
      </ul>
    </div>
  )
}

function Filters({ r, value, onChange }: { r: LiveCheckReport; value: StatusFilter; onChange: (f: StatusFilter) => void }) {
  const c = r.summary.counts
  const problems = PROBLEM.reduce((n, s) => n + (c[s] ?? 0), 0)
  const items: Array<{ v: StatusFilter; label: string; n: number }> = [
    { v: 'semua', label: 'Semua', n: r.summary.rows },
    { v: 'masalah', label: 'Bermasalah', n: problems },
    { v: 'perlu_dicek', label: 'Perlu dicek', n: r.summary.perlu_dicek },
    ...(Object.keys(STATUS_COPY) as LiveCheckStatus[]).filter((s) => c[s]).map((s) => ({ v: s, label: STATUS_COPY[s].short, n: c[s] })),
  ]
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saring status">
      {items.map((it) => (
        <Chip key={it.v} active={value === it.v} onClick={() => onChange(it.v)} className="h-7 px-2.5">
          {it.label}
          <span className="num text-3xs opacity-70">{it.n}</span>
        </Chip>
      ))}
    </div>
  )
}

function SignalCell({ r }: { r: LiveCheckRow }) {
  const e = r.expected
  return (
    <div className="space-y-0.5">
      {r.side ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <DirectionBadge direction={r.side} size="xs" />
          <span className="text-2xs text-muted-foreground">{r.action === 'open' ? 'Buka' : 'Tutup'}</span>
        </div>
      ) : (
        <span className="text-2xs text-muted-foreground">arah tidak diketahui</span>
      )}
      {e?.exit_reason && (
        <div className="text-3xs text-muted-foreground">
          {exitReasonLabel(e.exit_reason)}
          {e.alert === 'intrabar' ? ' · di tengah candle' : ''}
        </div>
      )}
    </div>
  )
}

const COLUMNS: ResponsiveColumn<LiveCheckRow>[] = [
  {
    key: 'bar',
    header: 'Candle (WIB)',
    mobile: 'title',
    cell: (r) => (
      <div className="num whitespace-nowrap text-xs">
        {formatTime(r.bar_close_ts, { zone: false })}
        <div className="text-3xs font-normal text-muted-foreground">close candle 4H</div>
      </div>
    ),
  },
  { key: 'sinyal', header: 'Sinyal', mobile: 'field', cell: (r) => <SignalCell r={r} /> },
  {
    key: 'status',
    header: 'Status',
    mobile: 'badge',
    cell: (r) => (
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge s={r.status} />
          {r.perlu_dicek && (
            <Badge variant="warn" size="xs">
              perlu dicek
            </Badge>
          )}
        </div>
        {r.causes.length > 0 && <div className="text-3xs text-muted-foreground">{r.causes.map((c) => CAUSE_LABEL[c] ?? c).join(' · ')}</div>}
      </div>
    ),
  },
  {
    key: 'harga',
    header: 'Harga Lab',
    align: 'right',
    mobile: 'hidden',
    className: 'hidden md:table-cell',
    headerClassName: 'hidden md:table-cell',
    cell: (r) => <span className="num text-xs">{r.expected ? formatPrice(r.expected.price) : '—'}</span>,
  },
  {
    key: 'kiriman',
    header: 'Kiriman',
    mobile: 'hidden',
    className: 'hidden lg:table-cell',
    headerClassName: 'hidden lg:table-cell',
    cell: (r) =>
      r.delivery ? (
        <div className="num whitespace-nowrap text-xs">
          {formatTime(epochIso(r.delivery.arrival), { date: false })}
          <div className="text-3xs text-muted-foreground">{httpLabel(r.delivery.nginx_status, r.delivery.app_status, r.delivery.app_ms)}</div>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'fill',
    header: 'Fill',
    align: 'right',
    mobile: 'hidden',
    className: 'hidden lg:table-cell',
    headerClassName: 'hidden lg:table-cell',
    cell: (r) =>
      r.delivery?.fill_price ? (
        <div className="num text-xs">
          {formatPrice(r.delivery.fill_price)}
          {r.price_diff_bps !== null && <div className="text-3xs text-muted-foreground">{bps(r.price_diff_bps, 0)}</div>}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: 'ket',
    header: 'Keterangan',
    mobile: 'field',
    className: 'max-w-[340px]',
    cell: (r) => <span className="line-clamp-2 text-2xs text-muted-foreground">{r.reason ?? '—'}</span>,
  },
]

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1 text-xs">
      <div className="text-muted-foreground">{k}</div>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}

function Detail({ r, causes, onClose }: { r: LiveCheckRow | null; causes: Record<string, string>; onClose: () => void }) {
  const e = r?.expected
  const d = r?.delivery
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto p-5">
        {r && (
          <div className="space-y-4">
            <div className="pr-8">
              <SheetTitle className="text-sm font-semibold">
                Candle 4H {formatTime(r.bar_open_ts, { zone: false })} → {formatTime(r.bar_close_ts, { date: false })}
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">{STATUS_COPY[r.status].hint}</SheetDescription>
              <div className="mt-2 flex flex-wrap gap-1">
                <StatusBadge s={r.status} />
                {r.perlu_dicek && (
                  <Badge variant="warn" size="sm">
                    perlu dicek
                  </Badge>
                )}
              </div>
            </div>
            {r.reason && <p className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs">{r.reason}</p>}
            {r.causes.length > 0 && (
              <div>
                <h4 className="eyebrow mb-1">Kemungkinan penyebab Lab beda dengan TradingView</h4>
                <ul className="list-disc space-y-1 pl-4 text-2xs text-muted-foreground">
                  {r.causes.map((c) => (
                    <li key={c}>
                      <b className="text-foreground">{CAUSE_LABEL[c] ?? c}:</b> {causes[c] ?? ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h4 className="eyebrow mb-1">Sinyal menurut strategi (dihitung Lab)</h4>
              {e ? (
                <div className="divide-y divide-border/40">
                  <Field k="Sinyal">{signalLabel(e.action, e.side)}</Field>
                  <Field k="Waktu alert">{e.alert === 'close' ? `${formatTime(epochIso(e.alert_at))} (candle tutup)` : 'di tengah candle (SL/TP)'}</Field>
                  <Field k="Harga Lab">
                    <span className="num">{formatPrice(e.price)}</span>
                  </Field>
                  {e.exit_reason && <Field k="Alasan exit">{exitReasonLabel(e.exit_reason)}</Field>}
                  <Field k="Varian">{(e.variants ?? []).join(', ') || '—'}</Field>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Lab tidak menghitung sinyal di candle ini.</p>
              )}
            </div>
            <div>
              <h4 className="eyebrow mb-1">Kiriman ke webhook</h4>
              {d ? (
                <div className="divide-y divide-border/40">
                  <Field k="Tiba">{formatTime(epochIso(d.arrival), { seconds: true })}</Field>
                  <Field k="Sumber bukti">{d.sources.join(' + ')}</Field>
                  <Field k="Pengirim">{d.tv === null ? 'tidak diketahui (tanpa log nginx)' : d.tv ? `TradingView (${d.ip ?? '?'})` : `bukan TradingView (${d.ip ?? '?'})`}</Field>
                  <Field k="Respons server">{httpLabel(d.nginx_status, d.app_status, d.app_ms)}</Field>
                  <Field k="Sinyal">{d.action ? signalLabel(d.action, d.side) : d.trade_dir ? (d.trade_dir > 0 ? 'order beli' : 'order jual') : '—'}</Field>
                  <Field k="Tereksekusi">{d.executed ? 'ya' : d.pending ? 'menunggu' : 'tidak'}</Field>
                  {d.fill_price && (
                    <Field k="Harga fill">
                      <span className="num">{formatPrice(d.fill_price)}</span>
                    </Field>
                  )}
                  {d.reason && <Field k="Alasan">{d.reason}</Field>}
                  {d.note && <Field k="Catatan">{d.note}</Field>}
                  {d.trade_logs.length > 0 && (
                    <Field k="Catatan bot">
                      {d.trade_logs.map((t, i) => (
                        <div key={i} className="num text-2xs">
                          {formatTime(epochIso(t.ts), { date: false, seconds: true })} · {signalLabel(t.action, t.side)} · {t.status ?? '?'}
                          {t.fill_price ? ` · ${formatPrice(t.fill_price)}` : ''}
                        </div>
                      ))}
                    </Field>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada kiriman yang tercatat untuk candle ini.</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Notes({ r }: { r: LiveCheckReport }) {
  const lc = r.last_cycle
  return (
    <details className="group rounded-lg border border-border/60 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
      <summary className="cursor-pointer select-none font-medium text-foreground">Cara membaca dan sumber data</summary>
      <div className="mt-2 space-y-3">
        <div className="flex gap-2 rounded-lg border border-info/30 bg-info/[0.06] p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
          <p>
            <b className="text-foreground">Posisi manual tidak dihitung.</b> Bagian ini membandingkan sinyal strategi dengan apa yang
            dilakukan <i>bot</i>. Posisi yang dibuka manual di akun Binance (bukan lewat webhook) bukan bagian dari strategi. Dampaknya
            tetap terlihat: bot menolak sinyal buka kalau sudah ada posisi ETH di akun (&quot;posisi manual&quot;), dan hanya menutup
            posisi yang dibuka bot sendiri.
          </p>
        </div>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <b>Sinyal strategi</b> dihitung ulang oleh Lab dari strategi Rosyade di data Binance USDT perpetual ({r.preset}, sejak{' '}
            {formatTime(r.since, { time: false })}), tanpa komisi seperti setelan bawaan skrip Pine. Ini bukan salinan sinyal
            TradingView: Lab bisa berbeda karena pemanasan data, sumber data, waktu candle dan SL/TP di tengah candle. Baris seperti itu
            ditandai <b className="text-warn">perlu dicek</b>, bukan otomatis error.
          </li>
          <li>
            <b>Kiriman</b> dibaca dari log server (nginx dan aplikasi) dan catatan bot, hanya dibaca. Kode 499 berarti TradingView
            memutus koneksi setelah ±3 detik; hasil di server dilihat dari log aplikasi.
          </li>
          <li>
            Harga beda: selisih harga fill dengan harga Lab di atas {r.price_bps} bps (+ = lebih mahal bagi bot).
          </li>
          {lc?.coverage && lc.coverage.length > 0 && (
            <li>
              Log yang tersedia:{' '}
              {lc.coverage.map(([a, b, s], i) => (
                <span key={i} className="num">
                  {i > 0 && '; '}
                  {formatTime(a, { time: false })} – {formatTime(b, { time: false })} ({s})
                </span>
              ))}
              . Di luar rentang itu statusnya &quot;tanpa log&quot;.
            </li>
          )}
          {lc && (
            <li>
              Mesin {lc.engine_commit ?? '?'} · parameter dari {lc.params_source ?? '?'}
              {lc.error && <span className="text-bearish"> · perhitungan terakhir gagal: {lc.error}</span>}
            </li>
          )}
        </ul>
      </div>
    </details>
  )
}

export interface LiveCheckViewProps {
  /** Range in 4H bars ("42" = 7 days). Uncontrolled when omitted. */
  bars?: string
  onBarsChange?: (bars: string) => void
  filter?: StatusFilter
  onFilterChange?: (f: StatusFilter) => void
  id?: string
}

/**
 * Cek bot live: expected 4H-ETH-Basic signals (Lab) vs what reached the live bot, per 4H candle.
 * Read-only; data from GET /api/v1/lab/live-check (computed by the Lab worker).
 */
export function LiveCheckView({ bars: barsProp, onBarsChange, filter: filterProp, onFilterChange, id }: LiveCheckViewProps) {
  const [barsState, setBarsState] = useState(LIVECHECK_RANGES[0].value)
  const [filterState, setFilterState] = useState<StatusFilter>('semua')
  const bars = barsProp ?? barsState
  const setBars = onBarsChange ?? setBarsState
  const filter = filterProp ?? filterState
  const setFilter = onFilterChange ?? setFilterState
  const [openId, setOpenId] = useState<number | null>(null)
  const now = useNow(60_000)
  const q = useLiveCheck(Number(bars))
  const r = q.data
  const rows = useMemo(() => (r ? filterRows(r.rows, filter) : []), [r, filter])
  const cells = useMemo(() => (r ? barCells(r.rows, r.window.start, r.window.end) : []), [r])
  const selected = r?.rows.find((x) => x.id === openId) ?? null
  const finished = r?.last_cycle?.finished ?? r?.last_cycle?.started ?? null
  const stale = Boolean(finished && now !== null && now - Date.parse(finished) > LIVECHECK_STALE_MS)

  const pickBar = (open: string) => {
    const t = Date.parse(open)
    const hit = r?.rows.find((x) => Date.parse(x.bar_open_ts) === t)
    if (hit) setOpenId(hit.id)
  }

  return (
    <Section
      id={id}
      className="scroll-mt-20"
      icon={<ScanSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title={
        <span className="inline-flex items-center gap-1">
          Cek bot live: sinyal strategi vs eksekusi
          <InfoTip title="Cek bot live">
            Untuk tiap candle 4H: sinyal {r?.preset ?? '4H-ETH-Basic'} yang dihitung Lab, kiriman TradingView ke webhook, dan hasil
            eksekusinya di akun bot. Hanya membaca, tidak pernah mengirim order.
          </InfoTip>
        </span>
      }
      description={<>Sinyal {r?.preset ?? '4H-ETH-Basic'} dibanding kiriman ke bot live (akun Rosyade).</>}
      action={<Segmented aria-label="Rentang waktu" size="xs" value={bars} onChange={setBars} options={LIVECHECK_RANGES} />}
    >
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.error || !r ? (
        <ErrorState error={q.error ?? undefined} onRetry={() => q.refetch()} message="Cek bot live belum bisa dimuat." />
      ) : (
        <div className="space-y-4">
          {!r.last_cycle && (
            <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-hidden="true" />
              <p>Worker Lab belum pernah menjalankan cek ini. Biasanya jalan beberapa menit setelah candle 4H berikutnya tutup.</p>
            </div>
          )}
          <Freshness
            dataLabel="Data sampai candle"
            dataAt={r.last_cycle?.data_last_bar ?? undefined}
            updatedAt={finished ?? undefined}
            timeframe="4h"
            stale={stale}
          />
          <Tiles r={r} />
          <Timeline cells={cells} onPick={pickBar} />
          <div className="space-y-3">
            <Filters r={r} value={filter} onChange={setFilter} />
            <ResponsiveTable
              rows={rows}
              columns={COLUMNS}
              rowKey={(x) => x.id}
              onRowClick={(x) => setOpenId(x.id)}
              rowLabel={(x) => `Detail candle ${formatTime(x.bar_close_ts)}`}
              caption="Satu baris per sinyal strategi dan/atau kiriman ke webhook"
              empty={
                <EmptyState
                  title={r.rows.length ? 'Tidak ada baris untuk saringan ini' : 'Belum ada sinyal atau kiriman'}
                  description={
                    r.rows.length
                      ? 'Pilih saringan lain.'
                      : `Dalam rentang ini strategi tidak memberi sinyal dan tidak ada kiriman ke webhook (dihitung ${finished ? formatAge(finished) : '—'}).`
                  }
                />
              }
            />
          </div>
          <Notes r={r} />
        </div>
      )}
      <Detail r={selected} causes={r?.causes ?? {}} onClose={() => setOpenId(null)} />
    </Section>
  )
}
