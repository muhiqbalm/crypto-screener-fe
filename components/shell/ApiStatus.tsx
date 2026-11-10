'use client'

import { cn } from '@/lib/utils/cn'
import { useApiHealth } from '@/lib/queries/health'

/** Backend health pill (GET /api/v1/health, polled every 30 s). */
export function ApiStatus({ className }: { className?: string }) {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  const { data: health, isPending } = useApiHealth()

  const state = isMock ? 'mock' : isPending ? 'pending' : (health?.status ?? 'offline')
  const dot = {
    mock: 'bg-warn',
    pending: 'bg-muted-foreground/50',
    healthy: 'bg-bullish',
    degraded: 'bg-warn',
    offline: 'bg-bearish',
  }[state]
  const label = {
    mock: 'Mode mock',
    pending: 'Cek API…',
    healthy: `API online · ${health?.latencyMs ?? '–'} ms`,
    degraded: `API lambat (data basi) · ${health?.latencyMs ?? '–'} ms`,
    offline: 'API offline',
  }[state]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-2xs text-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </div>
  )
}
