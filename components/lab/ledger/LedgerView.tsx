'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, Gauge, HelpCircle, History, ListChecks, Radar, X, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Freshness } from '@/components/ui/freshness'
import { Input } from '@/components/ui/input'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Segmented } from '@/components/ui/segmented'
import { StatTile } from '@/components/ui/stat-tile'
import { Term } from '@/components/ui/term'
import { EmptyState, ErrorState, LoadingState } from '@/components/shell/states'
import { Chip, Section } from '@/components/lab/Section'
import { BigNumber, CardLink, CountUp, DeckCard, Pill, RateBar, SectionHead, type Tone } from '@/components/lab/arena/deck'
import { SideBadge } from '@/components/trading/SideBadge'
import { formatCount, formatPrice, signClass } from '@/lib/utils/format'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
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
  filtersFromParams,
  filtersToParams,
  ledgerAnswer,
  sortGroups,
  typeLabel,
  type LedgerFilterState,
} from '@/lib/lab/ledger'
import { useLedgerMeta, useLedgerSignals, useLedgerSummary } from '@/lib/queries/ledger'
import type { LedgerFilters, LedgerGroup, LedgerHorizon, LedgerMeta, LedgerSignal, LedgerSource } from '@/lib/api/types/ledger'

const HORIZONS: LedgerHorizon[] = ['4h', '1d', '3d', '7d']
const PAGE = 50
const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm'

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
        <StatTile label="Sinyal tercatat" value={formatCount(total)} hint={`${meta.symbols.length} koin`} />
        <StatTile label="Menunggu hasil" value={formatCount(pending)} hint="Belum lewat waktu cek (maks. 7 hari)" />
        <StatTile
          label="Screener dicatat sejak"
          value={meta.live_since ? formatTime(meta.live_since, { time: false }) : 'Belum mulai'}
          hint={meta.live_since ? `${liveDays} hari pencatatan` : 'Catatan pertama di tutup jam berikutnya'}
        />
        <StatTile label="Siklus terakhir" value={formatAge(meta.last_cycle?.finished ?? null)} hint="Pencatatan dan penilaian tiap jam" />
      </div>
      <div className="flex flex-wrap gap-2 text-2xs">
        {bf?.status === 'done' && (
          <Badge variant="info" size="sm">
            <History /> Rekonstruksi screener: {formatTime(bf.from, { time: false })} – {formatTime(bf.to, { time: false })} · {formatCount(bf.signals)} sinyal
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
        {!bf && <Badge variant="muted" size="sm">Rekonstruksi data masa lalu tidak dijalankan</Badge>}
      </div>
    </div>
  )
}

function HonestyNote() {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-2xs leading-relaxed text-muted-foreground">
      <li>
        Gerak diukur dari harga 15 menit pertama setelah sinyal, <b className="text-foreground">sebelum biaya</b> (fee, slippage, funding). Ini bukan hasil
        strategi, hanya apakah arah sinyal benar.
      </li>
      <li>
        Banyak koin bergerak bareng di hari yang sama, jadi sinyal tidak saling lepas. Karena itu rentang ketidakpastian dihitung per hari. Lihat juga{' '}
        <b className="text-foreground">dibanding BTC</b>: sinyal short yang benar saat pasar turun sebagian besar hanya ikut arah pasar.
      </li>
      <li>
        <b className="text-foreground">Screener (live)</b> baru dicatat sejak fitur ini aktif. <b className="text-foreground">Screener (rekonstruksi)</b> menghitung
        ulang sinyal ±27 hari ke belakang dengan data yang tersedia saat itu; beberapa input didekati, jadi angkanya dipisah.
      </li>
      <li>
        Periode pendek = satu kondisi pasar. &quot;Terbukti&quot; dengan data kurang dari beberapa bulan adalah petunjuk, bukan jaminan. Pantau Lab hanya mencatat
        sinyal setelah pantauan dibuat.
      </li>
    </ul>
  )
}

// ── filters ────────────────────────────────────────────────────────────────

type FilterState = LedgerFilterState

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
        <label htmlFor="lg-source" className="text-2xs font-medium">Sumber</label>
        <select id="lg-source" value={value.source ?? ''} className={selectCls}
          onChange={(e) => set({ source: e.target.value as LedgerSource | '', signal_type: '' })}>
          <option value="" className="bg-popover">Semua sumber</option>
          {(meta?.sources ?? (Object.keys(SOURCE_LABEL) as LedgerSource[])).map((s) => (
            <option key={s} value={s} className="bg-popover">{SOURCE_LABEL[s] ?? s}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-type" className="text-2xs font-medium">Jenis sinyal</label>
        <select id="lg-type" value={value.signal_type ?? ''} className={selectCls} onChange={(e) => set({ signal_type: e.target.value })}>
          <option value="" className="bg-popover">Semua jenis</option>
          {types.map((t) => (
            <option key={t} value={t} className="bg-popover">{typeLabel(t)}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-symbol" className="text-2xs font-medium">Koin</label>
        <select id="lg-symbol" value={value.symbol ?? ''} className={selectCls} onChange={(e) => set({ symbol: e.target.value })}>
          <option value="" className="bg-popover">Semua koin</option>
          {(meta?.symbols ?? []).map((s) => (
            <option key={s} value={s} className="bg-popover">{s.replace(/USDT$/, '')}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-since" className="text-2xs font-medium">Dari</label>
        <Input id="lg-since" type="date" value={value.since ?? ''} onChange={(e) => set({ since: e.target.value })} className="h-8 px-2 text-2xs" />
      </div>
      <div className="space-y-1">
        <label htmlFor="lg-until" className="text-2xs font-medium">Sampai</label>
        <Input id="lg-until" type="date" value={value.until ?? ''} onChange={(e) => set({ until: e.target.value })} className="h-8 px-2 text-2xs" />
      </div>
      <div className="flex items-end gap-2">
        <Chip active={value.split} onClick={() => set({ split: !value.split })} title="Pisahkan statistik sinyal long dan short">
          Pisah Long/Short
        </Chip>
        <Button size="sm" variant="ghost" className="h-8 text-2xs"
          onClick={() => onChange({ source: '', signal_type: '', symbol: '', since: '', until: '', split: false })}>
          Reset
        </Button>
      </div>
    </div>
  )
}

// ── summary (per signal type) ──────────────────────────────────────────────

function summaryColumns(h: LedgerHorizon): ResponsiveColumn<LedgerGroup>[] {
  const at = (g: LedgerGroup) => g.horizons[h]
  return [
    {
      key: 'signal',
      header: 'Sinyal',
      mobile: 'title',
      cell: (g) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-2xs font-semibold">{typeLabel(g.signal_type)}</span>
            {g.direction !== null && <SideBadge side={g.direction === 1 ? 'long' : 'short'} />}
          </div>
          <div className="truncate text-2xs font-normal text-muted-foreground">
            {SOURCE_LABEL[g.source] ?? g.source}
            {at(g) && at(g).n > 0 && ` · ${at(g).coins} koin · ${at(g).days} hari`}
          </div>
        </div>
      ),
    },
    {
      key: 'verdict',
      header: 'Kesimpulan',
      mobile: 'badge',
      cell: (g) => {
        const v = VERDICT_COPY[at(g)?.verdict ?? 'insufficient']
        const vb = VERDICT_COPY[at(g)?.verdict_rel_btc ?? 'insufficient']
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant={v.tone} size="sm" title={v.hint}>
              {v.label}
            </Badge>
            {at(g)?.verdict !== 'insufficient' && <span className="hidden text-3xs text-muted-foreground 2xl:inline">dibanding BTC: {vb.label.toLowerCase()}</span>}
          </div>
        )
      },
    },
    {
      key: 'n',
      header: 'Dinilai',
      mobile: 'field',
      align: 'right',
      cell: (g) => (
        <div className="num text-2xs">
          <span className="font-semibold">{formatCount(at(g)?.n ?? 0)}</span>
          <span className="text-muted-foreground"> / {formatCount(g.n_signals)}</span>
          <div className="mt-0.5 hidden sm:block">
            <Badge variant={SAMPLE_COPY[at(g)?.sample ?? 'none'].tone} size="xs">
              {SAMPLE_COPY[at(g)?.sample ?? 'none'].label}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'hit',
      header: <Term k="hit_rate" short />,
      mobileLabel: 'Benar',
      mobile: 'field',
      align: 'right',
      cell: (g) => (
        <div className="num text-2xs">
          <div className="font-semibold">{hitPct(at(g)?.hit_rate)}</div>
          <div className="hidden text-3xs text-muted-foreground sm:block">{isThin(at(g)) ? '' : hitCi(at(g)?.hit_ci)}</div>
        </div>
      ),
    },
    {
      key: 'mean',
      header: <Term k="mean_move">Rata-rata gerak</Term>,
      mobileLabel: 'Rata-rata',
      mobile: 'field',
      align: 'right',
      cell: (g) => (
        <div className={cn('num text-2xs', signClass(at(g)?.mean_pct))}>
          <div className="font-semibold">{pct(at(g)?.mean_pct)}</div>
          <div className="hidden text-3xs text-muted-foreground sm:block">{isThin(at(g)) ? '' : retCi(at(g)?.mean_ci)}</div>
        </div>
      ),
    },
    {
      key: 'btc',
      header: <Term k="vs_btc" short />,
      mobile: 'hidden',
      align: 'right',
      cell: (g) => (
        <div className={cn('num text-2xs', signClass(at(g)?.mean_rel_btc_pct))}>
          <div className="font-semibold">{pct(at(g)?.mean_rel_btc_pct)}</div>
          <div className="text-3xs text-muted-foreground">{isThin(at(g)) ? '' : retCi(at(g)?.rel_btc_ci)}</div>
        </div>
      ),
    },
    {
      key: 'mfe',
      header: <Term k="mfe_mae" short />,
      mobile: 'hidden',
      align: 'right',
      className: 'hidden 2xl:table-cell',
      headerClassName: 'hidden 2xl:table-cell',
      cell: (g) => (
        <span className="num text-2xs">
          <span className="text-bullish">{pct(at(g)?.mean_mfe_pct, 1)}</span>
          {' / '}
          <span className="text-bearish">{pct(at(g)?.mean_mae_pct, 1)}</span>
        </span>
      ),
    },
  ]
}

// ── recent signals ─────────────────────────────────────────────────────────

function OutcomeCell({ s, h }: { s: LedgerSignal; h: LedgerHorizon }) {
  const o = s.outcomes[h]
  if (!o) {
    return <span className="text-3xs text-muted-foreground">{s.status === 'no_data' ? 'tanpa data' : 'menunggu'}</span>
  }
  if (o.dir_ret_pct === null) return <span className="text-3xs text-muted-foreground">tanpa data</span>
  return (
    <span
      className={cn('num inline-flex items-center gap-0.5 text-2xs', signClass(o.dir_ret_pct))}
      title={`Gerak koin ${pct(o.ret_pct)} · BTC ${pct(o.btc_ret_pct)} · terbaik ${pct(o.mfe_pct)} · terburuk ${pct(o.mae_pct)}`}
    >
      {o.hit ? <Check className="h-3 w-3" aria-label="arah benar" /> : <X className="h-3 w-3" aria-label="arah salah" />}
      {pct(o.dir_ret_pct, 1)}
    </span>
  )
}

const SIGNAL_COLUMNS: ResponsiveColumn<LedgerSignal>[] = [
  {
    key: 'coin',
    header: 'Koin',
    mobile: 'title',
    cell: (s) => (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-2xs font-semibold">{s.symbol.replace(/USDT$/, '')}</span>
        <SideBadge side={s.direction === 1 ? 'long' : 'short'} />
      </span>
    ),
  },
  {
    key: 'signal',
    header: 'Sinyal',
    mobile: 'hidden',
    cell: (s) => (
      <div>
        <div className="text-2xs font-medium">{typeLabel(s.signal_type)}</div>
        <div className="text-2xs text-muted-foreground">{SOURCE_LABEL[s.source] ?? s.source}</div>
      </div>
    ),
  },
  { key: 'time', header: 'Waktu', mobile: 'badge', cell: (s) => <span className="num whitespace-nowrap text-2xs">{formatTime(s.ts)}</span> },
  { key: 'entry', header: 'Harga', mobile: 'hidden', align: 'right', cell: (s) => <span className="num text-2xs">{formatPrice(s.entry_price ?? s.price)}</span> },
  ...HORIZONS.map(
    (h): ResponsiveColumn<LedgerSignal> => ({
      key: `h-${h}`,
      header: HORIZON_LABEL[h],
      mobile: h === '4h' ? 'hidden' : 'field',
      align: 'right',
      cell: (s) => <OutcomeCell s={s} h={h} />,
    }),
  ),
]

function RecentSignals({ filters }: { filters: LedgerFilters }) {
  const [pages, setPages] = useState(1)
  const q = useLedgerSignals(filters, PAGE * pages, 0)
  const items = q.data?.items ?? []
  return (
    <Section
      title="Sinyal terbaru"
      description={
        q.data
          ? `${formatCount(q.data.total)} sinyal sesuai filter · gerak searah sinyal (✓ = arah benar), sebelum biaya`
          : 'Sinyal terbaru beserta hasilnya'
      }
    >
      {q.isPending ? (
        <LoadingState rows={8} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Daftar sinyal tidak bisa dimuat" compact />
      ) : (
        <div className="space-y-3">
          <ResponsiveTable
            rows={items}
            columns={SIGNAL_COLUMNS}
            rowKey={(s) => String(s.id)}
            caption="Sinyal terbaru dan hasilnya"
            empty={<EmptyState title="Belum ada sinyal" description="Sinyal muncul di sini setelah worker Lab mencatatnya." />}
          />
          {q.data && q.data.total > items.length && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setPages((p) => p + 1)} disabled={q.isFetching}>
                {q.isFetching ? 'Memuat…' : 'Muat lebih banyak'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}

// ── verdict cards ──────────────────────────────────────────────────────────

const VERDICT_TONE: Record<string, Tone> = { positive: 'bullish', negative: 'bearish', inconclusive: 'warn', insufficient: 'muted' }
const VERDICT_ICON: Record<string, typeof CheckCircle2> = { positive: CheckCircle2, negative: XCircle, inconclusive: HelpCircle, insufficient: Clock }
const VERDICT_RANK: Record<string, number> = { positive: 0, negative: 1, inconclusive: 2, insufficient: 3 }

function VerdictCard({ g, h, onPick }: { g: LedgerGroup; h: LedgerHorizon; onPick: () => void }) {
  const st = g.horizons[h]
  const v = st?.verdict ?? 'insufficient'
  const copy = VERDICT_COPY[v]
  const tone = VERDICT_TONE[v]
  const thin = isThin(st)
  // colour only what the verdict proves; "belum terbukti" stays neutral
  const judged = v === 'positive' || v === 'negative'
  return (
    <DeckCard
      onClick={onPick}
      ariaLabel={`Lihat sinyal ${typeLabel(g.signal_type)}`}
      icon={VERDICT_ICON[v]}
      iconTone={tone}
      title={
        <span className="inline-flex items-center gap-2">
          {typeLabel(g.signal_type)}
          {g.direction !== null && <SideBadge side={g.direction === 1 ? 'long' : 'short'} />}
        </span>
      }
      eyebrow={SOURCE_LABEL[g.source] ?? g.source}
      action={
        <Pill tone={tone} icon={VERDICT_ICON[v]}>
          {copy.label}
        </Pill>
      }
      outline={v === 'negative' ? 'bearish' : v === 'positive' ? 'bullish' : undefined}
    >
      <div className="grid grid-cols-2 gap-4">
        <BigNumber label="Arah benar" value={hitPct(st?.hit_rate)} tone={judged ? tone : undefined} size="md" />
        <BigNumber label="Rata-rata gerak" value={pct(st?.mean_pct)} tone={judged ? tone : undefined} size="md" />
      </div>
      <RateBar rate={st?.hit_rate} tone={judged ? tone : 'muted'} className="mt-4" />
      <p className="mt-3 text-[13px] text-muted-foreground">
        {formatCount(st?.n ?? 0)} dari {formatCount(g.n_signals)} sinyal dinilai
        {st && st.n > 0 ? ` · ${st.coins} koin · ${st.days} hari` : ''}
        {!thin && st?.verdict_rel_btc ? ` · dibanding BTC: ${VERDICT_COPY[st.verdict_rel_btc].label.toLowerCase()}` : ''}
      </p>
    </DeckCard>
  )
}

// ── page ───────────────────────────────────────────────────────────────────

/**
 * Rekam jejak sinyal: the answer first (big), then one visual card per signal type; the
 * dense tables are folded under "Lihat detail". Filters live in the URL
 * (?source=&type=&symbol=&since=&until=&split=1&h=3d) so other pages can link here
 * pre-filtered. Needs a Suspense boundary (useSearchParams).
 */
export function LedgerView() {
  const meta = useLedgerMeta()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { filters: f, horizon } = useMemo(() => filtersFromParams(params), [params])
  const navigate = useCallback(
    (next: FilterState, h: LedgerHorizon) => {
      const qs = filtersToParams(next, h)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname],
  )
  const setF = (next: FilterState) => navigate(next, horizon)
  const setHorizon = (h: LedgerHorizon) => navigate(f, h)
  const filters: LedgerFilters = useMemo(
    () => ({ source: f.source, signal_type: f.signal_type, symbol: f.symbol, since: f.since, until: f.until }),
    [f.source, f.signal_type, f.symbol, f.since, f.until],
  )
  const summary = useLedgerSummary(filters, f.split ? 'direction' : 'none')
  const groups = useMemo(() => sortGroups(summary.data?.groups ?? [], horizon), [summary.data, horizon])
  const cards = useMemo(
    () => [...groups].sort((a, b) => (VERDICT_RANK[a.horizons[horizon]?.verdict ?? 'insufficient'] ?? 3) - (VERDICT_RANK[b.horizons[horizon]?.verdict ?? 'insufficient'] ?? 3)),
    [groups, horizon],
  )
  const answer = useMemo(() => ledgerAnswer(groups, horizon), [groups, horizon])
  const cols = useMemo(() => summaryColumns(horizon), [horizon])
  const filtered = Boolean(f.source || f.signal_type || f.symbol || f.since || f.until)
  const rest = answer.inconclusive.length + answer.insufficient.length
  const heroTone: Tone = answer.proven.length ? 'bullish' : answer.negative.length ? 'warn' : 'muted'

  return (
    <div className="space-y-8">
      {summary.isPending ? (
        <LoadingState rows={3} />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} title="Rekam jejak tidak bisa dimuat" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          <DeckCard hero fill icon={Radar} iconTone={heroTone} eyebrow={`Dicek setelah ${HORIZON_LABEL[horizon]}${filtered ? ' · filter aktif' : ''}`} className="col-span-2 lg:row-span-2">
            <p className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {answer.proven.length
                ? `${answer.proven.length} jenis sinyal terbukti benar arahnya.`
                : 'Belum ada jenis sinyal yang terbukti.'}{' '}
              {answer.negative.length ? `${answer.negative.length} cenderung salah arah.` : ''}
            </p>
            {(answer.proven.length > 0 || answer.negative.length > 0) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {answer.proven.slice(0, 4).map((g) => (
                  <Pill key={`p-${g.source}-${g.signal_type}-${g.direction}`} tone="bullish" icon={CheckCircle2}>
                    {typeLabel(g.signal_type)}
                  </Pill>
                ))}
                {answer.negative.slice(0, 4).map((g) => (
                  <Pill key={`n-${g.source}-${g.signal_type}-${g.direction}`} tone="bearish" icon={XCircle}>
                    {typeLabel(g.signal_type)}
                  </Pill>
                ))}
              </div>
            )}
            <div className="mt-auto space-y-1.5 pt-6 text-[13px] text-muted-foreground">
              <p>Sebelum biaya. Petunjuk, bukan jaminan.</p>
              <Freshness updatedAt={meta.data?.last_cycle?.finished ?? null} />
            </div>
          </DeckCard>
          <DeckCard icon={CheckCircle2} iconTone="bullish" title="Terbukti">
            <BigNumber label="Jenis sinyal" value={<CountUp value={answer.proven.length} format={(v) => formatCount(Math.round(v))} />} tone="bullish" size="lg" />
          </DeckCard>
          <DeckCard icon={XCircle} iconTone="bearish" title="Negatif">
            <BigNumber label="Salah arah" value={<CountUp value={answer.negative.length} format={(v) => formatCount(Math.round(v))} />} tone={answer.negative.length ? 'bearish' : undefined} size="lg" />
          </DeckCard>
          <DeckCard icon={HelpCircle} iconTone="warn" title="Belum terbukti" className="col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <BigNumber label="Jenis sinyal" value={formatCount(rest)} size="lg" hint={answer.insufficient.length ? `${answer.insufficient.length} masih menunggu cukup data` : 'belum bisa dibedakan dari kebetulan'} />
              <CardLink href="#kartu">Lihat semua</CardLink>
            </div>
          </DeckCard>
        </div>
      )}

      <section className="space-y-4">
        <SectionHead
          id="kartu"
          icon={ListChecks}
          title="Per jenis sinyal"
          sub="Ketuk satu kartu untuk melihat sinyalnya."
          action={
            <Segmented
              aria-label="Dicek setelah"
              size="sm"
              value={horizon}
              onChange={setHorizon}
              options={HORIZONS.map((h) => ({ value: h, label: HORIZON_LABEL[h] }))}
            />
          }
        />
        <details open={filtered} className="rounded-3xl border bg-card px-6 py-4">
          <summary className="cursor-pointer select-none text-[17px] font-semibold tracking-tight">Filter{filtered ? ' (aktif)' : ''}</summary>
          <div className="mt-4">
            <Filters meta={meta.data} value={f} onChange={setF} />
          </div>
        </details>
        {summary.isPending ? (
          <LoadingState rows={6} />
        ) : summary.isError ? null : cards.length === 0 ? (
          <EmptyState title="Belum ada sinyal untuk filter ini" description="Coba hapus filter, atau tunggu siklus berikutnya." />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {cards.map((g) => (
              <VerdictCard
                key={`${g.source}|${g.signal_type}|${g.direction ?? 0}`}
                g={g}
                h={horizon}
                onPick={() => setF({ ...f, source: g.source, signal_type: g.signal_type })}
              />
            ))}
          </div>
        )}
        <p className="text-[13px] text-muted-foreground">Kesimpulan butuh minimal 10 sinyal yang dinilai, di minimal 5 hari berbeda.</p>
      </section>

      <details className="rounded-3xl border bg-card px-6 py-4">
        <summary className="cursor-pointer select-none text-[17px] font-semibold tracking-tight">Lihat detail: tabel dan sinyal terbaru</summary>
        <div className="mt-5 space-y-6">
          {!summary.isPending && !summary.isError && (
            <ResponsiveTable
              rows={groups}
              columns={cols}
              rowKey={(g) => `${g.source}|${g.signal_type}|${g.direction ?? 0}`}
              onRowClick={(g) => setF({ ...f, source: g.source, signal_type: g.signal_type })}
              rowLabel={(g) => `Lihat sinyal ${typeLabel(g.signal_type)}`}
              caption="Ringkasan per jenis sinyal"
            />
          )}
          <RecentSignals key={JSON.stringify(filters)} filters={filters} />
        </div>
      </details>

      <details className="rounded-3xl border bg-card px-6 py-4">
        <summary className="cursor-pointer select-none text-[17px] font-semibold tracking-tight">Cara kerja dan status pencatatan</summary>
        <div className="mt-4 space-y-4">
          {meta.isPending ? (
            <LoadingState rows={2} />
          ) : meta.isError || !meta.data ? (
            <ErrorState error={meta.error} onRetry={() => meta.refetch()} title="Status pencatatan tidak bisa dimuat" compact />
          ) : (
            <StatusPanel meta={meta.data} />
          )}
          <HonestyNote />
        </div>
      </details>

      <Link href="/bot#eksekusi" className="group flex items-center justify-between gap-3 rounded-3xl border border-dashed px-6 py-4 text-[15px] hover:bg-accent/50">
        <span className="flex min-w-0 items-start gap-3">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            <b>Kualitas eksekusi bot live</b> sekarang ada di Status bot.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
      </Link>
    </div>
  )
}
