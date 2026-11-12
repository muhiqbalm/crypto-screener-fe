'use client'

import Link from 'next/link'
import type { UseQueryResult } from '@tanstack/react-query'
import { ArrowRight, KeyRound, Webhook } from 'lucide-react'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { formatTime } from '@/lib/utils/time'
import { alertStatusLabel, alertStatusTone } from '@/lib/bot/status'
import type { BotAccount, BotStatus } from '@/lib/api/types/bot'
import { LiveDot } from './kit/LiveDot'
import { BigPill, DeckCard, IconBadge, TONE_TEXT } from './kit/Tiles'

const ALERT_TONE = { ok: 'ok', warn: 'warn', bad: 'bad', wait: 'muted' } as const

function alertText(a: NonNullable<BotAccount['last_alert']>): string {
  const verb = a.action === 'open' ? 'Buka' : a.action === 'close' ? 'Tutup' : 'Alert'
  return `${verb} ${a.side ? a.side.toUpperCase() : ''} ${a.symbol.replace(/USDT$/, '')}`.replace(/\s+/g, ' ').trim()
}

/** One account = one big status tile: name, Aktif / Tidak aktif, key, last alert. */
function AccountTile({ a }: { a: BotAccount }) {
  const live = a.webhook_active && a.account_active
  const tone = !a.account_active ? 'bad' : a.webhook_active ? 'ok' : 'muted'
  const word = !a.account_active ? 'Akun nonaktif' : a.webhook_active ? 'Aktif' : 'Tidak aktif'
  return (
    <DeckCard className="flex flex-col gap-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconBadge icon={Webhook} tone={live ? 'ok' : 'muted'} />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold">{a.label}</p>
            <p className="text-[13px] text-muted-foreground">Webhook</p>
          </div>
        </div>
        <LiveDot tone={live ? 'ok' : 'off'} label={word} />
      </div>
      <p className={`text-[30px] font-bold leading-none tracking-tight ${TONE_TEXT[tone]}`}>{word}</p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {a.exchanges.length ? a.exchanges.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(', ') : 'Belum ada API key'}
        </span>
        {a.webhook_since && live && <span>sejak {formatTime(a.webhook_since, { time: false })}</span>}
      </p>
      {a.last_alert ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-[14px]">
          <span className="text-muted-foreground">Alert terakhir</span>
          <span className="num font-semibold">{formatTime(a.last_alert.at)}</span>
          <span className="text-muted-foreground">{alertText(a.last_alert)}</span>
          <BigPill tone={ALERT_TONE[alertStatusTone(a.last_alert.status)]} className="px-2.5 py-0.5">
            {alertStatusLabel(a.last_alert.status)}
          </BigPill>
        </div>
      ) : (
        <p className="border-t border-border/60 pt-3 text-[14px] text-muted-foreground">Belum ada alert yang diproses.</p>
      )}
    </DeckCard>
  )
}

/**
 * Read-only webhook state per bot account (GET /lab/bot/status) as big status tiles.
 * Never shows, fetches or copies the webhook passphrase; settings live on /webhook.
 */
export function WebhookStatusCard({ q, className }: { q: UseQueryResult<BotStatus>; className?: string }) {
  const s = q.data
  if (q.isPending) return <DeckCard className={className}><LoadingState rows={3} /></DeckCard>
  if (q.isError || !s) {
    return (
      <DeckCard className={className}>
        <ErrorState compact error={q.error} message="Status webhook belum bisa dimuat." onRetry={() => q.refetch()} />
      </DeckCard>
    )
  }
  if (!s.available || s.accounts.length === 0) {
    return (
      <DeckCard className={className}>
        <div className="flex items-center gap-3">
          <IconBadge icon={Webhook} tone="muted" />
          <p className="text-[17px] font-semibold">{!s.available ? 'Status webhook tidak tersedia' : 'Belum ada akun dengan webhook'}</p>
        </div>
        <p className="mt-3 text-[14px] text-muted-foreground">
          {!s.available ? `Database bot tidak bisa dibaca (${s.reason ?? 'alasan tidak diketahui'}).` : 'Alert TradingView belum bisa sampai ke bot.'}
        </p>
      </DeckCard>
    )
  }
  return (
    <div className={`flex flex-col gap-5 ${className ?? ''}`}>
      {s.accounts.map((a) => (
        <AccountTile key={a.label} a={a} />
      ))}
      <p className="px-1 text-[13px] text-muted-foreground">
        Kata sandi webhook tidak ditampilkan di sini.{' '}
        <Link href="/webhook" className="inline-flex items-center gap-0.5 font-semibold text-info hover:underline">
          Atur webhook <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
