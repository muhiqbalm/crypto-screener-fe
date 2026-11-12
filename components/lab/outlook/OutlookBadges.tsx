'use client'

import { AlertTriangle, Clock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DirectionBadge } from '@/components/ui/direction-badge'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import {
  EVIDENCE_TONE,
  FACTOR_SHORT,
  FASE_HINT,
  FASE_TEXT,
  KEYAKINAN_TONE,
  PELUANG_TEXT,
  PELUANG_TONE,
  STATUS_TEXT,
  STATUS_TONE,
} from '@/lib/lab/outlook'
import { cn } from '@/lib/utils/cn'
import type {
  CallStatus,
  EvidenceCode,
  Fase,
  OutlookBiasInfo,
  OutlookFactor,
  OutlookPeluang,
  OutlookStrategy,
} from '@/lib/api/types/outlook'

/** Arah of a call: the app-wide DirectionBadge (LONG / SHORT / NETRAL). */
export function BiasBadge({ bias, size = 'sm' }: { bias: OutlookBiasInfo; size?: 'sm' | 'default' }) {
  return <DirectionBadge direction={bias.bias} size={size === 'sm' ? 'sm' : 'md'} />
}

/** "keyakinan tinggi / sedang / rendah", or the FLAT lean. Word + tone, never colour alone. */
export function KeyakinanText({ bias, className }: { bias: OutlookBiasInfo; className?: string }) {
  if (!bias.keyakinan) {
    return (
      <span className={cn('text-2xs text-muted-foreground', className)}>
        {bias.condong ? `condong ${bias.condong} (belum terbukti)` : 'tanpa arah'}
      </span>
    )
  }
  const tone = bias.keyakinan === 'tinggi' ? 'text-bullish' : bias.keyakinan === 'sedang' ? 'text-info' : 'text-warn'
  return <span className={cn('text-2xs font-medium', tone, className)}>keyakinan {bias.keyakinan}</span>
}

export function KeyakinanBadge({ bias }: { bias: OutlookBiasInfo }) {
  if (!bias.keyakinan) return null
  return (
    <Badge variant={KEYAKINAN_TONE[bias.keyakinan]} size="sm" title={bias.conclusion ?? undefined}>
      keyakinan {bias.keyakinan}
    </Badge>
  )
}

export function FaseBadge({ fase }: { fase: Fase | null | undefined }) {
  if (!fase) return null
  return (
    <Badge variant={fase === 'baru' ? 'info' : 'muted'} size="sm" title={FASE_HINT[fase]}>
      {fase === 'baru' ? <Sparkles aria-hidden="true" /> : <Clock aria-hidden="true" />}
      {FASE_TEXT[fase]}
    </Badge>
  )
}

export function PeluangBadge({ p }: { p: OutlookPeluang | undefined }) {
  if (!p) return null
  return (
    <Badge variant={PELUANG_TONE[p.label]} size="sm" title={p.reason}>
      {PELUANG_TEXT[p.label]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: CallStatus }) {
  return (
    <Badge variant={STATUS_TONE[status]} size="sm">
      {STATUS_TEXT[status]}
    </Badge>
  )
}

export function EvidenceBadge({ code, text }: { code: EvidenceCode; text?: string }) {
  return (
    <Badge variant={EVIDENCE_TONE[code] ?? 'muted'} size="sm">
      {text ?? code}
    </Badge>
  )
}

export function PresetCell({ strategy }: { strategy: OutlookStrategy }) {
  const p = strategy.preset
  if (!p) {
    return (
      <div className="space-y-0.5">
        <div className="text-2xs text-muted-foreground">{strategy.name ?? 'Default template'}</div>
        <Badge variant="warn" size="xs">
          <AlertTriangle aria-hidden="true" />
          BELUM DIUJI
        </Badge>
      </div>
    )
  }
  return (
    <div className="space-y-0.5">
      <div className="truncate font-mono text-2xs" title={p.name}>{p.name}</div>
      <div className="flex items-center gap-1">
        {p.verdict ? <VerdictBadge verdict={p.verdict} /> : <Badge variant="warn" size="xs">BELUM DIUJI</Badge>}
        {p.contaminated && (
          <span className="text-3xs text-warn" title="Holdout preset sudah pernah dilihat saat riset: hasil uji bisa terlalu optimis">
            tercemar
          </span>
        )}
      </div>
    </div>
  )
}

/** Small factor chips: + (arah long) / − (arah short) / 0 per context factor; unavailable ones dimmed.
 *  The tooltip says whether the factor supports or opposes the strategy position. */
export function FactorChips({ factors, side }: { factors: OutlookFactor[]; side: 'long' | 'short' | null }) {
  const sign = side === 'long' ? 1 : side === 'short' ? -1 : 0
  return (
    <div className="flex flex-wrap gap-1">
      {factors
        .filter((f) => f.key !== 'strategi' && f.key !== 'berita')
        .map((f) => {
          const aligned = sign === 0 ? f.direction : f.direction * sign
          const tone = !f.available
            ? 'border-border text-muted-foreground/50'
            : f.direction > 0
              ? 'border-bullish/30 bg-bullish/10 text-bullish'
              : f.direction < 0
                ? 'border-bearish/30 bg-bearish/10 text-bearish'
                : 'border-border bg-muted/40 text-muted-foreground'
          const mark = !f.available ? '·' : f.direction > 0 ? '+' : f.direction < 0 ? '−' : '0'
          return (
            <span
              key={f.key}
              className={cn('inline-flex items-center gap-0.5 rounded border px-1 font-mono text-3xs leading-4', tone)}
              title={`${f.label}: ${f.value} · ${f.evidence_text}${sign !== 0 ? (aligned > 0 ? ' · searah' : aligned < 0 ? ' · berlawanan' : ' · netral') : ''}`}
            >
              {FACTOR_SHORT[f.key] ?? f.key}
              <span aria-hidden="true">{mark}</span>
            </span>
          )
        })}
    </div>
  )
}
