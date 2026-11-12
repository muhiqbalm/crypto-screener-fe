'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CandlestickChart,
  ClipboardList,
  Compass,
  ExternalLink,
  Layers,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/components/ui/stat-tile'
import { ErrorState } from '@/components/shell/states'
import { PageHeader } from '@/components/shell/page'
import { AssistantSlot } from '@/components/shell/AssistantSlot'
import { AiFactorCard } from '@/components/ai/AiFactorSummary'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { AnswerCard } from '@/components/ui/answer-card'
import { Freshness } from '@/components/ui/freshness'
import { InfoTip } from '@/components/ui/info-tip'
import { Term } from '@/components/ui/term'
import { EvidenceBadge, StatusBadge } from '@/components/lab/outlook/OutlookBadges'
import { DISCLAIMER } from '@/components/lab/outlook/OutlookView'
import { FactorBreakdown } from '@/components/screener/FactorBreakdown'
import { TrackRecordProvider } from '@/components/screener/TrackRecordHint'
import { Fold } from '@/components/market/shared'
import { BigStat, bigUsd, CoinAvatar, ConfidenceDots, CountUp, DirectionChip, EvidenceBar, EvidenceLegend, HeroCard, Pill, TitledPanel } from '@/components/market/ui'
import { CapitalInputs } from '@/components/market/coin/CapitalInputs'
import { LevelChart } from '@/components/market/coin/LevelChart'
import { useSavedInputs } from '@/components/market/useSavedInputs'
import { useOutlookDetail } from '@/lib/queries/outlook'
import { useScreenerSummary } from '@/lib/queries/screener'
import { findAsset } from '@/lib/screener/factors'
import { ApiError } from '@/lib/api/errors'
import {
  CLASS_TEXT,
  coinLabel,
  driverText,
  FASE_HINT,
  FASE_TEXT,
  faseOf,
  formatR,
  formatWib,
  groupFactors,
  kDariN,
  liveNote,
  PELUANG_TEXT,
  PELUANG_TONE,
} from '@/lib/lab/outlook'
import { formatCount, formatPercent, formatPrice, formatRR, formatScore, formatUsd, signClass } from '@/lib/utils/format'
import { safeExternalUrl } from '@/lib/utils/safe-url'
import { cn } from '@/lib/utils/cn'
import type { CalibStats, OutlookDetail, OutlookFactor, OutlookInputs, StrategyClass } from '@/lib/api/types/outlook'

const GROUP_SHORT = { utama: 'Strategi', mtf: 'Konteks 1D · 1H · BTC', konteks: 'Konteks lain' } as const

function Header({ symbol, d, price, change }: { symbol: string; d?: OutlookDetail; price: number | null; change: number | null }) {
  const fase = d ? faseOf(d) : null
  return (
    <div className="space-y-3">
      <Link href="/koin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Peluang koin
      </Link>
      <PageHeader
        eyebrow="Pasar · Peluang koin"
        eyebrowIcon={Compass}
        title={
          <span className="flex items-center gap-3">
            <CoinAvatar symbol={symbol} size="lg" />
            <span className="display text-3xl sm:text-4xl">{coinLabel(symbol)}</span>
            <span className="text-base font-normal text-muted-foreground">/USDT perp</span>
          </span>
        }
        status={d ? (
          <>
            <DirectionChip direction={d.bias.bias} size="lg" />
            <ConfidenceDots level={d.bias.keyakinan} className="ml-1" />
            {fase && <Pill tone={fase === 'baru' ? 'info' : 'muted'} title={FASE_HINT[fase]}>{FASE_TEXT[fase]}</Pill>}
            {d.positions && d.positions.length > 0 && (
              <Pill tone="lab" title={d.positions.map((p) => `${p.source} ${p.side} @ ${formatPrice(p.entry_price)}`).join(', ')}>Sudah ada posisi</Pill>
            )}
          </>
        ) : undefined}
        description={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="display tabular-nums text-2xl font-bold text-foreground">{formatPrice(price)}</span>
            {change !== null && <span className={cn('num text-base font-semibold', signClass(change))}>{formatPercent(change, 2)} 24 jam</span>}
          </span>
        }
        help={{
          apaIni: 'Satu halaman untuk satu koin: keputusan arah dari strategi utama, rencana trade lengkap, faktor dan bukti historisnya.',
          caraPakai: [
            'Baca keputusan di atas lebih dulu.',
            'Isi modalmu di samping chart untuk melihat untung/rugi dalam dolar.',
            'Cek "Batal kalau" sebelum masuk; posisi baru lebih kuat daripada menyusul.',
          ],
          istilah: ['keyakinan', 'fase', 'sl', 'tp', 'target_realistis', 'rr', 'kasus_serupa', 'zona_entry'],
        }}
      >
        {d && <Freshness dataLabel="Data close 4H" dataAt={d.last_bar_close} updatedAt={d.computed_at} timeframe="4h" nextDelayMin={4} stale={d.stale} />}
      </PageHeader>
    </div>
  )
}

/** Big decision card: one sentence, three numbers, the evidence bar. */
function Decision({ d }: { d: OutlookDetail }) {
  const side = d.strategy.side
  const paras = d.explanation.paragraphs ?? []
  const answer = side && d.plan?.saran ? d.plan.saran : (paras[0] ?? d.explanation.summary).replace(/^Keputusan: /, '')
  const cal = d.bias.calib?.stats
  const k = kDariN(d)
  const p = d.peluang
  const note = liveNote(d)
  return (
    <HeroCard glow={side === 'long' ? 'bullish' : side === 'short' ? 'bearish' : 'brand'}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Keputusan</span>
        {p && <Pill tone={PELUANG_TONE[p.label]} title={p.reason}>{PELUANG_TEXT[p.label]}</Pill>}
      </div>
      <p className="mt-3 max-w-4xl display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{answer}</p>
      {side && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
            <BigStat label={<Term k="rr" short />} size="xl" className="col-span-2 sm:col-span-1"
              value={d.plan?.rr ? <CountUp value={d.plan.rr} format={(v) => formatRR(v)} /> : '—'}
              sub={d.plan?.valid_until ? `berlaku s/d ${formatWib(d.plan.valid_until)}` : undefined} />
            <BigStat label={<Term k="kasus_serupa" />} size="xl" tone={signClass(cal?.mean_r)}
              value={cal && cal.n_cases > 0 ? <CountUp value={cal.mean_r ?? 0} format={(v) => formatR(v)} /> : '—'}
              sub={cal && cal.n_cases > 0 ? `rata-rata · ${formatCount(cal.n_pos)} posisi` : 'belum dikalibrasi'} />
            <BigStat label={<Term k="konteks_searah" />} size="xl"
              value={k ? <>{k.k}<span className="text-2xl font-semibold text-muted-foreground"> / {k.n}</span></> : '—'}
              sub="belum terbukti menambah keunggulan" />
          </div>
          {cal && cal.n_cases > 0 && <EvidenceBar className="mt-6" pTp={cal.p_tp} pSl={cal.p_sl} pBatal={cal.p_batal} showLegend />}
        </>
      )}
      <p className="mt-5 text-2xs text-muted-foreground">{driverText(d)}</p>
      {note && <p className="mt-1 text-2xs text-warn">{note}</p>}
    </HeroCard>
  )
}

function MoneyRow({ label, value, sub, big = false }: { label: string; value: number | null | undefined; sub?: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border/60 py-3 first:border-t-0">
      <div className="min-w-0">
        <div className={cn(big ? 'text-sm' : 'text-sm', 'text-muted-foreground')}>{label}</div>
        {sub && <div className="text-2xs text-muted-foreground/80">{sub}</div>}
      </div>
      <div className={cn('num shrink-0 display font-bold tracking-tight', big ? 'text-3xl' : 'text-xl', signClass(value))}>
        {value === null || value === undefined ? '—' : big ? <CountUp value={value} format={bigUsd} /> : bigUsd(value)}
      </div>
    </div>
  )
}

/** Right side of the chart: what the plan means in dollars for the saved capital. */
function Projection({ d, inputs, setInputs }: { d: OutlookDetail; inputs: OutlookInputs; setInputs: (i: OutlookInputs) => void }) {
  const pj = d.projection
  return (
    <div className="flex h-full flex-col rounded-2xl bg-muted/30 p-5">
      <div className="eyebrow">Kalau masuk di harga close</div>
      {pj.available ? (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">Modal</span>
            <span className="num text-lg font-semibold">{formatUsd(pj.capital)} · {pj.leverage}×</span>
          </div>
          <div className="mt-2">
            <MoneyRow big label="Kena take profit" value={pj.at_tp?.net} sub={pj.at_tp ? `${formatPercent(pj.at_tp.move_pct, 1)} gerak harga` : 'TP tidak tersedia'} />
            <MoneyRow big label="Kena stop loss" value={pj.at_sl?.net} sub={pj.at_sl ? `${formatPercent(pj.at_sl.move_pct, 1)} gerak harga` : undefined} />
            {pj.at_typical && <MoneyRow label="Di target realistis" value={pj.at_typical.net} />}
            {pj.calibrated && <MoneyRow label="Rata-rata kasus serupa" value={pj.calibrated.ev_usd} sub={`${formatR(pj.calibrated.mean_r)} · ${formatCount(pj.calibrated.n_pos)} posisi`} />}
          </div>
          {(pj.warnings ?? []).map((w) => (
            <p key={w} className="mt-1 flex items-start gap-1.5 text-2xs text-warn">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{w}
            </p>
          ))}
          <p className="mt-1 text-2xs text-muted-foreground">
            Simulasi, termasuk biaya, belum termasuk funding.
            <InfoTip label="Catatan proyeksi">{pj.note} {pj.calibrated?.caveat}</InfoTip>
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{pj.reason}</p>
      )}
      <div className="mt-auto border-t border-border/60 pt-4">
        <div className="eyebrow mb-2">Modalmu</div>
        <CapitalInputs initial={inputs} onChange={setInputs} />
      </div>
    </div>
  )
}

function LevelTile({ label, value, sub, dot, className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; dot: string; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-2xl border bg-muted/20 p-4 sm:p-5', className)}>
      <div className="eyebrow flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot)} aria-hidden="true" />{label}
      </div>
      <div className="num mt-2 break-words display text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-2xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Plan({ d }: { d: OutlookDetail }) {
  const st = d.strategy
  const pl = d.plan
  const pj = d.projection
  if (!st.side || !pl) {
    return (
      <TitledPanel title="Rencana" icon={ClipboardList}>
        <p className="text-base text-muted-foreground">
          {pl?.text ?? 'Tidak ada sinyal: strategi utama sedang tidak berposisi. Tunggu sinyal baru setelah close 4H berikutnya.'}
        </p>
      </TitledPanel>
    )
  }
  return (
    <TitledPanel title="Rencana" icon={ClipboardList}
      action={pl.valid_until ? <Pill>berlaku s/d {formatWib(pl.valid_until)}</Pill> : undefined}>
      {pl.geometry_ok ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <LevelTile className="col-span-2 xl:col-span-1" dot="bg-info" label={<Term k="zona_entry" />}
              value={pl.entry_zone ? `${formatPrice(pl.entry_zone[0])}–${formatPrice(pl.entry_zone[1])}` : formatPrice(d.price)}
              sub={pl.dont_chase ? `jangan kejar lewat ${formatPrice(pl.dont_chase)}` : undefined} />
            <LevelTile dot="bg-bearish" label={<Term k="sl" />} value={<span className="text-bearish">{formatPrice(st.sl)}</span>}
              sub={pl.r_unit_pct !== undefined ? `${formatScore(pl.r_unit_pct, 1)}% dari harga` : undefined} />
            <LevelTile dot="bg-bullish" label={<Term k="tp" />}
              value={<span className="text-bullish">{st.tp !== null && st.tp !== undefined ? formatPrice(st.tp) : 'tidak ada'}</span>}
              sub="exit resmi strategi" />
            <LevelTile className="col-span-2 xl:col-span-1" dot="bg-bullish/50" label={<Term k="target_realistis" />}
              value={pl.target_typical ? formatPrice(pl.target_typical) : '—'}
              sub={pl.target_typical ? `${formatR(pl.target_typical_r)} · gerak tipikal kasus serupa` : 'belum tersedia'} />
          </div>
          {st.tp1 !== null && st.tp1 !== undefined && (
            <p className="mt-4 text-sm">
              <span className="font-semibold">Target awal (bersyarat) {formatPrice(st.tp1)}</span>
              <span className="text-muted-foreground"> · sebagian untung diambil bila momentum melemah</span>
              {pj.at_tp1 ? <span className={cn('num ml-1 font-semibold', signClass(pj.at_tp1.net))}>({bigUsd(pj.at_tp1.net)})</span> : null}
            </p>
          )}
          {pl.invalidation && (
            <div className="mt-5">
              <div className="eyebrow mb-2"><Term k="batal_kalau" /></div>
              <ul className="grid gap-2 md:grid-cols-3">
                {pl.invalidation.map((x) => (
                  <li key={x} className="flex items-start gap-2 rounded-2xl bg-muted/30 px-4 py-3 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bearish" aria-hidden="true" />{x}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(pl.warnings ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(pl.warnings ?? []).map((w) => <Pill key={w} tone="warn"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{w}</Pill>)}
            </div>
          )}
        </>
      ) : (
        <p className="flex items-start gap-2 text-base text-warn"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />{pl.text}</p>
      )}
    </TitledPanel>
  )
}

function FactorChip({ f }: { f: OutlookFactor }) {
  const arrow = f.direction > 0 ? '▲' : f.direction < 0 ? '▼' : '–'
  const tone = f.direction > 0 ? 'text-bullish' : f.direction < 0 ? 'text-bearish' : 'text-muted-foreground'
  return (
    <li title={f.detail} className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl border bg-muted/20 px-4 py-3', !f.available && 'opacity-60')}>
      <span className="text-2xs text-muted-foreground">{f.label}</span>
      <span className={cn('flex items-center gap-1.5 text-base font-semibold', tone)}>
        <span aria-hidden="true">{arrow}</span><span className="min-w-0 break-words">{f.value}</span>
      </span>
      <span className="min-w-0 [&>span]:whitespace-normal"><EvidenceBadge code={f.evidence} text={f.evidence_text} /></span>
    </li>
  )
}

function CalibRow({ label, s }: { label: string; s: CalibStats | null | undefined }) {
  const has = !!s && s.n_cases > 0
  return (
    <li className="grid grid-cols-1 items-center gap-2 py-3 sm:grid-cols-[minmax(0,14rem)_6rem_minmax(0,1fr)] sm:gap-4">
      <span className="text-sm">{label}</span>
      <span className={cn('num text-lg font-bold', has ? signClass(s?.mean_r) : 'text-muted-foreground')}>
        {has ? formatR(s?.mean_r) : '—'}
        {has && <span className="ml-1.5 text-2xs font-normal text-muted-foreground">{formatCount(s?.n_pos)} pos.</span>}
      </span>
      {has ? <EvidenceBar pTp={s?.p_tp} pSl={s?.p_sl} pBatal={s?.p_batal} /> : <span className="text-2xs text-muted-foreground">belum ada data</span>}
    </li>
  )
}

function Factors({ d, asset, allAssets, loadingAsset }: {
  d: OutlookDetail
  asset: ReturnType<typeof findAsset>
  allAssets: Parameters<typeof FactorBreakdown>[0]['all']
  loadingAsset: boolean
}) {
  const groups = groupFactors(d.factors)
  const cal = d.bias.calib
  const cls = (d.bias.cls ?? 'belum_diuji') as StrategyClass
  return (
    <TitledPanel title="Faktor & bukti" icon={Layers}>
      <div className="space-y-5">
        {(['utama', 'mtf', 'konteks'] as const).map((g) => groups[g].length > 0 && (
          <div key={g}>
            <div className="eyebrow mb-2">{GROUP_SHORT[g]}</div>
            <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {groups[g].map((f) => <FactorChip key={f.key} f={f} />)}
            </ul>
          </div>
        ))}
      </div>

      {cal && (
        <div className="mt-7">
          <div className="flex items-center gap-1.5 text-base font-semibold">
            Kasus serupa di masa lalu
            <InfoTip label="Kasus serupa">
              Setiap close 4H sejak 2020 dihitung ulang tanpa melihat masa depan, lalu dinilai seperti instruksi halaman ini
              (masuk di close, SL &amp; TP terpasang, keluar saat strategi menutup posisi atau setelah 7 hari).
            </InfoTip>
          </div>
          <ul className="mt-1 divide-y divide-border/60">
            <CalibRow label={`Strategi ini (${CLASS_TEXT[cls]}, ${faseOf(d) === 'baru' ? 'posisi baru' : 'menyusul'})`} s={cal.own} />
            <CalibRow label="Semua strategi (out-of-sample)" s={cal.pooled} />
            {d.coin_calibration?.fase && <CalibRow label={`${coinLabel(d.symbol)} saja`} s={d.coin_calibration.fase} />}
          </ul>
          <EvidenceLegend className="mt-2" />
        </div>
      )}

      <Fold title="Skor screener (Tabel faktor)" className="mt-6 rounded-2xl">
        {asset ? (
          <TrackRecordProvider><FactorBreakdown asset={asset} all={allAssets} /></TrackRecordProvider>
        ) : (
          <p className="text-sm text-muted-foreground">{loadingAsset ? 'Memuat…' : 'Skor screener tidak tersedia untuk koin ini.'}</p>
        )}
      </Fold>
    </TitledPanel>
  )
}

function TrackSection({ d }: { d: OutlookDetail }) {
  const bt = d.backtest
  return (
    <div className="space-y-5">
      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Trade" value={bt.n} hint={`long ${bt.by_side?.long?.n ?? 0} · short ${bt.by_side?.short?.n ?? 0}`} />
          <StatTile label="Menang" value={bt.win_rate_pct === null ? '—' : `${formatScore(bt.win_rate_pct, 0)}%`} />
          <StatTile label="Rata-rata per trade" value={formatPercent(bt.mean_pct, 2)} valueClassName={signClass(bt.mean_pct)} hint="% dari nilai posisi" />
          <StatTile label="Lama tahan" value={bt.median_hold_hours === null ? '—' : `${formatScore(bt.median_hold_hours / 24, 1)} hari`} hint="median" />
        </div>
        <p className="mt-2 text-2xs text-muted-foreground">Backtest strategi utama · {bt.basis_text}.</p>
      </div>

      <div>
        <div className="eyebrow mb-2">Panggilan tersimpan</div>
        {d.calls && d.calls.length > 0 ? (
          <ul className="divide-y divide-border/60 text-sm">
            {d.calls.slice(0, 15).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <StatusBadge status={c.status} />
                <span className={cn('font-semibold', c.side === 'long' ? 'text-bullish' : 'text-bearish')}>{c.side?.toUpperCase()}</span>
                <span className="text-muted-foreground">{formatWib(c.bar_close)} · masuk {formatPrice(c.price)} · SL {formatPrice(c.sl)}</span>
                {c.r_net !== null && <span className={cn('num ml-auto font-semibold', signClass(c.r_net))}>{formatR(c.r_net)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada panggilan tersimpan untuk koin ini.</p>
        )}
      </div>

      {d.strategies && d.strategies.length > 0 && (
        <div>
          <div className="eyebrow mb-2">Strategi untuk koin ini (hanya UTAMA yang menentukan arah)</div>
          <ul className="divide-y divide-border/60 text-sm">
            {d.strategies.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="font-mono text-2xs">{s.name}</span>
                {s.primary && <Badge variant="brand" size="xs">UTAMA</Badge>}
                {s.live_reference && <Badge variant="info" size="xs">BOT LIVE</Badge>}
                {s.verdict ? <VerdictBadge verdict={s.verdict} /> : <Badge variant="warn" size="xs">BELUM DIUJI</Badge>}
                <span className="ml-auto">
                  {s.error ? <span className="text-muted-foreground">{s.error}</span> : s.side ? (
                    <span className={cn('font-semibold', s.side === 'long' ? 'text-bullish' : 'text-bearish')}>
                      {s.side.toUpperCase()}<span className="font-normal text-muted-foreground"> sejak {formatWib(s.entry_at)}</span>
                    </span>
                  ) : <span className="text-muted-foreground">tanpa posisi</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function CoinPage({ symbol }: { symbol: string }) {
  const [inputs, setInputs] = useSavedInputs()
  const q = useOutlookDetail(symbol, inputs)
  const scr = useScreenerSummary()
  const asset = findAsset(scr.data?.assets, symbol)
  const d = q.data && q.data.symbol === symbol ? q.data : undefined
  const notFound = q.error instanceof ApiError && q.error.kind === 'not_found'
  const price = d?.price ?? asset?.price ?? null
  const paras = d?.explanation.paragraphs ?? []

  return (
    <div className="space-y-8">
      <Header symbol={symbol} d={d} price={price} change={asset?.change_24h ?? null} />

      {q.isPending && !d ? (
        <div className="space-y-5" aria-busy="true">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-[440px] w-full rounded-3xl" />
        </div>
      ) : q.error && !d && !notFound ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Gagal memuat keputusan koin ini." />
      ) : d ? (
        <>
          <Decision d={d} />

          <TitledPanel
            title={`Chart ${d.strategy.timeframe?.toUpperCase() ?? '4H'}`}
            icon={CandlestickChart}
            action={
              <Link href={`/chart?symbol=${encodeURIComponent(d.symbol)}`} className="inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm text-info hover:bg-info/10">
                Buka di Chart <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0">
                <LevelChart d={d} height={500} />
                <p className="mt-2 text-2xs text-muted-foreground">Merah = batas rugi (SL), hijau = target (TP), pita biru = zona entry.</p>
              </div>
              <Projection d={d} inputs={inputs} setInputs={setInputs} />
            </div>
          </TitledPanel>

          <Plan d={d} />

          <AiFactorCard symbol={d.symbol} />

          <Factors d={d} asset={asset} allAssets={scr.data?.assets ?? []} loadingAsset={scr.isPending} />

          <Fold title="Rekam jejak & backtest">
            <TrackSection d={d} />
          </Fold>

          <Fold title={`Berita terbaru (${d.detail.headlines?.length ?? 0})`}>
            {d.detail.headlines?.length ? (
              <ul className="space-y-2.5 text-sm">
                {d.detail.headlines.map((h) => {
                  const url = safeExternalUrl(h.url)
                  return (
                    <li key={`${h.title}-${h.published_at}`} className="flex items-start gap-2">
                      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>
                        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">{h.title}</a> : h.title}
                        <span className="text-muted-foreground"> · {h.source} · {formatWib(h.published_at)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada judul berita terbaru yang menyebut koin ini.</p>
            )}
            <p className="mt-3 text-2xs text-muted-foreground">Berita hanya konteks, tidak dihitung sebagai sinyal.</p>
          </Fold>

          <AssistantSlot
            context={{ kind: 'koin', subject: d.symbol, label: coinLabel(symbol) }}
            source="otomatis"
            items={paras.slice(1).filter((p) => !p.startsWith('Ini informasi')).map((p) => ({ text: p, at: formatWib(d.computed_at) }))}
          />
          <Fold title="Cara keputusan ini dihitung">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {(d.method?.text ?? []).map((t) => <li key={t}>{t}</li>)}
            </ul>
          </Fold>
        </>
      ) : (
        <>
          <AnswerCard tone="menunggu" answer="Outlook belum tersedia untuk koin ini. Skor screener di bawah tetap bisa kamu baca." />
          <TitledPanel title="Skor screener (Tabel faktor)" icon={Layers}>
            {asset ? (
              <TrackRecordProvider><FactorBreakdown asset={asset} all={scr.data?.assets ?? []} /></TrackRecordProvider>
            ) : (
              <p className="text-sm text-muted-foreground">{scr.isPending ? 'Memuat…' : 'Koin ini tidak ada di data screener.'}</p>
            )}
          </TitledPanel>
        </>
      )}
      <p className="text-2xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  )
}
