'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Info, ListChecks, ScanSearch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Chip, Section } from '@/components/lab/Section'
import { SideBadge } from '@/components/trading/SideBadge'
import { ApiError } from '@/lib/api/errors'
import { formatPrice, formatTimestamp } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/lab/form'
import { bps } from '@/lib/lab/shadow'
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

const th = 'px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground'

const RANGES = [
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

function when(iso: string | null | undefined) {
  return formatTimestamp(iso).slice(0, 16)
}

function StatusBadge({ s }: { s: LiveCheckStatus }) {
  const c = STATUS_COPY[s]
  return (
    <Badge variant={c.tone} size="sm" title={c.hint}>
      {c.short}
    </Badge>
  )
}

function Tiles({ r }: { r: LiveCheckReport }) {
  const c = r.summary.counts
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Sinyal Lab" value={r.summary.expected} hint={`${r.preset} · ${r.window.bars} bar 4H`} />
      <StatTile label="Cocok" value={c.cocok} valueClassName="text-bullish" hint={c.harga_beda ? `+${c.harga_beda} harga beda` : 'Tereksekusi sesuai sinyal'} />
      <StatTile label="Gagal / ditolak" value={c.gagal} valueClassName={c.gagal ? 'text-bearish' : ''} hint="Terkirim, tidak tereksekusi" />
      <StatTile label="Tidak terkirim" value={c.tidak_terkirim} valueClassName={c.tidak_terkirim ? 'text-bearish' : ''} hint="Ada sinyal, tak ada kiriman" />
      <StatTile label="Tak terduga" value={c.tak_terduga} valueClassName={c.tak_terduga ? 'text-info' : ''} hint="Kiriman tanpa sinyal Lab" />
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
  return (
    <div>
      <div className="flex h-7 w-full items-stretch gap-px overflow-hidden rounded-md border border-border/60 bg-muted/20 p-0.5" role="list" aria-label="Timeline bar 4H">
        {cells.map((c) => {
          const tone = c.status ? STATUS_COPY[c.status].tone : null
          const label = `${when(c.open)} · ${c.status ? STATUS_COPY[c.status].label : 'tidak ada sinyal / kiriman'}${c.perlu ? ' · perlu dicek' : ''}`
          return c.status ? (
            <button
              key={c.open}
              type="button"
              role="listitem"
              title={label}
              aria-label={label}
              onClick={() => onPick(c.open)}
              className={cn(
                'min-w-[2px] flex-1 cursor-pointer rounded-[2px] hover:opacity-80',
                tone && CELL_BG[tone],
                c.perlu && 'ring-1 ring-inset ring-warn',
              )}
            />
          ) : (
            <span key={c.open} role="listitem" title={label} className="min-w-[1px] flex-1 rounded-[2px] bg-muted/40" />
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-3xs text-muted-foreground">
        <span className="num">{when(cells[0].open)}</span>
        <span>tiap kotak = 1 bar 4H · klik untuk detail</span>
        <span className="num">{when(cells[cells.length - 1].open)}</span>
      </div>
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
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
      {items.map((it) => (
        <Chip key={it.v} active={value === it.v} onClick={() => onChange(it.v)} className="h-7 px-2.5">
          {it.label}
          <span className="num text-3xs opacity-70">{it.n}</span>
        </Chip>
      ))}
    </div>
  )
}

function Row({ r, onOpen }: { r: LiveCheckRow; onOpen: () => void }) {
  const e = r.expected
  const d = r.delivery
  return (
    <tr className="cursor-pointer hover:bg-accent/30" onClick={onOpen}>
      <td className="num whitespace-nowrap px-3 py-2 text-xs">
        {when(r.bar_close_ts)}
        <div className="text-3xs text-muted-foreground">close bar 4H</div>
      </td>
      <td className="px-3 py-2">
        {r.side ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <SideBadge side={r.side} />
            <span className="text-2xs text-muted-foreground">{r.action === 'open' ? 'Open' : 'Close'}</span>
          </div>
        ) : (
          <span className="text-2xs text-muted-foreground">arah tidak diketahui</span>
        )}
        {e?.exit_reason && <div className="mt-0.5 text-3xs text-muted-foreground">{exitReasonLabel(e.exit_reason)}{e.alert === 'intrabar' ? ' · intrabar' : ''}</div>}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge s={r.status} />
          {r.perlu_dicek && (
            <Badge variant="warn" size="xs" title="Lab bisa berbeda dari Pine di sini; bukan otomatis error">
              perlu dicek
            </Badge>
          )}
        </div>
        {r.causes.length > 0 && <div className="mt-0.5 text-3xs text-muted-foreground">{r.causes.map((c) => CAUSE_LABEL[c] ?? c).join(' · ')}</div>}
      </td>
      <td className="num hidden px-3 py-2 text-right text-xs sm:table-cell">{e ? formatPrice(e.price) : '—'}</td>
      <td className="num hidden whitespace-nowrap px-3 py-2 text-xs md:table-cell">
        {d ? (
          <>
            {when(epochIso(d.arrival))}
            <div className="text-3xs text-muted-foreground">{httpLabel(d.nginx_status, d.app_status, d.app_ms)}</div>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="num hidden px-3 py-2 text-right text-xs lg:table-cell">
        {d?.fill_price ? (
          <>
            {formatPrice(d.fill_price)}
            {r.price_diff_bps !== null && <div className="text-3xs text-muted-foreground">{bps(r.price_diff_bps, 0)}</div>}
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="max-w-[340px] px-3 py-2 text-2xs text-muted-foreground">
        <span className="line-clamp-2">{r.reason ?? '—'}</span>
      </td>
    </tr>
  )
}

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 py-1 text-xs">
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
                Bar 4H {when(r.bar_open_ts)} → {when(r.bar_close_ts).slice(11)}
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">{STATUS_COPY[r.status].hint}</SheetDescription>
              <div className="mt-2 flex flex-wrap gap-1">
                <StatusBadge s={r.status} />
                {r.perlu_dicek && <Badge variant="warn" size="sm">perlu dicek</Badge>}
              </div>
            </div>
            {r.reason && <p className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-xs">{r.reason}</p>}
            {r.causes.length > 0 && (
              <div>
                <h4 className="eyebrow mb-1">Kemungkinan penyebab beda Lab vs Pine</h4>
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
              <h4 className="eyebrow mb-1">Sinyal menurut Lab</h4>
              {e ? (
                <div className="divide-y divide-border/40">
                  <Field k="Sinyal">{signalLabel(e.action, e.side)}</Field>
                  <Field k="Waktu alert">{e.alert === 'close' ? `${when(epochIso(e.alert_at))} (close bar)` : 'di dalam bar (SL/TP intrabar)'}</Field>
                  <Field k="Harga Lab"><span className="num">{formatPrice(e.price)}</span></Field>
                  {e.exit_reason && <Field k="Alasan exit">{exitReasonLabel(e.exit_reason)}</Field>}
                  <Field k="Varian">{(e.variants ?? []).join(', ') || '—'}</Field>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Lab tidak menghitung sinyal di bar ini.</p>
              )}
            </div>
            <div>
              <h4 className="eyebrow mb-1">Kiriman ke webhook</h4>
              {d ? (
                <div className="divide-y divide-border/40">
                  <Field k="Tiba">{when(epochIso(d.arrival))}</Field>
                  <Field k="Sumber bukti">{d.sources.join(' + ')}</Field>
                  <Field k="Klien">{d.tv === null ? 'tidak diketahui (tanpa log nginx)' : d.tv ? `TradingView (${d.ip ?? '?'})` : `bukan TradingView (${d.ip ?? '?'})`}</Field>
                  <Field k="Respons HTTP">{httpLabel(d.nginx_status, d.app_status, d.app_ms)}</Field>
                  <Field k="Sinyal">{d.action ? signalLabel(d.action, d.side) : d.trade_dir ? (d.trade_dir > 0 ? 'order beli' : 'order jual') : '—'}</Field>
                  <Field k="Tereksekusi">{d.executed ? 'ya' : d.pending ? 'menunggu' : 'tidak'}</Field>
                  {d.fill_price && <Field k="Harga fill"><span className="num">{formatPrice(d.fill_price)}</span></Field>}
                  {d.reason && <Field k="Alasan">{d.reason}</Field>}
                  {d.note && <Field k="Catatan">{d.note}</Field>}
                  {d.trade_logs.length > 0 && (
                    <Field k="trade_logs">
                      {d.trade_logs.map((t, i) => (
                        <div key={i} className="text-2xs">
                          {when(epochIso(t.ts))} · {signalLabel(t.action, t.side)} · {t.status ?? '?'}
                          {t.fill_price ? ` · ${formatPrice(t.fill_price)}` : ''}
                        </div>
                      ))}
                    </Field>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Tidak ada kiriman yang tercatat untuk bar ini.</p>
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
    <div className="space-y-3 text-2xs leading-relaxed text-muted-foreground">
      <div className="flex gap-2 rounded-lg border border-info/30 bg-info/[0.06] p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
        <p>
          <b className="text-foreground">Posisi manual tidak dihitung.</b> Halaman ini membandingkan sinyal strategi dengan apa yang
          dilakukan <i>bot</i>. Posisi yang dibuka manual di akun Binance (bukan lewat webhook) bukan bagian dari strategi: tidak muncul
          sebagai sinyal dan tidak dihitung. Dampaknya tetap terlihat: bot menolak sinyal open kalau sudah ada posisi ETH di akun
          (&quot;posisi manual&quot;), dan hanya menutup posisi yang dibuka bot sendiri.
        </p>
      </div>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          <b>Sinyal Lab</b> dihitung ulang dari template Rosyade + engine Lab di data Binance USD-M ({r.preset}, sejak {r.since}), tanpa
          komisi seperti properti default skrip Pine. Bukan salinan sinyal TradingView: Lab bisa berbeda karena warm-up, sumber data,
          timing bar dan SL/TP intrabar. Baris seperti itu ditandai <b className="text-warn">perlu dicek</b>, bukan error.
        </li>
        <li>
          <b>Kiriman</b> diambil dari log nginx (POST /webhook/tradingview dari IP luar), log aplikasi dan trade_logs, hanya dibaca.
          Kode 499 berarti TradingView memutus koneksi setelah ~3 detik; hasil di server dilihat dari log aplikasi.
        </li>
        <li>Harga beda: selisih fill vs harga Lab di atas {r.price_bps} bps (+ = lebih mahal bagi bot).</li>
        {lc?.coverage && lc.coverage.length > 0 && (
          <li>
            Log yang tersedia:{' '}
            {lc.coverage.map(([a, b, s], i) => (
              <span key={i} className="num">
                {i > 0 && '; '}
                {when(a).slice(0, 10)} – {when(b).slice(0, 10)} ({s})
              </span>
            ))}
            . Di luar rentang itu status &quot;tanpa data log&quot;.
          </li>
        )}
        {lc && (
          <li>
            Dihitung {relativeTime(lc.finished ?? lc.started)} · engine {lc.engine_commit ?? '?'} · data sampai bar{' '}
            {when(lc.data_last_bar)} · parameter dari {lc.params_source ?? '?'}
            {lc.error && <span className="text-bearish"> · error terakhir: {lc.error}</span>}
          </li>
        )}
      </ul>
    </div>
  )
}

/**
 * /lab/live-check — expected 4H-ETH-Basic signals (Lab) vs what reached the live bot.
 * Read-only; data from GET /api/v1/lab/live-check (computed by the Lab worker).
 */
export function LiveCheckView() {
  const [bars, setBars] = useState('270')
  const [filter, setFilter] = useState<StatusFilter>('semua')
  const [openId, setOpenId] = useState<number | null>(null)
  const q = useLiveCheck(Number(bars))
  const r = q.data
  const rows = useMemo(() => (r ? filterRows(r.rows, filter) : []), [r, filter])
  const cells = useMemo(() => (r ? barCells(r.rows, r.window.start, r.window.end) : []), [r])
  const selected = r?.rows.find((x) => x.id === openId) ?? null

  const pickBar = (open: string) => {
    const t = Date.parse(open)
    const hit = r?.rows.find((x) => Date.parse(x.bar_open_ts) === t)
    if (hit) setOpenId(hit.id)
  }

  return (
    <div className="space-y-5">
      <Section
        icon={<ScanSearch className="h-4 w-4 text-lab" />}
        title="Ringkasan"
        description={
          <>
            Sinyal {r?.preset ?? '4H-ETH-Basic'} menurut Lab dibanding kiriman TradingView ke bot live (akun Rosyade).
            {r?.last_cycle?.finished && <> · diperbarui {relativeTime(r.last_cycle.finished)}</>}
          </>
        }
        action={<Segmented aria-label="Rentang" size="xs" value={bars} onChange={setBars} options={RANGES} />}
      >
        {q.isPending ? (
          <LoadingState rows={3} />
        ) : q.error || !r ? (
          <ErrorState kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} message="Gagal memuat cek bot live." />
        ) : (
          <div className="space-y-4">
            {!r.last_cycle && (
              <div className="flex gap-2 rounded-lg border border-warn/30 bg-warn/[0.06] p-3 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                <p>Worker Lab belum pernah menjalankan cek ini. Biasanya jalan beberapa menit setelah close 4H berikutnya.</p>
              </div>
            )}
            <Tiles r={r} />
            <Timeline cells={cells} onPick={pickBar} />
          </div>
        )}
      </Section>

      {r && (
        <Section
          icon={<ListChecks className="h-4 w-4 text-lab" />}
          title="Per bar 4H"
          description="Satu baris per sinyal Lab dan/atau kiriman. Klik baris untuk detail."
        >
          <div className="space-y-3">
            <Filters r={r} value={filter} onChange={setFilter} />
            {rows.length === 0 ? (
              <EmptyState
                title={r.rows.length ? 'Tidak ada baris untuk filter ini' : 'Belum ada sinyal atau kiriman'}
                description={r.rows.length ? 'Pilih filter lain.' : 'Dalam rentang ini Lab tidak menghitung sinyal dan tidak ada kiriman ke webhook.'}
              />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
                <table className="w-full text-sm sm:min-w-[760px]">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      <th className={cn(th, 'text-left')}>Bar</th>
                      <th className={cn(th, 'text-left')}>Sinyal</th>
                      <th className={cn(th, 'text-left')}>Status</th>
                      <th className={cn(th, 'hidden text-right sm:table-cell')}>Harga Lab</th>
                      <th className={cn(th, 'hidden text-left md:table-cell')}>Kiriman</th>
                      <th className={cn(th, 'hidden text-right lg:table-cell')}>Fill</th>
                      <th className={cn(th, 'text-left')}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {rows.map((x) => (
                      <Row key={x.id} r={x} onOpen={() => setOpenId(x.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Notes r={r} />
          </div>
        </Section>
      )}
      <Detail r={selected} causes={r?.causes ?? {}} onClose={() => setOpenId(null)} />
    </div>
  )
}
