'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Clock, History, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { LoadingState } from '@/components/shell/states'
import { Chip, EmptyState, Section } from '@/components/lab/Section'
import { SideBadge } from '@/components/trading/SideBadge'
import { ApiError } from '@/lib/api/errors'
import { formatPrice, formatTimestamp, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { relativeTime } from '@/lib/lab/form'
import {
  HORIZON_LABEL,
  SAMPLE_COPY,
  SOURCE_LABEL,
  VERDICT_COPY,
  daysBetween,
  hitCi,
  hitPct,
  isThin,
  pct,
  retCi,
  sortGroups,
  typeLabel,
} from '@/lib/lab/ledger'
import { useLedgerMeta, useLedgerSignals, useLedgerSummary } from '@/lib/queries/ledger'
import type { LedgerFilters, LedgerHorizon, LedgerMeta, LedgerSignal, LedgerSource } from '@/lib/api/types/ledger'

const HORIZONS: LedgerHorizon[] = ['4h', '1d', '3d', '7d']
const PAGE = 50
const th = 'px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground'
const selectCls = 'flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs'

function errKind(e: unknown) {
  return e instanceof ApiError ? e.kind : 'server'
}

// ── status ─────────────────────────────────────────────────────────────────

function StatusPanel({ meta }: { meta: LedgerMeta }) {
  const total = meta.types.reduce((a, t) => a + t.n, 0)
  const pending = meta.types.reduce((a, t) => a + (t.pending ?? 0), 0)
  const liveDays = daysBetween(meta.live_since)
  const bf = meta.backfill
  const prog = meta.backfill_job?.progress
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sinyal tercatat" value={total.toLocaleString('id-ID')} hint={`${meta.symbols.length} koin`} />
        <StatTile label="Menunggu hasil" value={pending.toLocaleString('id-ID')} hint="Horizon belum lewat (maks. 7 hari)" />
        <StatTile
          label="Screener live sejak"
          value={meta.live_since ? formatTimestamp(meta.live_since).slice(0, 10) : 'Belum mulai'}
          hint={meta.live_since ? `${liveDays} hari pencatatan` : 'Snapshot pertama di close jam berikutnya'}
        />
        <StatTile
          label="Siklus terakhir"
          value={relativeTime(meta.last_cycle?.finished ?? null)}
          hint="Snapshot + penilaian tiap jam"
        />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {bf?.status === 'done' && (
          <Badge variant="info" size="sm">
            <History /> Rekonstruksi screener: {bf.from?.slice(0, 10)} – {bf.to?.slice(0, 10)} · {bf.signals?.toLocaleString('id-ID')} sinyal
          </Badge>
        )}
        {(bf?.status === 'queued' || bf?.status === 'running') && (
          <Badge variant="warn" size="sm">
            <Clock /> Rekonstruksi {bf.days} hari sedang berjalan
            {prog?.stage ? ` · ${prog.stage}${prog.total ? ` ${prog.done}/${prog.total}` : ''}` : ''}
          </Badge>
        )}
        {bf?.status === 'error' && (
          <Badge variant="bearish" size="sm">
            <AlertTriangle /> Rekonstruksi gagal: {bf.error}
          </Badge>
        )}
        {!bf && <Badge variant="muted" size="sm">Rekonstruksi historis tidak dijalankan</Badge>}
      </div>
    </div>
  )
}

function HonestyNote() {
  return (
    <div className="rounded-xl border border-warn/30 bg-warn/[0.06] p-4 text-xs leading-relaxed text-muted-foreground">
      <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-warn">
        <AlertTriangle className="h-3.5 w-3.5" /> Cara membaca angka ini dengan jujur
      </p>
      <ul className="list-disc space-y-1 pl-4">
        <li>
          Return diukur dari open candle 15 menit pertama setelah sinyal, <b>sebelum biaya</b> (fee, slippage, funding).
          Bukan hasil strategi, hanya apakah arah sinyal benar.
        </li>
        <li>
          Sinyal tidak independen: banyak koin bergerak bareng di hari yang sama, dan jendela 3/7 hari saling tumpang tindih.
          Karena itu interval 95% dihitung per hari (clustered). Lihat juga kolom <b>vs BTC</b>: return positif di pasar turun
          untuk sinyal short sebagian besar hanya arah pasar.
        </li>
        <li>
          <b>Screener (live)</b> baru dicatat sejak fitur ini aktif. <b>Screener (rekonstruksi)</b> menjalankan ulang generator
          yang sama secara kausal (tiap jam hanya memakai data sampai jam itu) untuk ±27 hari ke belakang. Beberapa input
          didekati (funding = rate terakhir yang settle, rasio L/S per jam, OI dari histori 1 jam), jadi angkanya dipisah.
        </li>
        <li>
          Periode pendek = satu rezim pasar. Kesimpulan &quot;Positif&quot; dengan data kurang dari beberapa bulan adalah petunjuk, bukan bukti.
          Lab watch hanya mencatat entry setelah watch dibuat; trade sebelumnya adalah backtest.
        </li>
      </ul>
    </div>
  )
}

// ── filters ────────────────────────────────────────────────────────────────

interface FilterState extends LedgerFilters {
  split: boolean
}

function Filters({
  meta,
  value,
  onChange,
}: {
  meta: LedgerMeta | undefined
  value: FilterState
  onChange: (v: FilterState) => void
}) {
  const types = useMemo(() => {
    const all = meta?.types ?? []
    const list = value.source ? all.filter((t) => t.source === value.source) : all
    return [...new Set(list.map((t) => t.signal_type))].sort()
  }, [meta, value.source])
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch })
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div className="space-y-1">
        <label htmlFor="lg-source" className="text-xs font-medium">Sumber</label>
        <select id="lg-source" value={value.source ?? ''} className={selectCls}
          onChange={(e) => set({ source: e.target.value as LedgerSource | '', signal_type: '' })}>
          <option value="" className="bg-popover">Semua sumber</option>
          {(meta?.sources ?? (Object.keys(SOURCE_LABEL) as LedgerSource[])).map((s) => (
            <option key={s} value={s} className="bg-popover">{SOURCE_LABEL[s] ?? s}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-type" className="text-xs font-medium">Jenis sinyal</label>
        <select id="lg-type" value={value.signal_type ?? ''} className={selectCls} onChange={(e) => set({ signal_type: e.target.value })}>
          <option value="" className="bg-popover">Semua jenis</option>
          {types.map((t) => (
            <option key={t} value={t} className="bg-popover">{typeLabel(t)}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-symbol" className="text-xs font-medium">Koin</label>
        <select id="lg-symbol" value={value.symbol ?? ''} className={selectCls} onChange={(e) => set({ symbol: e.target.value })}>
          <option value="" className="bg-popover">Semua koin</option>
          {(meta?.symbols ?? []).map((s) => (
            <option key={s} value={s} className="bg-popover">{s.replace(/USDT$/, '')}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-since" className="text-xs font-medium">Dari</label>
        <Input id="lg-since" type="date" value={value.since ?? ''} onChange={(e) => set({ since: e.target.value })} className="h-8 px-2 text-xs" />
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-until" className="text-xs font-medium">Sampai</label>
        <Input id="lg-until" type="date" value={value.until ?? ''} onChange={(e) => set({ until: e.target.value })} className="h-8 px-2 text-xs" />
      </div>
      <div className="flex items-end gap-2">
        <Chip active={value.split} onClick={() => set({ split: !value.split })} title="Pisahkan statistik sinyal long dan short">
          Pisah Long/Short
        </Chip>
        <Button size="sm" variant="ghost" className="h-8 text-xs"
          onClick={() => onChange({ source: '', signal_type: '', symbol: '', since: '', until: '', split: false })}>
          Reset
        </Button>
      </div>
    </div>
  )
}

// ── summary ────────────────────────────────────────────────────────────────

function SummaryTable({
  filters,
  split,
  horizon,
  onPick,
}: {
  filters: LedgerFilters
  split: boolean
  horizon: LedgerHorizon
  onPick: (source: LedgerSource, type: string) => void
}) {
  const q = useLedgerSummary(filters, split ? 'direction' : 'none')
  const groups = useMemo(() => sortGroups(q.data?.groups ?? [], horizon), [q.data, horizon])
  if (q.isPending) return <LoadingState rows={6} />
  if (q.error) return <ErrorPanel kind={errKind(q.error)} onRetry={() => q.refetch()} messageOverride="Gagal memuat ringkasan sinyal." />
  if (groups.length === 0)
    return (
      <EmptyState
        title="Belum ada sinyal untuk filter ini"
        description="Sinyal dicatat otomatis oleh worker Lab setiap close jam. Coba hapus filter, atau tunggu siklus berikutnya."
      />
    )
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
      <table className="w-full text-sm sm:min-w-[860px]">
        <thead className="border-b border-border/60 bg-muted/30">
          <tr>
            <th className={cn(th, 'text-left')}>Sinyal</th>
            <th className={cn(th, 'text-right')} title="Jumlah sinyal tercatat / yang sudah dinilai di horizon ini">Sinyal · dinilai</th>
            <th className={cn(th, 'text-right')} title="Persentase sinyal yang arahnya benar, dengan interval 95%">Hit rate</th>
            <th className={cn(th, 'text-right')} title="Rata-rata return searah sinyal, dengan interval 95% (clustered per hari)">Rata-rata</th>
            <th className={cn(th, 'hidden text-right md:table-cell')}>Median</th>
            <th className={cn(th, 'text-right')} title="Rata-rata return searah sinyal dikurangi return BTC di jendela yang sama">vs BTC</th>
            <th className={cn(th, 'hidden text-right lg:table-cell')} title="Rata-rata pergerakan terbaik / terburuk selama jendela">MFE / MAE</th>
            <th className={cn(th, 'text-left')}>Kesimpulan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {groups.map((g) => {
            const s = g.horizons[horizon]
            const thin = isThin(s)
            const v = VERDICT_COPY[s?.verdict ?? 'insufficient']
            const vb = VERDICT_COPY[s?.verdict_rel_btc ?? 'insufficient']
            const sample = SAMPLE_COPY[s?.sample ?? 'none']
            return (
              <tr key={`${g.source}|${g.signal_type}|${g.direction ?? 0}`}
                className={cn('cursor-pointer hover:bg-accent/40', thin && 'opacity-70')}
                onClick={() => onPick(g.source, g.signal_type)}
                title="Klik untuk melihat sinyal-sinyalnya di bawah">
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold">{typeLabel(g.signal_type)}</span>
                    {g.direction !== null && <SideBadge side={g.direction === 1 ? 'long' : 'short'} />}
                  </div>
                  <div className="text-2xs text-muted-foreground">
                    {SOURCE_LABEL[g.source] ?? g.source}
                    {s && s.n > 0 && ` · ${s.coins} koin · ${s.days} hari`}
                  </div>
                </td>
                <td className="num px-3 py-2 text-right text-xs">
                  {g.n_signals.toLocaleString('id-ID')} · <span className="font-semibold">{(s?.n ?? 0).toLocaleString('id-ID')}</span>
                  <div className="mt-0.5"><Badge variant={sample.tone} size="xs">{sample.label}</Badge></div>
                </td>
                <td className="num px-3 py-2 text-right text-xs">
                  <div className="font-semibold">{hitPct(s?.hit_rate)}</div>
                  <div className="text-3xs text-muted-foreground">{thin ? '' : hitCi(s?.hit_ci)}</div>
                </td>
                <td className={cn('num px-3 py-2 text-right text-xs', signClass(s?.mean_pct))}>
                  <div className="font-semibold">{pct(s?.mean_pct)}</div>
                  <div className="text-3xs text-muted-foreground">{thin ? '' : retCi(s?.mean_ci)}</div>
                </td>
                <td className={cn('num hidden px-3 py-2 text-right text-xs md:table-cell', signClass(s?.median_pct))}>{pct(s?.median_pct)}</td>
                <td className={cn('num px-3 py-2 text-right text-xs', signClass(s?.mean_rel_btc_pct))}>
                  <div className="font-semibold">{pct(s?.mean_rel_btc_pct)}</div>
                  <div className="text-3xs text-muted-foreground">{thin ? '' : retCi(s?.rel_btc_ci)}</div>
                </td>
                <td className="num hidden px-3 py-2 text-right text-xs lg:table-cell">
                  <span className="text-bullish">{pct(s?.mean_mfe_pct, 1)}</span>
                  {' / '}
                  <span className="text-bearish">{pct(s?.mean_mae_pct, 1)}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={v.tone} size="sm" title={v.hint}>{v.label}</Badge>
                    {s?.verdict !== 'insufficient' && (
                      <span className="text-3xs text-muted-foreground" title={vb.hint}>vs BTC: {vb.label.toLowerCase()}</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── recent signals ─────────────────────────────────────────────────────────

function OutcomeCell({ s, h }: { s: LedgerSignal; h: LedgerHorizon }) {
  const o = s.outcomes[h]
  if (!o) {
    return <span className="text-3xs text-muted-foreground">{s.status === 'no_data' ? 'tanpa data' : 'menunggu'}</span>
  }
  if (o.dir_ret_pct === null) return <span className="text-3xs text-muted-foreground">tanpa data</span>
  return (
    <span className={cn('num inline-flex items-center gap-0.5 text-xs', signClass(o.dir_ret_pct))}
      title={`Return koin ${pct(o.ret_pct)} · BTC ${pct(o.btc_ret_pct)} · MFE ${pct(o.mfe_pct)} · MAE ${pct(o.mae_pct)}`}>
      {o.hit ? <Check className="h-3 w-3" aria-label="benar" /> : <X className="h-3 w-3" aria-label="salah" />}
      {pct(o.dir_ret_pct, 1)}
    </span>
  )
}

function RecentSignals({ filters }: { filters: LedgerFilters }) {
  const [pages, setPages] = useState(1)
  const q = useLedgerSignals(filters, PAGE * pages, 0)
  const items = q.data?.items ?? []
  return (
    <Section
      title="Sinyal terbaru"
      description={q.data ? `${q.data.total.toLocaleString('id-ID')} sinyal sesuai filter · return searah sinyal (✓ = arah benar)` : 'Sinyal terbaru beserta hasilnya'}
    >
      {q.isPending ? (
        <LoadingState rows={8} />
      ) : q.error ? (
        <ErrorPanel kind={errKind(q.error)} onRetry={() => q.refetch()} messageOverride="Gagal memuat daftar sinyal." />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada sinyal" description="Sinyal baru muncul di sini setelah worker Lab mencatatnya." />
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
            <table className="w-full text-sm sm:min-w-[760px]">
              <thead className="border-b border-border/60 bg-muted/30">
                <tr>
                  <th className={cn(th, 'text-left')}>Waktu</th>
                  <th className={cn(th, 'text-left')}>Sinyal</th>
                  <th className={cn(th, 'text-left')}>Koin</th>
                  <th className={cn(th, 'hidden text-right sm:table-cell')}>Entry</th>
                  {HORIZONS.map((h) => (
                    <th key={h} className={cn(th, 'text-right')}>{HORIZON_LABEL[h]}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((s) => (
                  <tr key={String(s.id)}>
                    <td className="num whitespace-nowrap px-3 py-2 text-xs">{formatTimestamp(s.ts).slice(0, 16)}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-medium">{typeLabel(s.signal_type)}</div>
                      <div className="text-2xs text-muted-foreground">{SOURCE_LABEL[s.source] ?? s.source}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold">{s.symbol.replace(/USDT$/, '')}</span>
                        <SideBadge side={s.direction === 1 ? 'long' : 'short'} />
                      </div>
                    </td>
                    <td className="num hidden px-3 py-2 text-right text-xs sm:table-cell">{formatPrice(s.entry_price ?? s.price)}</td>
                    {HORIZONS.map((h) => (
                      <td key={h} className="px-3 py-2 text-right"><OutcomeCell s={s} h={h} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {q.data && q.data.total > items.length && (
            <div className="mt-3 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setPages((p) => p + 1)} disabled={q.isFetching}>
                {q.isFetching ? 'Memuat…' : 'Muat lebih banyak'}
              </Button>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ── page ───────────────────────────────────────────────────────────────────

export function LedgerView() {
  const meta = useLedgerMeta()
  const [f, setF] = useState<FilterState>({ source: '', signal_type: '', symbol: '', since: '', until: '', split: false })
  const [horizon, setHorizon] = useState<LedgerHorizon>('1d')
  const filters: LedgerFilters = useMemo(
    () => ({ source: f.source, signal_type: f.signal_type, symbol: f.symbol, since: f.since, until: f.until }),
    [f.source, f.signal_type, f.symbol, f.since, f.until],
  )
  return (
    <div className="space-y-5">
      <Section title="Status pencatatan" description="Worker Lab mencatat sinyal dan menilai hasilnya otomatis; halaman ini hanya membaca.">
        {meta.isPending ? (
          <LoadingState rows={2} />
        ) : meta.error || !meta.data ? (
          <ErrorPanel kind={errKind(meta.error)} onRetry={() => meta.refetch()} messageOverride="Gagal memuat status Catatan Sinyal." />
        ) : (
          <StatusPanel meta={meta.data} />
        )}
      </Section>

      <HonestyNote />

      <Section
        title="Ringkasan per jenis sinyal"
        description="Klik baris untuk melihat sinyalnya. Baris pudar = kurang dari 10 sinyal yang sudah dinilai."
        action={
          <Segmented
            aria-label="Horizon"
            size="xs"
            value={horizon}
            onChange={setHorizon}
            options={HORIZONS.map((h) => ({ value: h, label: HORIZON_LABEL[h] }))}
          />
        }
      >
        <div className="mb-4">
          <Filters meta={meta.data} value={f} onChange={setF} />
        </div>
        <SummaryTable
          filters={filters}
          split={f.split}
          horizon={horizon}
          onPick={(source, signal_type) => setF({ ...f, source, signal_type })}
        />
      </Section>

      <RecentSignals key={JSON.stringify(filters)} filters={filters} />
    </div>
  )
}
