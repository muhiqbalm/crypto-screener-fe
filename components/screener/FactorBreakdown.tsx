'use client'

import { Compass, Flame, Layers, Scale, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SignalBadge } from '@/components/screener/SignalBadge'
import { TierBadge } from '@/components/screener/TierBadge'
import { TrackRecordHint } from '@/components/screener/TrackRecordHint'
import { InfoTip } from '@/components/ui/info-tip'
import { compositeKey, factorKey, tierKey } from '@/lib/screener/track-record'
import {
  CONFIDENCE_TEXT,
  FACTORS,
  lsrText,
  momentumText,
  SCORE_HINT,
  scoreFraction,
  scorePosition,
  TIER_HINT,
} from '@/lib/screener/factors'
import { formatFunding, formatScore, formatVolume } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { termLabel } from '@/lib/glossary'
import type { AssetDetail, SignalDirection } from '@/lib/api/types/screener'

function isNum(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && !isNaN(v)
}

function dirClass(sig: SignalDirection | 'BUY' | 'SELL' | 'HOLD' | null | undefined): string {
  if (sig === 'BULLISH' || sig === 'BUY') return 'text-bullish'
  if (sig === 'BEARISH' || sig === 'SELL') return 'text-bearish'
  return 'text-muted-foreground'
}

const ICON = { momentum: Compass, funding: Flame, oi: Layers, lsr: Scale, reversal: TrendingUp }

/** Screener score of one coin: signal, position among the coins, group, the 5 factors (with
 *  their Signal Ledger track record) and, folded, the inverse-volatility allocation. */
export function FactorBreakdown({ asset, all }: { asset: AssetDetail; all: AssetDetail[] }) {
  const pos = scorePosition(asset, all)
  const frac = scoreFraction(pos)
  const momentum = asset.momentum_signal ?? asset.macd_signal ?? null
  const lsr = asset.long_short_ratio
  const value: Record<string, React.ReactNode> = {
    momentum: <span className={cn('font-semibold', dirClass(momentum))}>{momentumText(momentum)}</span>,
    funding: (
      <span className="text-right">
        <span className="block font-semibold">{formatFunding(asset.funding_rate)}</span>
        <span className={cn('text-3xs font-bold', dirClass(asset.funding_rate_signal))}>
          {asset.funding_rate_signal === 'BULLISH' ? 'mendukung naik' : asset.funding_rate_signal === 'BEARISH' ? 'mendukung turun' : 'netral'}
        </span>
      </span>
    ),
    oi: (
      <span className="text-right">
        <span className="block font-semibold">{formatVolume(asset.open_interest)}</span>
        <span className={cn('text-3xs font-bold', dirClass(asset.oi_signal))}>
          {asset.oi_signal === 'BULLISH' ? 'mendukung naik' : asset.oi_signal === 'BEARISH' ? 'mendukung turun' : 'netral'}
        </span>
      </span>
    ),
    lsr: (
      <span className="text-right">
        <span className="block font-semibold">{isNum(lsr) ? lsr.toFixed(2) : '—'}</span>
        <span className="text-3xs text-muted-foreground">{lsrText(lsr)}</span>
      </span>
    ),
    reversal: <span className="font-semibold">{isNum(asset.reversal_score) ? asset.reversal_score.toFixed(1) : '—'}</span>,
  }
  const track: Record<string, React.ReactNode> = {
    momentum: <TrackRecordHint k={factorKey('momentum', momentum)} symbol={asset.symbol} />,
    funding: <TrackRecordHint k={factorKey('funding', asset.funding_rate_signal)} symbol={asset.symbol} />,
    oi: <TrackRecordHint k={factorKey('oi', asset.oi_signal)} symbol={asset.symbol} />,
    lsr: null,
    reversal: null,
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-2.5">
          <span className="block text-2xs text-muted-foreground">{termLabel('screener_signal')}</span>
          <span className="mt-0.5 flex items-center gap-1">
            <SignalBadge signal={asset.signal} />
            <TrackRecordHint k={compositeKey(asset)} symbol={asset.symbol} />
          </span>
        </div>
        <div className="rounded-lg border bg-card p-2.5">
          <span className="flex items-center gap-1 text-2xs text-muted-foreground">Posisi skor <InfoTip label="Skor screener">{SCORE_HINT}</InfoTip></span>
          {pos ? (
            <>
              <span className="num block text-sm font-semibold">ke-{pos.pos} dari {pos.n}</span>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className="block h-full rounded-full bg-info" style={{ width: `${Math.round((frac ?? 0) * 100)}%` }} />
              </span>
            </>
          ) : <span className="text-muted-foreground">tidak tersedia</span>}
        </div>
        <div className="rounded-lg border bg-card p-2.5">
          <span className="flex items-center gap-1 text-2xs text-muted-foreground">Kelompok <InfoTip label="Kelompok skor">{TIER_HINT}</InfoTip></span>
          <span className="mt-0.5 flex items-center gap-1">
            <TierBadge tier={asset.tier} />
            <TrackRecordHint k={tierKey(asset)} symbol={asset.symbol} />
          </span>
        </div>
        <div className="rounded-lg border bg-card p-2.5">
          <span className="block text-2xs text-muted-foreground">Kekompakan skor</span>
          <span className="num block text-sm font-semibold">
            {isNum(asset.confidence_pct) ? `${asset.confidence_pct.toFixed(1)}%` : '—'}
          </span>
          {asset.confidence_tier && <span className="text-3xs text-muted-foreground">{CONFIDENCE_TEXT[asset.confidence_tier]}</span>}
        </div>
      </div>

      <ul className="space-y-1.5">
        {FACTORS.map((f) => {
          const Icon = ICON[f.key]
          return (
            <li key={f.key} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold">
                    {f.label} <InfoTip label={f.label}>{f.hint}</InfoTip>
                  </span>
                  <span className="block text-2xs text-muted-foreground">Bobot {f.weight}% dari skor</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 font-mono">
                {track[f.key]}
                {value[f.key]}
              </span>
            </li>
          )
        })}
      </ul>

      <details className="rounded-lg border bg-muted/20 p-3 text-xs">
        <summary className="cursor-pointer font-medium">Lanjutan: usulan porsi (gejolak terbalik)</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-card p-2.5">
            <span className="block text-2xs text-muted-foreground">Usulan porsi</span>
            <span className="num block text-base font-bold">
              {isNum(asset.suggested_position_pct) ? `${asset.suggested_position_pct.toFixed(2)}%` : '—'}
            </span>
            <span className="block text-3xs text-muted-foreground">dari modal yang dialokasikan</span>
          </div>
          <div className="rounded-lg border bg-card p-2.5">
            <span className="block text-2xs text-muted-foreground">Gejolak harga (ATR %)</span>
            <span className="num block text-base font-bold">{isNum(asset.volatility) ? `${asset.volatility.toFixed(2)}%` : '—'}</span>
            <span className="block text-3xs text-muted-foreground">rata-rata rentang per candle</span>
          </div>
        </div>
        <p className="mt-2 text-2xs text-muted-foreground">
          Porsi ini mengecil untuk koin yang lebih bergejolak. Ini hitungan screener, bukan saran Lab: riset Lab
          menyarankan ukuran 1× untuk strategi di halaman ini. Skor mentah: {formatScore(asset.composite_score, 4)}.
        </p>
      </details>
      <Badge variant="muted" size="xs">Sumber: screener (diperbarui terus)</Badge>
    </div>
  )
}
