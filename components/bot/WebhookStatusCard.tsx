'use client'

import Link from 'next/link'
import type { UseQueryResult } from '@tanstack/react-query'
import { ArrowRight, KeyRound, Webhook } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { formatTime } from '@/lib/utils/time'
import { alertStatusLabel, alertStatusTone } from '@/lib/bot/status'
import type { BotAccount, BotStatus } from '@/lib/api/types/bot'
import { Badge } from '@/components/ui/badge'
import { Panel } from '@/components/ui/hero-card'
import { IconChip } from '@/components/ui/icon-title'
import { LiveDot } from '@/components/ui/live-dot'
import { TONE_TEXT } from '@/components/ui/tone'

const ALERT_TONE = { ok: 'bullish', warn: 'warn', bad: 'bearish', wait: 'muted' } as const

function alertText(a: NonNullable<BotAccount['last_alert']>): string {
  const verb = a.action === 'open' ? 'Buka' : a.action === 'close' ? 'Tutup' : 'Alert'
  return `${verb} ${a.side ? a.side.toUpperCase() : ''} ${a.symbol.replace(/USDT$/, '')}`.replace(/\s+/g, ' ').trim()
}

/** One account = one big status tile: name, Aktif / Tidak aktif, key, last alert. */
function AccountTile({ a }: { a: BotAccount }) {
  const live = a.webhook_active && a.account_active
  const tone = !a.account_active ? 'bearish' : a.webhook_active ? 'bullish' : 'muted'
  const word = !a.account_active ? 'Akun nonaktif' : a.webhook_active ? 'Aktif' : 'Tidak aktif'
  return (
    <Panel as="article" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconChip icon={Webhook} tone={live ? 'bullish' : 'muted'} />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold leading-tight">{a.label}</h3>
            <p className="text-2xs text-muted-foreground">Webhook</p>
          </div>
        </div>
        <LiveDot tone={live ? 'bullish' : 'muted'} pulse={live} size="lg" />
      </div>
      <p className={`display text-3xl font-extrabold leading-none ${TONE_TEXT[tone]}`}>{word}</p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {a.exchanges.length ? a.exchanges.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(', ') : 'Belum ada API key'}
        </span>
        {a.webhook_since && live && <span>sejak {formatTime(a.webhook_since, { time: false })}</span>}
      </p>
      {a.last_alert ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-xs">
          <span className="text-muted-foreground">Alert terakhir</span>
          <span className="num font-semibold">{formatTime(a.last_alert.at)}</span>
          <span className="text-muted-foreground">{alertText(a.last_alert)}</span>
          <Badge variant={ALERT_TONE[alertStatusTone(a.last_alert.status)]}>{alertStatusLabel(a.last_alert.status)}</Badge>
        </div>
      ) : (
        <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">Belum ada alert yang diproses.</p>
      )}
    </Panel>
  )
}

/**
 * Read-only webhook state per bot account (GET /lab/bot/status) as big status tiles.
 * Never shows, fetches or copies the webhook passphrase; settings live on /webhook.
 */
export function WebhookStatusCard({ q, className }: { q: UseQueryResult<BotStatus>; className?: string }) {
  const s = q.data
  if (q.isPending) return <Panel as="div" className={className}><LoadingState rows={3} /></Panel>
  if (q.isError || !s) {
    return (
      <Panel as="div" className={className}>
        <ErrorState compact error={q.error} message="Status webhook belum bisa dimuat." onRetry={() => q.refetch()} />
      </Panel>
    )
  }
  if (!s.available || s.accounts.length === 0) {
    return (
      <Panel as="div" className={className}>
        <div className="flex items-center gap-3">
          <IconChip icon={Webhook} tone="muted" />
          <p className="text-lg font-bold">{!s.available ? 'Status webhook tidak tersedia' : 'Belum ada akun dengan webhook'}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {!s.available ? `Database bot tidak bisa dibaca (${s.reason ?? 'alasan tidak diketahui'}).` : 'Alert TradingView belum bisa sampai ke bot.'}
        </p>
      </Panel>
    )
  }
  return (
    <div className={`flex flex-col gap-5 ${className ?? ''}`}>
      {s.accounts.map((a) => (
        <AccountTile key={a.label} a={a} />
      ))}
      <p className="px-1 text-2xs text-muted-foreground">
        Kata sandi webhook tidak ditampilkan di sini.{' '}
        <Link href="/webhook" className="inline-flex items-center gap-0.5 font-semibold text-info hover:underline">
          Atur webhook <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
