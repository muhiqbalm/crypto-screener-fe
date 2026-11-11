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
import { BiasBadge, EvidenceBadge, KeyakinanText, PresetCell } from '@/components/lab/outlook/OutlookBadges'
import { useOutlookDetail } from '@/lib/queries/outlook'
import { OVERLAY_COLORS, positionLines, tradesToMarkers, type OverlayPriceLine } from '@/lib/lab/overlay'
import { coinLabel, formatWib, REGIME_TEXT } from '@/lib/lab/outlook'
import { formatPercent, formatPrice, formatScore, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { safeExternalUrl } from '@/lib/utils/safe-url'
import { cn } from '@/lib/utils/cn'
import type { OutlookDetail, OutlookInputs, RegimeLabel } from '@/lib/api/types/outlook'

export const DISCLAIMER = 'Bukan saran investasi; strategi bisa salah; preset GAGAL/belum diuji = keyakinan rendah.'

export function Disclaimer({ className }: { className?: string }) {
  return (
    <div role="note" className={cn('flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn', className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-semibold">{DISCLAIMER}</span> Angka proyeksi adalah hitungan dari harga & SL/TP strategi, bukan
        janji hasil. Rata-rata backtest tidak menjamin hasil berikutnya.
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
    return out
  }, [d.strategy])
  const markers = useMemo(() => {
    const times = klines.map((k) => k.time)
    return tradesToMarkers(d.detail.recent_trades ?? [], times).markers
  }, [klines, d.detail.recent_trades])
  if (klines.length === 0) return <p className="text-xs text-muted-foreground">Candle tidak tersedia.</p>
  return (
    <div className="h-64 overflow-hidden rounded-lg border">
      <TradingChart symbol={d.symbol} interval="4h" klines={klines} source="perp" priceLines={lines} markers={markers} />
    </div>
  )
}

function Body({ d }: { d: OutlookDetail }) {
  const st = d.strategy
  const pj = d.projection
  const bt = d.backtest
  const reg = d.regime?.btc
  const regLabel = reg?.label as RegimeLabel | null | undefined
  const sideRegime = st.side && regLabel ? bt.by_regime?.[st.side]?.[regLabel] : null
  return (
    <div className="space-y-1 pb-8">
      <Disclaimer />
      {d.stale && (
        <p className="mt-2 rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          Data sudah {formatScore(d.age_hours, 0)} jam sejak close 4H terakhir: bisa basi.
        </p>
      )}

      <H>Penjelasan</H>
      <div className="space-y-2 text-sm leading-relaxed">
        {(d.explanation.paragraphs ?? [d.explanation.summary]).map((p, i) => (
          <p key={i} className={cn(p.startsWith('→') && 'font-semibold', p.startsWith('Catatan') && 'text-warn')}>{p}</p>
        ))}
      </div>

      <H>Posisi strategi & proyeksi dana</H>
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
            <StatTile label="R:R (TP/SL)" value={pj.rr ? `${formatScore(pj.rr, 2)} : 1` : '—'} hint="setelah biaya" />
            <StatTile label="Profit di TP1" value={formatUsdSigned(pj.at_tp1?.net)} valueClassName={signClass(pj.at_tp1?.net)}
              hint={pj.at_tp1 ? 'bersyarat (exhaustion)' : 'tidak berlaku'} />
          </div>
          {pj.expected ? (
            <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">Rata-rata per trade (backtest):</span>
                <span className={cn('num font-bold', signClass(pj.expected.ev_usd))}>{formatUsdSigned(pj.expected.ev_usd)}</span>
                <span className="text-muted-foreground">
                  · menang {formatScore(pj.expected.win_rate_pct, 0)}% · rata-rata menang {formatUsdSigned(pj.expected.avg_win_usd)} ·
                  rata-rata kalah {formatUsdSigned(pj.expected.avg_loss_usd)} · tahan ±{formatScore((pj.expected.median_hold_hours ?? 0) / 24, 1)} hari
                </span>
                {pj.expected.small_sample && <Badge variant="warn" size="xs">SAMPEL KECIL</Badge>}
              </div>
              <p className="mt-1 text-muted-foreground">{pj.expected.caveat}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Statistik backtest tidak tersedia untuk sisi ini.</p>
          )}
          {(pj.warnings ?? []).map((w) => (
            <p key={w} className="mt-2 flex items-start gap-1 text-xs text-warn">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {w}
            </p>
          ))}
          <p className="mt-2 text-2xs text-muted-foreground">{pj.note}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{pj.reason}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <div><span className="text-muted-foreground">Entry:</span> <span className="num">{formatPrice(st.entry_price)}</span></div>
        <div><span className="text-muted-foreground">Sejak:</span> {formatWib(st.entry_at)}</div>
        <div><span className="text-muted-foreground">Harga:</span> <span className="num">{formatPrice(d.price)}</span></div>
        <div><span className="text-muted-foreground">SL:</span> <span className="num">{formatPrice(st.sl)}</span>{st.dist_sl_pct != null && <span className="text-muted-foreground"> ({formatScore(st.dist_sl_pct, 1)}% · {formatScore(st.dist_sl_r, 2)}R)</span>}</div>
        <div><span className="text-muted-foreground">TP:</span> <span className="num">{formatPrice(st.tp)}</span>{st.dist_tp_pct != null && <span className="text-muted-foreground"> ({formatScore(st.dist_tp_pct, 1)}% · {formatScore(st.dist_tp_r, 2)}R)</span>}</div>
        <div><span className="text-muted-foreground">PnL terbuka:</span> <span className={cn('num', signClass(st.open_pnl_pct))}>{formatPercent(st.open_pnl_pct, 1)}</span>{st.open_r != null && <span className="text-muted-foreground"> ({formatScore(st.open_r, 2)}R)</span>}</div>
      </div>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chart 4H</h3>
        <Link href={`/chart?symbol=${encodeURIComponent(d.symbol)}`} className="inline-flex items-center gap-1 text-xs text-info hover:underline">
          <CandlestickChart className="h-3.5 w-3.5" aria-hidden="true" /> Buka di Chart <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      <MiniChart d={d} />
      <p className="mt-1 text-2xs text-muted-foreground">Garis: entry (biru), SL & TP (putus-putus). Panah = entry trade backtest terakhir, lingkaran = exit.</p>

      <H>Faktor</H>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-3xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-1 py-1.5">Faktor</th>
              <th className="px-1 py-1.5">Arah</th>
              <th className="px-1 py-1.5">Nilai</th>
              <th className="px-1 py-1.5">Bukti</th>
              <th className="px-1 py-1.5 text-right" title="Bobot yang dipakai dalam skor dukungan">Bobot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {d.factors.map((f) => (
              <tr key={f.key} className={cn(!f.available && 'opacity-60')}>
                <td className="px-1 py-2 align-top">
                  <div className="font-medium">{f.label}</div>
                  <div className="mt-0.5 max-w-[22rem] text-2xs leading-snug text-muted-foreground">{f.detail}</div>
                </td>
                <td className={cn('px-1 py-2 align-top font-mono', f.direction > 0 ? 'text-bullish' : f.direction < 0 ? 'text-bearish' : 'text-muted-foreground')}>
                  {DIR_TEXT[f.direction]}
                </td>
                <td className="px-1 py-2 align-top">{f.value}</td>
                <td className="px-1 py-2 align-top"><EvidenceBadge code={f.evidence} text={f.evidence_text} /></td>
                <td className="num px-1 py-2 text-right align-top">{f.key === 'strategi' ? 'utama' : formatScore(f.used_weight, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 space-y-0.5 text-2xs text-muted-foreground">
        {d.bias.reasons.map((r) => <li key={r}>• {r}</li>)}
      </ul>

      <H>Statistik backtest</H>
      <p className="text-xs text-muted-foreground">Dasar: {bt.basis_text}.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Trade" value={bt.n} hint={`long ${bt.by_side?.long?.n ?? 0} · short ${bt.by_side?.short?.n ?? 0}`} />
        <StatTile label="Menang" value={bt.win_rate_pct === null ? '—' : `${formatScore(bt.win_rate_pct, 0)}%`} />
        <StatTile label="Rata-rata/trade" value={formatPercent(bt.mean_pct, 2)} valueClassName={signClass(bt.mean_pct)} hint="% dari nilai posisi" />
        <StatTile label="Lama tahan" value={bt.median_hold_hours === null ? '—' : `${formatScore(bt.median_hold_hours / 24, 1)} hari`} hint="median" />
      </div>
      {st.side && regLabel && (
        <p className="mt-2 text-xs">
          Di kondisi pasar BTC sekarang (<span className="font-medium">{REGIME_TEXT[regLabel]}</span>), trade {st.side} strategi ini:{' '}
          {sideRegime && sideRegime.n > 0 ? (
            <>
              <span className="num">{sideRegime.n}</span> trade, rata-rata{' '}
              <span className={cn('num', signClass(sideRegime.mean_pct))}>{formatPercent(sideRegime.mean_pct, 2)}</span>, menang{' '}
              {formatScore(sideRegime.win_rate_pct, 0)}%{!sideRegime.enough && ' (sampel kecil)'}
            </>
          ) : 'belum ada trade'}
          <span className="text-muted-foreground"> · {bt.by_regime_basis}</span>
        </p>
      )}

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
        Headline hanya konteks. Tidak dihitung sebagai sinyal karena belum ada sentimen per koin yang teruji.
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
            {d && <KeyakinanText bias={d.bias} className="text-xs" />}
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs text-muted-foreground">
            {d ? (
              <>Strategi Rosyade 4H · close 4H {formatWib(d.last_bar_close)} · {d.strategy.side ? `${d.strategy.side.toUpperCase()} sejak ${formatWib(d.strategy.entry_at)}` : 'FLAT'}</>
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
