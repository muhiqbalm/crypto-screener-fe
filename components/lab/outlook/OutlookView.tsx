'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronRight, RefreshCw, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, errorKind } from '@/components/shell/states'
import { Chip, Section } from '@/components/lab/Section'
import {
  BiasBadge,
  FactorChips,
  FaseBadge,
  KeyakinanBadge,
  KeyakinanText,
  PeluangBadge,
  PresetCell,
} from '@/components/lab/outlook/OutlookBadges'
import { Disclaimer, OutlookDetailSheet } from '@/components/lab/outlook/OutlookDetailSheet'
import { OutlookTrackRecord } from '@/components/lab/outlook/OutlookTrackRecord'
import { useOutlook, useRefreshOutlook } from '@/lib/queries/outlook'
import {
  coinLabel,
  DEFAULT_INPUTS,
  EMPTY_FILTERS,
  faseOf,
  filterRows,
  formatProb,
  formatR,
  formatWib,
  parseBounded,
  peluangRows,
  REGIME_TEXT,
  REGIME_TONE,
  sortRows,
  type Arah,
  type OutlookFilters,
  type OutlookSortKey,
} from '@/lib/lab/outlook'
import { relativeTime } from '@/lib/lab/form'
import { apiErrorDetail } from '@/lib/api/errors'
import { formatPrice, formatScore, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import type { Keyakinan, OutlookInputs, OutlookResponse, OutlookRow, Sizing } from '@/lib/api/types/outlook'

const COLS: { key: OutlookSortKey | null; label: string; title?: string; right?: boolean; hide?: string }[] = [
  { key: 'symbol', label: 'Koin' },
  { key: 'keyakinan', label: 'Arah', title: 'Arah = posisi strategi utama; keyakinan dari kasus serupa di simulasi historis' },
  { key: null, label: 'Fase', title: 'Sinyal baru vs menyusul posisi yang sudah berjalan', hide: 'hidden sm:table-cell' },
  { key: null, label: 'Entry / SL / TP', right: true, hide: 'hidden md:table-cell' },
  { key: 'profit_tp', label: 'Profit TP', right: true, title: 'Profit bersih di TP jika masuk sekarang (biaya termasuk)' },
  { key: 'loss_sl', label: 'Rugi SL', right: true, title: 'Rugi bersih di SL jika masuk sekarang (biaya termasuk)' },
  { key: 'rr', label: 'R:R', right: true, hide: 'hidden sm:table-cell' },
  { key: 'ev', label: 'Peluang', right: true, title: 'Nilai harapan kasus serupa (R, dikecilkan sesuai jumlah sampel)' },
  { key: null, label: 'Strategi', hide: 'hidden lg:table-cell' },
  { key: null, label: 'Konteks', title: 'Faktor konteks: + arah long, − arah short, 0 netral, · tidak tersedia', hide: 'hidden xl:table-cell' },
]

const th = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function InputsBar({ onChange }: { onChange: (i: OutlookInputs) => void }) {
  const [capital, setCapital] = useState(String(DEFAULT_INPUTS.capital))
  const [leverage, setLeverage] = useState(String(DEFAULT_INPUTS.leverage))
  const [riskPct, setRiskPct] = useState(String(DEFAULT_INPUTS.risk_pct))
  const [sizing, setSizing] = useState<Sizing>('notional')
  const cap = parseBounded(capital, 1, 1e9)
  const lev = parseBounded(leverage, 1, 20)
  const risk = parseBounded(riskPct, 0.1, 10)
  const valid = cap !== null && lev !== null && (sizing === 'notional' || risk !== null)
  const next = useDebounced(
    valid ? { capital: cap as number, leverage: lev as number, sizing, risk_pct: risk ?? 1 } : null,
    400,
  )
  const key = next ? `${next.capital}|${next.leverage}|${next.sizing}|${next.risk_pct}` : ''
  useEffect(() => {
    if (next) onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="ol-capital" className="text-xs">Modal (USDT)</Label>
        <Input id="ol-capital" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)}
          aria-invalid={cap === null} className={cn('h-8 w-32 font-mono text-sm', cap === null && 'border-bearish')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ol-lev" className="text-xs">Leverage</Label>
        <Input id="ol-lev" inputMode="decimal" value={leverage} onChange={(e) => setLeverage(e.target.value)}
          aria-invalid={lev === null} className={cn('h-8 w-20 font-mono text-sm', lev === null && 'border-bearish')} />
      </div>
      <div className="space-y-1">
        <span className="block text-xs font-medium">Ukuran posisi</span>
        <Segmented<Sizing>
          aria-label="Mode ukuran posisi"
          value={sizing}
          onChange={setSizing}
          options={[
            { value: 'notional', label: 'Modal × leverage' },
            { value: 'risk', label: 'Risiko % di SL' },
          ]}
        />
      </div>
      {sizing === 'risk' && (
        <div className="space-y-1">
          <Label htmlFor="ol-risk" className="text-xs">Risiko (% modal)</Label>
          <Input id="ol-risk" inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)}
            aria-invalid={risk === null} className={cn('h-8 w-20 font-mono text-sm', risk === null && 'border-bearish')} />
        </div>
      )}
      <p className="basis-full text-2xs text-muted-foreground">
        Default 1× (posisi = modal). Riset Lab: 2× terlalu berisiko untuk strategi ini (drawdown terlalu dalam). Tidak ada order yang dikirim.
        {!valid && <span className="text-bearish"> Isi modal 1–1.000.000.000 dan leverage 1–20.</span>}
      </p>
    </div>
  )
}

/** One line of market context + data freshness above the lists. */
function MarketStrip({ data }: { data: OutlookResponse }) {
  const meta = data.meta
  const btc = data.regime?.btc
  const closeIso = meta?.last_bar ? new Date(Date.parse(meta.last_bar) + 4 * 3600_000).toISOString() : null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
      <span>
        <span className="text-muted-foreground">Data: close 4H </span>
        <span className="font-medium">{formatWib(closeIso)}</span>
        {meta?.computed_at && <span className="text-muted-foreground"> · dihitung {relativeTime(meta.computed_at)}</span>}
      </span>
      {btc?.label && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground">BTC:</span>
          <Badge variant={REGIME_TONE[btc.label]} size="sm">{REGIME_TEXT[btc.label]}</Badge>
        </span>
      )}
      {meta?.fear_greed && (
        <span title="Fear & Greed pasar (alternative.me): konteks, bukan sinyal">
          <span className="text-muted-foreground">Fear & Greed: </span>
          <span className="num font-medium">{meta.fear_greed.value}</span> ({meta.fear_greed.classification})
        </span>
      )}
      {data.counts && (
        <span className="text-muted-foreground">
          {data.counts.arah.long} long · {data.counts.arah.short} short · {data.counts.arah.netral} tunggu ·{' '}
          <span className="text-foreground">{data.counts.sinyal_baru} sinyal baru</span>
        </span>
      )}
      <span className="text-muted-foreground">
        Kalibrasi: {data.calibration?.computed_at ? relativeTime(data.calibration.computed_at) : 'belum ada (keyakinan memakai aturan sederhana)'}
      </span>
    </div>
  )
}

function Level({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={cn('num truncate text-sm font-semibold', tone)}>{value}</div>
      {hint !== undefined && <div className="truncate text-3xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** "Peluang terbaik" card: decision, plan levels, money for the chosen capital, evidence. */
function PeluangCard({ r, onOpen }: { r: OutlookRow; onOpen: () => void }) {
  const pl = r.plan
  const pj = r.projection
  const cal = r.bias.calib?.stats
  const zone = pl?.entry_zone
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border bg-card p-3.5 text-left shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      aria-label={`Detail outlook ${coinLabel(r.symbol)}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {r.peluang?.rank && <span className="num text-xs text-muted-foreground">#{r.peluang.rank}</span>}
        <span className="font-mono text-sm font-bold">{coinLabel(r.symbol)}</span>
        <BiasBadge bias={r.bias} />
        <KeyakinanBadge bias={r.bias} />
        <FaseBadge fase={faseOf(r)} />
        <span className="ml-auto"><PeluangBadge p={r.peluang} /></span>
      </div>
      {pl?.saran && <p className="mt-2 text-xs leading-snug">{pl.saran}</p>}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        <Level label="Zona entry" value={zone ? `${formatPrice(zone[0])}–${formatPrice(zone[1])}` : formatPrice(r.price)} />
        <Level label="SL" value={formatPrice(r.strategy.sl)} tone="text-bearish"
          hint={pl?.r_unit_pct !== undefined ? `${formatScore(pl.r_unit_pct, 1)}% dari harga` : undefined} />
        <Level label="TP" value={r.strategy.tp !== null && r.strategy.tp !== undefined ? formatPrice(r.strategy.tp) : 'tidak ada'} tone="text-bullish"
          hint={pl?.target_typical ? `realistis ${formatPrice(pl.target_typical)}` : undefined} />
        <Level label="R:R" value={pl?.rr ? `${formatScore(pl.rr, 1)} : 1` : '—'} hint={pl?.valid_until ? `s/d ${formatWib(pl.valid_until)}` : undefined} />
      </div>
      {pj?.available && (
        <p className="mt-2.5 text-xs">
          <span className="text-muted-foreground">Modal {formatUsd(pj.capital)}: </span>
          TP <span className={cn('num font-semibold', signClass(pj.at_tp?.net))}>{formatUsdSigned(pj.at_tp?.net)}</span>
          {' · '}SL <span className={cn('num font-semibold', signClass(pj.at_sl?.net))}>{formatUsdSigned(pj.at_sl?.net)}</span>
          {pj.calibrated && (
            <>
              {' · '}rata-rata kasus serupa{' '}
              <span className={cn('num font-semibold', signClass(pj.calibrated.ev_usd))}>{formatUsdSigned(pj.calibrated.ev_usd)}</span>
            </>
          )}
        </p>
      )}
      {cal && cal.n_cases > 0 && (
        <p className="mt-1 text-2xs text-muted-foreground">
          Kasus serupa: TP dulu {formatProb(cal.p_tp)} · SL dulu {formatProb(cal.p_sl)} · dibatalkan {formatProb(cal.p_batal)} · rata-rata{' '}
          <span className={cn('num', signClass(cal.mean_r))}>{formatR(cal.mean_r)}</span> · {cal.n_pos.toLocaleString('id-ID')} posisi
        </p>
      )}
      {r.changes?.[0] && <p className="mt-1 truncate text-2xs text-info">Perubahan: {r.changes[0]}</p>}
      <span className="mt-1 inline-flex items-center gap-0.5 text-2xs text-muted-foreground group-hover:text-foreground">
        Detail & alasan <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </button>
  )
}

function Row({ r, onOpen }: { r: OutlookRow; onOpen: () => void }) {
  if (r.unavailable) {
    return (
      <tr>
        <td className="px-3 py-2 font-mono text-xs font-semibold">{coinLabel(r.symbol)}</td>
        <td colSpan={COLS.length - 1} className="px-3 py-2 text-xs text-muted-foreground">
          Tidak tersedia{r.error ? `: ${r.error}` : ''}
        </td>
      </tr>
    )
  }
  const st = r.strategy
  const pj = r.projection
  const ev = r.peluang?.score
  return (
    <tr
      className={cn('cursor-pointer hover:bg-muted/40', st.fresh && 'bg-info/[0.05]', r.stale && 'opacity-70')}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      tabIndex={0}
      aria-label={`Detail outlook ${coinLabel(r.symbol)}`}
    >
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 font-mono text-xs font-semibold">
          {coinLabel(r.symbol)}
          {r.positions && r.positions.length > 0 && (
            <Badge variant="lab" size="xs" title={r.positions.map((p) => `${p.source} ${p.side} @ ${formatPrice(p.entry_price)}`).join(', ')}>
              POSISI
            </Badge>
          )}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">{formatPrice(r.price)}</div>
      </td>
      <td className="px-3 py-2">
        <BiasBadge bias={r.bias} />
        <div><KeyakinanText bias={r.bias} /></div>
      </td>
      <td className="hidden px-3 py-2 sm:table-cell"><FaseBadge fase={faseOf(r)} /></td>
      <td className="hidden px-3 py-2 text-right font-mono text-[11px] tabular-nums md:table-cell">
        {st.side ? (
          <>
            <div>{formatPrice(r.price)}</div>
            <div className="text-bearish">{formatPrice(st.sl)}</div>
            <div className="text-bullish">{st.tp !== null && st.tp !== undefined ? formatPrice(st.tp) : '—'}</div>
          </>
        ) : '—'}
      </td>
      <td className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', signClass(pj?.at_tp?.net))}>
        {pj?.available ? formatUsdSigned(pj.at_tp?.net) : '—'}
      </td>
      <td className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', signClass(pj?.at_sl?.net))}>
        {pj?.available ? formatUsdSigned(pj.at_sl?.net) : '—'}
      </td>
      <td className="hidden px-3 py-2 text-right font-mono text-xs tabular-nums sm:table-cell">
        {r.plan?.rr ? formatScore(r.plan.rr, 2) : pj?.rr ? formatScore(pj.rr, 2) : '—'}
      </td>
      <td className="px-3 py-2 text-right">
        <div className={cn('num text-xs', signClass(ev))}>{ev === null || ev === undefined ? '—' : formatR(ev)}</div>
        {st.side && <PeluangBadge p={r.peluang} />}
      </td>
      <td className="hidden max-w-[11rem] px-3 py-2 lg:table-cell"><PresetCell strategy={st} /></td>
      <td className="hidden px-3 py-2 xl:table-cell"><FactorChips factors={r.factors} side={st.side} /></td>
    </tr>
  )
}

const ARAH: [Arah, string][] = [['long', 'Long'], ['short', 'Short'], ['netral', 'Tunggu (FLAT)']]
const KEYAKINAN: [Keyakinan, string][] = [['tinggi', 'Tinggi'], ['sedang', 'Sedang'], ['rendah', 'Rendah']]

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s)
  if (n.has(v)) n.delete(v)
  else n.add(v)
  return n
}

export function OutlookView() {
  const [inputs, setInputs] = useState<OutlookInputs>(DEFAULT_INPUTS)
  const q = useOutlook(inputs)
  const refresh = useRefreshOutlook()
  const [filters, setFilters] = useState<OutlookFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: OutlookSortKey; desc: boolean }>({ key: 'peluang', desc: true })
  const [open, setOpen] = useState<string | null>(null)
  const all = useMemo(() => q.data?.rows ?? [], [q.data])
  const rows = useMemo(() => sortRows(filterRows(all, filters), sort.key, sort.desc), [all, filters, sort])
  const best = useMemo(() => peluangRows(all), [all])
  const busy = q.data?.refresh?.status === 'queued' || q.data?.refresh?.status === 'running'
  const positive = best.filter((r) => r.peluang?.label === 'positif')
  const cards = (positive.length ? positive : best).slice(0, 6)

  const toggleSort = (key: OutlookSortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'symbol' }))

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: () => notify.info('Outlook dijadwalkan', { description: 'Dihitung ulang di worker Lab (±4 menit untuk 29 koin).' }),
      onError: (e) => notify.error('Gagal menjadwalkan', { description: apiErrorDetail(e) ?? undefined }),
    })
  const c = q.data?.counts

  return (
    <div className="space-y-4">
      <Disclaimer />
      <Section
        title="Modal & ukuran posisi"
        description="Dipakai untuk menghitung profit/rugi dalam dolar di TP dan SL. Tidak ada order yang dikirim."
      >
        <InputsBar onChange={setInputs} />
      </Section>

      {q.isPending ? (
        <div className="space-y-2" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : q.error ? (
        <ErrorState kind={errorKind(q.error)} onRetry={() => q.refetch()} message="Gagal memuat Outlook Koin." />
      ) : all.length === 0 ? (
        <EmptyState
          title="Outlook belum dihitung"
          description={busy ? 'Sedang dihitung pertama kali (±4 menit) — halaman update otomatis.' : 'Klik "Hitung ulang" untuk menghitung pertama kali.'}
          action={<Button size="sm" onClick={onRefresh} disabled={busy || refresh.isPending}>Hitung ulang</Button>}
        />
      ) : (
        <>
          {q.data && <MarketStrip data={q.data} />}

          <Section
            title="Peluang terbaik"
            icon={<Target className="h-4 w-4" aria-hidden="true" />}
            description="Urut dari bukti: nilai harapan panggilan serupa di simulasi historis (tanpa melihat masa depan), lalu keyakinan, lalu R:R. Bukan urut abjad."
          >
            {best.length === 0 ? (
              <EmptyState title="Tidak ada sinyal sekarang" description="Semua strategi utama sedang FLAT. Tunggu sinyal baru setelah close 4H berikutnya." />
            ) : (
              <>
                {positive.length === 0 && (
                  <p className="mb-3 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                    Belum ada panggilan dengan bukti historis positif. Daftar di bawah tetap diurutkan dari yang paling
                    tidak buruk — baca sebagai informasi, bukan ajakan masuk.
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {cards.map((r) => <PeluangCard key={r.symbol} r={r} onOpen={() => setOpen(r.symbol)} />)}
                </div>
                {best.length > cards.length && (
                  <p className="mt-2 text-2xs text-muted-foreground">+{best.length - cards.length} panggilan lain di tabel “Semua koin”.</p>
                )}
              </>
            )}
          </Section>

          <Section
            title="Semua koin"
            description="Klik baris untuk keputusan, rencana, alasan dan rekam jejak per koin."
            action={
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy || refresh.isPending} className="h-8 gap-1.5 text-xs">
                <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
                {busy ? `Menghitung… ${q.data?.refresh?.progress?.done ?? 0}/${q.data?.refresh?.progress?.total || '—'}` : 'Hitung ulang'}
              </Button>
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Filter">
              <span className="eyebrow mr-1">Arah</span>
              {ARAH.map(([v, label]) => (
                <Chip key={v} active={filters.arah.has(v)} onClick={() => setFilters((f) => ({ ...f, arah: toggle(f.arah, v) }))} className="h-7 px-2.5">
                  {label}{c ? ` (${c.arah[v]})` : ''}
                </Chip>
              ))}
              <span className="eyebrow ml-2 mr-1">Keyakinan</span>
              {KEYAKINAN.map(([v, label]) => (
                <Chip key={v} active={filters.keyakinan.has(v)} onClick={() => setFilters((f) => ({ ...f, keyakinan: toggle(f.keyakinan, v) }))} className="h-7 px-2.5">
                  {label}{c ? ` (${c.keyakinan[v]})` : ''}
                </Chip>
              ))}
              <span className="eyebrow ml-2 mr-1">Posisi</span>
              <Chip active={filters.posisi === 'ada'} onClick={() => setFilters((f) => ({ ...f, posisi: f.posisi === 'ada' ? null : 'ada' }))} className="h-7 px-2.5"
                title={q.data?.positions_available?.live ? 'Posisi paper Lab + bot live (baca saja)' : 'Posisi paper Lab (data bot live tidak tersedia)'}>
                Sudah ada{c ? ` (${c.posisi.ada})` : ''}
              </Chip>
              <Chip active={filters.posisi === 'tidak'} onClick={() => setFilters((f) => ({ ...f, posisi: f.posisi === 'tidak' ? null : 'tidak' }))} className="h-7 px-2.5">
                Belum ada
              </Chip>
              <Chip active={filters.baru} onClick={() => setFilters((f) => ({ ...f, baru: !f.baru }))} className="h-7 px-2.5">Sinyal baru saja</Chip>
              <span className="ml-auto">
                <Segmented<'peluang' | 'symbol'>
                  aria-label="Urutan"
                  value={sort.key === 'symbol' ? 'symbol' : 'peluang'}
                  onChange={(v) => setSort({ key: v, desc: v !== 'symbol' })}
                  options={[{ value: 'peluang', label: 'Peluang' }, { value: 'symbol', label: 'A–Z' }]}
                />
              </span>
            </div>
            {rows.length === 0 ? (
              <EmptyState title="Tidak ada koin yang cocok dengan filter" />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
                <table className="w-full text-sm sm:min-w-[640px]">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      {COLS.map((col) => (
                        <th key={col.label} className={cn(th, col.right ? 'text-right' : 'text-left', col.hide)} title={col.title}
                          aria-sort={col.key && sort.key === col.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                          {col.key ? (
                            <button type="button" onClick={() => toggleSort(col.key as OutlookSortKey)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                              {col.label}
                              {sort.key === col.key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                            </button>
                          ) : col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {rows.map((r) => <Row key={r.symbol} r={r} onOpen={() => setOpen(r.symbol)} />)}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {q.data && <OutlookTrackRecord data={q.data} />}

          <details className="rounded-xl border bg-card px-4 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-5">
            <summary className="cursor-pointer text-xs font-medium text-foreground">Cara arah, keyakinan & peluang dihitung</summary>
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              {(q.data?.method.text ?? []).map((t) => <li key={t}>{t}</li>)}
              <li>Profit/rugi dihitung jika masuk sekarang di harga close 4H terakhir, dengan SL/TP strategi saat ini, termasuk komisi 0,05% + slippage 0,05% per sisi; funding tidak termasuk.</li>
              <li>R = kelipatan jarak ke SL. Contoh: +0,14R dengan risiko {formatUsd(100)} di SL ≈ {formatUsdSigned(14)} rata-rata per panggilan.</li>
              <li>Di simulasi historis R bersih sudah dipotong biaya pulang-pergi 0,2%; funding tidak dihitung.</li>
            </ul>
          </details>
        </>
      )}
      <OutlookDetailSheet symbol={open} inputs={inputs} onClose={() => setOpen(null)} />
    </div>
  )
}
