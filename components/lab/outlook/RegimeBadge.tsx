'use client'

import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRegime } from '@/lib/queries/outlook'
import { useSession } from '@/lib/utils/use-session'
import { REGIME_TEXT, REGIME_TONE } from '@/lib/lab/outlook'
import { formatPercent } from '@/lib/utils/format'
import type { RegimeCurrent } from '@/lib/api/types/outlook'
import { cn } from '@/lib/utils/cn'

function tip(name: string, r: RegimeCurrent, rule: string): string {
  const parts = [
    `${name}: ${r.label_text}`,
    r.days_in_label ? `sudah ${r.days_in_label} hari` : null,
    r.dist_ema_slow_pct !== null && r.dist_ema_slow_pct !== undefined
      ? `harga ${formatPercent(r.dist_ema_slow_pct, 1)} dari EMA 200 hari`
      : null,
  ].filter(Boolean)
  return `${parts.join(' · ')}\n\nAturan: ${rule}`
}

/**
 * Compact market-regime badge (BTC, plus ETH when `withEth`). Visible to any
 * logged-in user; hidden when logged out, loading or on any error so the host
 * page never breaks because of it.
 */
export function RegimeBadge({ withEth = false, className }: { withEth?: boolean; className?: string }) {
  const session = useSession()
  const q = useRegime(Boolean(session?.accessToken))
  const d = q.data
  if (!d?.available || !d.btc?.label) return null
  const items: [string, RegimeCurrent | null][] = [['BTC', d.btc], ...(withEth ? ([['ETH', d.eth]] as [string, RegimeCurrent | null][]) : [])]
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} aria-label="Kondisi pasar">
      <span className="eyebrow inline-flex items-center gap-1">
        <Activity className="h-3 w-3" aria-hidden="true" />
        Kondisi pasar
      </span>
      {items.map(([name, r]) =>
        r?.label ? (
          <Badge key={name} variant={REGIME_TONE[r.label]} size="sm" title={tip(name, r, d.rule)}>
            {name}: {REGIME_TEXT[r.label]}
          </Badge>
        ) : null,
      )}
    </div>
  )
}
