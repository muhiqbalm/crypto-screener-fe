'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, CandlestickChart, ExternalLink, Info } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/components/ui/stat-tile'
import { ErrorState, errorKind } from '@/components/shell/states'
import { TradingChart, type Kline } from '@/components/chart/TradingChart'
import { VerdictBadge } from '@/components/lab/LabBadges'
import {
  BiasBadge,
  EvidenceBadge,
  FaseBadge,
  KeyakinanBadge,
  PresetCell,
  StatusBadge,
} from '@/components/lab/outlook/OutlookBadges'
import { useOutlookDetail } from '@/lib/queries/outlook'
import { OVERLAY_COLORS, positionLines, tradesToMarkers, type OverlayPriceLine } from '@/lib/lab/overlay'
import {
  CLASS_TEXT,
  coinLabel,
  faseOf,
  FACTOR_GROUP_TEXT,
  formatProb,
  formatR,
  formatWib,
  groupFactors,
} from '@/lib/lab/outlook'
import { formatPercent, formatPrice, formatScore, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { safeExternalUrl } from '@/lib/utils/safe-url'
import { cn } from '@/lib/utils/cn'
import type { CalibStats, OutlookDetail, OutlookInputs, StrategyClass } from '@/lib/api/types/outlook'

export const DISCLAIMER = 'Bukan saran investasi; strategi bisa salah; preset GAGAL/belum diuji = keyakinan rendah.'

export function Disclaimer({ className }: { className?: string }) {
  return (
    <div role="note" className={cn('flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn', className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">{DISCLAIMER}</span> Angka proyeksi adalah hitungan dari harga & SL/TP strategi, bukan
        janji hasil. Rata-rata historis tidak menjamin hasil berikutnya.
      </p>
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
}

const DIR_TEXT = { 1: '+ long', 0: '0', [-1]: '− short' } as const

function MiniChart({ d }: { d: OutlookDetail }) {
  const klines: Kline[] = useMemo(
    () => (d.detail.candles ?? []).map(([time, open, high, low, close]) => ({ time, open, high, low, close })),
    [d.detail.candles],
  )
  const lines: OverlayPriceLine[] = useMemo(() => {
    const st = d.strategy
    if (!st.side || st.entry_price === null || st.entry_price === undefined) return []
    const out = positionLines('outlook', { entry_price: st.entry_price, sl: st.sl ?? null, tp: st.tp ?? null, side: st.side })
    if (st.tp1 !== null && st.tp1 !== undefined) {
      out.push({ id: 'outlook-tp1', price: st.tp1, color: OVERLAY_COLORS.tp, title: 'TP1 (bersyarat)', dashed: true })
    }
    const z = d.plan?.entry_zone
    if (z) {
      out.push({ id: 'outlook-zone-lo', price: z[0], color: OVERLAY_COLORS.entry, title: 'zona entry', dashed: true })
      out.push({ id: 'outlook-zone-hi', price: z[1], color: OVERLAY_COLORS.entry, title: 'zona entry', dashed: true })
    }
    return out
  }, [d.strategy, d.plan])
  const markers = useMemo(() => {
    const times = klines.map((k) => k.time)
    return tradesToMarkers(d.detail.recent_trades ?? [], times).markers
  }, [klines, d.detail.recent_trades])
  if (klines.length === 0) return <p className="text-xs text-muted-foreground">Candle tidak tersedia.</p>
  return (
    <div className="h-64 overflow-hidden rounded-lg border">
      <TradingChart symbol={d.symbol} interval={d.strategy.timeframe === '1h' ? '1h' : '4h'} klines={klines} source="perp" priceLines={lines} markers={markers} />
    </div>
  )
}

function CalibLine({ label, s }: { label: string; s: CalibStats | null | undefined }) {
  if (!s || !s.n_cases) return <li><span className="text-muted-foreground">{label}:</span> belum ada data</li>
  return (
    <li>
      <span className="text-muted-foreground">{label}:</span> {s.n_cases.toLocaleString('id-ID')} panggilan · {s.n_pos.toLocaleString('id-ID')} posisi ·
      TP dulu {formatProb(s.p_tp)} · SL dulu {formatProb(s.p_sl)} · batal {formatProb(s.p_batal)} · rata-rata{' '}
      <span className={cn('num', signClass(s.mean_r))}>{formatR(s.mean_r)}</span> (bawah 95% {formatR(s.lo95_r)})
    </li>
  )
}

function Body({ d }: { d: OutlookDetail }) {
  const st = d.strategy
  const pj = d.projection
  const pl = d.plan
  const bt = d.backtest
  const paras = d.explanation.paragraphs ?? [d.explanation.summary]
  const groups = groupFactors(d.factors)
  const cal = d.bias.calib
  const cls = (d.bias.cls ?? 'belum_diuji') as StrategyClass
  return (
    <div className="space-y-1 pb-8">
      <Disclaimer />
      {d.stale && (
        <p className="mt-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          Data sudah {formatScore(d.age_hours, 0)} jam sejak close 4H terakhir: bisa basi.
        </p>
      )}

      <div className="mt-3 rounded-lg border bg-muted/30 p-3">
        <p className="text-sm font-semibold leading-snug">{paras[0]}</p>
      </div>

      {pl && pl.side && pl.geometry_ok && (
        <>
          <H>Rencana</H>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Zona entry" value={pl.entry_zone ? `${formatPrice(pl.entry_zone[0])}–${formatPrice(pl.entry_zone[1])}` : '—'}
              hint={pl.dont_chase ? `jangan kejar lewat ${formatPrice(pl.dont_chase)}` : undefined} />
            <StatTile label="Stop loss" value={formatPrice(st.sl)} valueClassName="text-bearish"
              hint={pl.r_unit_pct !== undefined ? `${formatScore(pl.r_unit_pct, 1)}% dari harga` : undefined} />
            <StatTile label="Take profit" value={st.tp !== null && st.tp !== undefined ? formatPrice(st.tp) : 'tidak ada'} valueClassName="text-bullish"
              hint={pl.target_typical ? `realistis ${formatPrice(pl.target_typical)} (${formatR(pl.target_typical_r)})` : 'target strategi'} />
            <StatTile label="R:R" value={pl.rr ? `${formatScore(pl.rr, 2)} : 1` : '—'}
              hint={`horizon ${Math.round((pl.horizon_hours ?? 168) / 24)} hari · s/d ${formatWib(pl.valid_until)}`} />
          </div>
          {pl.invalidation && (
            <div className="mt-2 text-xs">
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
      )}

      <H>Proyeksi dana</H>
      {pj.available ? (
        <>
          <p className="text-xs text-muted-foreground">
            Modal {formatUsd(pj.capital)} · leverage {pj.leverage}× · posisi{' '}
            <span className="num">{formatUsd(pj.notional)}</span> ({pj.basis_text}, {formatPrice(pj.basis_price)})
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Profit di TP" value={formatUsdSigned(pj.at_tp?.net)} valueClassName={signClass(pj.at_tp?.net)}
              hint={pj.at_tp ? `${formatPrice(pj.at_tp.price)} · ${formatPercent(pj.at_tp.move_pct, 1)}` : 'TP tidak tersedia'} />
            <StatTile label="Rugi di SL" value={formatUsdSigned(pj.at_sl?.net)} valueClassName={signClass(pj.at_sl?.net)}
              hint={pj.at_sl ? `${formatPrice(pj.at_sl.price)} · ${formatPercent(pj.at_sl.move_pct, 1)}` : undefined} />
            <StatTile label="Di target realistis" value={formatUsdSigned(pj.at_typical?.net)} valueClassName={signClass(pj.at_typical?.net)}
              hint={pj.at_typical ? 'setengah kasus serupa sampai sini' : 'tidak tersedia'} />
            <StatTile label="Rata-rata kasus serupa" value={formatUsdSigned(pj.calibrated?.ev_usd)} valueClassName={signClass(pj.calibrated?.ev_usd)}
              hint={pj.calibrated ? `${formatR(pj.calibrated.mean_r)} · ${pj.calibrated.n_pos.toLocaleString('id-ID')} posisi` : 'belum dikalibrasi'} />
          </div>
          {pj.calibrated && <p className="mt-1 text-2xs text-muted-foreground">{pj.calibrated.caveat}</p>}
          {pj.expected && (
            <p className="mt-1 text-2xs text-muted-foreground">
              Backtest strategi ({pj.expected.subset}): rata-rata {formatUsdSigned(pj.expected.ev_usd)} per trade, menang{' '}
              {formatScore(pj.expected.win_rate_pct, 0)}%, {pj.expected.n} trade{pj.expected.small_sample ? ' (sampel kecil)' : ''}. {pj.expected.caveat}
            </p>
          )}
          {(pj.warnings ?? []).map((w) => (
            <p key={w} className="mt-1 flex items-start gap-1 text-xs text-warn">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{w}
            </p>
          ))}
          <p className="mt-1 text-2xs text-muted-foreground">{pj.note}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{pj.reason}</p>
      )}

      <H>Kenapa, bukti & risiko</H>
      <div className="space-y-2 text-sm leading-relaxed">
        {paras.slice(1).map((p, i) => (
          <p key={i} className={cn(p.startsWith('Risiko') && 'text-warn', p.startsWith('Ini informasi') && 'text-2xs text-muted-foreground')}>{p}</p>
        ))}
      </div>

      {cal && (
        <ul className="mt-2 space-y-0.5 text-2xs">
          <CalibLine label={`Strategi ini (${CLASS_TEXT[cls]}, ${faseOf(d) === 'baru' ? 'sinyal baru' : 'menyusul'})`} s={cal.own} />
          <CalibLine label="Semua strategi out-of-sample" s={cal.pooled} />
          {d.coin_calibration?.fase && <CalibLine label={`Koin ini saja (${coinLabel(d.symbol)})`} s={d.coin_calibration.fase} />}
        </ul>
      )}

      {d.changes && d.changes.length > 0 && (
        <>
          <H>Yang berubah sejak close 4H sebelumnya</H>
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {d.changes.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </>
      )}

      {d.strategies && d.strategies.length > 0 && (
        <>
          <H>Strategi yang dihitung untuk koin ini</H>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-3xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-1 py-1.5">Strategi</th>
                  <th className="px-1 py-1.5">Uji</th>
                  <th className="px-1 py-1.5">Posisi</th>
                  <th className="px-1 py-1.5 text-right">SL / TP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {d.strategies.map((s) => (
                  <tr key={s.name}>
                    <td className="px-1 py-1.5">
                      <div className="font-mono text-2xs">{s.name}{s.primary && <Badge variant="brand" size="xs" className="ml-1">UTAMA</Badge>}</div>
                      <div className="text-3xs text-muted-foreground">{s.template_id} · {s.timeframe}</div>
                    </td>
                    <td className="px-1 py-1.5">{s.verdict ? <VerdictBadge verdict={s.verdict} /> : <Badge variant="warn" size="xs">BELUM DIUJI</Badge>}</td>
                    <td className="px-1 py-1.5">
                      {s.error ? <span className="text-muted-foreground">{s.error}</span> : s.side ? (
                        <span className={s.side === 'long' ? 'text-bullish' : 'text-bearish'}>
                          {s.side.toUpperCase()}<span className="text-muted-foreground"> sejak {formatWib(s.entry_at)}</span>
                        </span>
                      ) : <span className="text-muted-foreground">FLAT</span>}
                    </td>
                    <td className="num px-1 py-1.5 text-right">{s.side ? `${formatPrice(s.sl)} / ${s.tp !== null && s.tp !== undefined ? formatPrice(s.tp) : '—'}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.agreement && (
            <p className="mt-1 text-2xs text-muted-foreground">
              Strategi lolos uji: {d.agreement.lolos_uji.short} short, {d.agreement.lolos_uji.long} long, {d.agreement.lolos_uji.flat} FLAT (dari {d.agreement.lolos_uji.n}).
              Hanya strategi utama yang menentukan arah.
            </p>
          )}
        </>
      )}

      <H>Faktor</H>
      {(['utama', 'mtf', 'konteks'] as const).map((g) => groups[g].length > 0 && (
        <div key={g} className="mb-3">
          <div className="eyebrow mb-1">{FACTOR_GROUP_TEXT[g]}</div>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border/50">
                {groups[g].map((f) => (
                  <tr key={f.key} className={cn(!f.available && 'opacity-60')}>
                    <td className="px-1 py-2 align-top">
                      <div className="font-medium">{f.label}</div>
                      <div className="mt-0.5 max-w-[24rem] text-2xs leading-snug text-muted-foreground">{f.detail}</div>
                    </td>
                    <td className={cn('px-1 py-2 align-top font-mono', f.direction > 0 ? 'text-bullish' : f.direction < 0 ? 'text-bearish' : 'text-muted-foreground')}>
                      {DIR_TEXT[f.direction]}
                    </td>
                    <td className="px-1 py-2 align-top">{f.value}</td>
                    <td className="px-1 py-2 align-top"><EvidenceBadge code={f.evidence} text={f.evidence_text} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {d.calls && d.calls.length > 0 && (
        <>
          <H>Rekam jejak panggilan koin ini</H>
          <ul className="space-y-1 text-2xs">
            {d.calls.slice(0, 15).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={c.status} />
                <span className={c.side === 'long' ? 'text-bullish' : 'text-bearish'}>{c.side?.toUpperCase()}</span>
                <span className="text-muted-foreground">{c.keyakinan} · {formatWib(c.bar_close)} · masuk {formatPrice(c.price)} · SL {formatPrice(c.sl)}</span>
                {c.r_net !== null && <span className={cn('num', signClass(c.r_net))}>{formatR(c.r_net)}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chart {st.timeframe?.toUpperCase() ?? '4H'}</h3>
        <Link href={`/chart?symbol=${encodeURIComponent(d.symbol)}`} className="inline-flex items-center gap-1 text-xs text-info hover:underline">
          <CandlestickChart className="h-3.5 w-3.5" aria-hidden="true" /> Buka di Chart <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <MiniChart d={d} />
      <p className="mt-1 text-2xs text-muted-foreground">Garis: entry, zona entry, SL & TP. Panah = entry trade backtest terakhir, lingkaran = exit.</p>

      <H>Statistik backtest strategi</H>
      <p className="text-xs text-muted-foreground">Dasar: {bt.basis_text}.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Trade" value={bt.n} hint={`long ${bt.by_side?.long?.n ?? 0} · short ${bt.by_side?.short?.n ?? 0}`} />
        <StatTile label="Menang" value={bt.win_rate_pct === null ? '—' : `${formatScore(bt.win_rate_pct, 0)}%`} />
        <StatTile label="Rata-rata/trade" value={formatPercent(bt.mean_pct, 2)} valueClassName={signClass(bt.mean_pct)} hint="% dari nilai posisi" />
        <StatTile label="Lama tahan" value={bt.median_hold_hours === null ? '—' : `${formatScore(bt.median_hold_hours / 24, 1)} hari`} hint="median" />
      </div>

      <H>Headline terkait</H>
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
        <p className="text-xs text-muted-foreground">Tidak ada headline terbaru yang menyebut koin ini.</p>
      )}
      <p className="mt-1 flex items-start gap-1 text-2xs text-muted-foreground">
        <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
        Headline hanya konteks. Tidak dihitung sebagai sinyal karena tidak ada arsip berita per koin untuk diuji.
      </p>
    </div>
  )
}

export function OutlookDetailSheet({
  symbol,
  inputs,
  onClose,
}: {
  symbol: string | null
  inputs: OutlookInputs
  onClose: () => void
}) {
  const q = useOutlookDetail(symbol, inputs)
  const d = q.data && q.data.symbol === symbol ? q.data : undefined
  return (
    <Sheet open={Boolean(symbol)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-card p-5 sm:p-6">
        <div className="mb-3 pr-8">
          <SheetTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {symbol ? coinLabel(symbol) : ''} outlook
            {d && <BiasBadge bias={d.bias} size="default" />}
            {d && <KeyakinanBadge bias={d.bias} />}
            {d && <FaseBadge fase={faseOf(d)} />}
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs text-muted-foreground">
            {d ? (
              <>
                {d.strategy.name ?? 'Strategi'} · close 4H {formatWib(d.last_bar_close)} ·{' '}
                {d.strategy.side ? `${d.strategy.side.toUpperCase()} sejak ${formatWib(d.strategy.entry_at)}` : 'FLAT'}
              </>
            ) : 'Memuat…'}
          </SheetDescription>
          {d && <div className="mt-2"><PresetCell strategy={d.strategy} /></div>}
        </div>
        {q.isPending && !d ? (
          <div className="space-y-2" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error && !d ? (
          <ErrorState kind={errorKind(q.error)} onRetry={() => q.refetch()} message="Gagal memuat detail outlook." />
        ) : d ? (
          <Body d={d} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
