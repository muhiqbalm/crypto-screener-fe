'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ArrowUpRight, CandlestickChart, Compass, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/components/ui/stat-tile'
import { ErrorState } from '@/components/shell/states'
import { PageHeader } from '@/components/shell/page'
import { AssistantSlot } from '@/components/shell/AssistantSlot'
import { Section } from '@/components/lab/Section'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { AnswerCard } from '@/components/ui/answer-card'
import { Freshness } from '@/components/ui/freshness'
import { InfoTip } from '@/components/ui/info-tip'
import { Term } from '@/components/ui/term'
import { BiasBadge, EvidenceBadge, FaseBadge, KeyakinanBadge, StatusBadge } from '@/components/lab/outlook/OutlookBadges'
import { DISCLAIMER } from '@/components/lab/outlook/OutlookView'
import { FactorBreakdown } from '@/components/screener/FactorBreakdown'
import { TrackRecordProvider } from '@/components/screener/TrackRecordHint'
import { Fold } from '@/components/market/shared'
import { CapitalInputs } from '@/components/market/coin/CapitalInputs'
import { MiniChart } from '@/components/market/coin/MiniChart'
import { useSavedInputs } from '@/components/market/useSavedInputs'
import { useOutlookDetail } from '@/lib/queries/outlook'
import { useScreenerSummary } from '@/lib/queries/screener'
import { findAsset } from '@/lib/screener/factors'
import { ApiError } from '@/lib/api/errors'
import {
  CLASS_TEXT,
  coinLabel,
  driverText,
  faseOf,
  FACTOR_GROUP_TEXT,
  formatProb,
  formatR,
  formatWib,
  groupFactors,
  kDariN,
  liveNote,
} from '@/lib/lab/outlook'
import { formatCount, formatPercent, formatPrice, formatRR, formatScore, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { safeExternalUrl } from '@/lib/utils/safe-url'
import { cn } from '@/lib/utils/cn'
import type { CalibStats, OutlookDetail, OutlookInputs, StrategyClass } from '@/lib/api/types/outlook'

const DIR_TEXT = { 1: '+ long', 0: '0', [-1]: '− short' } as const

function CalibLine({ label, s }: { label: string; s: CalibStats | null | undefined }) {
  if (!s || !s.n_cases) return <li><span className="text-muted-foreground">{label}:</span> belum ada data</li>
  return (
    <li>
      <span className="text-muted-foreground">{label}:</span> {formatCount(s.n_cases)} panggilan dari{' '}
      {formatCount(s.n_pos)} posisi — TP dulu {formatProb(s.p_tp)}, SL dulu {formatProb(s.p_sl)}, dibatalkan{' '}
      {formatProb(s.p_batal)}; rata-rata <span className={cn('num', signClass(s.mean_r))}>{formatR(s.mean_r)}</span>
      {' '}(batas bawah 95% {formatR(s.lo95_r)})
    </li>
  )
}

function Header({ symbol, d, price, change }: { symbol: string; d?: OutlookDetail; price: number | null; change: number | null }) {
  return (
    <div className="space-y-2">
      <Link href="/koin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Peluang koin
      </Link>
      <PageHeader
        eyebrow="Pasar · Peluang koin"
        eyebrowIcon={Compass}
        title={<>{coinLabel(symbol)} <span className="text-base font-normal text-muted-foreground">/USDT perpetual</span></>}
        status={d ? (
          <>
            <BiasBadge bias={d.bias} size="default" />
            <KeyakinanBadge bias={d.bias} />
            <FaseBadge fase={faseOf(d)} />
            {d.positions && d.positions.length > 0 && (
              <Badge variant="lab" size="sm" title={d.positions.map((p) => `${p.source} ${p.side} @ ${formatPrice(p.entry_price)}`).join(', ')}>
                SUDAH ADA POSISI
              </Badge>
            )}
          </>
        ) : undefined}
        description={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="num text-lg font-bold text-foreground">{formatPrice(price)}</span>
            {change !== null && <span className={cn('num text-sm font-semibold', signClass(change))}>{formatPercent(change, 2)} 24 jam</span>}
          </span>
        }
        help={{
          apaIni: 'Satu halaman untuk satu koin: keputusan arah dari strategi utama, rencana trade lengkap, faktor dan bukti historisnya.',
          caraPakai: [
            'Baca kesimpulan di atas lebih dulu.',
            'Isi modalmu di bagian Rencana untuk melihat untung/rugi dalam dolar.',
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

function Plan({ d, inputs, setInputs }: { d: OutlookDetail; inputs: OutlookInputs; setInputs: (i: OutlookInputs) => void }) {
  const st = d.strategy
  const pl = d.plan
  const pj = d.projection
  if (!st.side || !pl) {
    return (
      <Section title="Rencana">
        <p className="text-sm text-muted-foreground">
          {pl?.text ?? 'Tidak ada sinyal: strategi utama sedang tidak berposisi. Tunggu sinyal baru setelah close 4H berikutnya.'}
        </p>
      </Section>
    )
  }
  return (
    <Section title="Rencana" description="Kalau masuk sekarang di harga close 4H terakhir, dengan SL dan TP strategi saat ini.">
      {pl.geometry_ok ? (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={<Term k="zona_entry" />} value={pl.entry_zone ? `${formatPrice(pl.entry_zone[0])}–${formatPrice(pl.entry_zone[1])}` : formatPrice(d.price)}
              hint={pl.dont_chase ? `jangan kejar lewat ${formatPrice(pl.dont_chase)}` : undefined} />
            <StatTile label={<Term k="sl" />} value={formatPrice(st.sl)} valueClassName="text-bearish"
              hint={pl.r_unit_pct !== undefined ? `${formatScore(pl.r_unit_pct, 1)}% dari harga` : undefined} />
            <StatTile label={<Term k="tp" />} value={st.tp !== null && st.tp !== undefined ? formatPrice(st.tp) : 'tidak ada'} valueClassName="text-bullish"
              hint="exit resmi strategi" />
            <StatTile label={<Term k="rr" />} value={pl.rr ? formatRR(pl.rr, 2) : '—'}
              hint={`berlaku s/d ${formatWib(pl.valid_until)}`} />
          </div>
          {pl.target_typical && (
            <p className="mt-2 flex items-start gap-1 text-xs">
              <span>
                <span className="font-semibold"><Term k="target_realistis" /> {formatPrice(pl.target_typical)}</span>{' '}
                <span className="text-muted-foreground">
                  ({formatR(pl.target_typical_r)}): setengah panggilan serupa di masa lalu sempat mencapai harga ini sebelum
                  ditutup. Ini gerak tipikal, bukan exit strategi.
                </span>
              </span>
            </p>
          )}
          {pl.invalidation && (
            <div className="mt-3 text-xs">
              <span className="font-semibold">Batal kalau:</span>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
                {pl.invalidation.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}
          {(pl.warnings ?? []).map((w) => (
            <p key={w} className="mt-1 flex items-start gap-1 text-xs text-warn">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{w}
            </p>
          ))}
        </>
      ) : (
        <p className="flex items-start gap-1 text-sm text-warn"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{pl.text}</p>
      )}

      <div className="mt-5 rounded-lg border bg-muted/20 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
          Uang untuk modalmu <Badge variant="muted" size="xs">SIMULASI</Badge>
        </div>
        <CapitalInputs initial={inputs} onChange={setInputs} />
        {pj.available ? (
          <>
            <p className="mt-3 text-xs text-muted-foreground">
              Posisi <span className="num">{formatUsd(pj.notional)}</span> (modal {formatUsd(pj.capital)} × {pj.leverage}) di harga{' '}
              {formatPrice(pj.basis_price)}.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatTile label="Rugi di SL" value={formatUsdSigned(pj.at_sl?.net)} valueClassName={signClass(pj.at_sl?.net)}
                hint={pj.at_sl ? `${formatPercent(pj.at_sl.move_pct, 1)} gerak harga` : undefined} />
              <StatTile label="Untung di TP" value={formatUsdSigned(pj.at_tp?.net)} valueClassName={signClass(pj.at_tp?.net)}
                hint={pj.at_tp ? `${formatPercent(pj.at_tp.move_pct, 1)} gerak harga` : 'TP tidak tersedia'} />
              <StatTile label="Di target realistis" value={formatUsdSigned(pj.at_typical?.net)} valueClassName={signClass(pj.at_typical?.net)}
                hint={pj.at_typical ? 'gerak tipikal' : 'tidak tersedia'} />
              <StatTile label="Rata-rata serupa" value={formatUsdSigned(pj.calibrated?.ev_usd)} valueClassName={signClass(pj.calibrated?.ev_usd)}
                hint={pj.calibrated ? `${formatR(pj.calibrated.mean_r)} · ${formatCount(pj.calibrated.n_pos)} posisi` : 'belum dikalibrasi'} />
            </div>
            {(pj.warnings ?? []).map((w) => (
              <p key={w} className="mt-1 flex items-start gap-1 text-xs text-warn">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{w}
              </p>
            ))}
            <p className="mt-2 text-2xs text-muted-foreground">
              {pj.note} {pj.calibrated?.caveat}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{pj.reason}</p>
        )}
      </div>
    </Section>
  )
}

function Factors({ d }: { d: OutlookDetail }) {
  const groups = groupFactors(d.factors)
  const k = kDariN(d)
  const cal = d.bias.calib
  const cls = (d.bias.cls ?? 'belum_diuji') as StrategyClass
  const paras = d.explanation.paragraphs ?? []
  const bukti = paras.find((p) => p.startsWith('Bukti:'))
  return (
    <div className="space-y-4">
      {k && (
        <p className="text-sm">
          <span className="font-semibold">{k.k} dari {k.n}</span> faktor konteks (1D, 1H, kondisi BTC) searah dengan{' '}
          {d.strategy.side?.toUpperCase()}. <span className="text-muted-foreground">Faktor ini belum terbukti menambah keunggulan, jadi tidak mengubah keyakinan.</span>
        </p>
      )}
      {(['utama', 'mtf', 'konteks'] as const).map((g) => groups[g].length > 0 && (
        <div key={g}>
          <div className="eyebrow mb-1">{FACTOR_GROUP_TEXT[g]}</div>
          <ul className="divide-y divide-border/60 rounded-lg border">
            {groups[g].map((f) => (
              <li key={f.key} className={cn('flex flex-wrap items-start gap-x-3 gap-y-1 p-2.5 text-xs', !f.available && 'opacity-60')}>
                <span className="min-w-[8rem] font-medium">{f.label}</span>
                <span className={cn('font-mono', f.direction > 0 ? 'text-bullish' : f.direction < 0 ? 'text-bearish' : 'text-muted-foreground')}>
                  {DIR_TEXT[f.direction]}
                </span>
                <span>{f.value}</span>
                <span className="ml-auto"><EvidenceBadge code={f.evidence} text={f.evidence_text} /></span>
                <span className="basis-full text-2xs leading-snug text-muted-foreground">{f.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="mb-1 flex items-center gap-1 text-sm font-semibold">
          Bukti: panggilan serupa di masa lalu
          <InfoTip label="Kasus serupa">
            Setiap close 4H sejak 2020 dihitung ulang tanpa melihat masa depan, lalu dinilai seperti instruksi halaman ini
            (masuk di close, SL &amp; TP terpasang, keluar saat strategi menutup posisi atau setelah 7 hari).
          </InfoTip>
        </div>
        {bukti && <p className="text-xs leading-relaxed">{bukti.replace(/^Bukti: /, '')}</p>}
        {cal && (
          <ul className="mt-2 space-y-0.5 text-2xs">
            <CalibLine label={`Strategi ini (${CLASS_TEXT[cls]}, ${faseOf(d) === 'baru' ? 'sinyal baru' : 'menyusul'})`} s={cal.own} />
            <CalibLine label="Semua strategi out-of-sample" s={cal.pooled} />
            {d.coin_calibration?.fase && <CalibLine label={`Koin ini saja (${coinLabel(d.symbol)})`} s={d.coin_calibration.fase} />}
          </ul>
        )}
      </div>
    </div>
  )
}

function TrackSection({ d }: { d: OutlookDetail }) {
  const bt = d.backtest
  return (
    <div className="space-y-4">
      {d.calls && d.calls.length > 0 ? (
        <ul className="space-y-1 text-2xs">
          {d.calls.slice(0, 15).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={c.status} />
              <span className={c.side === 'long' ? 'text-bullish' : 'text-bearish'}>{c.side?.toUpperCase()}</span>
              <span className="text-muted-foreground">keyakinan {c.keyakinan} · {formatWib(c.bar_close)} · masuk {formatPrice(c.price)} · SL {formatPrice(c.sl)}</span>
              {c.r_net !== null && <span className={cn('num', signClass(c.r_net))}>{formatR(c.r_net)}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada panggilan tersimpan untuk koin ini (rekam jejak live dimulai sejak versi ini aktif).</p>
      )}

      {d.strategies && d.strategies.length > 0 && (
        <div>
          <div className="eyebrow mb-1">Strategi yang dihitung untuk koin ini</div>
          <ul className="divide-y divide-border/60 rounded-lg border text-xs">
            {d.strategies.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2.5">
                <span className="font-mono text-2xs">{s.name}</span>
                {s.primary && <Badge variant="brand" size="xs">UTAMA</Badge>}
                {s.live_reference && <Badge variant="info" size="xs">BOT LIVE</Badge>}
                {s.verdict ? <VerdictBadge verdict={s.verdict} /> : <Badge variant="warn" size="xs">BELUM DIUJI</Badge>}
                <span className="ml-auto">
                  {s.error ? <span className="text-muted-foreground">{s.error}</span> : s.side ? (
                    <span className={s.side === 'long' ? 'text-bullish' : 'text-bearish'}>
                      {s.side.toUpperCase()}<span className="text-muted-foreground"> sejak {formatWib(s.entry_at)}</span>
                    </span>
                  ) : <span className="text-muted-foreground">tanpa posisi</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-2xs text-muted-foreground">Hanya strategi UTAMA yang menentukan arah di halaman ini.</p>
        </div>
      )}

      <div>
        <div className="eyebrow mb-1">Statistik backtest strategi utama</div>
        <p className="text-2xs text-muted-foreground">Dasar: {bt.basis_text}.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatTile label="Trade" value={bt.n} hint={`long ${bt.by_side?.long?.n ?? 0} · short ${bt.by_side?.short?.n ?? 0}`} />
          <StatTile label="Menang" value={bt.win_rate_pct === null ? '—' : `${formatScore(bt.win_rate_pct, 0)}%`} />
          <StatTile label="Rata-rata per trade" value={formatPercent(bt.mean_pct, 2)} valueClassName={signClass(bt.mean_pct)} hint="% dari nilai posisi" />
          <StatTile label="Lama tahan" value={bt.median_hold_hours === null ? '—' : `${formatScore(bt.median_hold_hours / 24, 1)} hari`} hint="median" />
        </div>
      </div>
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
    <div className="space-y-5">
      <Header symbol={symbol} d={d} price={price} change={asset?.change_24h ?? null} />

      {q.isPending && !d ? (
        <div className="space-y-2" aria-busy="true">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : q.error && !d && !notFound ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} title="Gagal memuat keputusan koin ini." />
      ) : d ? (
        <>
          <AnswerCard
            title="Kesimpulan"
            tone={d.peluang?.label === 'positif' ? 'baik' : d.strategy.side ? 'perlu_dicek' : 'menunggu'}
            answer={(paras[0] ?? d.explanation.summary).replace(/^Keputusan: /, '')}
            metrics={d.strategy.side ? [
              { label: <Term k="rr" short />, value: d.plan?.rr ? formatRR(d.plan.rr) : '—' },
              { label: <Term k="kasus_serupa" />, value: formatR(d.bias.calib?.stats?.mean_r), hint: d.bias.calib?.stats ? `${formatCount(d.bias.calib.stats.n_pos)} posisi` : 'belum dikalibrasi' },
              { label: <Term k="konteks_searah" />, value: kDariN(d) ? `${kDariN(d)?.k} dari ${kDariN(d)?.n}` : '—', hint: 'belum terbukti' },
            ] : undefined}
            footer={<>{driverText(d)} {liveNote(d) && <span className="text-warn">{liveNote(d)}</span>}</>}
          />

          <Plan d={d} inputs={inputs} setInputs={setInputs} />

          <Section title="Faktor & bukti">
            <Factors d={d} />
            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold">Skor screener (Tabel faktor)</div>
              {asset ? (
                <TrackRecordProvider><FactorBreakdown asset={asset} all={scr.data?.assets ?? []} /></TrackRecordProvider>
              ) : (
                <p className="text-xs text-muted-foreground">{scr.isPending ? 'Memuat…' : 'Skor screener tidak tersedia untuk koin ini.'}</p>
              )}
            </div>
          </Section>

          <Section title="Rekam jejak">
            <TrackSection d={d} />
          </Section>

          <Section
            title={`Chart ${d.strategy.timeframe?.toUpperCase() ?? '4H'}`}
            action={
              <Link href={`/chart?symbol=${encodeURIComponent(d.symbol)}`} className="inline-flex items-center gap-1 text-xs text-info hover:underline">
                <CandlestickChart className="h-3.5 w-3.5" aria-hidden="true" /> Buka di Chart <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          >
            <MiniChart d={d} />
            <p className="mt-1 text-2xs text-muted-foreground">Garis: entry, zona entry, SL, TP dan target realistis. Panah = entry trade backtest terakhir, lingkaran = exit.</p>
          </Section>

          <Section title="Berita">
            {d.detail.headlines?.length ? (
              <ul className="space-y-1.5 text-xs">
                {d.detail.headlines.map((h) => {
                  const url = safeExternalUrl(h.url)
                  return (
                    <li key={`${h.title}-${h.published_at}`} className="flex items-start gap-1.5">
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>
                        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">{h.title}</a> : h.title}
                        <span className="text-muted-foreground"> · {h.source} · {formatWib(h.published_at)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada judul berita terbaru yang menyebut koin ini.</p>
            )}
            <p className="mt-2 text-2xs text-muted-foreground">Berita hanya konteks: tidak dihitung sebagai sinyal karena tidak ada arsip berita per koin untuk diuji.</p>
          </Section>

          <AssistantSlot
            context={{ kind: 'koin', subject: d.symbol, label: coinLabel(symbol) }}
            source="otomatis"
            items={paras.slice(1).filter((p) => !p.startsWith('Ini informasi')).map((p) => ({ text: p, at: d.computed_at }))}
          />
          <Fold title="Cara keputusan ini dihitung">
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
              {(d.method?.text ?? []).map((t) => <li key={t}>{t}</li>)}
            </ul>
          </Fold>
        </>
      ) : (
        <>
          <AnswerCard tone="menunggu" answer="Outlook belum tersedia untuk koin ini. Skor screener di bawah tetap bisa kamu baca." />
          <Section title="Skor screener (Tabel faktor)">
            {asset ? (
              <TrackRecordProvider><FactorBreakdown asset={asset} all={scr.data?.assets ?? []} /></TrackRecordProvider>
            ) : (
              <p className="text-xs text-muted-foreground">{scr.isPending ? 'Memuat…' : 'Koin ini tidak ada di data screener.'}</p>
            )}
          </Section>
        </>
      )}
      <p className="text-2xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  )
}
